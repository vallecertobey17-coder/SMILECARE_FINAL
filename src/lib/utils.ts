import type { Medicine, MedicineStatus, Service } from './types'
import { getCapability } from './store'

export const today = () => new Date()
export const isoDate = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export function medicineStatus(m: Medicine, now = new Date()): MedicineStatus {
  if (m.stock <= 0) return 'OUT OF STOCK'
  const days = daysToExpiry(m, now)
  if (days < 0) return 'EXPIRED'
  if (m.stock <= m.reorderLevel) return 'LOW STOCK'
  if (days <= 30) return 'EXPIRING SOON'
  return 'GOOD'
}
export function daysToExpiry(m: Medicine, now = new Date()) {
  if (!/^\d{4}-\d{2}$/.test(m.expiry)) return Infinity
  const [y, mo] = m.expiry.split('-').map(Number)
  return Math.ceil((new Date(y, mo, 0).getTime() - now.getTime()) / 86400000)
}

export const fmtNum = (n: number) => n.toLocaleString('en-PH')
export const fmtPeso = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtDate = (s: string) => {
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s)
  return isNaN(+d) ? s : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
export const fmtTime = (hm: string) => {
  const [h, m] = hm.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return m ? `${hh}:${String(m).padStart(2, '0')} ${ap}` : `${hh} ${ap}`
}
export const fmtSchedule = (s: Service) => `${fmtDate(s.date)} ${fmtTime(s.start)} – ${fmtTime(s.end)}`
export const initials = (name: string) => {
  const parts = name.replace(/^(Dr\.|Dra\.)\s*/i, '').replace(/,.*$/, '').split(/\s+/).filter((p) => p && !/^[A-Z]\.$/.test(p))
  const pick = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  return pick.map((p) => p[0]!.toUpperCase()).join('')
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

/** Save a file via the platform's downloads capability, falling back to a normal browser download. */
export async function saveFile(filename: string, data: string, mime = 'text/plain') {
  const dl = await getCapability<any>('downloads')
  if (dl?.save) {
    await dl.save({ filename, data })
    return 'saved'
  }
  const blob = new Blob([data], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  return 'saved'
}

export const BARANGAYS = ['Dolores', 'San Juan', 'San Isidro', 'Sta. Ana', 'Muzon']
