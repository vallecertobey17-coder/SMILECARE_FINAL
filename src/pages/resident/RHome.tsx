import { useMemo } from 'react'
import { useStore } from '../../lib/store'
import { useResident } from './context'
import { Icon } from '../../components/Icon'
import { fmtTime, isoDate } from '../../lib/utils'
import { residentHistory } from '../../lib/domain'
import { VerificationBanner } from './shared'

export function filipinoGreeting(d = new Date()) {
  const h = d.getHours()
  return h < 12 ? 'Magandang Umaga' : h < 18 ? 'Magandang Hapon' : 'Magandang Gabi'
}

export default function RHome() {
  const { data } = useStore()
  const { resident, go } = useResident()
  const today = isoDate()
  const first = resident.name.split(' ')[0]

  const nextVisit = useMemo(() => {
    const upcoming = data.services.filter((s) => s.date >= today && s.status !== 'CANCELLED' && s.status !== 'COMPLETED').sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    return upcoming.find((s) => s.barangay === resident.barangay) ?? upcoming[0]
  }, [data.services, today, resident.barangay])

  const nextAppt = useMemo(
    () => data.appointments.filter((a) => a.residentId === resident.id && a.date >= today && (a.status === 'CONFIRMED' || a.status === 'PENDING')).sort((a, b) => a.date.localeCompare(b.date))[0],
    [data.appointments, resident.id, today],
  )
  const history = useMemo(() => residentHistory(data, resident), [data, resident])
  const lastBp = data.consultations.filter((c) => (c.residentId === resident.id || c.residentName === resident.name) && c.bp).sort((a, b) => b.date.localeCompare(a.date))[0]
  const lastSugar = data.consultations.filter((c) => (c.residentId === resident.id || c.residentName === resident.name) && c.bloodSugar).sort((a, b) => b.date.localeCompare(a.date))[0]

  const reminder = (() => {
    const bp = lastBp?.bp?.split('/').map(Number)
    if (bp && (bp[0] >= 130 || bp[1] >= 85))
      return { title: "It's time to check your blood pressure.", text: `Your last reading was ${lastBp!.bp} mmHg. Regular monitoring helps you stay ahead.` }
    if (lastSugar && (lastSugar.bloodSugar ?? 0) >= 100)
      return { title: 'Keep an eye on your blood sugar.', text: `Your last result was ${lastSugar.bloodSugar} mg/dL. A free Rapid Blood Sugar Screening is available at Rolling Botika visits.` }
    return { title: 'Stay on top of your health.', text: 'Book a free consultation or screening at the next Rolling Botika visit in your barangay.' }
  })()

  const d = new Date()
  const apptDate = nextAppt ? new Date(nextAppt.date + 'T00:00:00') : null

  return (
    <div className="page rpage">
      <div className="page-head">
        <div>
          <div className="eyebrow">{d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1 className="rtitle">
            {filipinoGreeting(d)}, {first}!
          </h1>
          <p>Manage your information and digital health card.</p>
        </div>
      </div>

      <VerificationBanner />

      {nextVisit && (
        <div className="hero-banner">
          <span className="hb-icon">
            <Icon name="r-truck" />
          </span>
          <div className="grow">
            <b>{nextVisit.unitId ? 'Rolling Botika' : nextVisit.name} is coming to Brgy. {nextVisit.barangay ?? nextVisit.location}</b>
            <small>
              {new Date(nextVisit.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {fmtTime(nextVisit.start)} - {fmtTime(nextVisit.end)} • {nextVisit.location}
            </small>
          </div>
          <button className="btn btn-white" onClick={() => go('my-schedule')}>
            View details
          </button>
        </div>
      )}

      <div className="rhome-grid">
        <section>
          <h3 className="sec-title">Your next appointment</h3>
          {nextAppt && apptDate ? (
            <button className="appt-card" onClick={() => go('my-booking')}>
              <span className="date-tile">
                <b>{apptDate.getDate()}</b>
                <small>{apptDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()}</small>
              </span>
              <span className="grow appt-main">
                <span className={`pill pill-${nextAppt.status === 'CONFIRMED' ? 'ok' : 'wait'}`}>{nextAppt.status}</span>
                <b>{nextAppt.serviceName ?? 'Medicine pickup'}</b>
                {nextAppt.time && (
                  <small>
                    <Icon name="r-clock" /> {nextAppt.time}
                  </small>
                )}
                <small>
                  <Icon name="r-pin" /> {nextAppt.location}
                </small>
                {nextAppt.doctor && <small className="muted">With {nextAppt.doctor}</small>}
              </span>
              <Icon name="r-chev" className="ic-muted" />
            </button>
          ) : (
            <div className="appt-card empty-appt">
              <span className="grow">
                <b>No upcoming appointments</b>
                <small className="muted">Reserve a slot before the Rolling Botika arrives.</small>
              </span>
              <button className="btn btn-primary sm" onClick={() => go('my-booking')}>
                Book now
              </button>
            </div>
          )}
        </section>

        <div className="quick-grid">
          {[
            { label: 'Book appointment', icon: 'r-book' as const, to: 'my-booking' },
            { label: 'Join E-Pila', icon: 'r-epila' as const, to: 'my-booking' },
            { label: 'Show Health ID', icon: 'r-qr' as const, to: 'my-profile' },
            { label: 'Ask SMILE', icon: 'r-chat' as const, to: 'ask-smile' },
          ].map((q) => (
            <button key={q.label} className="quick" onClick={() => go(q.to)}>
              <span className="quick-ic">
                <Icon name={q.icon} />
              </span>
              <span className="grow">{q.label}</span>
              <Icon name="r-chev" className="ic-muted" />
            </button>
          ))}
        </div>

        <section>
          <div className="sec-head">
            <h3 className="sec-title">Recent health activity</h3>
            <button className="link small" onClick={() => go('my-history')}>
              See history
            </button>
          </div>
          <div className="activity">
            {history.slice(0, 2).map((h) => (
              <div key={h.id} className="activity-item">
                <span className="quick-ic">
                  <Icon name={h.kind === 'medicine' ? 'r-med' : h.kind === 'consultation' ? 'r-heart' : 'r-book'} />
                </span>
                <span className="grow">
                  <span className="tag">{h.kind === 'medicine' ? 'MEDICINE DISPENSED' : h.kind.toUpperCase()}</span>
                  <b>
                    {h.title}
                    {h.kind === 'medicine' && h.detail ? ` • ${h.detail}` : ''}
                  </b>
                  <small className="muted">
                    {new Date(h.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} • {h.where}
                  </small>
                </span>
              </div>
            ))}
            {history.length === 0 && <p className="muted pad">Your consultations, medicines and vaccinations will appear here.</p>}
          </div>
        </section>

        <section className="reminder">
          <span className="eyebrow light">Health reminder</span>
          <h3>{reminder.title}</h3>
          <p>{reminder.text}</p>
          <button className="btn btn-white" onClick={() => go('my-booking')}>
            Schedule a Check
          </button>
        </section>
      </div>
    </div>
  )
}
