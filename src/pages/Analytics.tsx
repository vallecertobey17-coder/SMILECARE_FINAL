import { useMemo, useState } from 'react'
import { Users, Truck, Wallet, Pill, FileText, DatabaseBackup, Download, Plus, ArrowUpDown, ChevronDown } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Transaction } from '../lib/types'
import { Empty, Field, Modal, PageHead, Pager, StatCard, usePaged, useToast } from '../components/ui'
import { BARANGAYS, fmtDate, fmtMonth, fmtNum, fmtPeso, isoDate, saveFile, toCSV } from '../lib/utils'
import { COLLECTIONS } from '../lib/types'
import { HealthMap, DeploymentPlanner, AuditLog } from './AnalyticsTabs'

const PALETTE = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)']
const prevMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const pctChange = (now: number, before: number) => (before ? ((now - before) / before) * 100 : now ? 100 : 0)
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}% vs last month`

function Donut({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0)
  const R = 70
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 180 180" className="donut" role="img" aria-label="Top services share">
        <circle cx="90" cy="90" r={R} fill="none" stroke="var(--line)" strokeWidth="26" />
        {total > 0 &&
          parts.map((p, i) => {
            const len = (p.value / total) * C
            const el = (
              <circle key={p.label} cx="90" cy="90" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="26"
                strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)">
                <title>{`${p.label}: ${Math.round((p.value / total) * 100)}%`}</title>
              </circle>
            )
            offset += len
            return el
          })}
        <text x="90" y="86" textAnchor="middle" className="donut-num">{total}</text>
        <text x="90" y="106" textAnchor="middle" className="donut-cap">transactions</text>
      </svg>
      <ul className="legend">
        {parts.map((p, i) => (
          <li key={p.label}>
            <span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="grow">{p.label}</span>
            <b>{total ? Math.round((p.value / total) * 100) : 0}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Analytics() {
  const [tab, setTab] = useState<'overview' | 'map' | 'plan' | 'audit'>('overview')
  const store = useStore()
  const { data, add, readOnly } = store
  const toast = useToast()
  const months = useMemo(() => {
    const set = new Set<string>([isoDate().slice(0, 7)])
    data.transactions.forEach((t) => set.add(t.date.slice(0, 7)))
    data.dispensings.forEach((d) => set.add(d.date.slice(0, 7)))
    return [...set].sort().reverse()
  }, [data.transactions, data.dispensings])
  const latestWithData = useMemo(() => [...data.transactions].sort((a, b) => b.date.localeCompare(a.date))[0]?.date.slice(0, 7), [data.transactions])
  const [month, setMonth] = useState<string>('')
  const [brgy, setBrgy] = useState('')
  const [svc, setSvc] = useState('')
  const [newestFirst, setNewestFirst] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [tx, setTx] = useState({ service: '', residentName: '', doctor: '', barangay: BARANGAYS[0], amount: '' })
  const [err, setErr] = useState('')
  const [copyText, setCopyText] = useState<{ title: string; text: string } | null>(null)

  const m = month || latestWithData || isoDate().slice(0, 7)
  const services = [...new Set(data.transactions.map((t) => t.service))].sort()
  const residentBrgy = useMemo(() => new Map(data.residents.map((r) => [r.name, r.barangay])), [data.residents])

  const filterTx = (ym: string) => data.transactions.filter((t) => t.date.startsWith(ym) && (!brgy || t.barangay === brgy) && (!svc || t.service === svc))
  const filterDisp = (ym: string) =>
    data.dispensings.filter((d) => d.status === 'COMPLETED' && d.date.startsWith(ym) && (!brgy || residentBrgy.get(d.residentName) === brgy))

  const cur = filterTx(m)
  const prev = filterTx(prevMonth(m))
  const served = new Set(cur.map((t) => t.residentName)).size
  const servedPrev = new Set(prev.map((t) => t.residentName)).size
  const amount = cur.reduce((a, t) => a + t.amount, 0)
  const amountPrev = prev.reduce((a, t) => a + t.amount, 0)
  const qty = (list: typeof data.dispensings) => list.reduce((a, d) => a + d.items.reduce((b, i) => b + i.qty, 0), 0)
  const dispensed = qty(filterDisp(m))
  const dispensedPrev = qty(filterDisp(prevMonth(m)))
  const botikaSvcs = data.services.filter((s) => s.date.startsWith(m) && /botika/i.test(s.name))
  const deployments = botikaSvcs.length + data.units.filter((u) => u.kind === 'Rolling Botika' && u.status !== 'CLOSED').length
  const onSchedule = botikaSvcs.length ? Math.round((botikaSvcs.filter((s) => s.status !== 'SCHEDULED' || s.date >= isoDate()).length / botikaSvcs.length) * 100) : 100

  const top = useMemo(() => {
    const c = new Map<string, number>()
    cur.forEach((t) => c.set(t.service, (c.get(t.service) ?? 0) + 1))
    const sorted = [...c.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
    if (sorted.length > 5) {
      const rest = sorted.slice(4).reduce((a, p) => a + p.value, 0)
      return [...sorted.slice(0, 4), { label: 'Other', value: rest }]
    }
    return sorted
  }, [cur])

  const audit = useMemo(() => [...cur].sort((a, b) => (newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))), [cur, newestFirst])
  const paged = usePaged(audit, 6, m + brgy + svc + newestFirst)

  const txRows = (list: Transaction[]) =>
    list.map((t) => ({ transaction_id: t.txId, date: t.date.slice(0, 10), service: t.service, resident: t.residentName, doctor: t.doctor, barangay: t.barangay, amount_php: t.amount.toFixed(2) }))

  async function exportFile(filename: string, text: string, title: string, mime: string) {
    try {
      await saveFile(filename, text, mime)
      toast(`${filename} ready`)
    } catch {
      setCopyText({ title, text })
    }
  }

  function generateReport() {
    const rows = [
      { metric: 'Report period', value: fmtMonth(m) },
      { metric: 'Barangay', value: brgy || 'All' },
      { metric: 'Service', value: svc || 'All' },
      { metric: 'Residents served', value: served },
      { metric: 'Medicine units dispensed', value: dispensed },
      { metric: 'Amount collected (PHP)', value: amount.toFixed(2) },
      { metric: 'Botika deployments', value: deployments },
      ...top.map((t) => ({ metric: `Service share: ${t.label}`, value: `${Math.round((t.value / Math.max(1, cur.length)) * 100)}%` })),
    ]
    exportFile(`smilecare-report-${m}.csv`, toCSV(rows), 'Report (CSV)', 'text/csv')
  }

  async function recordTx() {
    setErr('')
    const amt = Number(tx.amount)
    if (!tx.service.trim() || !tx.residentName.trim()) return setErr('Service and resident are required.')
    if (!(amt >= 0)) return setErr('Enter a valid amount.')
    const now = new Date()
    const prefix = now.toLocaleString('en-US', { month: 'short' }).toUpperCase() + String(now.getFullYear()).slice(2) + String(now.getDate()).padStart(2, '0')
    const n = data.transactions.filter((t) => t.txId.startsWith(prefix + '#')).length + 1
    try {
      await add('transactions', { txId: `${prefix}#${String(n).padStart(3, '0')}`, service: tx.service.trim(), residentName: tx.residentName.trim(), doctor: tx.doctor.trim() || '—', barangay: tx.barangay, amount: amt, date: now.toISOString() })
      toast('Transaction recorded')
      setTxOpen(false)
      setMonth(now.toISOString().slice(0, 7))
    } catch (e: any) {
      setErr(e.message)
    }
  }

  return (
    <div className="page">
      <PageHead title="Analytics & Reports" subtitle="Health service needs, service utilization, important data. All in one place."
        actions={tab === 'overview' && <button className="btn btn-primary" onClick={generateReport}><FileText size={18} /> Generate report</button>} />

      <div className="tabs" role="tablist">
        {([['overview', 'Overview'], ['map', 'Health mapping'], ['plan', 'Deployment planner'], ['audit', 'System audit trail']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'map' && <HealthMap />}
      {tab === 'plan' && <DeploymentPlanner onSchedule={(b) => { toast(`Add the Brgy. ${b} visit in Health Services`); window.location.hash = 'services' }} />}
      {tab === 'audit' && <AuditLog />}
      {tab === 'overview' && (<>
      <div className="filters filters-inline">
        <div className="select-wrap">
          <select value={m} onChange={(e) => setMonth(e.target.value)} aria-label="Month">{months.map((x) => <option key={x} value={x}>{fmtMonth(x)}</option>)}</select>
          <ChevronDown size={16} />
        </div>
        <div className="select-wrap">
          <select value={brgy} onChange={(e) => setBrgy(e.target.value)} aria-label="Barangay"><option value="">All barangays</option>{BARANGAYS.map((b) => <option key={b} value={b}>Barangay {b}</option>)}</select>
          <ChevronDown size={16} />
        </div>
        <div className="select-wrap">
          <select value={svc} onChange={(e) => setSvc(e.target.value)} aria-label="Service"><option value="">All services</option>{services.map((s) => <option key={s}>{s}</option>)}</select>
          <ChevronDown size={16} />
        </div>
      </div>

      <div className="stats">
        <StatCard icon={<Users size={24} />} label="Residents Served" value={fmtNum(served)} note={<span className={served >= servedPrev ? 'up' : 'down'}>{fmtPct(pctChange(served, servedPrev))}</span>} />
        <StatCard icon={<Truck size={24} />} tone="blue" label="Botika Deployments" value={deployments} note={`${onSchedule}% on schedule`} />
        <StatCard icon={<Wallet size={24} />} tone="violet" label="Amount Collected" value={fmtPeso(amount)} note={<span className={amount >= amountPrev ? 'up' : 'down'}>{fmtPct(pctChange(amount, amountPrev))}</span>} />
        <StatCard icon={<Pill size={24} />} tone="orange" label="Medicine Dispensed" value={fmtNum(dispensed)} note={<span className={dispensed >= dispensedPrev ? 'up' : 'down'}>{fmtPct(pctChange(dispensed, dispensedPrev))}</span>} />
      </div>

      <div className="analytics-grid">
        <section className="card">
          <div className="card-head"><h3>Top Services</h3><span className="muted small">{fmtMonth(m)}</span></div>
          {top.length ? <Donut parts={top} /> : <Empty text="No transactions for this period." />}
        </section>

        <section className="card">
          <div className="card-head wrap">
            <div><h3>Audit Trail</h3><p className="muted small">Payments and services recorded in {fmtMonth(m)}</p></div>
            <div className="btn-row">
              <button className="btn btn-outline sm" onClick={() => setNewestFirst((v) => !v)}><ArrowUpDown size={15} /> {newestFirst ? 'Newest first' : 'Oldest first'}</button>
              {!readOnly && <button className="btn btn-outline sm" onClick={() => { setErr(''); setTx({ service: '', residentName: '', doctor: '', barangay: BARANGAYS[0], amount: '' }); setTxOpen(true) }}><Plus size={15} /> Record</button>}
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Transaction ID</th><th>Details</th><th className="right">Amount Paid (₱)</th></tr></thead>
              <tbody>
                {paged.slice.map((t) => (
                  <tr key={t.id}>
                    <td className="mono">{t.txId}<div className="muted small">{fmtDate(t.date)}</div></td>
                    <td><b>{t.service}</b><div className="muted small">Resident name: {t.residentName}</div><div className="muted small">Assigned Doctor: {t.doctor}</div></td>
                    <td className="right"><b>{fmtPeso(t.amount)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {audit.length === 0 && <Empty text="No transactions match these filters." />}
          </div>
          <Pager {...paged} onPage={paged.setPage} />
          <div className="btn-row end">
            <button className="btn btn-outline" onClick={() => exportFile(`smilecare-backup-${isoDate()}.json`, JSON.stringify(Object.fromEntries(COLLECTIONS.map((c) => [c, data[c]])), null, 2), 'Backup (JSON)', 'application/json')}>
              <DatabaseBackup size={17} /> Backup Transaction History
            </button>
            <button className="btn btn-primary" onClick={() => exportFile(`smilecare-transactions-${m}.csv`, toCSV(txRows(audit)), 'Transactions (CSV)', 'text/csv')} disabled={!audit.length}>
              <Download size={17} /> Download Transaction History
            </button>
          </div>
        </section>
      </div>
      </>)}

      <Modal open={txOpen} title="Record transaction" subtitle="Adds an entry to the transaction history" onClose={() => setTxOpen(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setTxOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={recordTx}>Record</button></>}>
        <div className="form-grid">
          <Field label="Service">
            <input list="tx-services" value={tx.service} onChange={(e) => setTx({ ...tx, service: e.target.value })} placeholder="General Consultation" />
            <datalist id="tx-services">{[...new Set([...services, ...data.services.map((s) => s.name)])].map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Resident name">
            <input list="tx-residents" value={tx.residentName} onChange={(e) => { const r = data.residents.find((x) => x.name === e.target.value); setTx({ ...tx, residentName: e.target.value, ...(r ? { barangay: r.barangay } : {}) }) }} />
            <datalist id="tx-residents">{data.residents.map((r) => <option key={r.id} value={r.name} />)}</datalist>
          </Field>
          <Field label="Assigned doctor"><input value={tx.doctor} onChange={(e) => setTx({ ...tx, doctor: e.target.value })} /></Field>
          <Field label="Barangay"><select value={tx.barangay} onChange={(e) => setTx({ ...tx, barangay: e.target.value })}>{BARANGAYS.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="Amount paid (₱)"><input type="number" min={0} step="0.01" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} /></Field>
          {err && <div className="alert alert-err span-2">{err}</div>}
        </div>
      </Modal>

      <Modal open={!!copyText} wide title={copyText?.title || ''} subtitle="Downloads aren't available here. Copy the data below instead." onClose={() => setCopyText(null)}
        footer={<button className="btn btn-primary" onClick={async () => { try { await navigator.clipboard.writeText(copyText!.text); toast('Copied to clipboard') } catch { toast('Select the text and copy it manually', 'err') } }}>Copy</button>}>
        <textarea className="copy-area" readOnly value={copyText?.text || ''} onFocus={(e) => e.currentTarget.select()} />
      </Modal>
    </div>
  )
}
