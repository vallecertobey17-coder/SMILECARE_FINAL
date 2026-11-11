import { useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import type { KnowledgeEntry } from '../lib/types'
import { Confirm, Empty, Field, Modal, RowMenu, useToast } from './ui'

type Draft = Omit<KnowledgeEntry, 'id'>

/** D5 Knowledge base — the answers Ask SMILE gives residents (DFD 3.0 Provide Information). */
export function KnowledgeBase() {
  const { data, add, update, remove, readOnly } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<KnowledgeEntry | null>(null)
  const [err, setErr] = useState('')

  async function save() {
    if (!editing) return
    const d = editing.draft
    if (!d.question.trim() || !d.answer.trim()) return setErr('Question and answer are required.')
    try {
      if (editing.id) await update('knowledge', editing.id, d)
      else await add('knowledge', d)
      toast('Knowledge base updated')
      setEditing(null)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  const set = (k: keyof Draft, v: string) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e))

  return (
    <section className="card">
      <div className="card-head wrap">
        <div>
          <h3><BookOpen size={18} /> Knowledge base</h3>
          <p className="muted small">Approved answers Ask SMILE uses for residents' inquiries. Medicine purposes and schedules are added automatically.</p>
        </div>
        {!readOnly && <button className="btn btn-primary sm" onClick={() => { setErr(''); setEditing({ draft: { question: '', answer: '', category: 'General', keywords: '' } }) }}><Plus size={16} /> Add entry</button>}
      </div>
      {data.knowledge.length === 0 && <Empty text="No entries yet." />}
      {data.knowledge.map((k) => (
        <div key={k.id} className="req">
          <span className="grow">
            <span className="tag">{k.category.toUpperCase()}</span>
            <b>{k.question}</b>
            <small className="muted">{k.answer}</small>
          </span>
          {!readOnly && (
            <RowMenu label={`Actions for ${k.question}`} items={[
              { label: 'Edit', onClick: () => { setErr(''); setEditing({ id: k.id, draft: { ...k } }) } },
              { label: 'Delete', onClick: () => setDeleting(k), danger: true },
            ]} />
          )}
        </div>
      ))}
      <Modal open={!!editing} title={editing?.id ? 'Edit entry' : 'New knowledge base entry'} onClose={() => setEditing(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        {editing && (
          <div className="form-grid">
            <Field label="Category"><input value={editing.draft.category} onChange={(e) => set('category', e.target.value)} /></Field>
            <Field label="Keywords" hint="Comma-separated words residents might use"><input value={editing.draft.keywords} onChange={(e) => set('keywords', e.target.value)} /></Field>
            <div className="span-2"><Field label="Question"><input value={editing.draft.question} onChange={(e) => set('question', e.target.value)} /></Field></div>
            <div className="span-2"><Field label="Answer"><textarea rows={4} value={editing.draft.answer} onChange={(e) => set('answer', e.target.value)} /></Field></div>
            {err && <div className="alert alert-err span-2">{err}</div>}
          </div>
        )}
      </Modal>
      <Confirm open={!!deleting} title="Delete entry?" text={`"${deleting?.question}" will no longer be used by Ask SMILE.`} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; try { await remove('knowledge', deleting.id); toast('Entry deleted') } catch (e: any) { toast(e.message, 'err') } }} />
    </section>
  )
}
