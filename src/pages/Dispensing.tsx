import { useMemo, useState } from 'react'
import { ClipboardCheck, Hourglass, AlertOctagon, Plus, Trash2, ShieldCheck, ShieldX, AlertTriangle, Inbox } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Appointment, DispenseItem, DispenseStatus, Dispensing as Disp } from '../lib/types'
import type { Session } from '../lib/auth'
import { Icon } from '../components/Icon'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, Pager, StatCard, Toolbar, usePaged, useToast } from '../components/ui'
import { fmtDate, fmtNum, isoDate } from '../lib/utils'
import { checkEligibility, dispenseLabel, dispenseNote, medLabel, sourceName, stockAt, stockPatches } from '../lib/domain'

const STATUSES: DispenseStatus[] = ['COMPLETED', 'PENDING', 'ERROR']

export default function Dispensing({ session }: { session: Session }) {
  const store = useStore()
  const { data, add, update, remove, readOnly } = store
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [day, setDay] = useState('')
  const [src, setSrc] = useState('')
  const [open, setOpen] = useState(false)
  const [residentQ, setResidentQ] = useState('')
  const [source, setSource] = useState('central')
  const [items, setItems] = useState<{ medicineId: string; qty: string }[]>([{ medicineId: '', qty: '1' }])
  const [releaseNow, setReleaseNow] = useState(true)
  const [fromAppt, setFromAppt] = useState<Appointment | null>(null)
  const [err, setErr] = useState('')
  const [viewing, setViewing] = useState<Disp | null>(null)
  const [deleting, setDeleting] = useState<Disp | null>(null)
  const verifier = session.role === 'Pharmacist' || session.role === 'Administrator' || session.role === 'Municipal Health Doctor' || session.role === 'Rolling Botika Staff'

  const resident = useMemo(() => {
    const v = residentQ.trim().toLowerCase()
    if (!v) return undefined
    return data.residents.find((r) => r.healthId.toLowerCase() === v || r.name.toLowerCase() === v)
  }, [residentQ, data.residents])

  const lines: DispenseItem[] = items
    .filter((i) => i.medicineId)
    .map((i) => {
      const m = data.medicines.find((x) => x.id === i.medicineId)!
      return { medicineId: m.id, label: medLabel(m), qty: Math.floor(Number(i.qty)) || 0 }
    })
  const elig = useMemo(() => checkEligibility(data, resident, lines, source), [data, resident, lines, source])

  const requests = data.appointments.filter((a) => a.medicines?.length && (a.status === 'PENDING' || a.status === 'CONFIRMED')).sort((a, b) => a.date.localeCompare(b.date))

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.dispensings
      .filter((d) => !status || d.status === status)
      .filter((d) => !day || d.date.startsWith(day))
      .filter((d) => !src || (d.source ?? 'central') === src)
      .filter((d) => !s || `${d.ref} ${d.residentName} ${d.items.map((i) => i.label).join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.dispensings, q, status, day, src])
  const paged = usePaged(rows, 8, q + status + day + src)

  function newRef() {
    const d = new Date()
    const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const used = new Set(data.dispensings.map((x) => x.ref))
    let n = data.dispensings.filter((x) => x.ref.startsWith(`SC-${stamp}-`)).length + 1
    let ref = ''
    do ref = `SC-${stamp}-${String(n++).padStart(3, '0')}`
    while (used.has(ref))
    return ref
  }

  async function applyStock(list: DispenseItem[], from: string) {
    for (const p of stockPatches(data, list, from)) {
      if (p.kind === 'medicine') await update('medicines', p.id, p.patch, { silent: true })
      else await update('units', p.id, p.patch, { silent: true })
    }
  }

  function openNew(appt?: Appointment) {
    setErr('')
    setFromAppt(appt ?? null)
    if (appt) {
      const r = data.residents.find((x) => x.id === appt.residentId)
      setResidentQ(r?.healthId ?? appt.residentName)
      const unit = data.units.find((u) => u.location === appt.location)
      setSource(unit?.stock ? unit.id : 'central')
      setItems(appt.medicines!.map((m) => ({ medicineId: m.medicineId, qty: String(m.qty) })))
    } else {
      setResidentQ('')
      setSource('central')
      setItems([{ medicineId: '', qty: '1' }])
    }
    setReleaseNow(true)
    setOpen(true)
  }

  async function submit() {
    setErr('')
    if (!lines.length) return setErr('Add at least one medicine.')
    if (lines.some((l) => l.qty <= 0)) return setErr('Enter a quantity for every medicine.')
    if (releaseNow && !elig.ok) return setErr('Resolve the eligibility issues before releasing, or save as pending.')
    if (!resident) return setErr('Find the resident by Health ID or full name.')
    try {
      if (releaseNow) await applyStock(lines, source)
      const ref = newRef()
      await add('dispensings', {
        ref,
        residentId: resident.id,
        residentName: resident.name,
        items: lines,
        status: releaseNow ? 'COMPLETED' : 'PENDING',
        date: new Date().toISOString(),
        source,
        ...(releaseNow ? { verifiedBy: session.name } : {}),
        ...(fromAppt ? { appointmentId: fromAppt.id } : {}),
      })
      if (fromAppt) await update('appointments', fromAppt.id, { status: releaseNow ? 'COMPLETED' : 'CONFIRMED' })
      toast(releaseNow ? `Released • ${ref}` : `Saved as pending • ${ref}`)
      setOpen(false)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function complete(d: Disp) {
    const r = data.residents.find((x) => x.id === d.residentId) ?? data.residents.find((x) => x.name === d.residentName)
    const from = d.source ?? 'central'
    const check = checkEligibility(data, r, d.items, from)
    try {
      if (!check.ok) {
        await update('dispensings', d.id, { status: 'ERROR', note: check.problems[0] })
        toast(check.problems[0], 'err')
      } else {
        await applyStock(d.items, from)
        await update('dispensings', d.id, { status: 'COMPLETED', note: '', verifiedBy: session.name })
        if (d.appointmentId) await update('appointments', d.appointmentId, { status: 'COMPLETED' }, { silent: true })
        toast(`${d.ref} released to ${d.residentName}`)
      }
      setViewing(null)
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  const sources = [{ id: 'central', name: 'Central health office' }, ...data.units.filter((u) => u.stock).map((u) => ({ id: u.id, name: u.name }))]

  return (
    <div className="page">
      <PageHead title="Medicine Dispensing" subtitle="Record medicine distributions with eligibility checking and pharmacist verification." />
      <div className="stats stats-3">
        <StatCard icon={<ClipboardCheck size={24} />} label="Completed" value={data.dispensings.filter((d) => d.status === 'COMPLETED').length} note={`${data.dispensings.filter((d) => d.status === 'COMPLETED' && d.date.startsWith(isoDate())).length} today`} onClick={() => setStatus('COMPLETED')} active={status === 'COMPLETED'} />
        <StatCard icon={<Hourglass size={24} />} label="Pending" value={data.dispensings.filter((d) => d.status === 'PENDING').length + requests.length} note={`${requests.length} resident request${requests.length === 1 ? '' : 's'}`} onClick={() => setStatus('PENDING')} active={status === 'PENDING'} />
        <StatCard icon={<AlertOctagon size={24} />} label="Out of stock" value={data.dispensings.filter((d) => d.status === 'ERROR').length} note="Needs restock" onClick={() => setStatus('ERROR')} active={status === 'ERROR'} />
      </div>

      {requests.length > 0 && (
        <section className="card">
          <div className="card-head">
            <div>
              <h3><Inbox size={18} /> Medicine requests from residents</h3>
              <p className="muted small">Pre-ordered through the resident platform. Confirm, then release at pickup.</p>
            </div>
          </div>
          <div className="req-list">
            {requests.map((a) => (
              <div key={a.id} className="req">
                <span className="grow">
                  <b>{a.residentName}</b> <span className="muted small">{a.ref}</span>
                  <small>{a.medicines!.map((m) => `${m.label} × ${m.qty}`).join(', ')}</small>
                  <small className="muted">Pickup {fmtDate(a.date)} • {a.location}</small>
                </span>
                <Badge status={a.status === 'CONFIRMED' ? 'SCHEDULED' : 'PENDING'} />
                {!readOnly && (
                  <div className="btn-row">
                    {a.status === 'PENDING' && <button className="btn btn-outline sm" onClick={() => update('appointments', a.id, { status: 'CONFIRMED' }).then(() => toast('Request confirmed'))}>Confirm</button>}
                    <button className="btn btn-primary sm" onClick={() => openNew(a)}>Release</button>
                    <button className="btn btn-ghost sm" onClick={() => update('appointments', a.id, { status: 'CANCELLED', notes: 'Declined by pharmacist' }).then(() => toast('Request declined'))}>Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Toolbar search={q} onSearch={setQ} placeholder="Search Dispensing..." status={status} onStatus={setStatus} statuses={STATUSES} labels={{ ERROR: 'Out of stock / not released' }}
        filtersOpen={showFilters} onToggleFilters={() => setShowFilters((v) => !v)} filterCount={[day, src].filter(Boolean).length}
        action={!readOnly && verifier && <button className="btn btn-primary" onClick={() => openNew()}><Icon name="add" /> Dispense Medicine</button>} />
      {showFilters && (
        <div className="filters">
          <Field label="Date"><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
          <Field label="Source">
            <select value={src} onChange={(e) => setSrc(e.target.value)}>
              <option value="">All sources</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <button className="btn btn-ghost" onClick={() => { setDay(''); setSrc('') }}>Clear filters</button>
        </div>
      )}
      <section className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference number</th><th>Resident name</th><th>Medicine (dosage)</th><th>Quantity</th><th>Status</th><th className="right"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {paged.slice.map((d) => {
                const unit = (it: DispenseItem) => data.medicines.find((m) => m.id === it.medicineId)?.unit ?? 'units'
                return (
                  <tr key={d.id}>
                    <td className="mono">{d.ref}<div className="muted small">{fmtDate(d.date)} • {sourceName(data, d.source)}</div></td>
                    <td><b>{d.residentName}</b>{d.verifiedBy && <div className="muted small">Verified by {d.verifiedBy}</div>}</td>
                    <td>{d.items.map((i, k) => <div key={k}>{i.label}</div>)}</td>
                    <td>{d.items.map((i, k) => <div key={k}>{i.qty} {unit(i)}</div>)}</td>
                    <td><Badge status={dispenseLabel(d.status, d.note)} />{d.status === 'ERROR' && dispenseNote(d.note) && <div className="muted small err-note">{dispenseNote(d.note)}</div>}</td>
                    <td className="right">
                      <RowMenu label={`Actions for ${d.ref}`} items={[
                        { label: 'View details', onClick: () => setViewing(d) },
                        { label: d.status === 'ERROR' ? 'Retry release' : 'Verify & release', onClick: () => complete(d), hidden: readOnly || d.status === 'COMPLETED' },
                        { label: 'Delete', onClick: () => setDeleting(d), danger: true, hidden: readOnly || session.role !== 'Administrator' },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text={data.dispensings.length ? 'No records match your search.' : 'No medicines dispensed yet.'} />}
        </div>
        <Pager {...paged} onPage={paged.setPage} />
      </section>

      <Modal open={open} wide title="Dispense medicine" subtitle={fromAppt ? `Resident request ${fromAppt.ref}` : 'Eligibility is checked before stock is released'} onClose={() => setOpen(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={releaseNow && !elig.ok}>{releaseNow ? 'Verify & release' : 'Save as pending'}</button></>}>
        <div className="stack">
          <div className="form-grid">
            <Field label="Resident (Health ID or full name)" hint={resident ? `${resident.healthId} • Brgy. ${resident.barangay}` : 'Scan the QR Health ID or start typing'}>
              <input list="resident-list" value={residentQ} onChange={(e) => setResidentQ(e.target.value)} placeholder="SC-TAY-2024-…" />
              <datalist id="resident-list">{data.residents.map((r) => <option key={r.id} value={r.healthId}>{r.name}</option>)}</datalist>
            </Field>
            <Field label="Dispense from">
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="items">
            <div className="items-head"><span>Medicine</span><span>Quantity</span><span /></div>
            {items.map((it, i) => {
              const m = data.medicines.find((x) => x.id === it.medicineId)
              return (
                <div key={i} className="items-row">
                  <select value={it.medicineId} aria-label="Medicine" onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, medicineId: e.target.value } : x)))}>
                    <option value="">Choose medicine…</option>
                    {[...data.medicines].sort((a, b) => a.name.localeCompare(b.name)).map((md) => {
                      const have = stockAt(data, md.id, source)
                      return <option key={md.id} value={md.id}>{medLabel(md)} — {fmtNum(have)} {md.unit}{have <= 0 ? ' (none here)' : ''}</option>
                    })}
                  </select>
                  <div className="qty">
                    <input type="number" min={1} value={it.qty} aria-label="Quantity" onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} />
                    <span className="muted small">{m?.unit ?? ''}</span>
                  </div>
                  <button className="icon-btn" aria-label="Remove line" disabled={items.length === 1} onClick={() => setItems(items.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
                </div>
              )
            })}
            <button className="link-btn" onClick={() => setItems([...items, { medicineId: '', qty: '1' }])}><Plus size={16} /> Add another medicine</button>
          </div>

          {(resident || lines.length > 0) && (
            <div className={`elig ${elig.ok ? 'ok' : 'bad'}`}>
              <div className="elig-head">
                {elig.ok ? <ShieldCheck size={20} /> : <ShieldX size={20} />}
                <b>{elig.ok ? 'Eligible for release' : 'Not eligible yet'}</b>
              </div>
              {resident && elig.ok && <small>{resident.name} is a verified resident of Brgy. {resident.barangay}. Stock is available at {sourceName(data, source)}.</small>}
              {elig.problems.map((p) => <small key={p}>• {p}</small>)}
              {elig.warnings.map((w) => <small key={w} className="warn-line"><AlertTriangle size={14} /> {w}</small>)}
            </div>
          )}
          <label className="check">
            <input type="checkbox" checked={releaseNow} onChange={(e) => setReleaseNow(e.target.checked)} /> I verified the resident and release now (deducts stock, signed as {session.name})
          </label>
          {err && <div className="alert alert-err">{err}</div>}
        </div>
      </Modal>

      <Modal open={!!viewing} title={viewing?.ref || ''} subtitle={viewing ? `${viewing.residentName} • ${fmtDate(viewing.date)}` : ''} onClose={() => setViewing(null)}
        footer={viewing && !readOnly && viewing.status !== 'COMPLETED' && <button className="btn btn-primary" onClick={() => complete(viewing)}>Verify & release</button>}>
        {viewing && (
          <div className="stack">
            <div className="info-row"><span className="muted">Status</span><Badge status={dispenseLabel(viewing.status, viewing.note)} /></div>
            <div className="info-row"><span className="muted">Source</span><b>{sourceName(data, viewing.source)}</b></div>
            {viewing.verifiedBy && <div className="info-row"><span className="muted">Verified by</span><b>{viewing.verifiedBy}</b></div>}
            {viewing.items.map((i, k) => <div key={k} className="info-row"><span>{i.label}</span><b>× {i.qty}</b></div>)}
            {dispenseNote(viewing.note) && <div className="alert alert-err">{dispenseNote(viewing.note)}</div>}
          </div>
        )}
      </Modal>

      <Confirm open={!!deleting} title="Delete record?" text={`Dispensing record ${deleting?.ref} will be deleted. Stock already deducted is not returned.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('dispensings', deleting.id); toast('Record deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
