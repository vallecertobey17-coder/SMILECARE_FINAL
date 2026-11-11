import { useMemo, useState } from 'react'
import { Users, Clock, UserX } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Resident, ResidentStatus } from '../lib/types'
import { Icon } from '../components/Icon'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, Pager, StatCard, Toolbar, usePaged, useToast } from '../components/ui'
import { BARANGAYS, fmtDate, fmtNum, isoDate } from '../lib/utils'

const STATUSES: ResidentStatus[] = ['APPROVED', 'PENDING', 'REJECTED']
type Draft = Omit<Resident, 'id'>
const blank = (): Draft => ({ name: '', healthId: '', barangay: BARANGAYS[0], status: 'PENDING', registered: isoDate(), contact: '', birthdate: '', address: '' })

export default function Residents() {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [brgy, setBrgy] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [viewing, setViewing] = useState<Resident | null>(null)
  const [deleting, setDeleting] = useState<Resident | null>(null)
  const [err, setErr] = useState('')

  const month = isoDate().slice(0, 7)
  const pending = data.residents.filter((r) => r.status === 'PENDING')
  const oldest = pending.reduce<string | null>((o, r) => (!o || r.registered < o ? r.registered : o), null)
  const oldestDays = oldest ? Math.max(0, Math.round((Date.now() - new Date(oldest + 'T00:00:00').getTime()) / 86400000)) : 0

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.residents
      .filter((r) => !status || r.status === status)
      .filter((r) => !brgy || r.barangay === brgy)
      .filter((r) => !from || r.registered >= from)
      .filter((r) => !to || r.registered <= to)
      .filter((r) => !s || [r.name, r.healthId, r.barangay].some((v) => v?.toLowerCase().includes(s)))
      .sort((a, b) => b.registered.localeCompare(a.registered) || a.name.localeCompare(b.name))
  }, [data.residents, q, status, brgy, from, to])
  const paged = usePaged(rows, 8, q + status + brgy + from + to)
  const filterCount = [brgy, from, to].filter(Boolean).length

  const nextHealthId = () => {
    const nums = data.residents.map((r) => parseInt(r.healthId.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n))
    return 'SC-' + String((nums.length ? Math.max(...nums) : 18000) + 1).padStart(6, '0')
  }

  async function save() {
    if (!editing) return
    const d = editing.draft
    if (!d.name.trim()) return setErr('Full name is required.')
    if (!d.healthId.trim()) return setErr('Health ID is required.')
    if (data.residents.some((r) => r.healthId === d.healthId.trim() && r.id !== editing.id)) return setErr('This Health ID is already in use.')
    try {
      const clean = { ...d, name: d.name.trim(), healthId: d.healthId.trim() }
      if (editing.id) await update('residents', editing.id, clean)
      else await add('residents', clean)
      toast(editing.id ? 'Resident updated' : 'Resident added')
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function setResidentStatus(r: Resident, s: ResidentStatus) {
    try {
      await update('residents', r.id, { status: s })
      toast(`${r.name} ${s === 'APPROVED' ? 'approved' : s === 'REJECTED' ? 'rejected' : 'set to pending'}`)
      setViewing((v) => (v && v.id === r.id ? { ...v, status: s } : v))
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  const set = (k: keyof Draft, v: string) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))

  return (
    <div className="page">
      <PageHead title="Residents & verification" subtitle="Review resident profiles and verification requests." />
      <div className="stats stats-3">
        <StatCard icon={<Users size={24} />} label="Registered residents" value={fmtNum(data.residents.length)} note={`+${data.residents.filter((r) => r.registered?.startsWith(month)).length} this month`} onClick={() => setStatus('')} active={status === ''} />
        <StatCard icon={<Clock size={24} />} tone="amber" label="Pending review" value={pending.length} note={oldest ? `Oldest: ${oldestDays} day${oldestDays === 1 ? '' : 's'}` : 'None waiting'} onClick={() => setStatus('PENDING')} active={status === 'PENDING'} />
        <StatCard icon={<UserX size={24} />} tone="red" label="Rejected" value={data.residents.filter((r) => r.status === 'REJECTED').length} note={`${data.residents.filter((r) => r.status === 'REJECTED' && r.registered?.startsWith(month)).length} this month`} onClick={() => setStatus('REJECTED')} active={status === 'REJECTED'} />
      </div>

      <Toolbar
          search={q}
          onSearch={setQ}
          placeholder="Search Resident..."
          status={status}
          onStatus={setStatus}
          statuses={STATUSES}
          filtersOpen={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
          filterCount={filterCount}
          action={
            !readOnly && (
              <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: { ...blank(), healthId: nextHealthId() } }) }}>
                <Icon name="add" /> Add Residents
              </button>
            )
          }
        />
        {showFilters && (
          <div className="filters">
            <Field label="Barangay">
              <select value={brgy} onChange={(e) => setBrgy(e.target.value)}>
                <option value="">All barangays</option>
                {BARANGAYS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Registered from">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Registered to">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <button className="btn btn-ghost" onClick={() => { setBrgy(''); setFrom(''); setTo('') }}>Clear filters</button>
          </div>
        )}

        <section className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Health ID</th>
                <th>Barangay</th>
                <th>Status</th>
                <th>Registered</th>
                <th className="right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {paged.slice.map((r) => (
                <tr key={r.id} onClick={() => setViewing(r)} className="clickable">
                  <td>
                    <div className="person">
                      <span className="avatar sm">{r.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                      <b>{r.name}</b>
                    </div>
                  </td>
                  <td className="mono">{r.healthId}</td>
                  <td>{r.barangay}</td>
                  <td><Badge status={r.status} /></td>
                  <td>{fmtDate(r.registered)}</td>
                  <td className="right" onClick={(e) => e.stopPropagation()}>
                    <RowMenu label={`Actions for ${r.name}`} items={[
                      { label: 'View profile', onClick: () => setViewing(r) },
                      { label: 'Approve', onClick: () => setResidentStatus(r, 'APPROVED'), hidden: readOnly || r.status === 'APPROVED' },
                      { label: 'Reject', onClick: () => setResidentStatus(r, 'REJECTED'), hidden: readOnly || r.status === 'REJECTED' },
                      { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: r.id, draft: { ...blank(), ...r } }) }, hidden: readOnly },
                      { label: 'Delete', onClick: () => setDeleting(r), danger: true, hidden: readOnly },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text={data.residents.length ? 'No residents match your search.' : 'No residents yet. Add the first one.'} />}
        </div>
        <Pager {...paged} onPage={paged.setPage} />
        </section>

      <Modal
        open={!!editing}
        title={editing?.id ? 'Edit resident' : 'Add resident'}
        subtitle="Resident profile for SMILECare services"
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>{editing?.id ? 'Save changes' : 'Add resident'}</button>
          </>
        }
      >
        {editing && (
          <div className="form-grid">
            <Field label="Full name"><input value={editing.draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Juan Dela Cruz" /></Field>
            <Field label="Health ID"><input value={editing.draft.healthId} onChange={(e) => set('healthId', e.target.value)} /></Field>
            <Field label="Barangay">
              <select value={editing.draft.barangay} onChange={(e) => set('barangay', e.target.value)}>
                {[...new Set([...BARANGAYS, editing.draft.barangay])].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={editing.draft.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </Field>
            <Field label="Date of birth"><input type="date" value={editing.draft.birthdate || ''} onChange={(e) => set('birthdate', e.target.value)} /></Field>
            <Field label="Contact number"><input value={editing.draft.contact || ''} onChange={(e) => set('contact', e.target.value)} placeholder="09XX XXX XXXX" /></Field>
            <Field label="Address"><input value={editing.draft.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="Street, Purok" /></Field>
            <Field label="Registered"><input type="date" value={editing.draft.registered} onChange={(e) => set('registered', e.target.value)} /></Field>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>

      <Modal open={!!viewing} title={viewing?.name || ''} subtitle={viewing ? `${viewing.healthId} • Brgy. ${viewing.barangay}` : ''} onClose={() => setViewing(null)}
        footer={viewing && !readOnly && (
          <>
            {viewing.status !== 'REJECTED' && <button className="btn btn-danger" onClick={() => setResidentStatus(viewing, 'REJECTED')}>Reject</button>}
            {viewing.status !== 'APPROVED' && <button className="btn btn-primary" onClick={() => setResidentStatus(viewing, 'APPROVED')}>Approve</button>}
          </>
        )}
      >
        {viewing && (
          <div className="stack">
            <div className="info-row"><span className="muted">Status</span><Badge status={viewing.status} /></div>
            <div className="info-row"><span className="muted">Registered</span><b>{fmtDate(viewing.registered)}</b></div>
            <div className="info-row"><span className="muted">Date of birth</span><b>{viewing.birthdate ? fmtDate(viewing.birthdate) : '—'}</b></div>
            <div className="info-row"><span className="muted">Contact</span><b>{viewing.contact || '—'}</b></div>
            <div className="info-row"><span className="muted">Address</span><b>{viewing.address || '—'}</b></div>
            <div className="info-row"><span className="muted">Medicines received</span><b>{data.dispensings.filter((d) => d.residentName === viewing.name && d.status === 'COMPLETED').length} dispensing(s)</b></div>
          </div>
        )}
      </Modal>

      <Confirm open={!!deleting} title="Delete resident?" text={`${deleting?.name} will be permanently removed from SMILECare.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('residents', deleting.id); toast('Resident deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
