import { useMemo, useState } from 'react'
import { Check, Minus, Plus, CalendarCheck, Pill, Ticket as TicketIcon, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useResident } from './context'
import { Icon } from '../../components/Icon'
import { Confirm, Empty, useToast } from '../../components/ui'
import { fmtDate, fmtTime, isoDate, medicineStatus } from '../../lib/utils'
import { medLabel, nextTicketNumber, nowServing } from '../../lib/domain'
import { VerificationBanner } from './shared'
import type { Appointment, Service, Ticket } from '../../lib/types'
import { PROGRAMS } from '../../lib/types'

type Step = 'choose' | 'details' | 'done'

/** 30-minute slots between a service's start and end time. */
function slots(s: Service) {
  const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5))
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const out: string[] = []
  for (let m = toMin(s.start); m + 30 <= toMin(s.end); m += 30) out.push(`${fmtTime(fmt(m)).replace(/ (AM|PM)$/, '')} - ${fmtTime(fmt(m + 30))}`)
  return out
}

export default function RBooking() {
  const [tab, setTab] = useState<'book' | 'epila'>('book')
  return (
    <div className="page rpage">
      <div className="page-head">
        <div>
          <h1 className="rtitle">Appointment &amp; E-Pila</h1>
          <p>Book a service or follow a live queue.</p>
        </div>
      </div>
      <VerificationBanner />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'book'} className={tab === 'book' ? 'on' : ''} onClick={() => setTab('book')}>
          Book Appointment &amp; Request Medicine
        </button>
        <button role="tab" aria-selected={tab === 'epila'} className={tab === 'epila' ? 'on' : ''} onClick={() => setTab('epila')}>
          My E-Pila
        </button>
      </div>
      {tab === 'book' ? <BookFlow /> : <EPila />}
    </div>
  )
}

