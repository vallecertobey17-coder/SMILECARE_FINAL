import { useMemo, useState } from 'react'
import { Download, HeartPulse, Pill, Stethoscope, Syringe } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useResident } from './context'
import { Empty, useToast } from '../../components/ui'
import { fmtDate, saveFile } from '../../lib/utils'
import { residentHistory, type HistoryKind } from '../../lib/domain'

const TABS: { id: 'all' | HistoryKind; label: string }[] = [
  { id: 'all', label: 'All records' },
  { id: 'consultation', label: 'Consultations' },
  { id: 'medicine', label: 'Medicines' },
  { id: 'vaccination', label: 'Vaccinations' },
]

export default function RHistory() {
  const { data } = useStore()
  const { resident } = useResident()
  const toast = useToast()
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all')
  const all = useMemo(() => residentHistory(data, resident), [data, resident])
  const items = tab === 'all' ? all : all.filter((h) => h.kind === tab)

  const mineC = data.consultations.filter((c) => c.residentId === resident.id || c.residentName === resident.name).sort((a, b) => b.date.localeCompare(a.date))
  const lastBp = mineC.find((c) => c.bp)
  const year = new Date().getFullYear()
  const thisYear = mineC.filter((c) => c.date.startsWith(String(year))).length
  const lastYear = mineC.filter((c) => c.date.startsWith(String(year - 1))).length
  const since = new Date(Date.now() - 90 * 86400000).toISOString()
  const activeMeds = new Set(
    data.dispensings
      .filter((d) => (d.residentId === resident.id || d.residentName === resident.name) && d.status === 'COMPLETED' && d.date >= since)
      .flatMap((d) => d.items.map((i) => i.medicineId)),
  ).size

  async function download() {
    const lines = [
      'SMILECare Health Summary',
      `Municipality of Taytay • Generated ${new Date().toLocaleString('en-PH')}`,
      '',
      `Name: ${resident.name}`,
      `Health ID: ${resident.healthId}`,
      `Barangay: ${resident.barangay}`,
      resident.birthdate ? `Date of birth: ${fmtDate(resident.birthdate)}` : '',
      '',
      `Last blood pressure: ${lastBp?.bp ?? 'none recorded'}`,
      `Consultations this year: ${thisYear}`,
      '',
      'RECORDS',
      ...all.map((h) => `${fmtDate(h.date)} | ${h.kind.toUpperCase()} | ${h.title}${h.detail ? ' | ' + h.detail : ''} | ${h.where}`),
    ].filter((l) => l !== undefined)
    try {
      await saveFile(`smilecare-health-summary-${resident.healthId}.txt`, lines.join('\n'))
      toast('Health summary ready')
    } catch {
      toast('Download was cancelled', 'err')
    }
  }

  const icon = (k: HistoryKind) => (k === 'medicine' ? <Pill size={20} /> : k === 'vaccination' ? <Syringe size={20} /> : <Stethoscope size={20} />)

  return (
    <div className="page rpage">
      <div className="page-head">
        <div>
          <h1 className="rtitle">Health history</h1>
          <p>Your secure, complete record of care.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={download}>
            <Download size={18} /> Download summary
          </button>
        </div>
      </div>

      <div className="stats stats-3">
        <div className="stat">
          <div className="stat-icon">
            <HeartPulse size={24} />
          </div>
          <div className="stat-body">
            <div className="stat-label">Last blood pressure</div>
            <div className="stat-value">{lastBp?.bp ?? '—'}</div>
            <div className="stat-note">{lastBp ? new Date(lastBp.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'No reading yet'}</div>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon">
            <Pill size={24} />
          </div>
          <div className="stat-body">
            <div className="stat-label">Active medicines</div>
            <div className="stat-value">{activeMeds}</div>
            <div className="stat-note">Received in the last 90 days</div>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon">
            <Stethoscope size={24} />
          </div>
          <div className="stat-body">
            <div className="stat-label">Consultations this year</div>
            <div className="stat-value">{thisYear}</div>
            <div className="stat-note">
              {thisYear - lastYear >= 0 ? '+' : ''}
              {thisYear - lastYear} vs last year
            </div>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <section className="card">
        {items.length === 0 && <Empty text="No records yet. Your consultations, medicines and vaccinations will appear here." />}
        <div className="timeline">
          {items.map((h) => (
            <div key={h.id} className="tl-item">
              <span className="tl-date">{fmtDate(h.date)}</span>
              <span className="quick-ic">{icon(h.kind)}</span>
              <span className="grow">
                <span className="tag">{h.kind === 'medicine' ? 'MEDICINE DISPENSED' : h.kind.toUpperCase()}</span>
                <b>{h.title}</b>
                {h.detail && <small>{h.detail}</small>}
                <small className="muted">{h.where}</small>
              </span>
              {h.status && <span className={`pill ${h.status === 'COMPLETED' ? 'pill-ok' : h.status === 'PENDING' ? 'pill-wait' : 'pill-no'}`}>{h.status === 'COMPLETED' ? 'Released' : h.status.charAt(0) + h.status.slice(1).toLowerCase()}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
