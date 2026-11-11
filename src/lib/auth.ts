// Staff sign-in for this device. Accounts are kept in this browser only
// (password stored as a salted SHA-256 hash). Access to the shared data itself
// is controlled by who the SMILECare page is shared with on claude.ai.
export interface Account {
  name: string
  email: string
  role: string
  salt: string
  hash: string
}
export interface Session {
  name: string
  email: string
  role: string
}

const ACC = 'smilecare:accounts'
const SES = 'smilecare:session'

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

export const accounts = () => read<Account[]>(ls(), ACC) ?? []

export async function register(name: string, email: string, role: string, password: string) {
  const list = accounts()
  const e = email.trim().toLowerCase()
  if (list.some((a) => a.email === e)) throw new Error('An account with this email already exists on this device.')
  const salt = Math.random().toString(36).slice(2)
  const acc: Account = { name: name.trim(), email: e, role: role.trim() || 'Health Worker', salt, hash: await hash(password, salt) }
  write(ls(), ACC, [...list, acc])
  return acc
}

export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  const e = email.trim().toLowerCase()
  const acc = accounts().find((a) => a.email === e)
  if (!acc || (await hash(password, acc.salt)) !== acc.hash) throw new Error('Incorrect email or password.')
  const s: Session = { name: acc.name, email: acc.email, role: acc.role }
  write(remember ? ls() : ss(), SES, s)
  return s
}

export function updateProfile(email: string, patch: { name?: string; role?: string }) {
  const list = accounts()
  const acc = list.find((a) => a.email === email)
  if (acc) {
    Object.assign(acc, patch)
    write(ls(), ACC, list)
  }
  for (const st of [ls(), ss()]) {
    const s = read<Session>(st, SES)
    if (s && s.email === email) write(st, SES, { ...s, ...patch })
  }
}

export const currentSession = () => read<Session>(ss(), SES) ?? read<Session>(ls(), SES)
export function logout() {
  write(ls(), SES, null)
  write(ss(), SES, null)
}
