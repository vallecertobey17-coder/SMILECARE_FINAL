import { useState } from 'react'
import { BadgeCheck, Clock, Pencil, Save, ShieldAlert, Upload } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useResident } from './context'
import { QR } from '../../components/QR'
import { Field, useToast } from '../../components/ui'
import { initials, BARANGAYS, fmtDate } from '../../lib/utils'
import { MUNICIPALITY } from '../../config'

export default function RProfile() {
  const { update } = useStore()
  const { resident } = useResident()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({ name: resident.name, birthdate: resident.birthdate ?? '', contact: resident.contact ?? '', address: resident.address ?? '', barangay: resident.barangay })
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))
  const verified = resident.status === 'APPROVED'

  async function save() {
    if (!f.name.trim()) return toast('Full name is required', 'err')
    try {
      // Changing name or barangay of a verified resident sends the record back for re-verification.
      const sensitive = verified && (f.name.trim() !== resident.name || f.barangay !== resident.barangay)
      await update('residents', resident.id, { ...f, name: f.name.trim(), ...(sensitive ? { status: 'PENDING' as const } : {}) })
      toast(sensitive ? 'Saved • your record will be re-verified' : 'Profile saved')
      setEditing(false)
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  async function reupload(file: File) {
    try {
      await update('residents', resident.id, { idDocument: file.name, status: 'PENDING', remarks: '' })
      toast('Document submitted for review')
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  return (
    <div className="page rpage">
      <div className="page-head">
        <div>
          <h1 className="rtitle">Profile and QR Health ID</h1>
          <p>Manage your information and digital health card.</p>
        </div>
      </div>
      <div className="profile-grid">
        <section className="id-card">
          <div className="id-top">
            <span className="avatar lg">{initials(resident.name)}</span>
            <span>
              <b>{resident.name}</b>
              <small>{verified ? `Verified resident since ${new Date((resident.verifiedAt ?? resident.registered) + 'T00:00:00').getFullYear()}` : 'Verification pending'}</small>
              <code>{resident.healthId}</code>
            </span>
          </div>
          <div className="id-qr">
            <QR value={resident.healthId} size={190} label={`QR Health ID ${resident.healthId}`} />
          </div>
          <p className="id-cap">Scan to securely access my health profile</p>
          <div className="id-foot">
            <span>Municipality of {MUNICIPALITY} • SMILECare Health ID</span>
            <span className={`pill ${verified ? 'pill-ok' : 'pill-wait'}`}>{verified ? 'VERIFIED RESIDENT' : resident.status}</span>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Personal Information</h3>
            {!editing ? (
              <button className="btn btn-outline sm" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Edit profile
              </button>
            ) : (
              <button className="btn btn-primary sm" onClick={save}>
                <Save size={15} /> Save
              </button>
            )}
          </div>
          {editing ? (
            <div className="form-grid">
              <Field label="Full name">
                <input value={f.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Date of birth">
                <input type="date" value={f.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
              </Field>
              <Field label="Mobile number">
                <input value={f.contact} onChange={(e) => set('contact', e.target.value)} />
              </Field>
              <Field label="Barangay" hint={verified ? 'Changing your name or barangay requires re-verification' : undefined}>
                <select value={f.barangay} onChange={(e) => set('barangay', e.target.value)}>
                  {BARANGAYS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <div className="span-2">
                <Field label="Address">
                  <input value={f.address} onChange={(e) => set('address', e.target.value)} />
                </Field>
              </div>
              <button className="btn btn-ghost span-2" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="stack">
              <div className="info-row"><span className="muted">Full name</span><b>{resident.name}</b></div>
              <div className="info-row"><span className="muted">Date of Birth</span><b>{resident.birthdate ? fmtDate(resident.birthdate) : '—'}</b></div>
              <div className="info-row"><span className="muted">Mobile Number</span><b>{resident.contact || '—'}</b></div>
              <div className="info-row"><span className="muted">Address</span><b>{resident.address || '—'}</b></div>
              <div className="info-row"><span className="muted">Barangay</span><b>{resident.barangay}</b></div>
              <div className="info-row"><span className="muted">Email</span><b>{resident.email || '—'}</b></div>
            </div>
          )}

          <div className={`verify-row ${resident.status.toLowerCase()}`}>
            {verified ? <BadgeCheck size={24} /> : resident.status === 'PENDING' ? <Clock size={24} /> : <ShieldAlert size={24} />}
            <span className="grow">
              <b>{verified ? 'Resident identity verified' : resident.status === 'PENDING' ? 'Verification in progress' : 'Verification not approved'}</b>
              <small className="muted">
                {verified
                  ? `Verified on ${fmtDate(resident.verifiedAt ?? resident.registered)}`
                  : resident.status === 'PENDING'
                    ? `Document submitted: ${resident.idDocument ?? 'in person'}`
                    : resident.remarks || 'Please upload a clearer document.'}
              </small>
            </span>
            <span className={`pill ${verified ? 'pill-ok' : resident.status === 'PENDING' ? 'pill-wait' : 'pill-no'}`}>{resident.status}</span>
          </div>
          {!verified && (
            <label className="upload">
              <Upload size={20} />
              <span>
                <b>Upload a new valid ID or barangay certificate</b>
                <small>Reviewed by the Municipal Health Office</small>
              </span>
              <input type="file" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && reupload(e.target.files[0])} />
            </label>
          )}
        </section>
      </div>
    </div>
  )
}
