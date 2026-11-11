import { useMemo, useState } from 'react'
import { Stethoscope, Droplet, HeartPulse } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Consultation } from '../lib/types'
import type { Session } from '../lib/auth'
import { Icon } from '../components/Icon'
import { RowMenu, Confirm, Empty, Field, Modal, PageHead, Pager, StatCard, Toolbar, usePaged, useToast } from '../components/ui'
import { fmtDate, isoDate } from '../lib/utils'

const TYPES = ['Free Consultation', 'Rapid Blood Sugar Screening', 'Eye Check-up', 'Dental Check-up']
type Draft = Omit<Consultation, 'id'>

export const bpHigh = (bp?: string) => {
  const m = bp?.match(/(\d+)\s*\/\s*(\d+)/)
  return !!m && (Number(m[1]) >= 140 || Number(m[2]) >= 90)
}
export const sugarHigh = (v?: number) => (v ?? 0) >= 126

export default function Consultations({ session }: { session: Session }) {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loc, setLoc] = useState('')
  const [editing, setEditing] = useState<{ id?: string; draft: Draft; residentQ: string } | null>(null)
  const [deleting, setDeleting] = useState<Consultation | null>(null)
  const [err, setErr] = useState('')

  const today = isoDate()
  const locations = [...new Set(['Municipal Health Office', ...data.units.map((u) => u.name), ...data.consultations.map((c) => c.location)])]
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.consultations
      .filter((c) => !type || c.type === type)
      .filter((c) => !loc || c.location === loc)
      .filter((c) => !s || `${c.residentName} ${c.complaint ?? ''} ${c.findings ?? ''} ${c.doctor}`.toLowerCase().includes(s))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.consultations, q, type, loc])
  const paged = usePaged(rows, 8, q + type + loc)

  const blank = (): Draft => ({ residentName: '', date: new Date().toISOString().slice(0, 16), type: TYPES[0], doctor: session.role === 'Municipal Health Doctor' ? session.name : '', location: data.units.find((u) => u.status !== 'CLOSED')?.name ?? 'Municipal Health Office' })

  async function save() {
    if (!editing) return
    const d = editing.draft
    const v = editing.residentQ.trim().toLowerCase()
    const r = data.residents.find((x) => x.healthId.toLowerCase() === v || x.name.toLowerCase() === v)
    if (!r) return setErr('Find the resident by Health ID or full name (register walk-ins under Residents first).')
    if (!d.doctor.trim()) return setErr('Enter the attending health personnel.')
    if (d.bp && !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(d.bp)) return setErr('Blood pressure should look like 120/80.')
    try {
      const unit = data.units.find((u) => u.name === d.location)
      const row: Draft = { ...d, residentId: r.id, residentName: r.name, barangay: r.barangay, date: new Date(d.date).toISOString(), ...(unit ? { unitId: unit.id } : {}) }
      if (editing.id) await update('consultations', editing.id, row)
      else await add('consultations', row)
      toast(editing.id ? 'Consultation updated' : 'Consultation recorded')
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  const set = (k: keyof Draft, v: string | number | undefined) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))

  return (
    <div className="page">
      <PageHead title="Consultations" subtitle="Record and manage consultations and screenings conducted during Rolling Botika deployments." />
      <div className="stats stats-3">
        <StatCard icon={<Stethoscope size={24} />} label="Consultations today" value={data.consultations.filter((c) => c.date.startsWith(today)).length} note={`${data.consultations.length} on record`} />
        <StatCard icon={<HeartPulse size={24} />} label="High blood pressure" value={data.consultations.filter((c) => bpHigh(c.bp)).length} note="Readings ≥ 140/90" />
        <StatCard icon={<Droplet size={24} />} label="High blood sugar" value={data.consultations.filter((c) => sugarHigh(c.bloodSugar)).length} note="Results ≥ 126 mg/dL" />
      </div>
      <Toolbar search={q} onSearch={setQ} placeholder="Search consultations..." status={type} onStatus={setType} statuses={TYPES} allLabel="All services"
        filtersOpen={showFilters} onToggleFilters={() => setShowFilters((v) => !v)} filterCount={loc ? 1 : 0}
        action={!readOnly && <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: blank(), residentQ: '' }) }}><Icon name="add" /> Record consultation</button>} />
      {showFilters && (
        <div className="filters">
          <Field label="Location">
            <select value={loc} onChange={(e) => setLoc(e.target.value)}>
              <option value="">All locations</option>
              {locations.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <button className="btn btn-ghost" onClick={() => setLoc('')}>Clear filters</button>
        </div>
      )}
      <section className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Resident</th><th>Service</th><th>Vitals</th><th>Findings</th><th>Attended by</th><th className="right"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {paged.slice.map((c) => (
                <tr key={c.id}>
                  <td>{fmtDate(c.date)}<div className="muted small">{new Date(c.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div></td>
                  <td><b>{c.residentName}</b><div className="muted small">Brgy. {c.barangay ?? '—'}</div></td>
                  <td>{c.type}{c.complaint && <div className="muted small">{c.complaint}</div>}</td>
                  <td>
                    {c.bp && <div><span className={`badge ${bpHigh(c.bp) ? 'badge-red' : 'badge-green'}`}>BP {c.bp}</span></div>}
                    {c.bloodSugar != null && <div><span className={`badge ${sugarHigh(c.bloodSugar) ? 'badge-red' : c.bloodSugar >= 100 ? 'badge-amber' : 'badge-green'}`}>{c.bloodSugar} mg/dL</span></div>}
                    {!c.bp && c.bloodSugar == null && <span className="muted">—</span>}
                  </td>
                  <td>{c.findings || '—'}{c.advice && <div className="muted small">{c.advice}</div>}</td>
                  <td>{c.doctor}<div className="muted small">{c.location}</div></td>
                  <td className="right">
                    {!readOnly && (
                      <RowMenu label={`Actions for consultation of ${c.residentName}`} items={[
                        { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: c.id, draft: { ...c, date: c.date.slice(0, 16) }, residentQ: data.residents.find((r) => r.id === c.residentId)?.healthId ?? c.residentName }) } },
                        { label: 'Delete', onClick: () => setDeleting(c), danger: true },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text={data.consultations.length ? 'No consultations match your search.' : 'No consultations recorded yet.'} />}
        </div>
        <Pager {...paged} onPage={paged.setPage} />
      </section>

      <Modal open={!!editing} wide title={editing?.id ? 'Edit consultation' : 'Record consultation'} subtitle="Consultation or screening transaction" onClose={() => setEditing(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        {editing && (
          <div className="form-grid">
            <Field label="Resident (Health ID or full name)">
              <input list="cons-residents" value={editing.residentQ} onChange={(e) => setEditing({ ...editing, residentQ: e.target.value })} placeholder="SC-TAY-2024-…" />
              <datalist id="cons-residents">{data.residents.filter((r) => r.status === 'APPROVED').map((r) => <option key={r.id} value={r.healthId}>{r.name}</option>)}</datalist>
            </Field>
            <Field label="Service">
              <select value={editing.draft.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Date & time"><input type="datetime-local" value={editing.draft.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Location">
              <input list="cons-locs" value={editing.draft.location} onChange={(e) => set('location', e.target.value)} />
              <datalist id="cons-locs">{locations.map((l) => <option key={l} value={l} />)}</datalist>
            </Field>
            <Field label="Chief complaint"><input value={editing.draft.complaint ?? ''} onChange={(e) => set('complaint', e.target.value)} placeholder="e.g. Headache, follow-up" /></Field>
            <Field label="Attending health personnel"><input value={editing.draft.doctor} onChange={(e) => set('doctor', e.target.value)} /></Field>
            <Field label="Blood pressure (mmHg)"><input value={editing.draft.bp ?? ''} onChange={(e) => set('bp', e.target.value)} placeholder="120/80" /></Field>
            <Field label="Blood sugar (mg/dL)"><input type="number" value={editing.draft.bloodSugar ?? ''} onChange={(e) => set('bloodSugar', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="e.g. 98" /></Field>
            <div className="span-2"><Field label="Findings / assessment"><input value={editing.draft.findings ?? ''} onChange={(e) => set('findings', e.target.value)} /></Field></div>
            <div className="span-2"><Field label="Advice / plan"><input value={editing.draft.advice ?? ''} onChange={(e) => set('advice', e.target.value)} /></Field></div>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>
      <Confirm open={!!deleting} title="Delete consultation?" text={`The consultation record of ${deleting?.residentName} will be deleted.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('consultations', deleting.id); toast('Consultation deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
