import { useMemo, useState } from 'react'
import { Syringe, CalendarClock, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Vaccination } from '../lib/types'
import type { Session } from '../lib/auth'
import { Icon } from '../components/Icon'
import { RowMenu, Confirm, Empty, Field, Modal, PageHead, Pager, StatCard, Toolbar, usePaged, useToast } from '../components/ui'
import { fmtDate, isoDate } from '../lib/utils'

const VACCINES = ['Influenza', 'Pneumococcal (PPV23)', 'Pneumococcal (PCV13)', 'Tetanus-diphtheria (Td)', 'Hepatitis B', 'HPV', 'Measles-Rubella (MR)', 'Anti-rabies']
const DOSES = ['1st dose', '2nd dose', '3rd dose', 'Booster', 'Annual dose']
type Draft = Omit<Vaccination, 'id'>

export default function Vaccinations({ session }: { session: Session }) {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [vaccine, setVaccine] = useState('')
  const [editing, setEditing] = useState<{ id?: string; draft: Draft; residentQ: string } | null>(null)
  const [deleting, setDeleting] = useState<Vaccination | null>(null)
  const [err, setErr] = useState('')
  const today = isoDate()
  const month = today.slice(0, 7)

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.vaccinations
      .filter((v) => !vaccine || v.vaccine === vaccine)
      .filter((v) => !s || `${v.residentName} ${v.vaccine} ${v.lot ?? ''} ${v.location}`.toLowerCase().includes(s))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.vaccinations, q, vaccine])
  const paged = usePaged(rows, 8, q + vaccine)
  const dueSoon = data.vaccinations.filter((v) => v.nextDose && v.nextDose >= today && v.nextDose <= isoDate(new Date(Date.now() + 30 * 86400000)))
  const vaccines = [...new Set([...VACCINES, ...data.vaccinations.map((v) => v.vaccine)])]

  const blank = (): Draft => ({ residentName: '', vaccine: VACCINES[0], dose: DOSES[0], date: new Date().toISOString().slice(0, 16), location: 'Municipal Health Office', administeredBy: session.name })

  async function save() {
    if (!editing) return
    const d = editing.draft
    const v = editing.residentQ.trim().toLowerCase()
    const r = data.residents.find((x) => x.healthId.toLowerCase() === v || x.name.toLowerCase() === v)
    if (!r) return setErr('Find the resident by Health ID or full name.')
    if (r.status !== 'APPROVED') return setErr(`${r.name} is not yet a verified resident.`)
    try {
      const row: Draft = { ...d, residentId: r.id, residentName: r.name, barangay: r.barangay, date: new Date(d.date).toISOString() }
      if (!row.nextDose) delete row.nextDose
      if (editing.id) await update('vaccinations', editing.id, row)
      else await add('vaccinations', row)
      toast(editing.id ? 'Vaccination updated' : 'Vaccination recorded')
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  const set = (k: keyof Draft, v: string) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))

  return (
    <div className="page">
      <PageHead title="Vaccinations" subtitle="Record vaccination services and keep each resident's vaccination history." />
      <div className="stats stats-3">
        <StatCard icon={<Syringe size={24} />} label="Vaccinations this month" value={data.vaccinations.filter((v) => v.date.startsWith(month)).length} note={`${data.vaccinations.length} on record`} />
        <StatCard icon={<Users size={24} />} label="Residents vaccinated" value={new Set(data.vaccinations.map((v) => v.residentId ?? v.residentName)).size} note="Unique residents" />
        <StatCard icon={<CalendarClock size={24} />} label="Next doses due" value={dueSoon.length} note="Within 30 days" />
      </div>
      <Toolbar search={q} onSearch={setQ} placeholder="Search vaccinations..." status={vaccine} onStatus={setVaccine} statuses={vaccines} allLabel="All vaccines"
        action={!readOnly && <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: blank(), residentQ: '' }) }}><Icon name="add" /> Record vaccination</button>} />
      <section className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Resident</th><th>Vaccine</th><th>Dose</th><th>Administered by</th><th>Next dose</th><th className="right"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {paged.slice.map((v) => (
                <tr key={v.id}>
                  <td>{fmtDate(v.date)}</td>
                  <td><b>{v.residentName}</b><div className="muted small">Brgy. {v.barangay ?? '—'}</div></td>
                  <td>{v.vaccine}{v.lot && <div className="muted small">Lot {v.lot}</div>}</td>
                  <td>{v.dose}</td>
                  <td>{v.administeredBy}<div className="muted small">{v.location}</div></td>
                  <td>{v.nextDose ? <span className={`badge ${v.nextDose < today ? 'badge-red' : 'badge-blue'}`}>{fmtDate(v.nextDose)}</span> : '—'}</td>
                  <td className="right">
                    {!readOnly && (
                      <RowMenu label={`Actions for vaccination of ${v.residentName}`} items={[
                        { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: v.id, draft: { ...v, date: v.date.slice(0, 16) }, residentQ: data.residents.find((r) => r.id === v.residentId)?.healthId ?? v.residentName }) } },
                        { label: 'Delete', onClick: () => setDeleting(v), danger: true },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text={data.vaccinations.length ? 'No vaccinations match your search.' : 'No vaccinations recorded yet.'} />}
        </div>
        <Pager {...paged} onPage={paged.setPage} />
      </section>

      <Modal open={!!editing} title={editing?.id ? 'Edit vaccination' : 'Record vaccination'} onClose={() => setEditing(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        {editing && (
          <div className="form-grid">
            <div className="span-2">
              <Field label="Resident (Health ID or full name)">
                <input list="vac-residents" value={editing.residentQ} onChange={(e) => setEditing({ ...editing, residentQ: e.target.value })} placeholder="SC-TAY-2024-…" />
                <datalist id="vac-residents">{data.residents.filter((r) => r.status === 'APPROVED').map((r) => <option key={r.id} value={r.healthId}>{r.name}</option>)}</datalist>
              </Field>
            </div>
            <Field label="Vaccine">
              <input list="vac-list" value={editing.draft.vaccine} onChange={(e) => set('vaccine', e.target.value)} />
              <datalist id="vac-list">{vaccines.map((v) => <option key={v} value={v} />)}</datalist>
            </Field>
            <Field label="Dose"><select value={editing.draft.dose} onChange={(e) => set('dose', e.target.value)}>{DOSES.map((d) => <option key={d}>{d}</option>)}</select></Field>
            <Field label="Date & time"><input type="datetime-local" value={editing.draft.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Lot number"><input value={editing.draft.lot ?? ''} onChange={(e) => set('lot', e.target.value)} /></Field>
            <Field label="Location"><input value={editing.draft.location} onChange={(e) => set('location', e.target.value)} /></Field>
            <Field label="Administered by"><input value={editing.draft.administeredBy} onChange={(e) => set('administeredBy', e.target.value)} /></Field>
            <Field label="Next dose due (optional)"><input type="date" value={editing.draft.nextDose ?? ''} onChange={(e) => set('nextDose', e.target.value)} /></Field>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>
      <Confirm open={!!deleting} title="Delete vaccination?" text={`The vaccination record of ${deleting?.residentName} will be deleted.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('vaccinations', deleting.id); toast('Vaccination deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
