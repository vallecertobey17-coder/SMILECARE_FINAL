import { useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { login, register, accounts, type Session } from '../lib/auth'
import { Logo } from '../components/Layout'
import { MUNICIPALITY } from '../config'

type Mode = 'login' | 'register' | 'forgot'

export default function Login({ onLogin, onBack }: { onLogin: (s: Session) => void; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>(() => (accounts().length ? 'login' : 'register'))
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(true)
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const switchTo = (m: Mode) => {
    setMode(m)
    setErr('')
    setInfo('')
    setPassword('')
    setConfirm('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setInfo('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Please enter a valid email address.')
    if (mode === 'register') {
      if (password.length < 8) return setErr('Password must be at least 8 characters.')
      if (password !== confirm) return setErr('Passwords do not match.')
    }
    if (mode === 'register' && !name.trim()) return setErr('Please enter your full name.')
    setBusy(true)
    try {
      if (mode === 'register') {
        await register(name, email, role, password)
        onLogin(await login(email, password, remember))
      } else {
        onLogin(await login(email, password, remember))
      }
    } catch (ex: any) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  const heading =
    mode === 'login' ? 'Welcome Back!' : mode === 'register' ? 'Create your account' : 'Reset your password'
  const sub =
    mode === 'login'
      ? 'Please enter your details to continue.'
      : mode === 'register'
        ? 'Set up your SMILECare staff account on this device.'
        : 'Password resets are handled by your SMILECare administrator.'

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
          <h1>{heading}</h1>
          <p className="muted">{sub}</p>
          {mode === 'forgot' ? (
            <div className="stack">
              <div className="alert alert-ok">
                For your security, passwords can't be reset from this screen. Contact IT Support or your SMILECare administrator to
                restore access, or create a new staff account on this device.
              </div>
              <button className="btn btn-primary btn-block" onClick={() => switchTo('login')}>
                Back to sign in
              </button>
            </div>
          ) : (
          <form onSubmit={submit} noValidate>
            {mode === 'register' && (
              <div className="grid-2">
                <label className="input-field">
                  <span>Full name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Barbara Pegg" autoComplete="name" />
                </label>
                <label className="input-field">
                  <span>Role / Department</span>
                  <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Family Medicine" />
                </label>
              </div>
            )}
            <label className="input-field">
              <span>Email address</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@smilecare.ph" autoComplete="email" />
            </label>
            <label className="input-field">
              <span>Password</span>
              <div className="pw">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button type="button" className="icon-btn sm" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {mode === 'register' && (
              <label className="input-field">
                <span>Confirm password</span>
                <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
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
            {info && <div className="alert alert-ok">{info}</div>}

            <button className="btn btn-primary btn-block" disabled={busy}>
              <ShieldCheck size={18} />
              {mode === 'login' ? 'Sign in securely' : 'Create account'}
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
        </section>
      </div>
    </div>
  )
}
