import { useMemo } from 'react'
import { ChevronRight, Truck, Building2, Pill, UserCheck, Stethoscope, Droplet, Eye, Smile, Syringe, Baby, HeartPulse, type LucideIcon } from 'lucide-react'

/** Colour, icon and stream label for each health service (Services today cards). */
function serviceStyle(name: string): { color: string; color2: string; icon: LucideIcon; stream: string } {
  const n = name.toLowerCase()
  if (n.includes('blood sugar')) return { color: '#3b2f9e', color2: '#6a5cf0', icon: Droplet, stream: 'Triage screening' }
  if (n.includes('blood pressure')) return { color: '#3b2f9e', color2: '#6a5cf0', icon: HeartPulse, stream: 'Triage vital checks' }
  if (n.includes('medicine') || n.includes('dispens') || n.includes('botika')) return { color: '#2e7d5b', color2: '#02a070', icon: Pill, stream: 'Pharmacy dispensary' }
  if (n.includes('eye')) return { color: '#0b7f8c', color2: '#22b5c4', icon: Eye, stream: 'Vision screening' }
  if (n.includes('dental')) return { color: '#b45309', color2: '#f59e0b', icon: Smile, stream: 'Dental clinic' }
  if (n.includes('vaccin')) return { color: '#7c3aed', color2: '#a78bfa', icon: Syringe, stream: 'Immunization' }
  if (n.includes('maternal') || n.includes('pediatric')) return { color: '#c81e2b', color2: '#ff6b6b', icon: Baby, stream: n.includes('maternal') ? 'OB-GYN & infant center' : 'Pediatrics' }
  return { color: '#006398', color2: '#2a9fd8', icon: Stethoscope, stream: 'OPD clinical stream' }
}
import { useStore } from '../lib/store'
import { AppointmentsBoard } from '../components/AppointmentsBoard'
import { can, type Permission, type Session } from '../lib/auth'
import { StatCard } from '../components/ui'
import { Icon } from '../components/Icon'
import { daysToExpiry, fmtNum, fmtTime, greeting, isoDate, medicineStatus } from '../lib/utils'

