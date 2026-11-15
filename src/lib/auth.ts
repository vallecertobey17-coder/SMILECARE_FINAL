// Sign-in for staff and residents. Credentials are kept in this browser only
// (password stored as a salted SHA-256 hash). Staff roles come from the shared
// staff roster (role-based access control); residents are linked to their
// resident record.
import type { StaffRole } from './types'

export type AccountKind = 'staff' | 'resident'
export interface Account {
  kind: AccountKind
  name: string
  email: string
  salt: string
  hash: string
  residentId?: string
}
export interface Session {
  kind: AccountKind
  name: string
  email: string
  role: StaffRole | 'Resident'
  title?: string
  residentId?: string
}

const ACC = 'smilecare:accounts:v2'
const SES = 'smilecare:session:v2'

function read<T>(store: Storage | undefined, key: string): T | null {
  try {
    const v = store?.getItem(key)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}
function write(store: Storage | undefined, key: string, v: unknown) {
  try {
    if (v === null) store?.removeItem(key)
    else store?.setItem(key, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}
const ls = () => (typeof localStorage !== 'undefined' ? localStorage : undefined)
const ss = () => (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined)

async function hash(password: string, salt: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + password))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const normEmail = (e: string) => e.trim().toLowerCase()
export const accounts = () => read<Account[]>(ls(), ACC) ?? []
export const findAccount = (email: string) => accounts().find((a) => a.email === normEmail(email))

export async function createAccount(a: { kind: AccountKind; name: string; email: string; password: string; residentId?: string }) {
  const list = accounts()
  const e = normEmail(a.email)
  if (list.some((x) => x.email === e)) throw new Error('An account with this email already exists on this device. Please sign in.')
  const salt = Math.random().toString(36).slice(2)
  const acc: Account = { kind: a.kind, name: a.name.trim(), email: e, salt, hash: await hash(a.password, salt), residentId: a.residentId }
  write(ls(), ACC, [...list, acc])
  return acc
}

export async function checkPassword(email: string, password: string): Promise<Account> {
  const acc = findAccount(email)
  if (!acc || (await hash(password, acc.salt)) !== acc.hash) throw new Error('Incorrect email or password.')
  return acc
}

export function saveSession(s: Session, remember: boolean) {
  write(remember ? ls() : ss(), SES, s)
}
export function updateSession(patch: Partial<Session>) {
  for (const st of [ls(), ss()]) {
    const s = read<Session>(st, SES)
    if (s) write(st, SES, { ...s, ...patch })
  }
  const list = accounts()
  const cur = currentSession()
  const acc = cur && list.find((a) => a.email === cur.email)
  if (acc && patch.name) {
    acc.name = patch.name
    write(ls(), ACC, list)
  }
}
export const currentSession = () => read<Session>(ss(), SES) ?? read<Session>(ls(), SES)
export function logout() {
  write(ls(), SES, null)
  write(ss(), SES, null)
}

/* ---------- role-based access ---------- */
export type Permission =
  | 'dashboard'
  | 'residents'
  | 'inventory'
  | 'services'
  | 'dispensing'
  | 'consultations'
  | 'vaccinations'
  | 'botika'
  | 'announcements'
  | 'analytics'
  | 'staff'
  | 'backup'

export const ROLE_ACCESS: Record<StaffRole, Permission[]> = {
  Administrator: ['dashboard', 'residents', 'inventory', 'services', 'dispensing', 'consultations', 'vaccinations', 'botika', 'announcements', 'analytics', 'staff', 'backup'],
  // Manuscript UML: the Doctor uses Dashboard, Health Services & Schedule, Appointment, Health Records,
  // Medicine Inventory (view + requirements) and Analytics & Reports — no Resident Records or Announcements.
  'Municipal Health Doctor': ['dashboard', 'inventory', 'services', 'consultations', 'vaccinations', 'analytics'],
  Pharmacist: ['dashboard', 'residents', 'inventory', 'dispensing', 'botika', 'analytics'],
  'Rolling Botika Staff': ['dashboard', 'residents', 'inventory', 'dispensing', 'consultations', 'botika'],
}
/* Actions that write data. Page access (above) lets a role open a page; these decide what it may change there.
   DFD 4.0 Record Health Service: medical assessments, consultations and service updates come from the Doctor
   (and field screenings from Rolling Botika Staff) — the Municipal Health Office Staff (Administrator) only
   receives the health-service record, so health records are view-only for the Administrator.
   DFD 1.0 / 3.0: resident verification and announcements belong to the Municipal Health Office Staff. */
export type Action = 'record-consultation' | 'record-vaccination' | 'verify-resident' | 'post-announcement' | 'register-walkin' | 'manage-inventory'
export const ROLE_ACTIONS: Record<StaffRole, Action[]> = {
  Administrator: ['verify-resident', 'post-announcement', 'register-walkin', 'manage-inventory'],
  'Municipal Health Doctor': ['record-consultation', 'record-vaccination'],
  Pharmacist: ['register-walkin', 'manage-inventory'],
  'Rolling Botika Staff': ['record-consultation', 'register-walkin', 'manage-inventory'],
}
export const canAct = (s: Session | null, a: Action) => !!s && s.kind === 'staff' && !!ROLE_ACTIONS[s.role as StaffRole]?.includes(a)
export const can = (s: Session | null, p: Permission) => !!s && s.kind === 'staff' && ROLE_ACCESS[s.role as StaffRole]?.includes(p)
