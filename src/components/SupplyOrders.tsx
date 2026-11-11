import { useMemo, useState } from 'react'
import { Truck, PackageCheck, ClipboardList, Building2, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Session } from '../lib/auth'
import type { Supplier, SupplyOrder, SupplyOrderStatus } from '../lib/types'
import { Badge, Empty, Field, Modal, RowMenu, StatCard, useToast } from './ui'
import { fmtDate, fmtNum, isoDate, medicineStatus } from '../lib/utils'
import { medLabel } from '../lib/domain'

/**
 * DFD 6.0 Monitor Medicine Inventory ↔ Suppliers:
 * medicine/supply requirements → purchase orders → deliveries (stock updated automatically).
 */
export function SupplyOrders({ session }: { session: Session }) {
  const { data, add, update, readOnly, log } = useStore()
  const toast = useToast()
  const isDoctor = session.role === 'Municipal Health Doctor'
  const canOrder = !isDoctor && !readOnly
  const [req, setReq] = useState<{ medicineId: string; qty: string; reason: string } | null>(null)
  const [ordering, setOrdering] = useState<{ order: SupplyOrder; supplierId: string; expected: string } | null>(null)
  const [receiving, setReceiving] = useState<{ order: SupplyOrder; qty: string; expiry: string } | null>(null)
  const [supplier, setSupplier] = useState<{ id?: string; draft: Omit<Supplier, 'id'> } | null>(null)
  const [err, setErr] = useState('')

  const orders = useMemo(() => [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.orders])
  const lowNoOrder = data.medicines.filter((m) => {
    const st = medicineStatus(m)
    return (st === 'LOW STOCK' || st === 'OUT OF STOCK') && !data.orders.some((o) => o.medicineId === m.id && (o.status === 'REQUESTED' || o.status === 'ORDERED'))
  })
  const ref = (prefix: string) => `${prefix}-${isoDate().replace(/-/g, '').slice(2)}-${String(data.orders.length + 1).padStart(2, '0')}`

  async function submitRequest() {
    if (!req) return
    const m = data.medicines.find((x) => x.id === req.medicineId)
    const qty = Math.floor(Number(req.qty))
    if (!m || !(qty > 0)) return setErr('Choose a medicine and quantity.')
    try {
      await add('orders', { ref: ref('REQ'), medicineId: m.id, label: medLabel(m), qty, status: 'REQUESTED', requestedBy: session.name, requestedRole: session.role, reason: req.reason.trim() || undefined, createdAt: new Date().toISOString() })
      toast('Requirement sent to the Municipal Health Office')
      setReq(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function placeOrder() {
    if (!ordering) return
    const s = data.suppliers.find((x) => x.id === ordering.supplierId)
    if (!s) return setErr('Choose a supplier.')
    try {
      await update('orders', ordering.order.id, { status: 'ORDERED', supplierId: s.id, supplierName: s.name, orderedAt: new Date().toISOString(), expectedDate: ordering.expected || undefined, ref: ordering.order.ref.replace(/^REQ/, 'PO') })
      toast(`Supply order sent to ${s.name}`)
      setOrdering(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function receive() {
    if (!receiving) return
    const o = receiving.order
    const m = data.medicines.find((x) => x.id === o.medicineId)
    const qty = Math.floor(Number(receiving.qty))
    if (!m || !(qty > 0)) return setErr('Enter the quantity delivered.')
    try {
      await update('medicines', m.id, { stock: m.stock + qty, ...(receiving.expiry ? { expiry: receiving.expiry } : {}) }, { silent: true })
      await update('orders', o.id, { status: 'DELIVERED', deliveredAt: new Date().toISOString(), deliveredQty: qty })
      log('delivery', 'inventory', `Received ${qty} ${m.unit} of ${medLabel(m)} from ${o.supplierName ?? 'supplier'}`)
      toast(`Stock updated: +${qty} ${m.unit} ${m.name}`)
      setReceiving(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function saveSupplier() {
    if (!supplier) return
    const d = supplier.draft
    if (!d.name.trim() || !d.contact.trim()) return setErr('Supplier name and contact person are required.')
    try {
      if (supplier.id) await update('suppliers', supplier.id, d)
      else await add('suppliers', d)
      toast('Supplier saved')
      setSupplier(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  const tone = (s: SupplyOrderStatus) => (s === 'REQUESTED' ? 'PENDING' : s === 'ORDERED' ? 'SCHEDULED' : s === 'DELIVERED' ? 'COMPLETED' : 'CANCELLED')

  return (
    <>
      <div className="stats stats-3">
        <StatCard icon={<ClipboardList size={24} />} label="Requirements to order" value={data.orders.filter((o) => o.status === 'REQUESTED').length} note="From doctors and staff" />
        <StatCard icon={<Truck size={24} />} label="Orders in transit" value={data.orders.filter((o) => o.status === 'ORDERED').length} note="Awaiting delivery" />
        <StatCard icon={<PackageCheck size={24} />} label="Delivered" value={data.orders.filter((o) => o.status === 'DELIVERED').length} note="Added to stock" />
      </div>

      {canOrder && lowNoOrder.length > 0 && (
        <section className="card">
          <div className="card-head"><h3>Inventory alerts without an order</h3></div>
          {lowNoOrder.map((m) => (
            <div key={m.id} className="req">
              <span className="grow"><b>{medLabel(m)}</b><small className="muted">{fmtNum(m.stock)} {m.unit} left • reorder level {m.reorderLevel}</small></span>
              <Badge status={medicineStatus(m)} />
              <button className="btn btn-outline sm" onClick={() => { setErr(''); setReq({ medicineId: m.id, qty: String(Math.max(m.reorderLevel * 3, 100)), reason: 'Inventory alert' }) }}>Create requirement</button>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <div className="card-head wrap">
          <div>
            <h3>Medicine & supply orders</h3>
            <p className="muted small">Requirement → order to supplier → delivery. Delivered quantities are added to central stock.</p>
          </div>
          {!readOnly && <button className="btn btn-primary sm" onClick={() => { setErr(''); setReq({ medicineId: '', qty: '', reason: '' }) }}><Plus size={16} /> {isDoctor ? 'Request medicine or supplies' : 'New requirement'}</button>}
        </div>
        {orders.length === 0 && <Empty text="No requirements or orders yet." />}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference</th><th>Medicine</th><th>Qty</th><th>Requested by</th><th>Supplier</th><th>Status</th><th className="right"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.ref}<div className="muted small">{fmtDate(o.createdAt)}</div></td>
                  <td><b>{o.label}</b>{o.reason && <div className="muted small">{o.reason}</div>}</td>
                  <td>{fmtNum(o.deliveredQty ?? o.qty)}</td>
                  <td>{o.requestedBy}<div className="muted small">{o.requestedRole}</div></td>
                  <td>{o.supplierName ?? '—'}{o.expectedDate && o.status === 'ORDERED' && <div className="muted small">Expected {fmtDate(o.expectedDate)}</div>}{o.deliveredAt && <div className="muted small">Delivered {fmtDate(o.deliveredAt)}</div>}</td>
                  <td><Badge status={tone(o.status)} /><div className="muted small">{o.status}</div></td>
                  <td className="right">
                    {canOrder && (o.status === 'REQUESTED' || o.status === 'ORDERED') && (
                      <RowMenu label={`Actions for ${o.ref}`} items={[
                        { label: 'Order from supplier', onClick: () => { setErr(''); setOrdering({ order: o, supplierId: data.suppliers[0]?.id ?? '', expected: '' }) }, hidden: o.status !== 'REQUESTED' },
                        { label: 'Record delivery', onClick: () => { setErr(''); setReceiving({ order: o, qty: String(o.qty), expiry: '' }) }, hidden: o.status !== 'ORDERED' },
                        { label: 'Cancel', onClick: () => update('orders', o.id, { status: 'CANCELLED' }).then(() => toast('Order cancelled')), danger: true },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3><Building2 size={18} /> Suppliers</h3>
          {canOrder && <button className="btn btn-outline sm" onClick={() => { setErr(''); setSupplier({ draft: { name: '', contact: '', email: '', supplies: '', leadDays: 5, availability: '' } }) }}><Plus size={16} /> Add supplier</button>}
        </div>
        {data.suppliers.length === 0 && <Empty text="No suppliers yet." />}
        {data.suppliers.map((s) => (
          <div key={s.id} className="req">
            <span className="grow">
              <b>{s.name}</b> <span className="muted small">{s.contact}{s.email ? ` • ${s.email}` : ''}{s.phone ? ` • ${s.phone}` : ''}</span>
              <small>{s.supplies} • usual delivery {s.leadDays} day{s.leadDays === 1 ? '' : 's'}</small>
              {s.availability && <small className="muted">Latest stock availability: {s.availability}</small>}
            </span>
            {canOrder && <button className="btn btn-ghost sm" onClick={() => { setErr(''); setSupplier({ id: s.id, draft: { ...s } }) }}>Edit</button>}
          </div>
        ))}
      </section>

      <Modal open={!!req} title={isDoctor ? 'Request medicine or supplies' : 'New medicine requirement'} subtitle="Sent to the Municipal Health Office for ordering" onClose={() => setReq(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setReq(null)}>Cancel</button><button className="btn btn-primary" onClick={submitRequest}>Submit</button></>}>
        {req && (
          <div className="form-grid">
            <Field label="Medicine">
              <select value={req.medicineId} onChange={(e) => setReq({ ...req, medicineId: e.target.value })}>
                <option value="">Choose medicine…</option>
                {[...data.medicines].sort((a, b) => a.name.localeCompare(b.name)).map((m) => <option key={m.id} value={m.id}>{medLabel(m)} — {fmtNum(m.stock)} {m.unit} in stock</option>)}
              </select>
            </Field>
            <Field label="Quantity needed"><input type="number" min={1} value={req.qty} onChange={(e) => setReq({ ...req, qty: e.target.value })} /></Field>
            <div className="span-2"><Field label="Reason"><input value={req.reason} onChange={(e) => setReq({ ...req, reason: e.target.value })} placeholder="e.g. Hypertension patients for next deployment" /></Field></div>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>

      <Modal open={!!ordering} title="Order from supplier" subtitle={ordering ? `${ordering.order.label} × ${fmtNum(ordering.order.qty)}` : ''} onClose={() => setOrdering(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setOrdering(null)}>Cancel</button><button className="btn btn-primary" onClick={placeOrder}>Send order</button></>}>
        {ordering && (
          <div className="form-grid">
            <Field label="Supplier">
              <select value={ordering.supplierId} onChange={(e) => setOrdering({ ...ordering, supplierId: e.target.value })}>
                {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Expected delivery"><input type="date" value={ordering.expected} onChange={(e) => setOrdering({ ...ordering, expected: e.target.value })} /></Field>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>

      <Modal open={!!receiving} title="Record delivery" subtitle={receiving ? `${receiving.order.ref} • ${receiving.order.supplierName}` : ''} onClose={() => setReceiving(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setReceiving(null)}>Cancel</button><button className="btn btn-primary" onClick={receive}>Add to stock</button></>}>
        {receiving && (
          <div className="form-grid">
            <Field label="Quantity delivered" hint={`Ordered: ${fmtNum(receiving.order.qty)}`}><input type="number" min={1} value={receiving.qty} onChange={(e) => setReceiving({ ...receiving, qty: e.target.value })} /></Field>
            <Field label="Expiry month of delivered stock (optional)"><input type="month" value={receiving.expiry} onChange={(e) => setReceiving({ ...receiving, expiry: e.target.value })} /></Field>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>

      <Modal open={!!supplier} title={supplier?.id ? 'Edit supplier' : 'Add supplier'} onClose={() => setSupplier(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setSupplier(null)}>Cancel</button><button className="btn btn-primary" onClick={saveSupplier}>Save</button></>}>
        {supplier && (
          <div className="form-grid">
            <Field label="Supplier name"><input value={supplier.draft.name} onChange={(e) => setSupplier({ ...supplier, draft: { ...supplier.draft, name: e.target.value } })} /></Field>
            <Field label="Contact person"><input value={supplier.draft.contact} onChange={(e) => setSupplier({ ...supplier, draft: { ...supplier.draft, contact: e.target.value } })} /></Field>
            <Field label="Email"><input value={supplier.draft.email ?? ''} onChange={(e) => setSupplier({ ...supplier, draft: { ...supplier.draft, email: e.target.value } })} /></Field>
            <Field label="Usual delivery (days)"><input type="number" min={0} value={supplier.draft.leadDays} onChange={(e) => setSupplier({ ...supplier, draft: { ...supplier.draft, leadDays: Number(e.target.value) } })} /></Field>
            <div className="span-2"><Field label="Medicines & supplies provided"><input value={supplier.draft.supplies} onChange={(e) => setSupplier({ ...supplier, draft: { ...supplier.draft, supplies: e.target.value } })} /></Field></div>
            <div className="span-2"><Field label="Latest stock availability (from supplier)"><input value={supplier.draft.availability ?? ''} onChange={(e) => setSupplier({ ...supplier, draft: { ...supplier.draft, availability: e.target.value } })} /></Field></div>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>
    </>
  )
}