export default function Dashboard({ go: rawGo, session }: { go: (r: string) => void; session: Session }) {
  const firstName = session.name.replace(/^(Dr\.|Dra\.)\s*/i, '').split(' ')[0]
  const allowed = (r: string) => can(session, r as Permission)
  const go = (r: string) => (allowed(r) ? rawGo(r) : undefined)
  const { data, loaded } = useStore()
  const now = new Date()
  const todayIso = isoDate(now)
  const monthPrefix = todayIso.slice(0, 7)

  const stats = useMemo(() => {
    const thisMonth = data.residents.filter((r) => r.registered?.startsWith(monthPrefix)).length
    const todays = data.services.filter((s) => s.date === todayIso || s.status === 'ONGOING')
    const appointments = todays.reduce((a, s) => a + (s.booked || 0), 0)
    const completedToday = todays.filter((s) => s.status === 'COMPLETED').reduce((a, s) => a + s.booked, 0)
    const activeUnits = data.units.filter((u) => u.status !== 'CLOSED')
    const queue = activeUnits.reduce((a, u) => a + (u.queue || 0), 0)
    const alerts = data.medicines.filter((m) => medicineStatus(m, now) !== 'GOOD')
    return { thisMonth, todays, appointments, completedToday, activeUnits, queue, alerts }
  }, [data, todayIso, monthPrefix])

  const pending = data.residents.filter((r) => r.status === 'PENDING')
  const oldestPending = pending.reduce<string | null>((o, r) => (!o || r.registered < o ? r.registered : o), null)
  const oldestDays = oldestPending ? Math.max(0, Math.round((now.getTime() - new Date(oldestPending + 'T00:00:00').getTime()) / 86400000)) : 0

  // Services quota board: today's/ongoing services, else the next upcoming ones
  const quotaServices = (stats.todays.length
    ? stats.todays
    : [...data.services].filter((s) => s.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date))
  ).slice(0, 6)

  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{dateLabel}</div>
          <h1>Operations overview</h1>
          <p className="muted">
            {greeting(now)}, {firstName}. Here's what's happening across SMILECare today.
          </p>
        </div>
        <span className="badge badge-blue lg">{session.role}</span>
      </div>

      <div className="quick-row">
        {[
          { id: 'dispensing', label: 'Dispense medicine' },
          { id: 'consultations', label: 'Record consultation' },
          { id: 'vaccinations', label: 'Record vaccination' },
          { id: 'residents', label: 'Register walk-in' },
          { id: 'botika', label: 'Manage E-Pila' },
          { id: 'announcements', label: 'Post announcement' },
          { id: 'inventory', label: 'Load Rolling Botika' },
          { id: 'analytics', label: 'Deployment planner' },
        ].filter((a) => allowed(a.id)).slice(0, 5).map((a) => (
          <button key={a.id} className="chip" onClick={() => go(a.id)}>{a.label}</button>
        ))}
      </div>

      <div className="stats">
        <StatCard
          icon={<Icon name="residents" />}
          label="Registered residents"
          value={loaded ? fmtNum(data.residents.length) : '—'}
          note={`+${stats.thisMonth} this month`}
          onClick={() => go('residents')}
        />
        <StatCard
          icon={<Icon name="r-book" />}
          tone="blue"
          label="Appointments today"
          value={loaded ? fmtNum(stats.appointments) : '—'}
          note={`${fmtNum(stats.completedToday)} completed`}
          onClick={() => go('services')}
        />
        <StatCard
          icon={<Icon name="r-epila" />}
          tone="violet"
          label="Active E-Pila"
          value={loaded ? fmtNum(stats.queue) : '—'}
          note={`Across ${stats.activeUnits.length} location${stats.activeUnits.length === 1 ? '' : 's'}`}
          onClick={() => go('botika')}
        />
        <StatCard
          icon={<Icon name="inventory" />}
          tone="orange"
          label="Inventory alerts"
          value={loaded ? stats.alerts.length : '—'}
          note={stats.alerts.length ? <span className="note-red">Needs attention</span> : 'All good'}
          onClick={() => go('inventory')}
        />
      </div>

      {session.role === 'Municipal Health Doctor' && <AppointmentsBoard doctor={session.name} compact />}

      <div className="dash-grid">
        <section className="card dash-card">
          <div className="card-head">
            <h3>Today's operations</h3>
            <button className="pill-btn" onClick={() => go('botika')}>
              Manage all units <ChevronRight size={16} />
            </button>
          </div>
          {stats.activeUnits.length === 0 && <p className="muted pad">No units are operating right now.</p>}
          <div className="units">
            {stats.activeUnits.slice(0, 3).map((u) => (
              <div key={u.id} className="unit">
                <div className={`unit-tile ${u.kind === 'Rolling Botika' ? 'rb' : 'ho'}`}>
                  {u.kind === 'Rolling Botika' ? <Truck size={30} strokeWidth={1.7} /> : <Building2 size={30} strokeWidth={1.7} />}
                </div>
                <div className="unit-main">
                  <span className="unit-pillrow">
                    <span className={`dot-pill ${u.status === 'IN PROGRESS' ? 'blue' : 'green'}`}><i />{u.status}</span>
                  </span>
                  <b>{u.name}</b>
                  <small className="muted">
                    {u.description || u.location} • Until {fmtTime(u.until)}
                  </small>
                </div>
                <div className="unit-nums">
                  <div className="num-served">
                    <b>{u.served}</b>
                    <small>Served</small>
                  </div>
                  <div className="num-queue">
                    <b>{u.queue}</b>
                    <small>In Queue</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card dash-card">
          <div className="card-head">
            <h3>Alerts &amp; Actions</h3>
            {stats.alerts.length + (pending.length ? 1 : 0) > 0 && (
              <span className="badge badge-red">{stats.alerts.length + (pending.length ? 1 : 0)} ALERTS</span>
            )}
          </div>
          <div className="alerts">
            {stats.alerts.slice(0, 4).map((m) => {
              const st = medicineStatus(m, now)
              return (
                <button key={m.id} className="alert-item" onClick={() => go('inventory')}>
                  <span className={`ai-icon ${st === 'EXPIRING SOON' ? 'tone-orange' : 'tone-red'}`}>
                    <Pill size={24} strokeWidth={1.8} />
                  </span>
                  <span>
                    <b>
                      {m.name} {m.strength}
                    </b>
                    <small>
                      {st === 'OUT OF STOCK'
                        ? `Out of stock${m.location ? ' • ' + m.location : ''}`
                        : st === 'EXPIRED'
                          ? `Expired • ${fmtNum(m.stock)} ${m.unit} to pull from stock`
                          : st === 'LOW STOCK'
                          ? `Low stock • ${fmtNum(m.stock)} ${m.unit} left`
                          : `${fmtNum(m.stock)} ${m.unit} expire in ${daysToExpiry(m, now)} days`}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              )
            })}
            {pending.length > 0 && (
              <button className="alert-item" onClick={() => go('residents')}>
                <span className="ai-icon tone-amber">
                  <UserCheck size={18} />
                </span>
                <span>
                  <b>{pending.length} verification requests</b>
                  <small>Oldest pending for {oldestDays} day{oldestDays === 1 ? '' : 's'}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            )}
            {stats.alerts.length === 0 && pending.length === 0 && <p className="muted pad">No alerts. Everything looks good.</p>}
          </div>
        </section>
      </div>

      <section className="card svc-today">
        <div className="svc-today-head">
          <div>
            <h3>Services today</h3>
            <p className="muted small">Real-time throughput quota across all clinical centers &amp; mobile units</p>
          </div>
          <span className="updated-pill">
            <i /> Last Updated: <b>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</b>
          </span>
        </div>
        {quotaServices.length === 0 && <p className="muted pad">No services scheduled.</p>}
        <div className="svc-grid">
          {quotaServices.map((s) => {
            const pct = s.capacity ? Math.min(100, Math.round((s.booked / s.capacity) * 100)) : 0
            const st = serviceStyle(s.category || s.name)
            const Icon = st.icon
            return (
              <button key={s.id} className="svc-card" style={{ ['--c' as string]: st.color, ['--c2' as string]: st.color2 }} onClick={() => go('services')}>
                <span className="svc-ic"><Icon size={26} strokeWidth={1.8} /></span>
                <span className="svc-body">
                  <span className="svc-top">
                    <span className="svc-name">
                      <b>{s.name}</b>
                      <small>{st.stream} • {s.location}</small>
                    </span>
                    <span className="svc-count"><b>{s.booked}</b> / {s.capacity}</span>
                  </span>
                  <span className="svc-bar" role="progressbar" aria-valuenow={s.booked} aria-valuemin={0} aria-valuemax={s.capacity} aria-label={`${s.name} ${pct}% of capacity`}>
                    <span style={{ width: Math.max(pct, s.booked ? 3 : 0) + '%' }} />
                  </span>
                </span>
                {pct >= 100 && <span className="svc-full">Full</span>}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
