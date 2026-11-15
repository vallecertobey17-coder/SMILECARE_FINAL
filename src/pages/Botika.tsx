import { useEffect, useRef, useState } from 'react'
import { Truck, Building2, UserPlus, BellRing, ListOrdered, Users, Check, Volume2, UserX, MonitorPlay, Clock, Star } from 'lucide-react'
import { Icon } from '../components/Icon'
import { useStore } from '../lib/store'
import type { PriorityType, Ticket, Unit, UnitStatus } from '../lib/types'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, StatCard, useToast } from '../components/ui'
import { fmtNum, fmtTime } from '../lib/utils'
import { CUTOFF_MIN, PRIORITIES, SERVICES, avgMinutes, cutoffReached, missingTickets, nextNumber, pushBackOrder, queueStats, serviceOf, servingTicket, waitingList } from '../lib/epila'

const STATUSES: UnitStatus[] = ['IN PROGRESS', 'OPEN', 'CLOSED']
type Draft = Omit<Unit, 'id'>
const blank = (): Draft => ({ name: '', location: '', until: '17:00', served: 0, queue: 0, status: 'OPEN', kind: 'Rolling Botika', description: '' })
type WalkIn = { unit: Unit; who: string; service: string; priority: '' | PriorityType }
const short = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] }

export default function Botika() {
  const { data, add, update, remove, readOnly, log } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<Unit | null>(null)
  const [walkIn, setWalkIn] = useState<WalkIn | null>(null)
  const [lane, setLane] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  // Older saved data only kept a counter: give every queued person a real ticket once.
  const synced = useRef(false)
  useEffect(() => {
    if (readOnly || synced.current || !data.units.length) return
    const miss = missingTickets(data)
    if (!miss.length) { synced.current = true; return }
    synced.current = true
    ;(async () => { for (const t of miss) await add('tickets', t, { silent: true }) })().catch(() => {})
  }, [data, readOnly])

  const active = data.units.filter((u) => u.status !== 'CLOSED')
  const units = [...data.units].sort((a, b) => (a.status === 'CLOSED' ? 1 : 0) - (b.status === 'CLOSED' ? 1 : 0) || a.name.localeCompare(b.name))
  const waitingCount = (u: Unit) => waitingList(data, u.id).length

  async function run(u: Unit, fn: () => Promise<void>) {
    if (busy) return
    setBusy(u.id)
    try { await fn() } catch (e: any) { toast(e.message, 'err') } finally { setBusy(null) }
  }
  const syncCount = async (u: Unit, served: number, removedFromLine: number) => update('units', u.id, { served, queue: Math.max(0, waitingCount(u) - removedFromLine) }, { silent: true })

  /** Finish whoever is being served and call the next person (priority lane first). */
  const callNext = (u: Unit) => run(u, async () => {
    const now = new Date().toISOString()
    const cur = servingTicket(data, u.id)
    let served = u.served
    if (cur) { await update('tickets', cur.id, { status: 'DONE', doneAt: now }, { silent: true }); served++ }
    const next = waitingList(data, u.id, lane[u.id] || undefined)[0]
    if (next) await update('tickets', next.id, { status: 'SERVING', calledAt: now }, { silent: true })
    await syncCount(u, served, next ? 1 : 0)
    log('call-next', 'units', `${u.name} now serving ${next ? `#${next.number} (${next.residentName})` : 'nobody'}`)
    toast(next ? `Now serving #${next.number} • ${next.residentName}${next.priority ? ` • ${next.priority} priority` : ''}` : 'Line is empty')
  })
  const complete = (u: Unit, t: Ticket) => run(u, async () => {
    await update('tickets', t.id, { status: 'DONE', doneAt: new Date().toISOString() }, { silent: true })
    await syncCount(u, u.served + 1, 0)
    toast(`#${t.number} completed`)
  })
  const recall = (u: Unit, t: Ticket) => run(u, async () => {
    await update('tickets', t.id, { calledAt: new Date().toISOString() }, { silent: true })
    toast(`Calling #${t.number} again • ${t.residentName}`)
  })
  /** First no-show: back of the next 3 people. Second no-show: removed from the line. */
  const noShow = (u: Unit, t: Ticket) => run(u, async () => {
    if ((t.noShows ?? 0) >= 1) {
      await update('tickets', t.id, { status: 'NO_SHOW', doneAt: new Date().toISOString() }, { silent: true })
      toast(`#${t.number} marked no-show and removed`)
    } else {
      await update('tickets', t.id, { status: 'WAITING', noShows: 1, order: pushBackOrder(data, t), calledAt: undefined }, { silent: true })
      toast(`#${t.number} didn't come — moved back 3 places`)
    }
    await update('units', u.id, { queue: waitingCount(u) + ((t.noShows ?? 0) >= 1 ? 0 : 1) }, { silent: true })
  })

  async function addWalkIn() {
    if (!walkIn) return
    const { unit: u, who, service, priority } = walkIn
    if (!who.trim()) return setErr('Enter the resident name or Health ID.')
    if (cutoffReached(u)) return setErr(`New numbers stop ${CUTOFF_MIN} minutes before closing (${fmtTime(u.until)}).`)
    const r = data.residents.find((x) => x.healthId.toLowerCase() === who.trim().toLowerCase() || x.name.toLowerCase() === who.trim().toLowerCase())
    if (r && data.tickets.some((t) => t.residentId === r.id && (t.status === 'WAITING' || t.status === 'SERVING'))) return setErr(`${r.name} already has an active queue number.`)
    await run(u, async () => {
      const number = nextNumber(data, u)
      await add('tickets', { unitId: u.id, unitName: u.name, number, residentId: r?.id ?? '', residentName: r?.name ?? who.trim(), purpose: service, service, status: 'WAITING', walkIn: true, ...(priority ? { priority } : {}), createdAt: new Date().toISOString() }, { silent: true })
      await update('units', u.id, { queue: waitingCount(u) + 1 }, { silent: true })
      toast(`Issued #${number} • ${r?.name ?? who.trim()}${priority ? ' • priority lane' : ''}`)
      setWalkIn(null)
    })
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
  const totalWaiting = active.reduce((a, u) => a + waitingCount(u), 0)

  return (
    <div className="page">
      <PageHead title="Rolling Botika & E-Pila" subtitle="Deploy mobile pharmacy units and manage virtual queues across locations."
        actions={<>
          <a className="btn btn-outline" href="#display" target="_blank" rel="noreferrer"><MonitorPlay size={18} /> Open display board</a>
          {!readOnly && <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: blank() }) }}><Icon name="add" /> Add Unit</button>}
        </>} />
      <div className="stats stats-3">
        <StatCard icon={<Truck size={24} />} label="Active units" value={active.length} note={`${data.units.length} total`} />
        <StatCard icon={<ListOrdered size={24} />} tone="violet" label="In queue (E-Pila)" value={fmtNum(totalWaiting)} note={`Across ${active.length} location${active.length === 1 ? '' : 's'}`} />
        <StatCard icon={<Users size={24} />} tone="blue" label="Served today" value={fmtNum(data.units.reduce((a, u) => a + u.served, 0))} note="All units" />
      </div>

      {units.length === 0 && <section className="card"><Empty text="No units yet. Add a Rolling Botika or health office." /></section>}
      <div className="unit-grid">
        {units.map((u) => {
          const cur = servingTicket(data, u.id)
          const line = waitingList(data, u.id)
          const per = avgMinutes(data, u.id)
          const closedForNew = u.status !== 'CLOSED' && cutoffReached(u)
          const off = u.status === 'CLOSED' || busy === u.id
          return (
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
                <div><b>{line.length}</b><small>In queue</small></div>
                <div><b>~{per}m</b><small>Per person</small></div>
              </div>

              {(
                <div className={`now-serving ${cur ? '' : 'empty'}`}>
                  <span className="eyebrow">Now serving</span>
                  {cur ? (
                    <>
                      <div className="ns-row">
                        <b className="ns-num">#{cur.number}</b>
                        <span className="grow">
                          <b>{cur.residentName}</b>
                          <small className="muted">{serviceOf(cur)}{cur.walkIn ? ' • walk-in' : ' • E-Pila app'}</small>
                        </span>
                        {cur.priority && <span className="prio"><Star size={13} /> {cur.priority}</span>}
                      </div>
                      {!readOnly && (
                        <div className="ns-actions">
                          <button className="btn btn-outline sm" disabled={off} onClick={() => complete(u, cur)}><Check size={16} /> Complete</button>
                          <button className="btn btn-outline sm" disabled={off} onClick={() => recall(u, cur)}><Volume2 size={16} /> Recall</button>
                          <button className="btn btn-outline sm danger" disabled={off} onClick={() => noShow(u, cur)}><UserX size={16} /> No-show</button>
                        </div>
                      )}
                    </>
                  ) : <p className="muted small">{u.status === 'CLOSED' ? 'Unit closed — no queue right now.' : 'Nobody is being served. Press Call next.'}</p>}
                </div>
              )}

              {(
                <div className="next-up">
                  <span className="muted small">Next up</span>
                  <ol>
                    {!line.length && <li className="li-empty">{u.status === 'CLOSED' ? 'Queue closed' : 'No one waiting'}</li>}
                    {line.slice(0, 4).map((t) => (
                      <li key={t.id} className={t.priority ? 'is-prio' : ''}>
                        <b>#{t.number}</b>
                        <span className="grow">{short(t.residentName)}</span>
                        <small className="lane">{serviceOf(t)}</small>
                        {t.priority && <span className="prio" title={`${t.priority} priority lane`}><Star size={12} /> {t.priority === 'Senior citizen' ? 'Senior' : t.priority}</span>}
                      </li>
                    ))}
                  </ol>
                  <small className="muted next-more">{line.length > 4 ? `+${line.length - 4} more waiting • ~${line.length * per} min to clear` : line.length ? `~${line.length * per} min to clear` : '\u00a0'}</small>
                </div>
              )}
              <p className="cutoff">{closedForNew ? <><Clock size={15} /> New numbers closed — {CUTOFF_MIN} min before closing time.</> : '\u00a0'}</p>

              {!readOnly && (
                <div className="unit-actions">
                  <button className="btn btn-outline" disabled={off || closedForNew} onClick={() => { setErr(''); setWalkIn({ unit: u, who: '', service: SERVICES[0], priority: '' }) }}><UserPlus size={17} /> Add to queue</button>
                  <button className="btn btn-primary" disabled={off || (!line.length && !cur)} onClick={() => callNext(u)}><BellRing size={17} /> Call next</button>
                  <select className="mini-select" value={lane[u.id] || ''} aria-label={`Lane to call for ${u.name}`} onChange={(e) => setLane((l) => ({ ...l, [u.id]: e.target.value }))} disabled={u.status === 'CLOSED'}>
                    <option value="">All services</option>
                    {SERVICES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select className="mini-select" value={u.status} aria-label={`Status for ${u.name}`} onChange={(e) => run(u, async () => { await update('units', u.id, { status: e.target.value as UnitStatus }); toast(`${u.name} is now ${e.target.value.toLowerCase()}`) })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <section className="card">
        <div className="card-head"><div><h3>E-Pila report • today</h3><p className="muted small">Waiting time is from getting a number to being called.</p></div></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Unit</th><th>Numbers issued</th><th>Served</th><th>No-shows</th><th>Priority lane</th><th>Avg. wait</th><th>Per person</th></tr></thead>
            <tbody>
              {units.filter((u) => u.status !== 'CLOSED').map((u) => { const s = queueStats(data, u.id); return (
                <tr key={u.id}><td><b>{u.name}</b></td><td>{s.issued}</td><td>{s.served}</td><td>{s.noShows}</td><td>{s.priority}</td><td>{s.avgWait != null ? `${s.avgWait} min` : '—'}</td><td>~{s.avgService} min</td></tr>
              ) })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={!!walkIn} title="Add to queue" subtitle={walkIn ? `${walkIn.unit.name} • walk-in number` : ''} onClose={() => setWalkIn(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setWalkIn(null)}>Cancel</button><button className="btn btn-primary" onClick={addWalkIn}><UserPlus size={17} /> Issue number</button></>}>
        {walkIn && (
          <div className="form-grid">
            <Field label="Resident name or Health ID">
              <input list="epila-residents" value={walkIn.who} onChange={(e) => setWalkIn({ ...walkIn, who: e.target.value })} placeholder="e.g. Juan Dela Cruz or SC-TAY-2024-…" autoFocus />
              <datalist id="epila-residents">{data.residents.map((r) => <option key={r.id} value={r.name}>{r.healthId}</option>)}</datalist>
            </Field>
            <Field label="Service">
              <select value={walkIn.service} onChange={(e) => setWalkIn({ ...walkIn, service: e.target.value })}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select>
            </Field>
            <Field label="Priority lane" hint="Seniors, PWDs and pregnant women are served first (RA 9994, RA 10754). Check a valid ID.">
              <select value={walkIn.priority} onChange={(e) => setWalkIn({ ...walkIn, priority: e.target.value as WalkIn['priority'] })}>
                <option value="">None</option>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <div className="field"><span className="field-label">Number to issue</span><b className="issue-num">#{nextNumber(data, walkIn.unit)}</b></div>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>

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
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>
      <Confirm open={!!deleting} title="Delete unit?" text={`${deleting?.name} will be removed.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('units', deleting.id); toast('Unit deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
