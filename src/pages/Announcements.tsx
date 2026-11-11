import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { useStore } from '../lib/store'
import { KnowledgeBase } from '../components/KnowledgeBase'
import type { Announcement, AnnouncementCategory } from '../lib/types'
import type { Session } from '../lib/auth'
import { Icon } from '../components/Icon'
import { RowMenu, Confirm, Empty, Field, Modal, PageHead, useToast } from '../components/ui'
import { BARANGAYS } from '../lib/utils'
import { when, catTone } from './resident/RAnnouncements'

const CATS: AnnouncementCategory[] = ['ROLLING BOTIKA', 'ADVISORY', 'URGENT', 'APPOINTMENT']
type Draft = Omit<Announcement, 'id'>

export default function Announcements({ session }: { session: Session }) {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [cat, setCat] = useState('')
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const [err, setErr] = useState('')
  const list = cat === 'KB' ? [] : [...data.announcements].filter((a) => !cat || a.category === cat).sort((a, b) => b.date.localeCompare(a.date))

  const blank = (): Draft => ({ title: '', body: '', category: 'ROLLING BOTIKA', date: new Date().toISOString(), author: session.name })
  /** Draft a Rolling Botika announcement from the next scheduled deployment. */
  function fromSchedule() {
    const next = data.services.filter((s) => s.status === 'SCHEDULED' && s.unitId).sort((a, b) => a.date.localeCompare(b.date))[0]
    if (!next) return toast('No scheduled Rolling Botika deployment to announce', 'err')
    const same = data.services.filter((s) => s.date === next.date && s.location === next.location).map((s) => s.name)
    const d = new Date(next.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    setErr('')
    setEditing({ draft: { ...blank(), barangay: next.barangay, title: `Next stop: Barangay ${next.barangay ?? next.location}`, body: `The Rolling Botika will be at ${next.location} on ${d}. Services: ${same.join(', ')}. Pre-book your slot in SMILECare.` } })
  }

  async function save() {
    if (!editing) return
    const d = editing.draft
    if (!d.title.trim() || !d.body.trim()) return setErr('Title and message are required.')
    try {
      const row = { ...d, title: d.title.trim(), body: d.body.trim() }
      if (!row.barangay) delete row.barangay
      if (editing.id) await update('announcements', editing.id, row)
      else await add('announcements', { ...row, date: new Date().toISOString() })
      toast(editing.id ? 'Announcement updated' : 'Announcement published to residents')
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  const set = (k: keyof Draft, v: string) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))

  return (
    <div className="page">
      <PageHead title="Announcements" subtitle="Publish schedules, service changes and advisories, and manage the knowledge base Ask SMILE uses."
        actions={!readOnly && (
          <div className="btn-row">
            <button className="btn btn-outline" onClick={fromSchedule}><Megaphone size={18} /> Announce next deployment</button>
            <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ draft: blank() }) }}><Icon name="add" /> New announcement</button>
          </div>
        )} />
      <div className="tabs">
        <button className={cat === '' ? 'on' : ''} onClick={() => setCat('')}>All</button>
        <button className={cat === 'KB' ? 'on' : ''} onClick={() => setCat('KB')}>Knowledge base (Ask SMILE)</button>
        {CATS.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c.charAt(0) + c.slice(1).toLowerCase()}</button>)}
      </div>
      {cat === 'KB' && <KnowledgeBase />}
      {cat !== 'KB' && list.length === 0 && <section className="card"><Empty text="No announcements yet." /></section>}
      <div className="ann-list">
        {list.map((a) => (
          <div key={a.id} className="ann">
            <span className="ann-top">
              <span className={`pill ${catTone(a.category)}`}>{a.category}</span>
              {a.barangay && <span className="tag">BRGY. {a.barangay.toUpperCase()}</span>}
              <span className="grow" />
              <small className="muted">{when(a.date)}{a.author ? ` • ${a.author}` : ''}</small>
              {!readOnly && (
                <RowMenu label={`Actions for ${a.title}`} items={[
                  { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: a.id, draft: { ...a } }) } },
                  { label: 'Delete', onClick: () => setDeleting(a), danger: true },
                ]} />
              )}
            </span>
            <b>{a.title}</b>
            <span className="ann-body">{a.body}</span>
          </div>
        ))}
      </div>

      <Modal open={!!editing} title={editing?.id ? 'Edit announcement' : 'New announcement'} subtitle="Residents see this in Announcements and their notifications" onClose={() => setEditing(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>{editing?.id ? 'Save' : 'Publish'}</button></>}>
        {editing && (
          <div className="form-grid">
            <Field label="Category">
              <select value={editing.draft.category} onChange={(e) => set('category', e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}</select>
            </Field>
            <Field label="Barangay (optional)">
              <select value={editing.draft.barangay ?? ''} onChange={(e) => set('barangay', e.target.value)}>
                <option value="">All of Taytay</option>
                {BARANGAYS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <div className="span-2"><Field label="Title"><input value={editing.draft.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
            <div className="span-2"><Field label="Message"><textarea rows={4} value={editing.draft.body} onChange={(e) => set('body', e.target.value)} /></Field></div>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>
      <Confirm open={!!deleting} title="Delete announcement?" text={`"${deleting?.title}" will be removed for all residents.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('announcements', deleting.id); toast('Announcement deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </div>
  )
}
