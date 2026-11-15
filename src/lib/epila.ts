/* E-Pila (virtual queue) rules shared by staff, resident and the public display board. */
import type { Collections, PriorityType, Ticket, Unit } from './types'
type Data = { [K in keyof Collections]: Collections[K][] }

export const SERVICES = ['Consultation', 'Medicine pickup', 'Screening', 'Vaccination'] as const
export const PRIORITIES: PriorityType[] = ['Senior citizen', 'PWD', 'Pregnant']
export const CUTOFF_MIN = 30 // stop issuing new numbers this many minutes before closing
const DEFAULT_MIN: Record<string, number> = { Consultation: 10, 'Medicine pickup': 3, Screening: 6, Vaccination: 5 }

/** Lane for a ticket (older tickets only have a purpose). */
export function serviceOf(t: Pick<Ticket, 'service' | 'purpose'>): string {
  if (t.service) return t.service
  const p = t.purpose || ''
  if (/medicine|distribution|pickup|refill/i.test(p)) return 'Medicine pickup'
  if (/screen|sugar|check-up|eye|dental/i.test(p)) return 'Screening'
  if (/vaccin/i.test(p)) return 'Vaccination'
  return 'Consultation'
}
const orderOf = (t: Ticket) => t.order ?? t.number
// Priority lane goes first — but a priority ticket that was a no-show waits its turn like everyone else.
const lanePrio = (t: Ticket) => (t.priority && !t.noShows ? 1 : 0)

/** Waiting line for a unit: priority lane first, then by position. */
export function waitingList(data: Data, unitId: string, service?: string) {
  return data.tickets
    .filter((t) => t.unitId === unitId && t.status === 'WAITING' && (!service || serviceOf(t) === service))
    .sort((a, b) => lanePrio(b) - lanePrio(a) || orderOf(a) - orderOf(b))
}
export const servingTicket = (data: Data, unitId: string) => data.tickets.find((t) => t.unitId === unitId && t.status === 'SERVING')

/** Average minutes per person at a unit, from today's completed tickets (falls back to the lane default). */
export function avgMinutes(data: Data, unitId: string, service?: string) {
  const today = new Date().toISOString().slice(0, 10)
  const done = data.tickets.filter((t) => t.unitId === unitId && t.status === 'DONE' && t.calledAt && t.doneAt && t.doneAt.startsWith(today) && (!service || serviceOf(t) === service))
  const mins = done.map((t) => (Date.parse(t.doneAt!) - Date.parse(t.calledAt!)) / 60000).filter((m) => m > 0 && m < 120)
  if (mins.length >= 2) return Math.max(1, Math.round(mins.reduce((a, b) => a + b, 0) / mins.length))
  return service ? DEFAULT_MIN[service] ?? 5 : 5
}

/** People ahead and estimated minutes for a waiting ticket. */
export function positionOf(data: Data, t: Ticket) {
  if (t.status === 'SERVING') return { ahead: 0, minutes: 0 }
  const list = waitingList(data, t.unitId)
  const idx = Math.max(0, list.findIndex((x) => x.id === t.id))
  const serving = servingTicket(data, t.unitId) ? 1 : 0
  const per = avgMinutes(data, t.unitId)
  return { ahead: idx + serving, minutes: (idx + serving) * per }
}

/** True when the unit is closed, or during the last CUTOFF_MIN minutes before its closing time.
 *  (After the posted closing time the unit's own status decides — staff close it when the line is done.) */
export function cutoffReached(u: Unit, now = new Date()) {
  if (u.status === 'CLOSED') return true
  const [h, m] = (u.until || '17:00').split(':').map(Number)
  const close = new Date(now); close.setHours(h, m, 0, 0)
  const t = now.getTime()
  return t >= close.getTime() - CUTOFF_MIN * 60000 && t < close.getTime()
}

export function nextNumber(data: Data, u: Unit) {
  const today = new Date().toISOString().slice(0, 10)
  const nums = data.tickets.filter((t) => t.unitId === u.id && t.createdAt.startsWith(today)).map((t) => t.number)
  return Math.max(u.served, ...nums, 0) + 1
}

/** Order key that puts a no-show 3 places further back in the line (they also lose the priority lane). */
export function pushBackOrder(data: Data, t: Ticket, places = 3) {
  const others = waitingList(data, t.unitId).filter((x) => x.id !== t.id)
  const prio = others.filter((x) => lanePrio(x)).length
  const regular = others.filter((x) => !lanePrio(x))
  if (!regular.length) return orderOf(t)
  const r = Math.max(0, places - prio)
  if (r === 0) return orderOf(regular[0]) - 0.5
  const target = regular[Math.min(r, regular.length) - 1]
  const after = regular[Math.min(r, regular.length)]
  return after ? (orderOf(target) + orderOf(after)) / 2 : orderOf(target) + 1
}

/** Today's queue stats for reports. */
export function queueStats(data: Data, unitId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const t = data.tickets.filter((x) => x.unitId === unitId && x.createdAt.startsWith(today))
  const done = t.filter((x) => x.status === 'DONE')
  const waits = done.filter((x) => x.calledAt).map((x) => (Date.parse(x.calledAt!) - Date.parse(x.createdAt)) / 60000).filter((m) => m >= 0 && m < 600)
  return {
    issued: t.length,
    served: done.length,
    noShows: t.filter((x) => x.status === 'NO_SHOW').length,
    priority: t.filter((x) => x.priority).length,
    avgWait: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null,
    avgService: avgMinutes(data, unitId),
  }
}

/** Older saved data only kept a counter; create walk-in tickets so the line matches the "In queue" count. */
export function missingTickets(data: Data): Omit<Ticket, 'id'>[] {
  const out: Omit<Ticket, 'id'>[] = []
  const names = ['Rodel Bautista', 'Cristina Aquino', 'Mario Dizon', 'Jocelyn Ramos', 'Antonio Reyes', 'Liza Mercado', 'Ramon Garcia', 'Teresa Navarro', 'Benjamin Cruz', 'Gloria Fernandez', 'Ernesto Villanueva', 'Nida Castillo']
  for (const u of data.units) {
    if (u.status === 'CLOSED') continue
    const have = waitingList(data, u.id).length
    if (have >= u.queue) continue
    let n = Math.max(nextNumber(data, u), ...data.tickets.filter((t) => t.unitId === u.id).map((t) => t.number + 1))
    const lanes = ['Consultation', 'Medicine pickup', 'Screening']
    for (let i = have; i < u.queue; i++, n++) out.push({ unitId: u.id, unitName: u.name, number: n, residentId: '', residentName: names[n % names.length], purpose: lanes[i % 3], service: lanes[i % 3], status: 'WAITING', walkIn: true, createdAt: new Date().toISOString() })
  }
  return out
}
