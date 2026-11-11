import { useMemo, useState } from 'react'
import { ClipboardCheck, Hourglass, AlertOctagon, Plus, Trash2 } from 'lucide-react'
import { Icon } from '../components/Icon'
import { useStore } from '../lib/store'
import type { DispenseItem, DispenseStatus, Dispensing as Disp, Medicine } from '../lib/types'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, Pager, StatCard, Toolbar, usePaged, useToast } from '../components/ui'
import { daysToExpiry, fmtDate, fmtNum, isoDate } from '../lib/utils'

const STATUSES: DispenseStatus[] = ['COMPLETED', 'PENDING', 'ERROR']
const label = (m: Medicine) => `${m.name} (${m.strength})`

export default function Dispensing() {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [day, setDay] = useState('')
  const [open, setOpen] = useState(false)
  const [resident, setResident] = useState('')
  const [items, setItems] = useState<{ medicineId: string; qty: string }[]>([{ medicineId: '', qty: '1' }])
  const [releaseNow, setReleaseNow] = useState(true)
  const [err, setErr] = useState('')
  const [viewing, setViewing] = useState<Disp | null>(null)
  const [deleting, setDeleting] = useState<Disp | null>(null)

  const findMed = (it: DispenseItem) =>
    data.medicines.find((m) => m.id === it.medicineId) ?? data.medicines.find((m) => label(m).toLowerCase() === it.label.toLowerCase())

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.dispensings
      .filter((d) => !status || d.status === status)
      .filter((d) => !day || d.date.startsWith(day))
      .filter((d) => !s || `${d.ref} ${d.residentName} ${d.items.map((i) => i.label).join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.dispensings, q, status, day])
  const paged = usePaged(rows, 8, q + status + day)

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

  /** Deduct stock for each item. Returns an error message instead if stock is insufficient. */
  async function deduct(list: DispenseItem[]): Promise<string | null> {
    const need = new Map<string, number>()
    for (const it of list) {
      const m = findMed(it)
      if (!m) return `${it.label} is not in inventory.`
      need.set(m.id, (need.get(m.id) ?? 0) + it.qty)
    }
    for (const [id, qty] of need) {
      const m = data.medicines.find((x) => x.id === id)!
      if (daysToExpiry(m) < 0) return `${label(m)} is expired and can't be dispensed.`
      if (m.stock < qty) return `Not enough ${label(m)}: ${fmtNum(m.stock)} ${m.unit} left, ${fmtNum(qty)} needed.`
    }
    for (const [id, qty] of need) {
      const m = data.medicines.find((x) => x.id === id)!
      await update('medicines', id, { stock: m.stock - qty })
    }
    return null
  }

  async function submit() {
    setErr('')
    if (!resident.trim()) return setErr('Enter the resident receiving the medicine.')
    const list: DispenseItem[] = []
    for (const it of items) {
      if (!it.medicineId) continue
      const m = data.medicines.find((x) => x.id === it.medicineId)!
      const qty = Math.floor(Number(it.qty))
      if (!(qty > 0)) return setErr(`Enter a quantity for ${label(m)}.`)
      list.push({ medicineId: m.id, label: label(m), qty })
    }
    if (!list.length) return setErr('Add at least one medicine.')
    try {
      let st: DispenseStatus = 'PENDING'
      let note: string | undefined
      if (releaseNow) {
        const problem = await deduct(list)
        if (problem) return setErr(problem)
        st = 'COMPLETED'
      }
      const ref = newRef()
      await add('dispensings', { ref, residentName: resident.trim(), items: list, status: st, date: new Date().toISOString(), ...(note ? { note } : {}) })
      toast(st === 'COMPLETED' ? `Released • ${ref}` : `Saved as pending • ${ref}`)
      setOpen(false)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function complete(d: Disp) {
    try {
      const problem = await deduct(d.items)
      if (problem) {
        await update('dispensings', d.id, { status: 'ERROR', note: problem })
        toast(problem, 'err')
      } else {
        await update('dispensings', d.id, { status: 'COMPLETED', note: '' })
        toast(`${d.ref} released to ${d.residentName}`)
      }
      setViewing(null)
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  const openNew = () => {
    setErr('')
    setResident('')
    setItems([{ medicineId: '', qty: '1' }])
    setReleaseNow(true)
    setOpen(true)
  }

  return (
    <div className="page">
      <PageHead title="Medicine Dispensing" subtitle="Record and track medicines released to residents." />
      <div className="stats stats-3">
        <StatCard icon={<ClipboardCheck size={24} />} label="Completed" value={data.dispensings.filter((d) => d.status === 'COMPLETED').length} note={`${data.dispensings.filter((d) => d.status === 'COMPLETED' && d.date.startsWith(isoDate())).length} today`} onClick={() => setStatus('COMPLETED')} active={status === 'COMPLETED'} />
        <StatCard icon={<Hourglass size={24} />} tone="amber" label="Pending" value={data.dispensings.filter((d) => d.status === 'PENDING').length} note="Awaiting release" onClick={() => setStatus('PENDING')} active={status === 'PENDING'} />
        <StatCard icon={<AlertOctagon size={24} />} tone="red" label="Errors" value={data.dispensings.filter((d) => d.status === 'ERROR').length} note="Needs follow-up" onClick={() => setStatus('ERROR')} active={status === 'ERROR'} />
      </div>

      <Toolbar search={q} onSearch={setQ} placeholder="Search Dispensing..." status={status} onStatus={setStatus} statuses={STATUSES}
          filtersOpen={showFilters} onToggleFilters={() => setShowFilters((v) => !v)} filterCount={day ? 1 : 0}
          action={!readOnly && <button className="btn btn-primary" onClick={openNew}><Icon name="add" /> Dispense Medicine</button>} />
        {showFilters && (
          <div className="filters">
            <Field label="Date"><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
            <button className="btn btn-ghost" onClick={() => setDay('')}>Clear filters</button>
          </div>
        )}
        <section className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference number</th><th>Resident name</th><th>Medicine (dosage)</th><th>Quantity</th><th>Status</th><th className="right"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {paged.slice.map((d) => {
                const unit = (it: DispenseItem) => findMed(it)?.unit ?? 'units'
                return (
                  <tr key={d.id}>
                    <td className="mono">{d.ref}<div className="muted small">{fmtDate(d.date)}</div></td>
                    <td><b>{d.residentName}</b></td>
                    <td>{d.items.map((i, k) => <div key={k}>{i.label}</div>)}</td>
                    <td>{d.items.map((i, k) => <div key={k}>{i.qty} {i.qty === 1 ? unit(i).replace(/s$/, '') : unit(i)}</div>)}</td>
                    <td><Badge status={d.status} />{d.status === 'ERROR' && d.note && <div className="muted small err-note">{d.note}</div>}</td>
                    <td className="right">
                      <RowMenu label={`Actions for ${d.ref}`} items={[
                        { label: 'View details', onClick: () => setViewing(d) },
                        { label: d.status === 'ERROR' ? 'Retry release' : 'Release medicine', onClick: () => complete(d), hidden: readOnly || d.status === 'COMPLETED' },
                        { label: 'Delete', onClick: () => setDeleting(d), danger: true, hidden: readOnly },
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

      <Modal open={open} wide title="Dispense medicine" subtitle="Release medicines to a resident. Stock is deducted from inventory." onClose={() => setOpen(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>{releaseNow ? 'Release medicine' : 'Save as pending'}</button></>}>
        <div className="stack">
          <Field label="Resident name">
            <input list="resident-list" value={resident} onChange={(e) => setResident(e.target.value)} placeholder="Start typing a resident's name" />
            <datalist id="resident-list">{data.residents.filter((r) => r.status === 'APPROVED').map((r) => <option key={r.id} value={r.name}>{r.healthId}</option>)}</datalist>
          </Field>
          <div className="items">
            <div className="items-head"><span>Medicine</span><span>Quantity</span><span /></div>
            {items.map((it, i) => {
              const m = data.medicines.find((x) => x.id === it.medicineId)
              return (
                <div key={i} className="items-row">
                  <select value={it.medicineId} aria-label="Medicine" onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, medicineId: e.target.value } : x)))}>
                    <option value="">Choose medicine…</option>
                    {[...data.medicines].sort((a, b) => a.name.localeCompare(b.name)).map((md) => (
                      <option key={md.id} value={md.id} disabled={md.stock <= 0}>{label(md)} — {fmtNum(md.stock)} {md.unit}{md.stock <= 0 ? ' (out of stock)' : ''}</option>
                    ))}
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
          <label className="check">
            <input type="checkbox" checked={releaseNow} onChange={(e) => setReleaseNow(e.target.checked)} /> Release now (deduct stock immediately)
          </label>
          {err && <div className="alert alert-err">{err}</div>}
        </div>
      </Modal>

      <Modal open={!!viewing} title={viewing?.ref || ''} subtitle={viewing ? `${viewing.residentName} • ${fmtDate(viewing.date)}` : ''} onClose={() => setViewing(null)}
        footer={viewing && !readOnly && viewing.status !== 'COMPLETED' && <button className="btn btn-primary" onClick={() => complete(viewing)}>Release medicine</button>}>
        {viewing && (
          <div className="stack">
            <div className="info-row"><span className="muted">Status</span><Badge status={viewing.status} /></div>
            {viewing.items.map((i, k) => <div key={k} className="info-row"><span>{i.label}</span><b>× {i.qty}</b></div>)}
            {viewing.note && <div className="alert alert-err">{viewing.note}</div>}
          </div>
        )}
      </Modal>

      <Confirm open={!!deleting} title="Delete record?" text={`Dispensing record ${deleting?.ref} will be deleted. Stock already deducted is not returned.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('dispensings', deleting.id); toast('Record deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
