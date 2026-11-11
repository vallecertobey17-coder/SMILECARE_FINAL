import { useState } from 'react'
import { Save, Database, LogOut } from 'lucide-react'
import { useStore } from '../lib/store'
import { updateProfile, type Session } from '../lib/auth'
import { Field, PageHead, useToast, Confirm } from '../components/ui'

export default function Preferences({ session, onSession, onLogout }: { session: Session; onSession: (s: Session) => void; onLogout: () => void }) {
  const { backend, resetLocal, data, readOnly, error } = useStore()
  const toast = useToast()
  const [name, setName] = useState(session.name)
  const [role, setRole] = useState(session.role)
  const [confirmReset, setConfirmReset] = useState(false)

  const save = () => {
    if (!name.trim()) return toast('Name cannot be empty', 'err')
    updateProfile(session.email, { name: name.trim(), role: role.trim() })
    onSession({ ...session, name: name.trim(), role: role.trim() })
    toast('Profile saved')
  }

  return (
    <div className="page">
      <PageHead title="Settings" subtitle="Manage your profile and workspace." />
      <div className="settings-grid">
        <section className="card">
          <div className="card-head"><h3>Your profile</h3></div>
          <div className="form-grid">
            <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Role / Department"><input value={role} onChange={(e) => setRole(e.target.value)} /></Field>
            <Field label="Email"><input value={session.email} disabled /></Field>
          </div>
          <div className="btn-row end">
            <button className="btn btn-outline" onClick={onLogout}><LogOut size={17} /> Sign out</button>
            <button className="btn btn-primary" onClick={save}><Save size={17} /> Save profile</button>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3><Database size={18} /> Data &amp; sync</h3></div>
          <div className="stack">
            <div className="info-row"><span className="muted">Storage</span><b>{backend === 'shared' ? 'Shared workspace database (live)' : backend === 'local' ? 'This browser only (offline demo)' : 'Connecting…'}</b></div>
            <div className="info-row"><span className="muted">Access</span><b>{readOnly ? 'View only' : 'Can edit'}</b></div>
            {error && <div className="alert alert-err">{error}</div>}
            <div className="info-row"><span className="muted">Records</span><b>{data.residents.length} residents • {data.medicines.length} medicines • {data.services.length} services • {data.dispensings.length} dispensing • {data.transactions.length} transactions</b></div>
            {backend === 'shared' ? (
              <p className="muted small">Everyone the SMILECare page is shared with sees the same records, updated live. Manage who has access from the page's Share menu on claude.ai.</p>
            ) : (
              <>
                <p className="muted small">You're viewing demo data stored only in this browser. Open SMILECare from its claude.ai link while signed in to use the shared database.</p>
                <button className="btn btn-outline" onClick={() => setConfirmReset(true)}>Reset demo data</button>
              </>
            )}
          </div>
        </section>
      </div>
      <Confirm open={confirmReset} title="Reset demo data?" text="All changes stored in this browser will be replaced with the original demo records." confirmLabel="Reset"
        onClose={() => setConfirmReset(false)} onConfirm={() => { resetLocal(); toast('Demo data restored') }} />
    </div>
  )
}
