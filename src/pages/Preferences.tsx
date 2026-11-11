import { useEffect, useState } from 'react'
import { Save, Database, LogOut, DatabaseBackup, Upload, History, WifiOff } from 'lucide-react'
import { useStore } from '../lib/store'
import { can, normEmail, updateSession, type Session } from '../lib/auth'
import { Field, PageHead, useToast, Confirm } from '../components/ui'
import { isoDate, saveFile } from '../lib/utils'
import { COLLECTIONS } from '../lib/types'

const AUTO = 'smilecare:autobackups'
type Snap = { at: string; data: Record<string, unknown[]> }
const loadSnaps = (): Snap[] => {
  try {
    return JSON.parse(localStorage.getItem(AUTO) || '[]')
  } catch {
    return []
  }
}

export default function Preferences({ session, onSession, onLogout }: { session: Session; onSession: (s: Session) => void; onLogout: () => void }) {
  const { backend, resetLocal, data, readOnly, error, update, restore, log, online, pending } = useStore()
  const toast = useToast()
  const [name, setName] = useState(session.name)
  const [confirmReset, setConfirmReset] = useState(false)
  const [restoring, setRestoring] = useState<{ label: string; data: Record<string, unknown[]> } | null>(null)
  const [snaps, setSnaps] = useState<Snap[]>(loadSnaps)
  const admin = can(session, 'backup')
  const snapshot = () => Object.fromEntries(COLLECTIONS.filter((c) => c !== 'audit').map((c) => [c, data[c]])) as Record<string, unknown[]>
  const counts = COLLECTIONS.filter((c) => c !== 'audit').reduce((a, c) => a + data[c].length, 0)

  // Automatic daily backup on the Administrator's device (keeps the last 3).
  useEffect(() => {
    if (!admin || !counts) return
    const list = loadSnaps()
    if (list[0]?.at?.startsWith(isoDate())) return
    const next = [{ at: new Date().toISOString(), data: snapshot() }, ...list].slice(0, 3)
    try {
      localStorage.setItem(AUTO, JSON.stringify(next))
      setSnaps(next)
    } catch {
      /* storage full: keep going without automatic backups */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, counts])

  async function saveProfile() {
    if (!name.trim()) return toast('Name cannot be empty', 'err')
    try {
      const member = data.staff.find((s) => normEmail(s.email) === session.email)
      if (member) await update('staff', member.id, { name: name.trim() })
      updateSession({ name: name.trim() })
      onSession({ ...session, name: name.trim() })
      toast('Profile saved')
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  async function backup() {
    const body = JSON.stringify({ app: 'SMILECare', version: 2, exportedAt: new Date().toISOString(), data: snapshot() }, null, 2)
    try {
      await saveFile(`smilecare-backup-${isoDate()}.json`, body, 'application/json')
      log('backup', 'backup', `Downloaded a backup of ${counts} records`)
      toast('Backup downloaded')
    } catch {
      toast('Download was cancelled', 'err')
    }
  }

  async function pickFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      const d = parsed?.data ?? parsed
      if (!d || typeof d !== 'object' || !Array.isArray(d.residents)) throw new Error('bad')
      setRestoring({ label: `${file.name}${parsed.exportedAt ? ` (exported ${new Date(parsed.exportedAt).toLocaleString('en-PH')})` : ''}`, data: d })
    } catch {
      toast('That file is not a SMILECare backup', 'err')
    }
  }

  async function doRestore() {
    if (!restoring) return
    try {
      const n = await restore(restoring.data as any)
      toast(`Restored ${n} records`)
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  return (
    <div className="page">
      <PageHead title="Settings" subtitle="Manage your profile, sync status and data backups." />
      <div className="settings-grid">
        <section className="card">
          <div className="card-head"><h3>Your profile</h3></div>
          <div className="form-grid">
            <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Role" hint="Assigned by the Administrator"><input value={session.role} disabled /></Field>
            <div className="span-2"><Field label="Email"><input value={session.email} disabled /></Field></div>
          </div>
          <div className="btn-row end">
            <button className="btn btn-outline" onClick={onLogout}><LogOut size={17} /> Sign out</button>
            <button className="btn btn-primary" onClick={saveProfile}><Save size={17} /> Save profile</button>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3><Database size={18} /> Data &amp; sync</h3></div>
          <div className="stack">
            <div className="info-row"><span className="muted">Storage</span><b>{backend === 'shared' ? 'Central SMILECare database (live)' : backend === 'local' ? 'This browser only (demo mode)' : 'Connecting…'}</b></div>
            <div className="info-row"><span className="muted">Connection</span><b>{online ? 'Online' : 'Offline'}{pending ? ` • ${pending} change${pending > 1 ? 's' : ''} waiting to sync` : ''}</b></div>
            <div className="info-row"><span className="muted">Access</span><b>{readOnly ? 'View only' : 'Can edit'}</b></div>
            <div className="info-row"><span className="muted">Records</span><b>{counts}</b></div>
            {error && <div className="alert alert-err">{error}</div>}
            <p className="muted small"><WifiOff size={14} /> Offline synchronization: when the connection drops during a Rolling Botika deployment, new transactions are kept on this device and sent to the central database automatically once you're back online.</p>
            {backend === 'local' && (
              <>
                <p className="muted small">You're using demo data stored only in this browser.</p>
                <button className="btn btn-outline" onClick={() => setConfirmReset(true)}>Reset demo data</button>
              </>
            )}
          </div>
        </section>

        {admin && (
          <section className="card span-all">
            <div className="card-head">
              <div>
                <h3><DatabaseBackup size={18} /> Backup &amp; recovery</h3>
                <p className="muted small">Download full backups and recover critical system data after data loss or system failure.</p>
              </div>
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={backup}><DatabaseBackup size={17} /> Download backup now</button>
              <label className="btn btn-outline file-btn">
                <Upload size={17} /> Restore from backup file
                <input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
              </label>
            </div>
            <h4 className="mini-title"><History size={16} /> Automatic daily backups on this device</h4>
            {snaps.length === 0 && <p className="muted small">The first automatic backup is made when an Administrator opens Settings.</p>}
            {snaps.map((s) => (
              <div key={s.at} className="info-row">
                <span>{new Date(s.at).toLocaleString('en-PH')} <span className="muted small">• {Object.values(s.data).reduce((a, v) => a + (v?.length ?? 0), 0)} records</span></span>
                {!readOnly && <button className="btn btn-outline sm" onClick={() => setRestoring({ label: `automatic backup from ${new Date(s.at).toLocaleString('en-PH')}`, data: s.data })}>Restore</button>}
              </div>
            ))}
          </section>
        )}
      </div>
      <Confirm open={confirmReset} title="Reset demo data?" text="All changes stored in this browser will be replaced with the original demo records." confirmLabel="Reset"
        onClose={() => setConfirmReset(false)} onConfirm={() => { resetLocal(); toast('Demo data restored') }} />
      <Confirm open={!!restoring} title="Restore this backup?" text={`All current records will be replaced with the ${restoring?.label}. This is written to the audit trail.`} confirmLabel="Restore"
        onClose={() => setRestoring(null)} onConfirm={doRestore} />
    </div>
  )
}
