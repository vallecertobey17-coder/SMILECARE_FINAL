// Business rules shared by the administrative and resident platforms.
import type { Collections, DispenseItem, Medicine, Resident, Unit } from './types'
import { daysToExpiry, isoDate, medicineStatus } from './utils'

type Data = { [K in keyof Collections]: Collections[K][] }

export const medLabel = (m: Medicine) => `${m.name} (${m.strength})`

/** Stock available for a medicine at a source ('central' or a unit id). */
export function stockAt(data: Data, medicineId: string, source: string): number {
  if (source === 'central') return data.medicines.find((m) => m.id === medicineId)?.stock ?? 0
  return data.units.find((u) => u.id === source)?.stock?.[medicineId] ?? 0
}

export function sourceName(data: Data, source?: string) {
  if (!source || source === 'central') return 'Central health office'
  return data.units.find((u) => u.id === source)?.name ?? 'Unit'
}

export interface EligibilityResult {
  ok: boolean
  problems: string[] // block release
  warnings: string[] // shown to the pharmacist, do not block
}

/** Eligibility checking for medicine distribution (proposal: Dispensing Management). */
export function checkEligibility(data: Data, resident: Resident | undefined, items: DispenseItem[], source: string): EligibilityResult {
  const problems: string[] = []
  const warnings: string[] = []
  if (!resident) problems.push('Resident is not registered. Register them as a walk-in first.')
  else if (resident.status === 'PENDING') problems.push(`${resident.name} is still pending verification.`)
  else if (resident.status === 'REJECTED') problems.push(`${resident.name}'s verification was rejected.`)
  const need = new Map<string, number>()
  for (const it of items) need.set(it.medicineId, (need.get(it.medicineId) ?? 0) + it.qty)
  for (const [id, qty] of need) {
    const m = data.medicines.find((x) => x.id === id)
    if (!m) {
      problems.push('A selected medicine is no longer in inventory.')
      continue
    }
    if (daysToExpiry(m) < 0) problems.push(`${medLabel(m)} is expired and can't be dispensed.`)
    const have = stockAt(data, id, source)
    if (have < qty) problems.push(`Not enough ${medLabel(m)} at ${sourceName(data, source)}: ${have} ${m.unit} left, ${qty} needed.`)
    if (resident) {
      const recent = data.dispensings
        .filter((d) => d.status === 'COMPLETED' && (d.residentId === resident.id || d.residentName === resident.name))
        .filter((d) => d.items.some((i) => i.medicineId === id))
        .sort((a, b) => b.date.localeCompare(a.date))[0]
      if (recent) {
        const days = Math.floor((Date.now() - new Date(recent.date).getTime()) / 86400000)
        if (days < 25) warnings.push(`${resident.name} already received ${medLabel(m)} ${days} day${days === 1 ? '' : 's'} ago.`)
      }
    }
  }
  return { ok: problems.length === 0, problems, warnings }
}

/** Compute the stock updates needed to release `items` from `source`. */
export function stockPatches(data: Data, items: DispenseItem[], source: string) {
  const need = new Map<string, number>()
  for (const it of items) need.set(it.medicineId, (need.get(it.medicineId) ?? 0) + it.qty)
  if (source === 'central') {
    return [...need].map(([id, qty]) => ({ kind: 'medicine' as const, id, patch: { stock: stockAt(data, id, 'central') - qty } }))
  }
  const unit = data.units.find((u) => u.id === source)!
  const stock = { ...(unit.stock ?? {}) }
  for (const [id, qty] of need) stock[id] = (stock[id] ?? 0) - qty
  return [{ kind: 'unit' as const, id: unit.id, patch: { stock } }]
}

