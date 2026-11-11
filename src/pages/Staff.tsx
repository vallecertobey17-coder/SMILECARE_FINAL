import { useState } from 'react'
import { ShieldCheck, Users, LifeBuoy, Check } from 'lucide-react'
import { useStore } from '../lib/store'
import { STAFF_ROLES, type Staff, type StaffRole } from '../lib/types'
import { ROLE_ACCESS, normEmail, type Session } from '../lib/auth'
import { Icon } from '../components/Icon'
import { Badge, RowMenu, Confirm, Empty, Field, Modal, PageHead, StatCard, useToast } from '../components/ui'
import { fmtDate } from '../lib/utils'

type Draft = Omit<Staff, 'id'>
const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', residents: 'Residents', inventory: 'Inventory', services: 'Health services', dispensing: 'Dispensing', consultations: 'Consultations',
  vaccinations: 'Vaccinations', botika: 'Rolling Botika & E-Pila', announcements: 'Announcements', analytics: 'Analytics & reports', staff: 'Staff & roles', backup: 'Backup & recovery',
}

export default function StaffPage({ session }: { session: Session }) {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<Staff | null>(null)
  const [err, setErr] = useState('')
  const admins = data.staff.filter((s) => s.role === 'Administrator' && s.active)
  const support = [...data.support].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  async function save() {
    if (!editing) return
    const d = { ...editing.draft, name: editing.draft.name.trim(), email: normEmail(editing.draft.email) }
    if (!d.name || !/^\S+@\S+\.\S+$/.test(d.email)) return setErr('Enter a name and a valid email.')
    if (data.staff.some((s) => normEmail(s.email) === d.email && s.id !== editing.id)) return setErr('This email is already on the roster.')
    const cur = data.staff.find((s) => s.id === editing.id)
    if (cur?.role === 'Administrator' && (d.role !== 'Administrator' || !d.active) && admins.length <= 1) return setErr('Keep at least one active Administrator.')
    try {
      if (editing.id) await update('staff', editing.id, d)
      else await add('staff', d)
      toast(editing.id ? 'Staff member updated' : `${d.name} added. They can now create their account with ${d.email}.`)
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  const set = (k: keyof Draft, v: string | boolean) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))

  return (
    <div className="page">
      <PageHead title="Staff & Roles" subtitle="Authorize municipal health personnel and Rolling Botika staff, and assign role-based access."
        actions={!readOnly && <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: { name: '', email: '', role: 'Health Personnel', title: '', active: true } }) }}><Icon name="add" /> Add staff</button>} />
      <div className="stats stats-3">
        <StatCard icon={<Users size={24} />} label="Active staff" value={data.staff.filter((s) => s.active).length} note={`${data.staff.length} on roster`} />
        <StatCard icon={<ShieldCheck size={24} />} label="Administrators" value={admins.length} note="Full access" />
        <StatCard icon={<LifeBuoy size={24} />} label="Open support requests" value={data.support.filter((s) => s.status === 'OPEN').length} note="From residents" />
      </div>
      <section className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th className="right"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.staff.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b>{s.title && <div className="muted small">{s.title}</div>}</td>
                  <td>{s.email}</td>
                  <td><span className="badge badge-blue">{s.role}</span></td>
                  <td><Badge status={s.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td className="right">
                    {!readOnly && (
                      <RowMenu label={`Actions for ${s.name}`} items={[
                        { label: 'Edit role', onClick: () => { setErr(''); setEditing({ id: s.id, draft: { ...s } }) } },
                        { label: s.active ? 'Deactivate' : 'Reactivate', onClick: () => (s.active && s.role === 'Administrator' && admins.length <= 1 ? toast('Keep at least one active Administrator', 'err') : update('staff', s.id, { active: !s.active }).then(() => toast(s.active ? 'Access removed' : 'Access restored'))), hidden: normEmail(s.email) === session.email },
                        { label: 'Remove', onClick: () => setDeleting(s), danger: true, hidden: normEmail(s.email) === session.email },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.staff.length === 0 && <Empty text="No staff yet." />}
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h3>Role permissions</h3></div>
        <div className="table-wrap">
          <table className="table perm-table">
            <thead><tr><th>Module</th>{STAFF_ROLES.map((r) => <th key={r}>{r}</th>)}</tr></thead>
            <tbody>
              {Object.keys(LABELS).map((p) => (
                <tr key={p}>
                  <td>{LABELS[p]}</td>
                  {STAFF_ROLES.map((r) => <td key={r}>{(ROLE_ACCESS[r as StaffRole] as string[]).includes(p) ? <Check size={18} className="ok-ic" /> : <span className="muted">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h3><LifeBuoy size={18} /> Support requests</h3></div>
        {support.length === 0 && <p className="muted small">No support requests yet.</p>}
        {support.map((s) => (
          <div key={s.id} className="req">
            <span className="grow">
              <b>{s.name}</b> <span className="muted small">{s.email}{s.mobile ? ` • ${s.mobile}` : ''} • {fmtDate(s.createdAt)}</span>
              <small>{s.message}</small>
            </span>
            <Badge status={s.status === 'OPEN' ? 'PENDING' : 'COMPLETED'} />
            {!readOnly && s.status === 'OPEN' && <button className="btn btn-outline sm" onClick={() => update('support', s.id, { status: 'RESOLVED' }).then(() => toast('Marked as resolved'))}>Resolve</button>}
          </div>
        ))}
      </section>

      <Modal open={!!editing} title={editing?.id ? 'Edit staff member' : 'Add staff member'} subtitle="The staff member signs up with this email and gets the selected role" onClose={() => setEditing(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        {editing && (
          <div className="form-grid">
            <Field label="Full name"><input value={editing.draft.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Email"><input type="email" value={editing.draft.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Role">
              <select value={editing.draft.role} onChange={(e) => set('role', e.target.value)}>{STAFF_ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            </Field>
            <Field label="Title / assignment"><input value={editing.draft.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Rolling Botika • San Juan" /></Field>
            <label className="check span-2"><input type="checkbox" checked={editing.draft.active} onChange={(e) => set('active', e.target.checked)} /> Active (can sign in)</label>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>
      <Confirm open={!!deleting} title="Remove staff member?" text={`${deleting?.name} will lose access to SMILECare.`} confirmLabel="Remove" onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; if (deleting.role === 'Administrator' && admins.length <= 1) return toast('Keep at least one active Administrator', 'err'); try { await remove('staff', deleting.id); toast('Staff member removed') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
