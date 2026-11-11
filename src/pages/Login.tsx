import { useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Upload, UserRound, Stethoscope } from 'lucide-react'
import { checkPassword, createAccount, findAccount, normEmail, saveSession, type AccountKind, type Session } from '../lib/auth'
import { useStore } from '../lib/store'
import { Logo } from '../components/Layout'
import { BARANGAYS, isoDate } from '../lib/utils'
import { DEMO_PASSWORD } from '../lib/seed'
import { PROJECT, MUNICIPALITY } from '../config'
import type { StaffRole } from '../lib/types'

type Mode = 'login' | 'register' | 'forgot'

/** Downscale an uploaded ID photo so it fits in a database record. */
async function compressImage(file: File): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) return undefined
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const scale = Math.min(1, 640 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return undefined
  } finally {
    URL.revokeObjectURL(url)
  }
}

const DEMOS: { label: string; email: string; kind: AccountKind; name: string }[] = [
  { label: 'Resident', email: 'aj@smilecare.demo', kind: 'resident', name: 'AJ F. Alanzalon' },
  { label: 'Administrator', email: 'admin@smilecare.demo', kind: 'staff', name: 'Juan Santos' },
  { label: 'Doctor', email: 'doctor@smilecare.demo', kind: 'staff', name: 'Dr. Barbara Pegg' },
  { label: 'Pharmacist', email: 'pharmacist@smilecare.demo', kind: 'staff', name: 'Ana Reyes, RPh' },
  { label: 'Rolling Botika Staff', email: 'botika@smilecare.demo', kind: 'staff', name: 'Mark Villanueva' },
]

