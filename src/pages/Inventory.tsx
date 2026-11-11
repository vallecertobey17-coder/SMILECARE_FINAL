import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Icon } from '../components/Icon'
import { useStore } from '../lib/store'
import type { Medicine, MedicineStatus } from '../lib/types'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, Pager, StatCard, Toolbar, usePaged, useToast } from '../components/ui'
import { fmtMonth, fmtNum, medicineStatus } from '../lib/utils'

const STATUSES: MedicineStatus[] = ['GOOD', 'LOW STOCK', 'EXPIRING SOON', 'EXPIRED', 'OUT OF STOCK']
const FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'ointment', 'inhaler', 'drops']
type Draft = Omit<Medicine, 'id'>
const blank = (): Draft => ({ name: '', strength: '', form: 'tablet', stock: 0, unit: 'blister packs', expiry: '', reorderLevel: 100, location: '' })

export default function Inventory() {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [form, setForm] = useState('')
  const [sort, setSort] = useState('name')
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [restock, setRestock] = useState<{ id: string; qty: string; expiry: string }>({ id: '', qty: '', expiry: '' })
  const [restockOpen, setRestockOpen] = useState(false)
  const [deleting, setDeleting] = useState<Medicine | null>(null)
  const [err, setErr] = useState('')

  const withStatus = useMemo(() => data.medicines.map((m) => ({ m, st: medicineStatus(m) })), [data.medicines])
  const totalUnits = data.medicines.reduce((a, m) => a + (m.stock || 0), 0)
  const low = withStatus.filter((x) => x.st === 'LOW STOCK' || x.st === 'OUT OF STOCK').length
  const exp = withStatus.filter((x) => x.st === 'EXPIRING SOON' || x.st === 'EXPIRED').length

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const r = withStatus
      .filter((x) => !status || x.st === status)
      .filter((x) => !form || x.m.form === form)
      .filter((x) => !s || `${x.m.name} ${x.m.strength} ${x.m.form}`.toLowerCase().includes(s))
    const cmp: Record<string, (a: typeof r[0], b: typeof r[0]) => number> = {
      name: (a, b) => a.m.name.localeCompare(b.m.name),
      stockAsc: (a, b) => a.m.stock - b.m.stock,
      stockDesc: (a, b) => b.m.stock - a.m.stock,
      expiry: (a, b) => a.m.expiry.localeCompare(b.m.expiry),
    }
    return r.sort(cmp[sort])
  }, [withStatus, q, status, form, sort])
  const paged = usePaged(rows, 8, q + status + form + sort)

  async function save() {
    if (!editing) return
    const d = editing.draft
    if (!d.name.trim()) return setErr('Medicine name is required.')
    if (!d.strength.trim()) return setErr('Dosage strength is required (e.g. 500mg).')
    if (!/^\d{4}-\d{2}$/.test(d.expiry)) return setErr('Please choose an expiry month.')
    if (!(d.stock >= 0)) return setErr('Stock must be zero or more.')
    try {
      const clean = { ...d, name: d.name.trim(), strength: d.strength.trim(), stock: Math.floor(Number(d.stock)), reorderLevel: Math.floor(Number(d.reorderLevel)) }
      if (editing.id) await update('medicines', editing.id, clean)
      else await add('medicines', clean)
      toast(editing.id ? 'Medicine updated' : 'Medicine added to inventory')
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function doRestock() {
    const m = data.medicines.find((x) => x.id === restock.id)
    const qty = Math.floor(Number(restock.qty))
    if (!m) return setErr('Choose a medicine.')
    if (!(qty > 0)) return setErr('Enter how many units you received.')
    try {
      await update('medicines', m.id, { stock: m.stock + qty, ...(restock.expiry ? { expiry: restock.expiry } : {}) })
      toast(`Added ${fmtNum(qty)} ${m.unit} of ${m.name}`)
      setRestockOpen(false)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  const set = (k: keyof Draft, v: string | number) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))
  const openRestock = (id = '') => { setErr(''); setRestock({ id, qty: '', expiry: '' }); setRestockOpen(true) }

  return (
    <div className="page">
      <PageHead title="Medicine Inventory" subtitle="Track stock levels, expiry dates and reorder needs across dispensaries." />
      <div className="stats stats-3">
        <StatCard icon={<Icon name="pill" />} label="Total Medicine Types" value={data.medicines.length} note={`${fmtNum(totalUnits)} units`} onClick={() => setStatus('')} active={status === ''} />
        <StatCard icon={<Icon name="stat-bell" />} tone="amber" label="Low Stock" value={low} note="Reorder needed" onClick={() => setStatus('LOW STOCK')} active={status === 'LOW STOCK'} />
        <StatCard icon={<Icon name="stat-x" />} tone="orange" label="Expiring Soon" value={exp} note={`Within 30 days${withStatus.some((x) => x.st === 'EXPIRED') ? ` • ${withStatus.filter((x) => x.st === 'EXPIRED').length} expired` : ''}`} onClick={() => setStatus('EXPIRING SOON')} active={status === 'EXPIRING SOON'} />
      </div>

      <Toolbar
          search={q} onSearch={setQ} placeholder="Search Inventory..." status={status} onStatus={setStatus} statuses={STATUSES}
          filtersOpen={showFilters} onToggleFilters={() => setShowFilters((v) => !v)} filterCount={form ? 1 : 0}
          action={!readOnly && (
            <div className="btn-row">
              <button className="btn btn-outline" onClick={() => { setErr(''); setEditing({ draft: blank() }) }}><Plus size={18} /> New medicine</button>
              <button className="btn btn-primary" onClick={() => openRestock()}><Icon name="add" /> Add Stock</button>
            </div>
          )}
        />
        {showFilters && (
          <div className="filters">
            <Field label="Form">
              <select value={form} onChange={(e) => setForm(e.target.value)}>
                <option value="">All forms</option>
                {FORMS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Sort by">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="name">Name (A–Z)</option>
                <option value="stockAsc">Stock (lowest first)</option>
                <option value="stockDesc">Stock (highest first)</option>
                <option value="expiry">Expiry (soonest first)</option>
              </select>
            </Field>
            <button className="btn btn-ghost" onClick={() => { setForm(''); setSort('name') }}>Clear filters</button>
          </div>
        )}

        <section className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Medicine</th><th>Form</th><th>Available stock</th><th>Status</th><th>Expiry</th><th className="right"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {paged.slice.map(({ m, st }) => (
                <tr key={m.id}>
                  <td><b>{m.name}</b><div className="muted small">{m.strength}{m.location ? ` • ${m.location}` : ''}</div></td>
                  <td>{m.strength} {m.form}</td>
                  <td>
                    <b>{fmtNum(m.stock)}</b> <span className="muted">{m.unit}</span>
                    <div className="bar thin"><span className={st === 'GOOD' ? '' : 'warn'} style={{ width: Math.min(100, (m.stock / Math.max(1, m.reorderLevel * 4)) * 100) + '%' }} /></div>
                  </td>
                  <td><Badge status={st} /></td>
                  <td>{m.expiry ? <span className="badge badge-red">{fmtMonth(m.expiry)}</span> : '—'}</td>
                  <td className="right">
                    {!readOnly && (
                      <RowMenu label={`Actions for ${m.name}`} items={[
                        { label: 'Add stock', onClick: () => openRestock(m.id) },
                        { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: m.id, draft: { ...blank(), ...m } }) } },
                        { label: 'Delete', onClick: () => setDeleting(m), danger: true },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text={data.medicines.length ? 'No medicines match your search.' : 'No medicines in inventory yet.'} />}
        </div>
        <Pager {...paged} onPage={paged.setPage} />
        </section>

      <Modal open={!!editing} title={editing?.id ? 'Edit medicine' : 'New medicine'} onClose={() => setEditing(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>{editing?.id ? 'Save changes' : 'Add medicine'}</button></>}>
        {editing && (
          <div className="form-grid">
            <Field label="Medicine name"><input value={editing.draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Paracetamol" /></Field>
            <Field label="Dosage strength"><input value={editing.draft.strength} onChange={(e) => set('strength', e.target.value)} placeholder="500mg" /></Field>
            <Field label="Form">
              <select value={editing.draft.form} onChange={(e) => set('form', e.target.value)}>{FORMS.map((f) => <option key={f}>{f}</option>)}</select>
            </Field>
            <Field label="Unit"><input value={editing.draft.unit} onChange={(e) => set('unit', e.target.value)} placeholder="blister packs" /></Field>
            <Field label="Available stock"><input type="number" min={0} value={editing.draft.stock} onChange={(e) => set('stock', Number(e.target.value))} /></Field>
            <Field label="Reorder level" hint="Flagged as low stock at or below this amount"><input type="number" min={0} value={editing.draft.reorderLevel} onChange={(e) => set('reorderLevel', Number(e.target.value))} /></Field>
            <Field label="Expiry month"><input type="month" value={editing.draft.expiry} onChange={(e) => set('expiry', e.target.value)} /></Field>
            <Field label="Storage location"><input value={editing.draft.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="Dispensary A" /></Field>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>

      <Modal open={restockOpen} title="Add stock" subtitle="Record a delivery of medicines" onClose={() => setRestockOpen(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setRestockOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={doRestock}>Add stock</button></>}>
        <div className="form-grid">
          <Field label="Medicine">
            <select value={restock.id} onChange={(e) => setRestock({ ...restock, id: e.target.value })}>
              <option value="">Choose medicine…</option>
              {[...data.medicines].sort((a, b) => a.name.localeCompare(b.name)).map((m) => <option key={m.id} value={m.id}>{m.name} {m.strength} ({fmtNum(m.stock)} in stock)</option>)}
            </select>
          </Field>
          <Field label="Quantity received"><input type="number" min={1} value={restock.qty} onChange={(e) => setRestock({ ...restock, qty: e.target.value })} placeholder="e.g. 200" /></Field>
          <Field label="New expiry month (optional)" hint="Leave empty to keep the current expiry"><input type="month" value={restock.expiry} onChange={(e) => setRestock({ ...restock, expiry: e.target.value })} /></Field>
          {err && <div className="alert alert-err span-2">{err}</div>}
        </div>
      </Modal>

      <Confirm open={!!deleting} title="Delete medicine?" text={`${deleting?.name} ${deleting?.strength} will be removed from inventory.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('medicines', deleting.id); toast('Medicine deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
