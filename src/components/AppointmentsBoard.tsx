import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import type { Appointment, AppointmentStatus } from '../lib/types'
import { Badge, Empty, Field, RowMenu, useToast } from './ui'
import { fmtDate, isoDate } from '../lib/utils'
import { nowServing } from '../lib/domain'

/**
 * DFD 2.0 Schedule Appointment → Municipal Health Office Staff:
 * the Appointment Requests List and Appointment Queue List.
 * With `doctor`, it is the Municipal Health Doctor's Appointment Schedule (DFD 8.0 → Doctor).
 */
export function AppointmentsBoard({ doctor, compact }: { doctor?: string; compact?: boolean }) {
  const { data, update, readOnly } = useStore()
  const toast = useToast()
  const today = isoDate()
  const [status, setStatus] = useState<string>(doctor ? 'CONFIRMED' : '')
  const [when, setWhen] = useState<'upcoming' | 'today' | 'all'>('upcoming')
  const [mine, setMine] = useState(!!doctor)
  const doctors = data.staff.filter((s) => s.role === 'Municipal Health Doctor' && s.active)

  const rows = useMemo(
    () =>
      data.appointments
        .filter((a) => !status || a.status === status)
        .filter((a) => (when === 'today' ? a.date === today : when === 'upcoming' ? a.date >= today : true))
        .filter((a) => !doctor || a.kind !== 'medicine')
        .filter((a) => !mine || !doctor || !a.doctor || a.doctor === doctor)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
    [data.appointments, status, when, today, doctor, mine],
  )

  async function setSt(a: Appointment, s: AppointmentStatus) {
    try {
      await update('appointments', a.id, { status: s })
      if (s === 'CANCELLED') {
        const svc = data.services.find((x) => x.id === a.serviceId)
        if (svc && svc.booked > 0) await update('services', svc.id, { booked: svc.booked - 1 }, { silent: true })
      }
      toast(`${a.ref} ${s.toLowerCase()}`)
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  const queues = data.units.filter((u) => u.status !== 'CLOSED')

  return (
    <div className="stack">
      {!doctor && !compact && (
        <section className="card">
          <div className="card-head"><h3>Appointment queue (E-Pila)</h3></div>
          <div className="queue-row">
            {queues.length === 0 && <span className="muted">No queues open.</span>}
            {queues.map((u) => (
              <div key={u.id} className="queue-box">
                <b>{u.name}</b>
                <span>Now serving <strong>#{nowServing(data, u.id) || '—'}</strong></span>
                <small className="muted">{u.queue} waiting • {data.tickets.filter((t) => t.unitId === u.id && t.status === 'WAITING').length} via E-Pila</small>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="card">
        <div className="card-head wrap">
          <div>
            <h3>{doctor ? 'My appointment schedule' : 'Appointment requests'}</h3>
            <p className="muted small">{doctor ? 'Confirmed consultations and services booked by residents.' : 'Bookings and medicine requests submitted by residents.'}</p>
          </div>
          <div className="btn-row">
            {doctor && (
              <label className="check small"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Assigned to me</label>
            )}
            <select className="mini-select" value={when} onChange={(e) => setWhen(e.target.value as typeof when)} aria-label="Date range">
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="all">All dates</option>
            </select>
            <select className="mini-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="">All statuses</option>
              {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>
        {rows.length === 0 && <Empty text="No appointments for this view." />}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date & time</th><th>Resident</th><th>Request</th><th>Doctor</th><th>Status</th>{!readOnly && <th className="right"><span className="sr-only">Actions</span></th>}</tr></thead>
            <tbody>
              {(compact ? rows.slice(0, 6) : rows).map((a) => (
                <tr key={a.id}>
                  <td>{fmtDate(a.date)}<div className="muted small">{a.time ?? 'Pickup'} • {a.location}</div></td>
                  <td><b>{a.residentName}</b><div className="muted small">{a.ref}{a.barangay ? ` • Brgy. ${a.barangay}` : ''}</div></td>
                  <td>{a.serviceName ?? 'Medicine request'}{a.medicines && <div className="muted small">{a.medicines.map((m) => `${m.label} × ${m.qty}`).join(', ')}</div>}{a.notes && <div className="muted small">Note: {a.notes}</div>}</td>
                  <td>
                    {!readOnly && !doctor && a.kind !== 'medicine' ? (
                      <Field label="">
                        <select className="mini-select" value={a.doctor ?? ''} aria-label={`Doctor for ${a.ref}`} onChange={(e) => update('appointments', a.id, { doctor: e.target.value }).then(() => toast('Doctor assigned'))}>
                          <option value="">Unassigned</option>
                          {[...new Set([...doctors.map((d) => d.name), ...(a.doctor ? [a.doctor] : [])])].map((n) => <option key={n}>{n}</option>)}
                        </select>
                      </Field>
                    ) : (a.doctor ?? '—')}
                  </td>
                  <td><Badge status={a.status} /></td>
                  {!readOnly && (
                    <td className="right">
                      <RowMenu label={`Actions for ${a.ref}`} items={[
                        { label: 'Confirm', onClick: () => setSt(a, 'CONFIRMED'), hidden: a.status !== 'PENDING' },
                        { label: 'Mark completed', onClick: () => setSt(a, 'COMPLETED'), hidden: a.status !== 'CONFIRMED' },
                        { label: 'Cancel', onClick: () => setSt(a, 'CANCELLED'), danger: true, hidden: a.status === 'CANCELLED' || a.status === 'COMPLETED' },
                      ]} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
