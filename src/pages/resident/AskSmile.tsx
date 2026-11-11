import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, Square, AlertTriangle } from 'lucide-react'
import { getCapability, useStore } from '../../lib/store'
import { useResident } from './context'
import { fmtDate, fmtTime, isoDate, medicineStatus } from '../../lib/utils'
import { medLabel } from '../../lib/domain'

type Msg = { role: 'user' | 'assistant'; content: string }
const CHIPS = ['Rolling Botika Schedule', 'Refill my medicine', 'Book a consultation', 'What is Losartan for?']
const EMERGENCY = /(chest pain|can't breathe|cannot breathe|difficulty breathing|unconscious|seizure|stroke|heavy bleeding|suicid|overdose|nalason|hindi makahinga)/i

export default function AskSmile() {
  const { data } = useStore()
  const { resident } = useResident()
  const first = resident.name.split(' ')[0]
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: `Magandang araw, ${first}! Ako si SMILE, ang iyong AI health assistant. Paano kita matutulungan ngayon?` }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState<null | ((input: any, opts?: any) => Promise<{ text: string }>)>(null)
  const ctl = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    getCapability<any>('sample').then((s) => alive && s && setAi(() => s))
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs])

  /* ---- live SMILECare data the assistant may use ---- */
  const today = isoDate()
  const schedules = data.services
    .filter((s) => s.date >= today && s.status !== 'CANCELLED' && s.status !== 'COMPLETED')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)
  const availability = (medId: string) =>
    data.units
      .filter((u) => u.status !== 'CLOSED' || u.stock)
      .map((u) => ({ where: u.name, qty: u.stock ? u.stock[medId] ?? 0 : data.medicines.find((m) => m.id === medId)?.stock ?? 0 }))
      .filter((x) => x.qty > 0)
  const medicines = data.medicines.filter((m) => medicineStatus(m) !== 'EXPIRED')
  const myAppts = data.appointments.filter((a) => a.residentId === resident.id && a.status !== 'CANCELLED' && a.date >= today)

  function context() {
    return [
      `Today is ${fmtDate(today)}. Resident: ${first}, Barangay ${resident.barangay}, verification status ${resident.status}.`,
      'MEDICINES (name | purpose | basic usage | where available today):',
      ...medicines.map((m) => `- ${medLabel(m)} | ${m.purpose ?? ''} | ${m.usage ?? ''} | ${availability(m.id).map((a) => `${a.where}: ${a.qty} ${m.unit}`).join('; ') || 'not available right now'}`),
      'UPCOMING ROLLING BOTIKA / HEALTH SERVICE SCHEDULES:',
      ...schedules.map((s) => `- ${fmtDate(s.date)} ${fmtTime(s.start)}-${fmtTime(s.end)} | ${s.name} | ${s.location} (Brgy. ${s.barangay ?? '-'}) | ${Math.max(0, s.capacity - s.booked)} slots left`),
      'KNOWLEDGE BASE (approved answers from the Municipal Health Office):',
      ...data.knowledge.map((k) => `- Q: ${k.question} A: ${k.answer}`),
      "RESIDENT'S UPCOMING BOOKINGS:",
      ...(myAppts.length ? myAppts.map((a) => `- ${a.ref} ${a.serviceName ?? 'Medicine request'} on ${fmtDate(a.date)} ${a.time ?? ''} at ${a.location} (${a.status})`) : ['- none']),
    ].join('\n')
  }

  const RULES = () =>
    `You are SMILE, the friendly AI health assistant of SMILECare, the health information system of the Municipality of Taytay, Rizal (Philippines) for its Rolling Botika mobile healthcare program.
Answer in the language the resident uses (English, Filipino or Taglish). Keep answers short (under 120 words), warm and clear, using simple bullet points when listing.
You give GENERAL information only: Rolling Botika schedules, available medicines, their recorded purpose and basic usage, and how to use SMILECare (booking in "Appointment & E-Pila", Health ID under "Profile & QR ID", history under "Health History").
Never diagnose, never recommend a medicine or dose for a person's symptoms, and never act as a prescription. For symptoms, advise seeing a doctor at a free consultation. Prescription medicines (e.g. antibiotics) need a doctor's prescription.
If there are signs of an emergency, tell them to call 911 or go to the nearest hospital right away.
Only use the SMILECare data below for availability and schedules; if something is not in it, say you don't have that information.

SMILECARE DATA
${context()}`

  /** Built-in answers when AI is unavailable (e.g. the public demo site). */
  function localAnswer(q: string): string {
    const t = q.toLowerCase()
    if (EMERGENCY.test(q)) return 'This sounds like it could be an emergency. Please call 911 or go to the nearest hospital right away.'
    const kb = data.knowledge
      .map((k) => ({ k, hits: k.keywords.split(',').map((w) => w.trim().toLowerCase()).filter((w) => w && t.includes(w)).length + (t.includes(k.question.toLowerCase().replace(/\?$/, '')) ? 3 : 0) }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)[0]
    const med = medicines.find((m) => t.includes(m.name.toLowerCase().split(' ')[0]))
    if (med) {
      const av = availability(med.id)
      return `${medLabel(med)} — ${med.purpose ?? 'no recorded purpose'}.\n${med.usage ? `Basic usage: ${med.usage}\n` : ''}${av.length ? `Available at: ${av.map((a) => `${a.where} (${a.qty})`).join(', ')}.` : 'It is not available at any site right now.'}\nThis is general information only — please follow your doctor's advice.`
    }
    if (kb && !/sched|kailan|when|where|saan|next visit/.test(t)) return kb.k.answer
    if (/sched|botika|kailan|when|where|saan|visit/.test(t))
      return schedules.length
        ? `Upcoming Rolling Botika and health services:\n${schedules.slice(0, 5).map((s) => `• ${fmtDate(s.date)}, ${fmtTime(s.start)}–${fmtTime(s.end)}: ${s.name} at ${s.location}`).join('\n')}\nSee all in Schedule.`
        : 'There are no upcoming schedules yet. Please check Announcements for updates.'
    if (/refill|request|gamot|medicine|reseta/.test(t))
      return 'To refill or request a medicine, open "Appointment & E-Pila", choose "Request Medicine", pick your pickup location and the medicines you need. The pharmacist will confirm your order. Bring your ID and prescription, if required.'
    if (/book|consult|appoint|doctor|check.?up|pa-?check/.test(t))
      return 'To book a free consultation, open "Appointment & E-Pila", choose "Book Appointment", then pick a service and an available time slot. You will get a reference number right away.'
    if (/e-?pila|queue|pila|number/.test(t))
      return 'To get a queue number, open "Appointment & E-Pila" → "My E-Pila", choose the Rolling Botika site and tap "Get my number". You can follow the line from your phone.'
    if (/qr|health id|id/.test(t)) return 'Your digital Health ID and QR code are under "Profile & QR ID". Show it to the staff at the Rolling Botika.'
    return "I can help with Rolling Botika schedules, available medicines and their general purpose, booking a consultation, requesting medicine, and E-Pila queue numbers. For symptoms, please see a doctor at a free consultation."
  }

  async function ask(text: string) {
    const q = text.trim()
    if (!q || busy) return
    const history: Msg[] = [...msgs, { role: 'user', content: q }]
    setMsgs([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)
    const write = (content: string) => setMsgs((m) => [...m.slice(0, -1), { role: 'assistant', content }])
    if (EMERGENCY.test(q) || !ai) {
      write(localAnswer(q))
      setBusy(false)
      return
    }
    ctl.current = new AbortController()
    try {
      // The conversation the page keeps: rules + data first, then the last few turns.
      const turns = history.slice(1).slice(-8)
      const { text: answer } = await ai([{ role: 'user', content: RULES() }, ...turns], {
        cache: false,
        modelTier: 'quick',
        signal: ctl.current.signal,
        onText: ({ text: t }: { text: string }) => write(t),
      })
      write(answer)
    } catch (e: any) {
      if (e?.code === 'not_granted' || e?.code === 'sampling_disabled' || e?.code === 'capability_disabled') setAi(null)
      if (e?.code === 'cancelled') write(e.text || '(stopped)')
      else write(e?.text || localAnswer(q))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <div className="page rpage">
      <div className="page-head">
        <div>
          <h1 className="rtitle">Ask SMILE</h1>
          <p>Simple health guidance, available anytime.</p>
        </div>
        <span className="pill pill-no lg">
          <AlertTriangle size={14} /> NOT FOR EMERGENCIES
        </span>
      </div>
      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c} className="chip" onClick={() => ask(c)} disabled={busy}>
            {c}
          </button>
        ))}
      </div>
      <section className="chat card">
        <div className="chat-head">
          <span className="avatar">SC</span>
          <span>
            <b>SMILE Health assistant</b>
            <small className="muted">{ai ? 'Online now • AI powered' : 'Online now'}</small>
          </span>
        </div>
        <div className="chat-body" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.content || <span className="typing">Thinking…</span>}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <p className="chat-note">For emergencies, call 911 or go to the nearest hospital. SMILE gives general information only and does not diagnose or prescribe.</p>
        <form className="chat-input" onSubmit={submit}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your health question...." aria-label="Type your health question" />
          {busy && ai ? (
            <button type="button" className="btn btn-outline" onClick={() => ctl.current?.abort()}>
              <Square size={16} /> Stop
            </button>
          ) : (
            <button className="btn btn-primary" disabled={!input.trim() || busy}>
              <Send size={17} /> Send
            </button>
          )}
        </form>
      </section>
    </div>
  )
}