/* ---------- resident history ---------- */
export type HistoryKind = 'consultation' | 'medicine' | 'vaccination' | 'appointment'
export interface HistoryItem {
  id: string
  kind: HistoryKind
  date: string
  title: string
  detail: string
  where: string
  status?: string
}
export function residentHistory(data: Data, r: Pick<Resident, 'id' | 'name'>): HistoryItem[] {
  const mine = (x: { residentId?: string; residentName: string }) => x.residentId === r.id || (!x.residentId && x.residentName === r.name)
  const out: HistoryItem[] = []
  for (const c of data.consultations.filter(mine))
    out.push({
      id: c.id,
      kind: 'consultation',
      date: c.date,
      title: c.type === 'Rapid Blood Sugar Screening' ? 'Blood sugar screening' : c.complaint || c.type,
      detail: [c.bp && `BP ${c.bp}`, c.bloodSugar && `Blood sugar ${c.bloodSugar} mg/dL`, c.findings].filter(Boolean).join(' • '),
      where: `${c.doctor} • ${c.location}`,
    })
  for (const d of data.dispensings.filter(mine))
    out.push({
      id: d.id,
      kind: 'medicine',
      date: d.date,
      title: d.items.map((i) => i.label).join(', '),
      detail: d.items.map((i) => { const u = data.medicines.find((m) => m.id === i.medicineId)?.unit ?? 'units'; return `${i.qty} ${i.qty === 1 ? u.replace(/s$/, '') : u}` }).join(', '),
      where: sourceName(data, d.source),
      status: dispenseLabel(d.status, d.note),
    })
  for (const v of data.vaccinations.filter(mine))
    out.push({ id: v.id, kind: 'vaccination', date: v.date, title: `${v.vaccine} vaccine`, detail: v.dose, where: `${v.administeredBy} • ${v.location}` })
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

/* ---------- E-Pila ---------- */
export function nextTicketNumber(data: Data, unit: Unit) {
  const today = isoDate()
  const nums = data.tickets.filter((t) => t.unitId === unit.id && t.createdAt.startsWith(today)).map((t) => t.number)
  return Math.max(unit.served + unit.queue, ...nums, 0) + 1
}
export function nowServing(data: Data, unitId: string) {
  const serving = data.tickets.filter((t) => t.unitId === unitId && t.status === 'SERVING').sort((a, b) => b.number - a.number)[0]
  const unit = data.units.find((u) => u.id === unitId)
  return serving?.number ?? unit?.served ?? 0
}

/* ---------- health mapping & deployment planning ---------- */
export interface BarangayStats {
  barangay: string
  residents: number
  pending: number
  consultations: number
  highBp: number
  highSugar: number
  vaccinations: number
  medicines: number
  appointments: number
  lastDeployment: string | null
}
const parseBp = (bp?: string) => {
  const m = bp?.match(/(\d+)\s*\/\s*(\d+)/)
  return m ? [Number(m[1]), Number(m[2])] : null
}
export function barangayStats(data: Data, barangays: string[], sinceDays = 90): BarangayStats[] {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString()
  const brgyOf = new Map(data.residents.map((r) => [r.id, r.barangay]))
  const nameBrgy = new Map(data.residents.map((r) => [r.name, r.barangay]))
  const where = (x: { residentId?: string; residentName?: string; barangay?: string }) =>
    x.barangay || (x.residentId && brgyOf.get(x.residentId)) || (x.residentName && nameBrgy.get(x.residentName)) || ''
  const all = [...new Set([...barangays, ...data.residents.map((r) => r.barangay)])].filter(Boolean)
  return all.map((b) => {
    const cons = data.consultations.filter((c) => c.date >= since && where(c) === b)
    const bpHigh = cons.filter((c) => {
      const v = parseBp(c.bp)
      return v && (v[0] >= 140 || v[1] >= 90)
    }).length
    const sugarHigh = cons.filter((c) => (c.bloodSugar ?? 0) >= 126).length
    const deps = data.services.filter((s) => s.barangay === b && s.date <= isoDate() && s.status !== 'CANCELLED').map((s) => s.date).sort()
    return {
      barangay: b,
      residents: data.residents.filter((r) => r.barangay === b && r.status === 'APPROVED').length,
      pending: data.residents.filter((r) => r.barangay === b && r.status === 'PENDING').length,
      consultations: cons.length,
      highBp: bpHigh,
      highSugar: sugarHigh,
      vaccinations: data.vaccinations.filter((v) => v.date >= since && where(v) === b).length,
      medicines: data.dispensings
        .filter((d) => d.status === 'COMPLETED' && d.date >= since && where(d) === b)
        .reduce((a, d) => a + d.items.reduce((s, i) => s + i.qty, 0), 0),
      appointments: data.appointments.filter((a) => a.status !== 'CANCELLED' && a.date >= isoDate() && where(a) === b).length,
      lastDeployment: deps.length ? deps[deps.length - 1] : null,
    }
  })
}

export interface Recommendation {
  barangay: string
  score: number
  reasons: string[]
  services: string[]
  medicines: { id: string; label: string; qty: number }[]
}
/** Smart Deployment Recommendation: rank barangays for the next Rolling Botika visits. */
export function recommendDeployments(data: Data, barangays: string[]): Recommendation[] {
  const stats = barangayStats(data, barangays)
  const upcoming = new Set(data.services.filter((s) => s.date > isoDate() && s.status === 'SCHEDULED').map((s) => s.barangay))
  return stats
    .map((s) => {
      const reasons: string[] = []
      const daysSince = s.lastDeployment ? Math.floor((Date.now() - new Date(s.lastDeployment + 'T00:00:00').getTime()) / 86400000) : 120
      let score = 0
      score += Math.min(daysSince, 120) * 0.4
      if (daysSince >= 30) reasons.push(s.lastDeployment ? `No visit in ${daysSince} days` : 'No recorded visit yet')
      score += s.highBp * 6 + s.highSugar * 6
      if (s.highBp) reasons.push(`${s.highBp} high blood-pressure reading${s.highBp > 1 ? 's' : ''}`)
      if (s.highSugar) reasons.push(`${s.highSugar} high blood-sugar result${s.highSugar > 1 ? 's' : ''}`)
      score += s.appointments * 5
      if (s.appointments) reasons.push(`${s.appointments} pre-booked appointment${s.appointments > 1 ? 's' : ''}`)
      score += s.residents * 1.5 + s.medicines * 0.05
      if (s.pending) reasons.push(`${s.pending} resident${s.pending > 1 ? 's' : ''} awaiting verification`)
      if (upcoming.has(s.barangay)) {
        score *= 0.35
        reasons.push('Already has an upcoming deployment')
      }
      const services = ['Free Consultation', 'Medicine Distribution']
      if (s.highSugar || s.consultations === 0) services.push('Rapid Blood Sugar Screening')
      if (s.vaccinations === 0) services.push('Vaccination')
      // medicine load: most dispensed medicines overall, scaled to barangay size
      const demand = new Map<string, number>()
      for (const d of data.dispensings.filter((x) => x.status === 'COMPLETED'))
        for (const i of d.items) demand.set(i.medicineId, (demand.get(i.medicineId) ?? 0) + i.qty)
      const medicines = [...demand]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id, q]) => {
          const m = data.medicines.find((x) => x.id === id)
          return m && medicineStatus(m) !== 'EXPIRED' ? { id, label: medLabel(m), qty: Math.max(30, Math.round(q * 0.6 + s.residents * 10)) } : null
        })
        .filter(Boolean) as Recommendation['medicines']
      return { barangay: s.barangay, score: Math.round(score), reasons: reasons.length ? reasons : ['Routine coverage'], services, medicines }
    })
    .sort((a, b) => b.score - a.score)
}

/** Label shown instead of "ERROR" for a dispensing that could not be released. */
export function dispenseLabel(status: string, note?: string): string {
  if (status !== 'ERROR') return status
  const n = (note ?? '').toLowerCase()
  if (n.includes('expired')) return 'EXPIRED'
  if (n.includes('verification') || n.includes('not registered') || n.includes('rejected')) return 'NOT ELIGIBLE'
  return 'OUT OF STOCK'
}
/** Extra detail worth showing under the label (hidden when it only repeats it). */
export function dispenseNote(note?: string): string {
  if (!note) return ''
  return /^out of stock\.?$/i.test(note.trim()) ? '' : note
}