export default function Login({ onLogin, onBack, initialKind = 'resident' }: { onLogin: (s: Session) => void; onBack: () => void; initialKind?: AccountKind }) {
  const { data, add, log, setActor, loaded } = useStore()
  const [kind, setKind] = useState<AccountKind>(initialKind)
  const [mode, setMode] = useState<Mode>('login')
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', barangay: BARANGAYS[0], birthdate: '', contact: '', address: '' })
  const [doc, setDoc] = useState<{ name: string; data?: string } | null>(null)
  const [remember, setRemember] = useState(true)
  const [show, setShow] = useState(false)
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  const switchTo = (m: Mode) => {
    setMode(m)
    setErr('')
    set('password', '')
    set('confirm', '')
  }

  /** Build the session from the shared records (staff roster / resident record). */
  async function finish(email: string, accKind: AccountKind, name: string, residentId?: string): Promise<Session> {
    const e = normEmail(email)
    if (accKind === 'staff') {
      let member = data.staff.find((s) => normEmail(s.email) === e)
      if (!member && data.staff.length === 0) {
        // First staff account in a new workspace becomes the Administrator.
        await add('staff', { name, email: e, role: 'Administrator', active: true, title: 'System Administrator' })
        member = { id: '', name, email: e, role: 'Administrator', active: true }
      }
      if (!member) throw new Error("This email isn't on the SMILECare staff roster. Ask your Administrator to add you under Staff & Roles.")
      if (!member.active) throw new Error('Your staff access has been deactivated. Please contact your Administrator.')
      return { kind: 'staff', name: member.name, email: e, role: member.role as StaffRole, title: member.title }
    }
    const r = data.residents.find((x) => x.id === residentId) ?? data.residents.find((x) => normEmail(x.email ?? '') === e)
    if (!r) throw new Error('No resident record is linked to this account. Please register again or visit the Municipal Health Office.')
    return { kind: 'resident', name: r.name, email: e, role: 'Resident', residentId: r.id }
  }

  function done(s: Session) {
    saveSession(s, remember)
    setActor({ name: s.name, role: s.role })
    log('login', 'session', `${s.name} signed in (${s.role})`)
    onLogin(s)
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setErr('')
    if (!loaded) return setErr('Still connecting to SMILECare. Please try again in a moment.')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Please enter a valid email address.')
    setBusy(true)
    try {
      if (mode === 'login') {
        const acc = await checkPassword(f.email, f.password)
        return done(await finish(acc.email, acc.kind, acc.name, acc.residentId))
      }
      // register
      if (!f.name.trim()) throw new Error('Please enter your full name.')
      if (f.password.length < 8) throw new Error('Password must be at least 8 characters.')
      if (f.password !== f.confirm) throw new Error('Passwords do not match.')
      if (findAccount(f.email)) throw new Error('An account with this email already exists on this device. Please sign in.')
      if (kind === 'staff') {
        const s = await finish(f.email, 'staff', f.name.trim())
        await createAccount({ kind: 'staff', name: s.name, email: f.email, password: f.password })
        return done(s)
      }
      if (!f.birthdate) throw new Error('Please enter your date of birth.')
      if (!doc) throw new Error('Please upload a valid ID or barangay certificate for verification.')
      if (!agree) throw new Error('Please agree to the data privacy notice to continue.')
      const e = normEmail(f.email)
      let resident = data.residents.find((r) => normEmail(r.email ?? '') === e)
      if (!resident) {
        const year = new Date().getFullYear()
        const nums = data.residents.map((r) => parseInt(r.healthId.split('-').pop() || '0', 10)).filter((n) => !isNaN(n))
        const healthId = `SC-TAY-${year}-${String((nums.length ? Math.max(...nums) : 18000) + 1).padStart(6, '0')}`
        setActor({ name: f.name.trim(), role: 'Resident' })
        const id = await add('residents', {
          name: f.name.trim(),
          healthId,
          barangay: f.barangay,
          status: 'PENDING',
          registered: isoDate(),
          birthdate: f.birthdate,
          contact: f.contact.trim(),
          address: f.address.trim(),
          email: e,
          idDocument: doc.name,
          idDocumentData: doc.data,
        })
        resident = { id, name: f.name.trim(), healthId, barangay: f.barangay, status: 'PENDING', registered: isoDate() }
      }
      await createAccount({ kind: 'resident', name: resident.name, email: e, password: f.password, residentId: resident.id })
      done({ kind: 'resident', name: resident.name, email: e, role: 'Resident', residentId: resident.id })
    } catch (ex: any) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  async function demo(d: (typeof DEMOS)[number]) {
    setErr('')
    if (!loaded) return setErr('Still connecting to SMILECare. Please try again in a moment.')
    try {
      const resident = d.kind === 'resident' ? data.residents.find((r) => normEmail(r.email ?? '') === d.email) : undefined
      if (d.kind === 'resident' && !resident) throw new Error('The demo resident record is missing from the database.')
      if (!findAccount(d.email)) await createAccount({ kind: d.kind, name: d.name, email: d.email, password: DEMO_PASSWORD, residentId: resident?.id })
      const acc = await checkPassword(d.email, DEMO_PASSWORD)
      done(await finish(acc.email, acc.kind, acc.name, acc.residentId ?? resident?.id))
    } catch (ex: any) {
      setErr(ex.message)
    }
  }

  const isRes = kind === 'resident'
  const heading = mode === 'login' ? 'Welcome Back!' : mode === 'register' ? (isRes ? 'Create your resident account' : 'Create your staff account') : 'Forgot your password?'
  const sub =
    mode === 'login'
      ? 'Please enter your details to continue.'
      : mode === 'register'
        ? isRes
          ? `Register and verify that you're a resident of ${MUNICIPALITY} to access SMILECare services.`
          : 'Your email must be on the staff roster. Your role is assigned by the Administrator.'
        : 'Password resets are handled by the SMILECare IT support team.'

  return (
    <div className="auth-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Homepage
      </button>
      <div className="auth-card">
        <section className="auth-hero">
          <Logo light />
          <div className="auth-hero-copy">
            <h2>Your health journey starts here.</h2>
            <p>Connect with {MUNICIPALITY}'s health services wherever you are.</p>
          </div>
          <blockquote>
            <p>“Hindi na kailangang pumila nang matagal. Malaking tulong sa aming seniors.”</p>
            <cite>— Aling Lorna, Brgy. Dolores</cite>
          </blockquote>
        </section>

        <section className="auth-form">
          <div className="seg" role="tablist" aria-label="Account type">
            <button role="tab" aria-selected={isRes} className={isRes ? 'on' : ''} onClick={() => { setKind('resident'); setErr('') }}>
              <UserRound size={18} /> Resident
            </button>
            <button role="tab" aria-selected={!isRes} className={!isRes ? 'on' : ''} onClick={() => { setKind('staff'); setErr('') }}>
              <Stethoscope size={18} /> Health Personnel
            </button>
          </div>
          <h1>{heading}</h1>
          <p className="muted">{sub}</p>

          {mode === 'forgot' ? (
            <div className="stack">
              <div className="alert alert-ok">
                For your security, passwords can't be reset from this screen. Contact IT Support at {PROJECT.supportEmail} or {PROJECT.supportPhone}, or visit the
                Municipal Health Office with a valid ID.
              </div>
              <button className="btn btn-primary btn-block" onClick={() => switchTo('login')}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              {mode === 'register' && (
                <label className="input-field">
                  <span>Full name</span>
                  <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Juan F. Dela Cruz" autoComplete="name" />
                </label>
              )}
              <label className="input-field">
                <span>Email address</span>
                <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </label>
              {mode === 'register' && isRes && (
                <>
                  <div className="grid-2">
                    <label className="input-field">
                      <span>Barangay</span>
                      <select value={f.barangay} onChange={(e) => set('barangay', e.target.value)}>
                        {BARANGAYS.map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                    </label>
                    <label className="input-field">
                      <span>Date of birth</span>
                      <input type="date" value={f.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
                    </label>
                  </div>
                  <div className="grid-2">
                    <label className="input-field">
                      <span>Mobile number</span>
                      <input value={f.contact} onChange={(e) => set('contact', e.target.value)} placeholder="09__ ___ ____" autoComplete="tel" />
                    </label>
                    <label className="input-field">
                      <span>Address</span>
                      <input value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="House no., street, purok" />
                    </label>
                  </div>
                  <label className="upload">
                    <Upload size={20} />
                    <span>
                      <b>{doc ? doc.name : 'Upload a valid ID or barangay certificate'}</b>
                      <small>{doc ? 'Tap to replace' : 'Photo or PDF • reviewed by the Municipal Health Office'}</small>
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) setDoc({ name: file.name, data: await compressImage(file) })
                      }}
                    />
                  </label>
                </>
              )}
              <label className="input-field">
                <span>Password</span>
                <div className="pw">
                  <input type={show ? 'text' : 'password'} value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  <button type="button" className="icon-btn sm" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {mode === 'register' && (
                <label className="input-field">
                  <span>Confirm password</span>
                  <input type={show ? 'text' : 'password'} value={f.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </label>
              )}
              {mode === 'register' && isRes && (
                <label className="check">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree that the Municipality of {MUNICIPALITY} may process my information under the Data Privacy Act of 2012.
                </label>
              )}
              {mode === 'login' && (
                <div className="auth-row">
                  <label className="check">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
                  </label>
                  <button type="button" className="link" onClick={() => switchTo('forgot')}>
                    Forgot Password?
                  </button>
                </div>
              )}
              {err && <div className="alert alert-err">{err}</div>}
              <button className="btn btn-primary btn-block" disabled={busy}>
                <ShieldCheck size={18} />
                {mode === 'login' ? 'Sign in securely' : isRes ? 'Submit for verification' : 'Create staff account'}
              </button>
            </form>
          )}
          <p className="auth-switch">
            {mode === 'login' ? (
              <>
                New to SMILECare?{' '}
                <button className="link" onClick={() => switchTo('register')}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className="link" onClick={() => switchTo('login')}>
                  Sign in
                </button>
              </>
            )}
          </p>
          {mode === 'login' && (
            <div className="demo-box">
              <span className="muted small">Demo accounts for presentations</span>
              <div className="demo-chips">
                {DEMOS.map((d) => (
                  <button key={d.email} className="chip" onClick={() => demo(d)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
