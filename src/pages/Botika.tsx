import { useState } from 'react'
import { Truck, Building2, UserPlus, BellRing, ListOrdered, Users } from 'lucide-react'
import { Icon } from '../components/Icon'
import { useStore } from '../lib/store'
import type { Unit, UnitStatus } from '../lib/types'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, StatCard, useToast } from '../components/ui'
import { fmtNum, fmtTime } from '../lib/utils'

const STATUSES: UnitStatus[] = ['IN PROGRESS', 'OPEN', 'CLOSED']
type Draft = Omit<Unit, 'id'>
const blank = (): Draft => ({ name: '', location: '', until: '17:00', served: 0, queue: 0, status: 'OPEN', kind: 'Rolling Botika', description: '' })

export default function Botika() {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<Unit | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const active = data.units.filter((u) => u.status !== 'CLOSED')
  const units = [...data.units].sort((a, b) => (a.status === 'CLOSED' ? 1 : 0) - (b.status === 'CLOSED' ? 1 : 0) || a.name.localeCompare(b.name))

  async function act(u: Unit, patch: Partial<Unit>, msg: string) {
    if (busy) return
    setBusy(u.id)
    try {
      await update('units', u.id, patch)
      toast(msg)
    } catch (e: any) {
      toast(e.message, 'err')
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    if (!editing) return
    const d = editing.draft
    if (!d.name.trim()) return setErr('Unit name is required.')
    if (!d.location.trim()) return setErr('Location is required.')
    try {
      const clean = { ...d, name: d.name.trim(), location: d.location.trim(), served: Math.max(0, Math.floor(d.served)), queue: Math.max(0, Math.floor(d.queue)) }
      if (editing.id) await update('units', editing.id, clean)
      else await add('units', clean)
      toast(editing.id ? 'Unit updated' : 'Unit added')
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  const set = (k: keyof Draft, v: string | number) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))

  return (
    <div className="page">
      <PageHead title="Rolling Botika & E-Pila" subtitle="Deploy mobile pharmacy units and manage virtual queues across locations."
        actions={!readOnly && <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: blank() }) }}><Icon name="add" /> Add Unit</button>} />
      <div className="stats stats-3">
        <StatCard icon={<Truck size={24} />} label="Active units" value={active.length} note={`${data.units.length} total`} />
        <StatCard icon={<ListOrdered size={24} />} tone="violet" label="In queue (E-Pila)" value={fmtNum(active.reduce((a, u) => a + u.queue, 0))} note={`Across ${active.length} location${active.length === 1 ? '' : 's'}`} />
        <StatCard icon={<Users size={24} />} tone="blue" label="Served today" value={fmtNum(data.units.reduce((a, u) => a + u.served, 0))} note="All units" />
      </div>

      {units.length === 0 && <section className="card"><Empty text="No units yet. Add a Rolling Botika or health office." /></section>}
      <div className="unit-grid">
        {units.map((u) => (
          <section key={u.id} className={`card unit-card ${u.status === 'CLOSED' ? 'is-closed' : ''}`}>
            <div className="unit-card-head">
              <div className={`unit-icon ${u.kind === 'Rolling Botika' ? 'tone-teal' : 'tone-blue'}`}>{u.kind === 'Rolling Botika' ? <Truck size={22} /> : <Building2 size={22} />}</div>
              <div className="grow">
                <Badge status={u.status} />
                <h3>{u.name}</h3>
                <p className="muted small">{u.description ? `${u.description} • ` : ''}{u.location} • Until {fmtTime(u.until)}</p>
              </div>
              {!readOnly && (
                <RowMenu label={`Actions for ${u.name}`} items={[
                  { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: u.id, draft: { ...blank(), ...u } }) } },
                  { label: 'Delete', onClick: () => setDeleting(u), danger: true },
                ]} />
              )}
            </div>
            <div className="unit-big">
              <div><b>{u.served}</b><small>Served</small></div>
              <div><b>{u.queue}</b><small>In queue</small></div>
              <div><b>{u.served + u.queue ? Math.round((u.served / (u.served + u.queue)) * 100) : 0}%</b><small>Done</small></div>
            </div>
            {!readOnly && (
              <div className="unit-actions">
                <button className="btn btn-outline" disabled={u.status === 'CLOSED' || busy === u.id} onClick={() => act(u, { queue: u.queue + 1 }, `Added to queue • ${u.name}`)}><UserPlus size={17} /> Add to queue</button>
                <button className="btn btn-primary" disabled={u.queue <= 0 || u.status === 'CLOSED' || busy === u.id} onClick={() => act(u, { queue: u.queue - 1, served: u.served + 1 }, `Now serving #${u.served + 1} at ${u.name}`)}><BellRing size={17} /> Call next</button>
                <select className="mini-select" value={u.status} aria-label={`Status for ${u.name}`} onChange={(e) => act(u, { status: e.target.value as UnitStatus }, `${u.name} is now ${e.target.value.toLowerCase()}`)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
            )}
          </section>
        ))}
      </div>

      <Modal open={!!editing} title={editing?.id ? 'Edit unit' : 'Add unit'} onClose={() => setEditing(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>{editing?.id ? 'Save changes' : 'Add unit'}</button></>}>
        {editing && (
          <div className="form-grid">
            <Field label="Unit name"><input value={editing.draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Rolling Botika • San Juan" /></Field>
            <Field label="Type">
              <select value={editing.draft.kind} onChange={(e) => set('kind', e.target.value)}><option>Rolling Botika</option><option>Health Office</option></select>
            </Field>
            <Field label="Location"><input value={editing.draft.location} onChange={(e) => set('location', e.target.value)} placeholder="Club Manila East Grounds" /></Field>
            <Field label="Description"><input value={editing.draft.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="General consultations" /></Field>
            <Field label="Open until"><input type="time" value={editing.draft.until} onChange={(e) => set('until', e.target.value)} /></Field>
            <Field label="Status">
              <select value={editing.draft.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}</select>
            </Field>
            <Field label="Served"><input type="number" min={0} value={editing.draft.served} onChange={(e) => set('served', Number(e.target.value))} /></Field>
            <Field label="In queue"><input type="number" min={0} value={editing.draft.queue} onChange={(e) => set('queue', Number(e.target.value))} /></Field>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>
      <Confirm open={!!deleting} title="Delete unit?" text={`${deleting?.name} will be removed.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('units', deleting.id); toast('Unit deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
