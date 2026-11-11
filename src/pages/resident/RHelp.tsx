import { useState, type FormEvent } from 'react'
import { Mail, MapPin, Phone, Clock, Send } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useResident } from './context'
import { Field, useToast } from '../../components/ui'
import { PROJECT } from '../../config'

const FIXES = [
  { q: "I can't book or join E-Pila", a: 'These unlock once your residency is verified. Check your status under Profile & QR ID.' },
  { q: 'The app says "Offline"', a: 'Your changes are kept on this device and sync automatically when your connection returns.' },
  { q: 'I forgot my password', a: 'Contact IT support below or visit the Municipal Health Office with a valid ID.' },
  { q: 'My Health ID QR will not scan', a: 'Turn up your screen brightness, or show your Health ID number to the staff.' },
]

export default function RHelp() {
  const { add } = useStore()
  const { resident } = useResident()
  const toast = useToast()
  const [f, setF] = useState({ name: resident.name, mobile: resident.contact ?? '', address: resident.address ?? '', email: resident.email ?? '', message: '' })
  const [sent, setSent] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.message.trim()) return toast('Please type your message', 'err')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast('Please enter a valid email', 'err')
    try {
      await add('support', { name: f.name.trim(), email: f.email.trim(), mobile: f.mobile.trim(), address: f.address.trim(), message: f.message.trim(), createdAt: new Date().toISOString(), status: 'OPEN' })
      setSent(true)
      set('message', '')
      toast('Message sent to IT support')
    } catch (ex: any) {
      toast(ex.message, 'err')
    }
  }

  return (
    <div className="page rpage">
      <div className="page-head">
        <div>
          <h1 className="rtitle">Need help?</h1>
          <p>Find quick fixes for common technical issues or contact our IT support team for one-to-one help.</p>
        </div>
      </div>
      <div className="help-grid">
        <div className="stack">
          <section className="card contact-card">
            <h3>Contact us</h3>
            <p className="muted small">Have a question or need assistance? Contact us using the details below or submit a support request through the form.</p>
            <div className="contact-row"><MapPin size={20} /><span>{PROJECT.supportAddress}</span></div>
            <div className="contact-row"><Phone size={20} /><span>{PROJECT.supportPhone}</span></div>
            <div className="contact-row"><Mail size={20} /><span>{PROJECT.supportEmail}</span></div>
            <div className="contact-row"><Clock size={20} /><span>Support hours {PROJECT.supportHours}</span></div>
          </section>
          <section className="card">
            <h3>Quick fixes</h3>
            {FIXES.map((x) => (
              <details key={x.q} className="faq">
                <summary>{x.q}</summary>
                <p className="muted">{x.a}</p>
              </details>
            ))}
          </section>
        </div>
        <form className="card stack" onSubmit={submit} noValidate>
          <h3>Send a support request</h3>
          <p className="muted small">Please leave us a message, and our support team will get back to you as soon as possible.</p>
          <div className="form-grid">
            <Field label="Full name"><input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Mobile Number"><input value={f.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="09__ - ___-___" /></Field>
            <Field label="Address"><input value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Email"><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="example@gmail.com" /></Field>
          </div>
          <Field label="Message">
            <textarea rows={5} value={f.message} onChange={(e) => set('message', e.target.value)} placeholder="Type your message..." />
          </Field>
          {sent && <div className="alert alert-ok">Thanks! Your message was sent. The support team will reply by email or phone.</div>}
          <button className="btn btn-primary">
            <Send size={17} /> Submit
          </button>
        </form>
      </div>
    </div>
  )
}
