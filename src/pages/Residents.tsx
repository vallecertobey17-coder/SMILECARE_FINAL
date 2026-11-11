import { useMemo, useState, type FormEvent } from 'react'
import { Users, Clock, UserX, ScanLine, UserPlus, FileImage } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Resident, ResidentStatus } from '../lib/types'
import type { Session } from '../lib/auth'
import { Icon } from '../components/Icon'
import { QR } from '../components/QR'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, Pager, StatCard, Toolbar, usePaged, useToast } from '../components/ui'
import { initials, BARANGAYS, fmtDate, fmtNum, isoDate } from '../lib/utils'
import { residentHistory } from '../lib/domain'

const STATUSES: ResidentStatus[] = ['APPROVED', 'PENDING', 'REJECTED']
type Draft = Omit<Resident, 'id'>
const blank = (): Draft => ({ name: '', healthId: '', barangay: BARANGAYS[0], status: 'APPROVED', registered: isoDate(), contact: '', birthdate: '', address: '', walkIn: true })

export default function Residents({ session }: { session: Session }) {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [brgy, setBrgy] = useState('')
  const [origin, setOrigin] = useState('')
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [tab, setTab] = useState<'profile' | 'history'>('profile')
  const [rejecting, setRejecting] = useState<Resident | null>(null)
  const [remarks, setRemarks] = useState('')
  const [deleting, setDeleting] = useState<Resident | null>(null)
  const [scan, setScan] = useState('')
  const [err, setErr] = useState('')
  const isAdmin = session.role === 'Administrator'

  const month = isoDate().slice(0, 7)
  const pending = data.residents.filter((r) => r.status === 'PENDING')
  const oldest = pending.reduce<string | null>((o, r) => (!o || r.registered < o ? r.registered : o), null)
  const oldestDays = oldest ? Math.max(0, Math.round((Date.now() - new Date(oldest + 'T00:00:00').getTime()) / 86400000)) : 0
  const view = data.residents.find((r) => r.id === viewing) ?? null
  const history = useMemo(() => (view ? residentHistory(data, view) : []), [data, view])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.residents
      .filter((r) => !status || r.status === status)
      .filter((r) => !brgy || r.barangay === brgy)
      .filter((r) => !origin || (origin === 'walkin' ? r.walkIn : !r.walkIn))
      .filter((r) => !s || [r.name, r.healthId, r.barangay, r.email].some((v) => v?.toLowerCase().includes(s)))
      .sort((a, b) => (a.status === 'PENDING' ? -1 : 0) - (b.status === 'PENDING' ? -1 : 0) || b.registered.localeCompare(a.registered))
  }, [data.residents, q, status, brgy, origin])
  const paged = usePaged(rows, 8, q + status + brgy + origin)

  const nextHealthId = () => {
    const nums = data.residents.map((r) => parseInt(r.healthId.split('-').pop() || '0', 10)).filter((n) => !isNaN(n))
    return `SC-TAY-${new Date().getFullYear()}-${String((nums.length ? Math.max(...nums) : 18000) + 1).padStart(6, '0')}`
  }

  function findById(e: FormEvent) {
    e.preventDefault()
    const v = scan.trim().toUpperCase()
    const r = data.residents.find((x) => x.healthId.toUpperCase() === v)
    if (!r) return toast(`No resident with Health ID ${v}`, 'err')
    setScan('')
    setTab('profile')
    setViewing(r.id)
  }

  async function save() {
    if (!editing) return
    const d = editing.draft
    if (!d.name.trim()) return setErr('Full name is required.')
    if (!d.healthId.trim()) return setErr('Health ID is required.')
    if (data.residents.some((r) => r.healthId === d.healthId.trim() && r.id !== editing.id)) return setErr('This Health ID is already in use.')
    try {
      const clean: Draft = { ...d, name: d.name.trim(), healthId: d.healthId.trim() }
      if (!editing.id && clean.status === 'APPROVED') Object.assign(clean, { verifiedAt: isoDate(), verifiedBy: session.name })
      if (editing.id) await update('residents', editing.id, clean)
      else await add('residents', clean)
      toast(editing.id ? 'Resident updated' : `Walk-in resident registered • ${clean.healthId}`)
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function setResidentStatus(r: Resident, s: ResidentStatus, note?: string) {
    try {
      await update('residents', r.id, {
        status: s,
        ...(s === 'APPROVED' ? { verifiedAt: isoDate(), verifiedBy: session.name, remarks: '' } : {}),
        ...(s === 'REJECTED' ? { remarks: note || 'Documents could not be verified' } : {}),
      })
      toast(`${r.name} ${s === 'APPROVED' ? 'verified' : s === 'REJECTED' ? 'rejected' : 'set to pending'}`)
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  const set = (k: keyof Draft, v: string) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))
  const openView = (r: Resident) => {
    setTab('profile')
    setViewing(r.id)
  }

  return (
    <div className="page">
      <PageHead title="Residents & verification" subtitle="Review resident profiles, verification requests and health records." />
      <div className="stats stats-3">
        <StatCard icon={<Users size={24} />} label="Registered residents" value={fmtNum(data.residents.length)} note={`+${data.residents.filter((r) => r.registered?.startsWith(month)).length} this month`} onClick={() => setStatus('')} active={status === ''} />
        <StatCard icon={<Clock size={24} />} label="Pending review" value={pending.length} note={oldest ? `Oldest: ${oldestDays} day${oldestDays === 1 ? '' : 's'}` : 'None waiting'} onClick={() => setStatus('PENDING')} active={status === 'PENDING'} />
        <StatCard icon={<UserX size={24} />} label="Rejected" value={data.residents.filter((r) => r.status === 'REJECTED').length} note="Needs new documents" onClick={() => setStatus('REJECTED')} active={status === 'REJECTED'} />
      </div>

      <form className="scan-bar" onSubmit={findById}>
        <ScanLine size={22} />
        <input value={scan} onChange={(e) => setScan(e.target.value)} placeholder="Scan a QR Health ID or type the Health ID (e.g. SC-TAY-2024-018429)" aria-label="Health ID" />
        <button className="btn btn-primary sm" disabled={!scan.trim()}>
          Find resident
        </button>
      </form>

      <Toolbar
        search={q}
        onSearch={setQ}
        placeholder="Search Resident..."
        status={status}
        onStatus={setStatus}
        statuses={STATUSES}
        filtersOpen={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        filterCount={[brgy, origin].filter(Boolean).length}
        action={
          !readOnly && (
            <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: { ...blank(), healthId: nextHealthId() } }) }}>
              <UserPlus size={18} /> Register walk-in
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
          <Field label="Registration">
            <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="">Online & walk-in</option>
              <option value="online">Online (self-registered)</option>
              <option value="walkin">Walk-in</option>
            </select>
          </Field>
          <button className="btn btn-ghost" onClick={() => { setBrgy(''); setOrigin('') }}>Clear filters</button>
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
                <tr key={r.id} onClick={() => openView(r)} className="clickable">
                  <td>
                    <div className="person">
                      <span className="avatar sm">{initials(r.name)}</span>
                      <span>
                        <b>{r.name}</b>
                        <div className="muted small">{r.walkIn ? 'Walk-in' : r.email ? 'Online registration' : '—'}</div>
                      </span>
                    </div>
                  </td>
                  <td className="mono">{r.healthId}</td>
                  <td>{r.barangay}</td>
                  <td><Badge status={r.status} /></td>
                  <td>{fmtDate(r.registered)}</td>
                  <td className="right" onClick={(e) => e.stopPropagation()}>
                    <RowMenu label={`Actions for ${r.name}`} items={[
                      { label: 'View profile & QR', onClick: () => openView(r) },
                      { label: 'Verify (approve)', onClick: () => setResidentStatus(r, 'APPROVED'), hidden: readOnly || r.status === 'APPROVED' },
                      { label: 'Reject', onClick: () => { setRemarks(''); setRejecting(r) }, hidden: readOnly || r.status === 'REJECTED' },
                      { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: r.id, draft: { ...blank(), ...r } }) }, hidden: readOnly },
                      { label: 'Delete', onClick: () => setDeleting(r), danger: true, hidden: readOnly || !isAdmin },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text={data.residents.length ? 'No residents match your search.' : 'No residents yet.'} />}
        </div>
        <Pager {...paged} onPage={paged.setPage} />
      </section>

      <Modal
        open={!!editing}
        title={editing?.id ? 'Edit resident' : 'Register walk-in resident'}
        subtitle={editing?.id ? 'Resident profile' : 'For residents registering in person at the health office or Rolling Botika'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>{editing?.id ? 'Save changes' : 'Register resident'}</button>
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
            <Field label="Status" hint={!editing.id ? 'Walk-ins verified in person can be approved right away' : undefined}>
              <select value={editing.draft.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s === 'APPROVED' ? 'Verified' : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </Field>
            <Field label="Date of birth"><input type="date" value={editing.draft.birthdate || ''} onChange={(e) => set('birthdate', e.target.value)} /></Field>
            <Field label="Contact number"><input value={editing.draft.contact || ''} onChange={(e) => set('contact', e.target.value)} placeholder="09XX XXX XXXX" /></Field>
            <Field label="Address"><input value={editing.draft.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="Street, Purok" /></Field>
            <Field label="Email (optional)" hint="Lets the resident link an online account later"><input type="email" value={editing.draft.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>

      <Modal open={!!view} wide title={view?.name || ''} subtitle={view ? `${view.healthId} • Brgy. ${view.barangay}` : ''} onClose={() => setViewing(null)}
        footer={view && !readOnly && view.status !== 'APPROVED' && (
          <>
            {view.status !== 'REJECTED' && <button className="btn btn-danger" onClick={() => { setRemarks(''); setRejecting(view) }}>Reject</button>}
            <button className="btn btn-primary" onClick={() => setResidentStatus(view, 'APPROVED')}>Verify resident</button>
          </>
        )}
      >
        {view && (
          <>
            <div className="tabs sm">
              <button className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}>Profile & QR ID</button>
              <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Health history ({history.length})</button>
            </div>
            {tab === 'profile' ? (
              <div className="resident-view">
                <div className="qr-box">
                  <QR value={view.healthId} size={150} />
                  <code>{view.healthId}</code>
                  <Badge status={view.status} />
                </div>
                <div className="stack grow">
                  <div className="info-row"><span className="muted">Registered</span><b>{fmtDate(view.registered)} • {view.walkIn ? 'Walk-in' : 'Online'}</b></div>
                  <div className="info-row"><span className="muted">Date of birth</span><b>{view.birthdate ? fmtDate(view.birthdate) : '—'}</b></div>
                  <div className="info-row"><span className="muted">Contact</span><b>{view.contact || '—'}</b></div>
                  <div className="info-row"><span className="muted">Address</span><b>{view.address || '—'}</b></div>
                  <div className="info-row"><span className="muted">Email</span><b>{view.email || '—'}</b></div>
                  {view.verifiedAt && <div className="info-row"><span className="muted">Verified</span><b>{fmtDate(view.verifiedAt)}{view.verifiedBy ? ` by ${view.verifiedBy}` : ''}</b></div>}
                  {view.remarks && <div className="alert alert-err">Remarks: {view.remarks}</div>}
                  {view.idDocument && (
                    <div className="doc-box">
                      <FileImage size={18} /> <b>Submitted document:</b> {view.idDocument}
                      {view.idDocumentData && <img src={view.idDocumentData} alt={`Verification document of ${view.name}`} />}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="timeline">
                {history.length === 0 && <Empty text="No consultations, medicines or vaccinations recorded yet." />}
                {history.map((h) => (
                  <div key={h.id} className="tl-item">
                    <span className="tl-date">{fmtDate(h.date)}</span>
                    <span className="quick-ic"><Icon name={h.kind === 'medicine' ? 'r-med' : h.kind === 'consultation' ? 'r-heart' : 'r-book'} /></span>
                    <span className="grow">
                      <span className="tag">{h.kind.toUpperCase()}</span>
                      <b>{h.title}</b>
                      {h.detail && <small>{h.detail}</small>}
                      <small className="muted">{h.where}</small>
                    </span>
                    {h.status && <Badge status={h.status} />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={!!rejecting} title="Reject verification?" subtitle={rejecting?.name} onClose={() => setRejecting(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setRejecting(null)}>Cancel</button><button className="btn btn-danger" onClick={() => { if (rejecting) setResidentStatus(rejecting, 'REJECTED', remarks.trim()); setRejecting(null) }}>Reject</button></>}>
        <Field label="Reason shown to the resident">
          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. ID photo is unreadable, please upload a clearer copy" />
        </Field>
      </Modal>

      <Confirm open={!!deleting} title="Delete resident?" text={`${deleting?.name} will be permanently removed from SMILECare.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('residents', deleting.id); toast('Resident deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
