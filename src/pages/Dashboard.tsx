import { useMemo } from 'react'
import { Users, CalendarCheck, ListOrdered, AlertTriangle, ChevronRight, Truck, Building2, Pill, UserCheck, Clock } from 'lucide-react'
import { useStore } from '../lib/store'
import { can, type Permission, type Session } from '../lib/auth'
import { Badge, StatCard } from '../components/ui'
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
  ).slice(0, 4)

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
          icon={<Users size={24} />}
          label="Registered residents"
          value={loaded ? fmtNum(data.residents.length) : '—'}
          note={`+${stats.thisMonth} this month`}
          onClick={() => go('residents')}
        />
        <StatCard
          icon={<CalendarCheck size={24} />}
          tone="blue"
          label="Appointments today"
          value={loaded ? fmtNum(stats.appointments) : '—'}
          note={`${fmtNum(stats.completedToday)} completed`}
          onClick={() => go('services')}
        />
        <StatCard
          icon={<ListOrdered size={24} />}
          tone="violet"
          label="Active E-Pila"
          value={loaded ? fmtNum(stats.queue) : '—'}
          note={`Across ${stats.activeUnits.length} location${stats.activeUnits.length === 1 ? '' : 's'}`}
          onClick={() => go('botika')}
        />
        <StatCard
          icon={<AlertTriangle size={24} />}
          tone="orange"
          label="Inventory alerts"
          value={loaded ? stats.alerts.length : '—'}
          note={stats.alerts.length ? 'Needs attention' : 'All good'}
          onClick={() => go('inventory')}
        />
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h3>Today's operations</h3>
            <button className="link-btn" onClick={() => go('botika')}>
              Manage all units <ChevronRight size={18} />
            </button>
          </div>
          {stats.activeUnits.length === 0 && <p className="muted pad">No units are operating right now.</p>}
          <div className="units">
            {stats.activeUnits.slice(0, 3).map((u) => (
              <div key={u.id} className="unit">
                <div className={`unit-icon ${u.kind === 'Rolling Botika' ? 'tone-teal' : 'tone-blue'}`}>
                  {u.kind === 'Rolling Botika' ? <Truck size={22} /> : <Building2 size={22} />}
                </div>
                <div className="unit-main">
                  <Badge status={u.status} />
                  <b>{u.name}</b>
                  <small className="muted">
                    {u.description || u.location} • Until {fmtTime(u.until)}
                  </small>
                </div>
                <div className="unit-nums">
                  <div>
                    <b>{u.served}</b>
                    <small>Served</small>
                  </div>
                  <div>
                    <b>{u.queue}</b>
                    <small>In queue</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
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
                    {st === 'EXPIRING SOON' || st === 'EXPIRED' ? <Clock size={18} /> : <Pill size={18} />}
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

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Services today</h3>
            <p className="muted small">Real-time throughput quota across all clinical centers &amp; mobile units</p>
          </div>
          <span className="muted small">
            Last updated {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        {quotaServices.length === 0 && <p className="muted pad">No services scheduled.</p>}
        <div className="quotas">
          {quotaServices.map((s) => {
            const pct = s.capacity ? Math.min(100, Math.round((s.booked / s.capacity) * 100)) : 0
            return (
              <button key={s.id} className="quota" onClick={() => go('services')}>
                <div className="quota-top">
                  <b>{s.name}</b>
                  <span>
                    {s.booked} / {s.capacity}
                  </span>
                </div>
                <small className="muted">{s.category || s.location}</small>
                <div className="bar">
                  <span style={{ width: pct + '%' }} className={pct >= 90 ? 'full' : ''} />
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
