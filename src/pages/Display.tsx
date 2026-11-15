import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useStore } from '../lib/store'
import { BrandLogo } from '../components/BrandMark'
import { avgMinutes, serviceOf, servingTicket, waitingList } from '../lib/epila'
import { fmtTime } from '../lib/utils'

/** Public "Now serving" board for a TV or tablet at each Rolling Botika / health office (no sign-in). */
export default function Display() {
  const { data, loaded } = useStore()
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t) }, [])
  const only = new URLSearchParams(location.hash.split('?')[1] || '').get('unit')
  const units = data.units.filter((u) => u.status !== 'CLOSED' && (!only || u.id === only))
  return (
    <div className="board">
      <header className="board-head">
        <BrandLogo size={52} light />
        <div className="board-title"><b>E-Pila • Now serving</b><small>Taytay, Rizal</small></div>
        <div className="board-clock"><b>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</b><small>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</small></div>
      </header>
      {!loaded && <p className="board-empty">Loading…</p>}
      {loaded && !units.length && <p className="board-empty">No Rolling Botika or health office queue is open right now.</p>}
      <div className={`board-grid n${Math.min(units.length, 3)}`}>
        {units.map((u) => {
          const cur = servingTicket(data, u.id)
          const line = waitingList(data, u.id)
          return (
            <section key={u.id} className="board-card">
              <div className="bc-head"><b>{u.name}</b><small>{u.location} • until {fmtTime(u.until)}</small></div>
              <span className="bc-label">Now serving</span>
              <b className="bc-num">{cur ? `#${cur.number}` : '—'}</b>
              <span className="bc-lane">{cur ? `${serviceOf(cur)}${cur.priority ? ' • priority' : ''}` : 'Please wait to be called'}</span>
              <div className="bc-next">
                <span className="bc-label">Next</span>
                <div className="bc-chips">
                  {line.slice(0, 5).map((t) => <span key={t.id} className={t.priority ? 'prio-chip' : ''}>{t.priority && <Star size={16} />}#{t.number}</span>)}
                  {!line.length && <span className="muted">No one waiting</span>}
                </div>
              </div>
              <div className="bc-foot"><span>{line.length} waiting</span><span>~{avgMinutes(data, u.id)} min per person</span></div>
            </section>
          )
        })}
      </div>
      <footer className="board-foot">Get your number on the SMILECare app → E-Pila. Seniors, PWDs and pregnant women: please approach the priority lane.</footer>
    </div>
  )
}
