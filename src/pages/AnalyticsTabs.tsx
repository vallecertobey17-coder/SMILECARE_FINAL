import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Sparkles, MapPin, Square, TrendingUp } from 'lucide-react'
import { getCapability, useStore } from '../lib/store'
import { Empty, Field, Pager, usePaged, useToast } from '../components/ui'
import { BARANGAYS, fmtDate, fmtNum, saveFile, toCSV, medicineStatus } from '../lib/utils'
import { barangayStats, medLabel, recommendDeployments } from '../lib/domain'

/* ---------------- Health Mapping Reports ---------------- */
export function HealthMap() {
  const { data } = useStore()
  const toast = useToast()
  const [days, setDays] = useState(90)
  const stats = useMemo(() => barangayStats(data, BARANGAYS, days), [data, days])
  const cols: { key: keyof (typeof stats)[number]; label: string }[] = [
    { key: 'residents', label: 'Verified residents' },
    { key: 'consultations', label: 'Consultations' },
    { key: 'highBp', label: 'High BP' },
    { key: 'highSugar', label: 'High blood sugar' },
    { key: 'vaccinations', label: 'Vaccinations' },
    { key: 'medicines', label: 'Medicines dispensed' },
    { key: 'appointments', label: 'Upcoming bookings' },
  ]
  const max = (k: string) => Math.max(1, ...stats.map((s) => Number((s as any)[k]) || 0))

  async function exportCsv() {
    try {
      await saveFile(`smilecare-health-map-${days}d.csv`, toCSV(stats.map((s) => ({ barangay: s.barangay, ...Object.fromEntries(cols.map((c) => [c.label, s[c.key]])), last_deployment: s.lastDeployment ?? '' }))), 'text/csv')
      toast('Health map exported')
    } catch {
      toast('Download was cancelled', 'err')
    }
  }

  return (
    <section className="card">
      <div className="card-head wrap">
        <div>
          <h3><MapPin size={18} /> Health mapping by barangay</h3>
          <p className="muted small">Recorded health-service needs and utilization. Darker cells mean higher values.</p>
        </div>
        <div className="btn-row">
          <select className="mini-select" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
          </select>
          <button className="btn btn-outline sm" onClick={exportCsv}><Download size={15} /> Export CSV</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table heat">
          <thead><tr><th>Barangay</th>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th>Last visit</th></tr></thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.barangay}>
                <td><b>{s.barangay}</b>{s.pending > 0 && <div className="muted small">{s.pending} pending verification</div>}</td>
                {cols.map((c) => {
                  const v = Number(s[c.key]) || 0
                  const a = v / max(c.key)
                  const alert = (c.key === 'highBp' || c.key === 'highSugar') && v > 0
                  return (
                    <td key={c.key} className="heat-cell" style={{ background: v ? `rgba(${alert ? '255,102,102' : '0,99,152'}, ${0.08 + a * 0.45})` : undefined }}>
                      {fmtNum(v)}
                    </td>
                  )
                })}
                <td>{s.lastDeployment ? fmtDate(s.lastDeployment) : <span className="muted">None</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ---------------- Smart Deployment Recommendation ---------------- */
export function DeploymentPlanner({ onSchedule }: { onSchedule: (barangay: string) => void }) {
  const { data } = useStore()
  const recs = useMemo(() => recommendDeployments(data, BARANGAYS), [data])
  const [ai, setAi] = useState<null | ((input: string, opts?: any) => Promise<{ text: string }>)>(null)
  const [plan, setPlan] = useState('')
  const [busy, setBusy] = useState(false)
  const ctl = useRef<AbortController | null>(null)
  useEffect(() => {
    getCapability<any>('sample').then((s) => s && setAi(() => s))
  }, [])

  // Demand forecast: average monthly use over the last 90 days vs. total stock (central + units).
  const forecast = useMemo(() => {
    const since = new Date(Date.now() - 90 * 86400000).toISOString()
    return data.medicines
      .map((m) => {
        const used = data.dispensings.filter((d) => d.status === 'COMPLETED' && d.date >= since).reduce((a, d) => a + d.items.filter((i) => i.medicineId === m.id).reduce((s, i) => s + i.qty, 0), 0)
        const monthly = used / 3
        const total = m.stock + data.units.reduce((a, u) => a + (u.stock?.[m.id] ?? 0), 0)
        const months = monthly > 0 ? total / monthly : Infinity
        return { m, monthly: Math.round(monthly), total, months }
      })
      .filter((x) => x.monthly > 0 || medicineStatus(x.m) !== 'GOOD')
      .sort((a, b) => a.months - b.months)
  }, [data])

  async function explain() {
    if (!ai) return
    setBusy(true)
    setPlan('')
    ctl.current = new AbortController()
    const prompt = `You are a planning assistant for the Municipality of Taytay's Rolling Botika mobile healthcare program.
Using ONLY the data below, write a short deployment plan for the next two weeks (max 180 words): which barangays to visit first and why, which services to bring, and which medicines to load. Use bullet points. Do not invent numbers.

RANKED BARANGAYS (score, reasons, suggested services, suggested medicine load):
${recs.map((r, i) => `${i + 1}. ${r.barangay} | score ${r.score} | ${r.reasons.join('; ')} | services: ${r.services.join(', ')} | load: ${r.medicines.map((m) => `${m.label} x${m.qty}`).join(', ') || 'none'}`).join('\n')}

MEDICINE DEMAND (monthly use, total stock, months left):
${forecast.slice(0, 8).map((f) => `- ${medLabel(f.m)}: ${f.monthly}/month, ${f.total} ${f.m.unit} in stock, ${Number.isFinite(f.months) ? f.months.toFixed(1) : 'n/a'} months`).join('\n')}`
    try {
      const { text } = await ai(prompt, { signal: ctl.current.signal, onText: ({ text }: { text: string }) => setPlan(text), cache: { gcTime: 600000 } })
      setPlan(text)
    } catch (e: any) {
      setPlan(e?.text || (e?.code === 'cancelled' ? '' : 'The AI planner is unavailable right now. The ranking above is still up to date.'))
      if (e?.code === 'not_granted' || e?.code === 'sampling_disabled') setAi(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head wrap">
          <div>
            <h3><TrendingUp size={18} /> Recommended next deployments</h3>
            <p className="muted small">Ranked from health-service, medicine-demand and barangay-level data: time since last visit, high BP / blood-sugar findings, pre-bookings and population.</p>
          </div>
          {ai && (busy ? (
            <button className="btn btn-outline sm" onClick={() => ctl.current?.abort()}><Square size={15} /> Stop</button>
          ) : (
            <button className="btn btn-primary sm" onClick={explain}><Sparkles size={15} /> Draft plan with AI</button>
          ))}
        </div>
        {(plan || busy) && <div className="ai-plan">{plan || 'Thinking…'}</div>}
        <div className="rec-list">
          {recs.map((r, i) => (
            <div key={r.barangay} className={`rec ${i === 0 ? 'top' : ''}`}>
              <span className="rec-rank">{i + 1}</span>
              <span className="grow">
                <b>Brgy. {r.barangay}</b> <span className="muted small">priority score {r.score}</span>
                <small>{r.reasons.join(' • ')}</small>
                <small className="muted">Bring: {r.services.join(', ')}</small>
                {r.medicines.length > 0 && <small className="muted">Load: {r.medicines.map((m) => `${m.label} × ${m.qty}`).join(', ')}</small>}
              </span>
              <button className="btn btn-outline sm" onClick={() => onSchedule(r.barangay)}>Schedule visit</button>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h3>Medicine demand forecast</h3></div>
        {forecast.length === 0 && <Empty text="Not enough dispensing data yet." />}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Medicine</th><th>Avg. monthly use</th><th>Total stock</th><th>Supply left</th></tr></thead>
            <tbody>
              {forecast.map((f) => (
                <tr key={f.m.id}>
                  <td><b>{medLabel(f.m)}</b></td>
                  <td>{fmtNum(f.monthly)} {f.m.unit}</td>
                  <td>{fmtNum(f.total)}</td>
                  <td>{Number.isFinite(f.months) ? <span className={`badge ${f.months < 1 ? 'badge-red' : f.months < 3 ? 'badge-amber' : 'badge-green'}`}>{f.months < 1 ? 'Under 1 month' : f.months > 24 ? 'Over 2 years' : `${f.months.toFixed(1)} months`}</span> : <span className="badge badge-gray">No recent use</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/* ---------------- System Audit Trail ---------------- */
export function AuditLog() {
  const { data } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...data.audit]
      .filter((a) => !action || a.action === action)
      .filter((a) => !s || `${a.actor} ${a.role} ${a.entity} ${a.summary}`.toLowerCase().includes(s))
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [data.audit, q, action])
  const paged = usePaged(rows, 12, q + action)
  const actions = [...new Set(data.audit.map((a) => a.action))].sort()

  async function exportCsv() {
    try {
      await saveFile('smilecare-audit-trail.csv', toCSV(rows.map((a) => ({ time: a.at, user: a.actor, role: a.role, action: a.action, module: a.entity, details: a.summary }))), 'text/csv')
      toast('Audit trail exported')
    } catch {
      toast('Download was cancelled', 'err')
    }
  }

  return (
    <section className="card">
      <div className="card-head wrap">
        <div>
          <h3>System audit trail</h3>
          <p className="muted small">Important system activities for accountability and authorized review (latest 600 shown).</p>
        </div>
        <button className="btn btn-outline sm" onClick={exportCsv} disabled={!rows.length}><Download size={15} /> Export CSV</button>
      </div>
      <div className="filters filters-inline">
        <Field label="Search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="User, module or details" /></Field>
        <Field label="Action">
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Details</th></tr></thead>
          <tbody>
            {paged.slice.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td><b>{a.actor}</b><div className="muted small">{a.role}</div></td>
                <td><span className={`badge ${a.action === 'delete' ? 'badge-red' : a.action === 'create' ? 'badge-green' : a.action === 'restore' || a.action === 'backup' ? 'badge-violet' : 'badge-blue'}`}>{a.action}</span></td>
                <td>{a.entity}</td>
                <td>{a.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty text="No activity recorded yet. Actions like sign-ins, dispensing and edits appear here." />}
      </div>
      <Pager {...paged} onPage={paged.setPage} />
    </section>
  )
}
