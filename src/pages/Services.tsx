import { useMemo, useState } from 'react'
import { CalendarDays, Activity, CheckCircle2 } from 'lucide-react'
import { Icon } from '../components/Icon'
import { useStore } from '../lib/store'
import { AppointmentsBoard } from '../components/AppointmentsBoard'
import type { Service, ServiceStatus } from '../lib/types'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, Pager, StatCard, Toolbar, usePaged, useToast } from '../components/ui'
import { fmtDate, fmtTime, isoDate } from '../lib/utils'

const STATUSES: ServiceStatus[] = ['SCHEDULED', 'ONGOING', 'COMPLETED']
type Draft = Omit<Service, 'id'>
const blank = (): Draft => ({ name: '', location: '', date: isoDate(), start: '08:00', end: '17:00', capacity: 50, booked: 0, status: 'SCHEDULED', category: '' })

export default function Services() {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loc, setLoc] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'schedule' | 'appointments'>('schedule')

  const locations = [...new Set(data.services.map((s) => s.location))].sort()
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.services
      .filter((x) => !status || x.status === status)
      .filter((x) => !loc || x.location === loc)
      .filter((x) => !from || x.date >= from)
      .filter((x) => !to || x.date <= to)
      .filter((x) => !s || `${x.name} ${x.location} ${x.category ?? ''}`.toLowerCase().includes(s))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  }, [data.services, q, status, loc, from, to])
  const paged = usePaged(rows, 8, q + status + loc + from + to)

  async function save() {
    if (!editing) return
    const d = editing.draft
    if (!d.name.trim()) return setErr('Service name is required.')
    if (!d.location.trim()) return setErr('Location is required.')
    if (!d.date) return setErr('Date is required.')
    if (d.end <= d.start) return setErr('End time must be after start time.')
    if (!(d.capacity > 0)) return setErr('Capacity must be at least 1.')
    if (d.booked < 0 || d.booked > d.capacity) return setErr('Booked slots must be between 0 and capacity.')
    try {
      const clean = { ...d, name: d.name.trim(), location: d.location.trim(), capacity: Math.floor(d.capacity), booked: Math.floor(d.booked) }
      if (editing.id) await update('services', editing.id, clean)
      else await add('services', clean)
      toast(editing.id ? 'Service updated' : 'Service added')
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function act(s: Service, patch: Partial<Service>, msg: string) {
    try {
      await update('services', s.id, patch)
      toast(msg)
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  const set = (k: keyof Draft, v: string | number) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))

  return (
    <div className="page">
      <PageHead title="Health Services" subtitle="Manage the deployment schedule, capacity, and resident appointments." />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'schedule'} className={tab === 'schedule' ? 'on' : ''} onClick={() => setTab('schedule')}>Deployment schedule</button>
        <button role="tab" aria-selected={tab === 'appointments'} className={tab === 'appointments' ? 'on' : ''} onClick={() => setTab('appointments')}>
          Appointments{data.appointments.filter((a) => a.status === 'PENDING').length > 0 && <span className="count">{data.appointments.filter((a) => a.status === 'PENDING').length}</span>}
        </button>
      </div>
      {tab === 'appointments' ? <AppointmentsBoard /> : (<>
      <div className="stats stats-3">
        <StatCard icon={<CalendarDays size={24} />} tone="blue" label="Scheduled" value={data.services.filter((s) => s.status === 'SCHEDULED').length} note="Upcoming services" onClick={() => setStatus('SCHEDULED')} active={status === 'SCHEDULED'} />
        <StatCard icon={<Activity size={24} />} tone="violet" label="Ongoing" value={data.services.filter((s) => s.status === 'ONGOING').length} note="Running now" onClick={() => setStatus('ONGOING')} active={status === 'ONGOING'} />
        <StatCard icon={<CheckCircle2 size={24} />} label="Completed" value={data.services.filter((s) => s.status === 'COMPLETED').length} note={`${data.services.filter((s) => s.status === 'COMPLETED').reduce((a, s) => a + s.booked, 0)} residents served`} onClick={() => setStatus('COMPLETED')} active={status === 'COMPLETED'} />
      </div>

      <Toolbar search={q} onSearch={setQ} placeholder="Search Services..." status={status} onStatus={setStatus} statuses={STATUSES}
          filtersOpen={showFilters} onToggleFilters={() => setShowFilters((v) => !v)} filterCount={[loc, from, to].filter(Boolean).length}
          action={!readOnly && <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: blank() }) }}><Icon name="add" /> Add Service</button>} />
        {showFilters && (
          <div className="filters">
            <Field label="Location">
              <select value={loc} onChange={(e) => setLoc(e.target.value)}>
                <option value="">All locations</option>
                {locations.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <button className="btn btn-ghost" onClick={() => { setLoc(''); setFrom(''); setTo('') }}>Clear filters</button>
          </div>
        )}
        <section className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Service</th><th>Location</th><th>Schedule</th><th>Capacity</th><th>Status</th><th className="right"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {paged.slice.map((s) => {
                const pct = s.capacity ? Math.round((s.booked / s.capacity) * 100) : 0
                return (
                  <tr key={s.id}>
                    <td><b>{s.name}</b>{s.category && <div className="muted small">{s.category}</div>}</td>
                    <td>{s.location}</td>
                    <td>{fmtDate(s.date)}<div className="muted small">{fmtTime(s.start)} – {fmtTime(s.end)}</div></td>
                    <td>
                      <b>{s.booked}</b> <span className="muted">/ {s.capacity}</span>
                      <div className="bar thin"><span className={pct >= 90 ? 'full' : ''} style={{ width: Math.min(100, pct) + '%' }} /></div>
                    </td>
                    <td><Badge status={s.status} /></td>
                    <td className="right">
                      {!readOnly && (
                        <RowMenu label={`Actions for ${s.name}`} items={[
                          { label: s.booked >= s.capacity ? 'Fully booked' : 'Book a slot', onClick: () => s.booked < s.capacity && act(s, { booked: s.booked + 1 }, `Slot booked • ${s.booked + 1}/${s.capacity}`), hidden: s.status === 'COMPLETED' },
                          ...STATUSES.filter((x) => x !== s.status).map((x) => ({ label: `Mark ${x.toLowerCase()}`, onClick: () => act(s, { status: x }, `${s.name} marked ${x.toLowerCase()}`) })),
                          { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: s.id, draft: { ...blank(), ...s } }) } },
                          { label: 'Delete', onClick: () => setDeleting(s), danger: true },
                        ]} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text={data.services.length ? 'No services match your search.' : 'No services scheduled yet.'} />}
        </div>
        <Pager {...paged} onPage={paged.setPage} />
        </section>

      </>)}

      <Modal open={!!editing} title={editing?.id ? 'Edit service' : 'Add service'} onClose={() => setEditing(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>{editing?.id ? 'Save changes' : 'Add service'}</button></>}>
        {editing && (
          <div className="form-grid">
            <Field label="Service name"><input value={editing.draft.name} onChange={(e) => set('name', e.target.value)} placeholder="General Consultation" /></Field>
            <Field label="Category"><input value={editing.draft.category || ''} onChange={(e) => set('category', e.target.value)} placeholder="OPD Clinical stream" /></Field>
            <Field label="Location">
              <input list="svc-locations" value={editing.draft.location} onChange={(e) => set('location', e.target.value)} placeholder="Municipal Health Office" />
              <datalist id="svc-locations">{locations.map((l) => <option key={l} value={l} />)}</datalist>
            </Field>
            <Field label="Date"><input type="date" value={editing.draft.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Start time"><input type="time" value={editing.draft.start} onChange={(e) => set('start', e.target.value)} /></Field>
            <Field label="End time"><input type="time" value={editing.draft.end} onChange={(e) => set('end', e.target.value)} /></Field>
            <Field label="Capacity"><input type="number" min={1} value={editing.draft.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></Field>
            <Field label="Booked slots"><input type="number" min={0} value={editing.draft.booked} onChange={(e) => set('booked', Number(e.target.value))} /></Field>
            <Field label="Status">
              <select value={editing.draft.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((x) => <option key={x} value={x}>{x.charAt(0) + x.slice(1).toLowerCase()}</option>)}</select>
            </Field>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>

      <Confirm open={!!deleting} title="Delete service?" text={`${deleting?.name} on ${deleting ? fmtDate(deleting.date) : ''} will be removed.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('services', deleting.id); toast('Service deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