/* ---------------- booking ---------------- */
function BookFlow() {
  const { data, add, update } = useStore()
  const { resident } = useResident()
  const toast = useToast()
  const verified = resident.status === 'APPROVED'
  const today = isoDate()
  const [step, setStep] = useState<Step>('choose')
  const [wantAppt, setWantAppt] = useState(false)
  const [wantMeds, setWantMeds] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [slot, setSlot] = useState('')
  const [pickupId, setPickupId] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [medSearch, setMedSearch] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [doneRef, setDoneRef] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState<Appointment | null>(null)

  const services = useMemo(
    () => data.services.filter((s) => s.date >= today && (s.status === 'SCHEDULED' || s.status === 'ONGOING') && s.name !== 'Medicine Distribution').sort((a, b) => a.date.localeCompare(b.date)),
    [data.services, today],
  )
  /** Pickup points: Rolling Botika units with stock, plus the health office (central stock). */
  const pickups = useMemo(() => {
    const list = data.units
      .filter((u) => u.status !== 'CLOSED' || u.stock)
      .map((u) => {
        const svc = data.services.filter((s) => s.unitId === u.id && s.date >= today && s.status !== 'CANCELLED' && s.status !== 'COMPLETED').sort((a, b) => a.date.localeCompare(b.date))[0]
        return { id: u.id, name: u.name, location: u.location, date: svc?.date ?? (u.status !== 'CLOSED' ? today : ''), central: !u.stock }
      })
      .filter((p) => p.date)
    return list.sort((a, b) => a.date.localeCompare(b.date))
  }, [data.units, data.services, today])
  const pickup = pickups.find((p) => p.id === pickupId)
  const availableQty = (medId: string) => {
    const u = data.units.find((x) => x.id === pickupId)
    if (!u) return 0
    return u.stock ? u.stock[medId] ?? 0 : data.medicines.find((m) => m.id === medId)?.stock ?? 0
  }
  const meds = data.medicines
    .filter((m) => medicineStatus(m) !== 'EXPIRED')
    .filter((m) => !medSearch || `${m.name} ${m.purpose ?? ''}`.toLowerCase().includes(medSearch.toLowerCase()))
  const service = services.find((s) => s.id === serviceId)
  const taken = new Set(data.appointments.filter((a) => a.serviceId === serviceId && a.status !== 'CANCELLED').map((a) => a.time))
  const totalQty = Object.values(cart).reduce((a, b) => a + b, 0)
  const mine = data.appointments.filter((a) => a.residentId === resident.id).sort((a, b) => b.date.localeCompare(a.date))

  const setQty = (id: string, q: number) => setCart((c) => {
    const next = { ...c }
    if (q <= 0) delete next[id]
    else next[id] = Math.min(q, availableQty(id), 90)
    return next
  })

  function reset() {
    setStep('choose')
    setWantAppt(false)
    setWantMeds(false)
    setServiceId('')
    setSlot('')
    setPickupId('')
    setCart({})
    setNotes('')
    setErr('')
  }

  async function submit() {
    setErr('')
    if (wantAppt && (!service || !slot)) return setErr('Choose a service and a time slot.')
    if (wantMeds && (!pickup || totalQty === 0)) return setErr('Choose a pickup location and at least one medicine.')
    if (service && service.booked >= service.capacity) return setErr('Sorry, this service is fully booked. Please choose another date.')
    setBusy(true)
    try {
      const kind = wantAppt && wantMeds ? 'both' : wantAppt ? 'appointment' : 'medicine'
      const ref = `APT-${String(Date.now()).slice(-6)}`
      const medicines = Object.entries(cart).map(([medicineId, qty]) => ({ medicineId, qty, label: medLabel(data.medicines.find((m) => m.id === medicineId)!) }))
      const appt: Omit<Appointment, 'id'> = {
        ref,
        residentId: resident.id,
        residentName: resident.name,
        barangay: resident.barangay,
        kind,
        ...(service ? { serviceId: service.id, serviceName: service.name, time: slot } : {}),
        date: service?.date ?? pickup!.date,
        location: service?.location ?? pickup!.location,
        ...(medicines.length ? { medicines } : {}),
        // appointments with an open slot are confirmed at once; medicine requests wait for the pharmacist
        status: wantMeds ? 'PENDING' : 'CONFIRMED',
        createdAt: new Date().toISOString(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }
      const id = await add('appointments', appt)
      if (service) await update('services', service.id, { booked: service.booked + 1 })
      setDoneRef({ ...appt, id })
      setStep('done')
      toast('Request submitted')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function cancel(a: Appointment) {
    try {
      await update('appointments', a.id, { status: 'CANCELLED' })
      const s = data.services.find((x) => x.id === a.serviceId)
      if (s && s.booked > 0) await update('services', s.id, { booked: s.booked - 1 })
      toast('Booking cancelled')
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  return (
    <>
      {step === 'choose' && (
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Choose What You Need</h3>
              <p className="muted small">Select one or both options to continue. You may book an appointment, request medicine from Rolling Botika, or do both.</p>
            </div>
          </div>
          <div className="choice-grid">
            <button className={`choice ${wantAppt ? 'on' : ''}`} onClick={() => setWantAppt((v) => !v)} aria-pressed={wantAppt} disabled={!verified}>
              <span className="choice-ic">
                <CalendarCheck size={26} />
              </span>
              <b>Book Appointment</b>
              <small>Schedule a health service.</small>
              <span className="choice-check">{wantAppt && <Check size={16} />}</span>
            </button>
            <button className={`choice ${wantMeds ? 'on' : ''}`} onClick={() => setWantMeds((v) => !v)} aria-pressed={wantMeds} disabled={!verified}>
              <span className="choice-ic">
                <Pill size={26} />
              </span>
              <b>Request Medicine</b>
              <small>Request available medicine from Rolling Botika.</small>
              <span className="choice-check">{wantMeds && <Check size={16} />}</span>
            </button>
          </div>
          <div className="btn-row between">
            <span className="muted small">You can change this selection anytime before submission.</span>
            <button className="btn btn-primary" disabled={!verified || (!wantAppt && !wantMeds)} onClick={() => setStep('details')}>
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'details' && (
        <div className="book-grid">
          <div className="stack">
            {wantAppt && (
              <section className="card">
                <div className="step-head">
                  <span className="step-n">1</span>
                  <h3>Choose a health service</h3>
                </div>
                {services.length === 0 && <Empty text="No services are open for booking right now." />}
                <div className="svc-pick">
                  {services.map((s) => {
                    const full = s.booked >= s.capacity
                    return (
                      <button key={s.id} className={`svc-opt ${serviceId === s.id ? 'on' : ''}`} disabled={full} onClick={() => { setServiceId(s.id); setSlot('') }}>
                        <b>{s.name}</b>
                        <small>
                          {fmtDate(s.date)} • {fmtTime(s.start)} – {fmtTime(s.end)}
                        </small>
                        <small className="muted">{s.location}</small>
                        <span className={`pill ${full ? 'pill-no' : 'pill-ok'}`}>{full ? 'Fully booked' : `${s.capacity - s.booked} slots left`}</span>
                      </button>
                    )
                  })}
                </div>
                {service && (
                  <>
                    <h4 className="mini-title">Pick a time</h4>
                    <div className="slots">
                      {slots(service).map((t) => (
                        <button key={t} className={`slot ${slot === t ? 'on' : ''}`} disabled={taken.has(t)} onClick={() => setSlot(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
            {wantMeds && (
              <section className="card">
                <div className="step-head">
                  <span className="step-n">{wantAppt ? 2 : 1}</span>
                  <h3>Choose medicines</h3>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">Pickup location</span>
                    <select value={pickupId} onChange={(e) => { setPickupId(e.target.value); setCart({}) }}>
                      <option value="">Choose where to pick up…</option>
                      {pickups.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {fmtDate(p.date)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Search medicine</span>
                    <input value={medSearch} onChange={(e) => setMedSearch(e.target.value)} placeholder="e.g. Losartan or blood pressure" />
                  </label>
                </div>
                {!pickupId && <p className="muted small pad">Choose a pickup location to see what's available there.</p>}
                {pickupId && (
                  <div className="med-pick">
                    {meds.map((m) => {
                      const have = availableQty(m.id)
                      const q = cart[m.id] ?? 0
                      return (
                        <div key={m.id} className={`med-opt ${q ? 'on' : ''} ${have <= 0 ? 'off' : ''}`}>
                          <span className="grow">
                            <b>{m.name}</b>
                            <small>
                              {m.strength} {m.form}
                            </small>
                            <small className="muted">{m.purpose}</small>
                            <span className={`pill ${have > 0 ? 'pill-ok' : 'pill-no'}`}>{have > 0 ? `${have} available` : 'Not available here'}</span>
                          </span>
                          <span className="stepper">
                            <button className="icon-btn sm" disabled={q === 0} onClick={() => setQty(m.id, q - 10)} aria-label={`Fewer ${m.name}`}>
                              <Minus size={16} />
                            </button>
                            <b>{q}</b>
                            <button className="icon-btn sm" disabled={have <= q} onClick={() => setQty(m.id, q + 10)} aria-label={`More ${m.name}`}>
                              <Plus size={16} />
                            </button>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
            <label className="field">
              <span className="field-label">Notes for the health team (optional)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. senior citizen, needs wheelchair access" />
            </label>
          </div>

          <aside className="card summary">
            <h3>Request summary</h3>
            {wantAppt && (
              <div className="info-row">
                <span className="muted">Appointment</span>
                <b>{service ? `${service.name}${slot ? ` • ${slot}` : ''}` : '—'}</b>
              </div>
            )}
            {wantMeds && (
              <>
                <div className="info-row">
                  <span className="muted">Selected medicines</span>
                  <b>{Object.keys(cart).length}</b>
                </div>
                <div className="info-row">
                  <span className="muted">Total quantity</span>
                  <b>{totalQty} units</b>
                </div>
                <div className="info-row">
                  <span className="muted">Pickup location</span>
                  <b>{pickup?.location ?? '—'}</b>
                </div>
              </>
            )}
            <p className="muted small">Bring your ID and prescription, if required. Medicines are provided free for eligible residents, subject to availability.</p>
            {err && <div className="alert alert-err">{err}</div>}
            <button className="btn btn-primary btn-block" disabled={busy} onClick={submit}>
              {wantMeds && wantAppt ? 'Confirm appointment & order' : wantMeds ? 'Confirm medicine order' : 'Confirm appointment'}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setStep('choose')}>
              Back
            </button>
          </aside>
        </div>
      )}

      {step === 'done' && doneRef && (
        <section className="card done-card">
          <span className="done-ic">
            <Check size={34} />
          </span>
          <h2>{doneRef.status === 'CONFIRMED' ? 'Appointment confirmed' : 'Request received'}</h2>
          <p className="muted">
            Reference <b>{doneRef.ref}</b> • {fmtDate(doneRef.date)}
            {doneRef.time ? ` • ${doneRef.time}` : ''} • {doneRef.location}
          </p>
          {doneRef.status === 'PENDING' && <p className="muted small">The pharmacist will confirm your medicine order. You'll see the update here and in your notifications.</p>}
          <div className="btn-row center">
            <button className="btn btn-primary" onClick={reset}>
              Make another request
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h3>My bookings</h3>
        </div>
        {mine.length === 0 && <Empty text="You have no bookings yet." />}
        <div className="bookings">
          {mine.map((a) => (
            <div key={a.id} className="booking">
              <span className="quick-ic">{a.kind === 'medicine' ? <Pill size={20} /> : <CalendarCheck size={20} />}</span>
              <span className="grow">
                <b>{a.serviceName ?? 'Medicine request'}</b>
                <small className="muted">
                  {a.ref} • {fmtDate(a.date)}
                  {a.time ? ` • ${a.time}` : ''} • {a.location}
                </small>
                {a.medicines && <small>{a.medicines.map((m) => `${m.label} × ${m.qty}`).join(', ')}</small>}
              </span>
              <span className={`pill ${a.status === 'CONFIRMED' || a.status === 'COMPLETED' ? 'pill-ok' : a.status === 'PENDING' ? 'pill-wait' : 'pill-no'}`}>{a.status}</span>
              {(a.status === 'PENDING' || a.status === 'CONFIRMED') && a.date >= today && (
                <button className="icon-btn sm danger" onClick={() => setCancelling(a)} aria-label={`Cancel ${a.ref}`}>
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <Confirm open={!!cancelling} title="Cancel booking?" text={`${cancelling?.ref} on ${cancelling ? fmtDate(cancelling.date) : ''} will be cancelled.`} confirmLabel="Cancel booking" onClose={() => setCancelling(null)} onConfirm={() => cancelling && cancel(cancelling)} />
    </>
  )
}

/* ---------------- E-Pila digital queue ---------------- */
function EPila() {
  const { data, add, update } = useStore()
  const { resident } = useResident()
  const toast = useToast()
  const verified = resident.status === 'APPROVED'
  const [unitId, setUnitId] = useState('')
  const [purpose, setPurpose] = useState<string>(PROGRAMS[0])
  const [busy, setBusy] = useState(false)
  const active = data.units.filter((u) => u.status !== 'CLOSED')
  const myTickets = data.tickets.filter((t) => t.residentId === resident.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const current = myTickets.filter((t) => t.status === 'WAITING' || t.status === 'SERVING')
  const past = myTickets.filter((t) => t.status === 'DONE' || t.status === 'CANCELLED').slice(0, 6)

  async function join() {
    const unit = data.units.find((u) => u.id === unitId)
    if (!unit) return toast('Choose a location first', 'err')
    if (current.some((t) => t.unitId === unit.id)) return toast('You already have a number at this location', 'err')
    setBusy(true)
    try {
      const number = nextTicketNumber(data, unit)
      await add('tickets', { unitId: unit.id, unitName: unit.name, number, residentId: resident.id, residentName: resident.name, purpose, status: 'WAITING', createdAt: new Date().toISOString() })
      await update('units', unit.id, { queue: unit.queue + 1 }, { silent: true })
      toast(`You're #${number} at ${unit.name}`)
    } catch (e: any) {
      toast(e.message, 'err')
    } finally {
      setBusy(false)
    }
  }
  async function leave(t: Ticket) {
    try {
      await update('tickets', t.id, { status: 'CANCELLED' })
      const u = data.units.find((x) => x.id === t.unitId)
      if (u && t.status === 'WAITING' && u.queue > 0) await update('units', u.id, { queue: u.queue - 1 }, { silent: true })
      toast('You left the queue')
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  return (
    <div className="epila-grid">
      <div className="stack">
        {current.map((t) => {
          const serving = nowServing(data, t.unitId)
          const ahead = Math.max(0, t.number - serving - 1)
          return (
            <section key={t.id} className={`ticket ${t.status === 'SERVING' ? 'serving' : ''}`}>
              <span className="eyebrow light">E-Pila number</span>
              <b className="ticket-num">#{t.number}</b>
              <span className="ticket-unit">{t.unitName}</span>
              <div className="ticket-stats">
                <div>
                  <b>#{serving || '—'}</b>
                  <small>Now serving</small>
                </div>
                <div>
                  <b>{t.status === 'SERVING' ? 0 : ahead}</b>
                  <small>Ahead of you</small>
                </div>
                <div>
                  <b>~{t.status === 'SERVING' ? 0 : ahead * 5} min</b>
                  <small>Est. wait</small>
                </div>
              </div>
              <p className="ticket-msg">{t.status === 'SERVING' ? "It's your turn! Please proceed to the counter." : ahead <= 3 ? 'Almost your turn — please stay nearby.' : `Purpose: ${t.purpose}. We'll notify you when you're near.`}</p>
              {t.status === 'WAITING' && (
                <button className="btn btn-white sm" onClick={() => leave(t)}>
                  Leave queue
                </button>
              )}
            </section>
          )
        })}
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Get a queue number</h3>
              <p className="muted small">Join the line remotely and arrive when it's almost your turn.</p>
            </div>
          </div>
          {!active.length && <Empty text="No Rolling Botika or health office queue is open right now." />}
          <div className="unit-pick">
            {active.map((u) => (
              <button key={u.id} className={`svc-opt ${unitId === u.id ? 'on' : ''}`} onClick={() => setUnitId(u.id)}>
                <b>{u.name}</b>
                <small className="muted">
                  {u.location} • Until {fmtTime(u.until)}
                </small>
                <span className="pill pill-ok">
                  Now serving #{nowServing(data, u.id) || '—'} • {u.queue} waiting
                </span>
              </button>
            ))}
          </div>
          {active.length > 0 && (
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Purpose of visit</span>
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  {PROGRAMS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <div className="field end">
                <button className="btn btn-primary" disabled={!verified || !unitId || busy} onClick={join}>
                  <TicketIcon size={18} /> Get my number
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <h3>Recent queue tickets</h3>
        </div>
        {past.length === 0 && <p className="muted small">Your completed queue tickets will show here.</p>}
        {past.map((t) => (
          <div key={t.id} className="info-row">
            <span>
              <b>#{t.number}</b> <span className="muted small">{t.unitName}</span>
              <br />
              <small className="muted">{fmtDate(t.createdAt)}</small>
            </span>
            <span className={`pill ${t.status === 'DONE' ? 'pill-ok' : 'pill-no'}`}>{t.status === 'DONE' ? 'COMPLETED' : 'CANCELLED'}</span>
          </div>
        ))}
        <div className="epila-help">
          <Icon name="r-epila" />
          <p className="muted small">E-Pila keeps lines short at Rolling Botika sites. Show your number to the staff when called.</p>
        </div>
      </section>
    </div>
  )
}
