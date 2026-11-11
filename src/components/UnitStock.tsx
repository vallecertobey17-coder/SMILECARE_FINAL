import { useState } from 'react'
import { Truck, ArrowRightLeft } from 'lucide-react'
import { useStore } from '../lib/store'
import { Empty, Field, Modal, useToast } from './ui'
import { fmtNum, medicineStatus } from '../lib/utils'
import { medLabel } from '../lib/domain'

const LOW = 20

/** Inventory actually loaded in each Rolling Botika unit, with load/return transfers to the central office. */
export function UnitStock() {
  const { data, update, readOnly, log } = useStore()
  const toast = useToast()
  const units = data.units.filter((u) => u.kind === 'Rolling Botika')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ unitId: '', medId: '', qty: '', dir: 'load' as 'load' | 'return' })
  const [err, setErr] = useState('')

  const openTransfer = (unitId = '', dir: 'load' | 'return' = 'load', medId = '') => {
    setErr('')
    setF({ unitId: unitId || units[0]?.id || '', medId, qty: '', dir })
    setOpen(true)
  }

  async function transfer() {
    const unit = data.units.find((u) => u.id === f.unitId)
    const med = data.medicines.find((m) => m.id === f.medId)
    const qty = Math.floor(Number(f.qty))
    if (!unit || !med) return setErr('Choose a unit and a medicine.')
    if (!(qty > 0)) return setErr('Enter a quantity.')
    const onUnit = unit.stock?.[med.id] ?? 0
    if (f.dir === 'load') {
      if (medicineStatus(med) === 'EXPIRED') return setErr(`${medLabel(med)} is expired and can't be loaded.`)
      if (med.stock < qty) return setErr(`Only ${fmtNum(med.stock)} ${med.unit} left at the central office.`)
    } else if (onUnit < qty) return setErr(`Only ${onUnit} ${med.unit} on this unit.`)
    try {
      const delta = f.dir === 'load' ? qty : -qty
      await update('medicines', med.id, { stock: med.stock - delta }, { silent: true })
      await update('units', unit.id, { stock: { ...(unit.stock ?? {}), [med.id]: onUnit + delta } }, { silent: true })
      log('transfer', 'inventory', `${f.dir === 'load' ? 'Loaded' : 'Returned'} ${qty} ${med.unit} of ${medLabel(med)} ${f.dir === 'load' ? 'to' : 'from'} ${unit.name}`)
      toast(`${f.dir === 'load' ? 'Loaded' : 'Returned'} ${qty} ${med.unit} • ${unit.name}`)
      setOpen(false)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  return (
    <>
      {units.length === 0 && (
        <section className="card">
          <Empty text="No Rolling Botika units yet. Add one under Rolling Botika & E-Pila." />
        </section>
      )}
      <div className="unit-stock-grid">
        {units.map((u) => {
          const rows = Object.entries(u.stock ?? {})
            .map(([id, qty]) => ({ m: data.medicines.find((x) => x.id === id), qty }))
            .filter((r) => r.m)
            .sort((a, b) => a.qty - b.qty)
          const low = rows.filter((r) => r.qty < LOW).length
          return (
            <section key={u.id} className="card">
              <div className="card-head">
                <div className="person">
                  <span className="unit-icon"><Truck size={22} /></span>
                  <span>
                    <h3>{u.name}</h3>
                    <small className="muted">{u.location} • {rows.reduce((a, r) => a + r.qty, 0)} units loaded</small>
                  </span>
                </div>
                {low > 0 && <span className="badge badge-amber">{low} LOW</span>}
              </div>
              {rows.length === 0 && <p className="muted small">Nothing loaded yet.</p>}
              <div className="stock-rows">
                {rows.map(({ m, qty }) => (
                  <div key={m!.id} className="info-row">
                    <span>
                      <b>{medLabel(m!)}</b>
                      <div className="bar thin"><span className={qty < LOW ? 'warn' : ''} style={{ width: Math.min(100, (qty / 200) * 100) + '%' }} /></div>
                    </span>
                    <span className="right">
                      <b>{qty}</b> <span className="muted small">{m!.unit}</span>
                      {qty < LOW && <div><span className={`badge ${qty === 0 ? 'badge-red' : 'badge-amber'}`}>{qty === 0 ? 'EMPTY' : 'LOW'}</span></div>}
                    </span>
                  </div>
                ))}
              </div>
              {!readOnly && (
                <div className="btn-row end">
                  <button className="btn btn-outline sm" onClick={() => openTransfer(u.id, 'return')} disabled={!rows.length}>Return to central</button>
                  <button className="btn btn-primary sm" onClick={() => openTransfer(u.id, 'load')}><ArrowRightLeft size={15} /> Load medicines</button>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <Modal open={open} title={f.dir === 'load' ? 'Load medicines to unit' : 'Return medicines to central office'} subtitle="Moves stock between the central health office and a Rolling Botika unit" onClose={() => setOpen(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={transfer}>{f.dir === 'load' ? 'Load' : 'Return'}</button></>}>
        <div className="form-grid">
          <Field label="Rolling Botika unit">
            <select value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value })}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Direction">
            <select value={f.dir} onChange={(e) => setF({ ...f, dir: e.target.value as 'load' | 'return' })}>
              <option value="load">Central → unit (load)</option>
              <option value="return">Unit → central (return)</option>
            </select>
          </Field>
          <Field label="Medicine">
            <select value={f.medId} onChange={(e) => setF({ ...f, medId: e.target.value })}>
              <option value="">Choose medicine…</option>
              {[...data.medicines].sort((a, b) => a.name.localeCompare(b.name)).map((m) => {
                const onUnit = data.units.find((u) => u.id === f.unitId)?.stock?.[m.id] ?? 0
                return <option key={m.id} value={m.id}>{medLabel(m)} — central {fmtNum(m.stock)} • unit {onUnit}</option>
              })}
            </select>
          </Field>
          <Field label="Quantity"><input type="number" min={1} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field>
          {err && <div className="alert alert-err span-2">{err}</div>}
        </div>
      </Modal>
    </>
  )
}
