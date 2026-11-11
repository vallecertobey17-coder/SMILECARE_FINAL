import { useMemo, useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useResident } from './context'
import { Empty } from '../../components/ui'
import type { Announcement } from '../../lib/types'

type Tab = 'all' | 'unread' | 'appointments' | 'advisories'
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'advisories', label: 'Advisories' },
]

export function when(iso: string) {
  const d = new Date(iso)
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (days <= 0) return `Today, ${time}`
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export const catTone = (c: Announcement['category']) => (c === 'URGENT' ? 'pill-no' : c === 'ROLLING BOTIKA' ? 'pill-blue' : c === 'APPOINTMENT' ? 'pill-ok' : 'pill-wait')

export default function RAnnouncements() {
  const { data } = useStore()
  const { resident, read, markRead } = useResident()
  const [tab, setTab] = useState<Tab>('all')

  // Appointment updates for this resident appear alongside municipal announcements.
  const items = useMemo(() => {
    const own: Announcement[] = data.appointments
      .filter((a) => a.residentId === resident.id && a.status !== 'PENDING')
      .map((a) => ({
        id: `apt:${a.id}:${a.status}`,
        category: 'APPOINTMENT',
        title: `${a.serviceName ?? 'Medicine request'} ${a.status.toLowerCase()}`,
        body: `Reference ${a.ref} • ${new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${a.time ? ` • ${a.time}` : ''} • ${a.location}`,
        date: a.createdAt,
      }))
    return [...data.announcements, ...own].sort((a, b) => b.date.localeCompare(a.date))
  }, [data.announcements, data.appointments, resident])

  const shown = items.filter((a) =>
    tab === 'all' ? true : tab === 'unread' ? !read.has(a.id) : tab === 'appointments' ? a.category === 'APPOINTMENT' : a.category === 'ADVISORY' || a.category === 'URGENT' || a.category === 'ROLLING BOTIKA',
  )
  const unread = items.filter((a) => !read.has(a.id)).length

  return (
    <div className="page rpage">
      <div className="page-head">
        <div>
          <h1 className="rtitle">Announcements and notifications</h1>
          <p>Important health updates from the Municipality of Taytay.</p>
        </div>
        {unread > 0 && (
          <div className="page-actions">
            <button className="btn btn-outline" onClick={() => markRead(items.map((a) => a.id))}>
              <CheckCheck size={18} /> Mark all as read
            </button>
          </div>
        )}
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'unread' && unread > 0 && <span className="count">{unread}</span>}
          </button>
        ))}
      </div>
      <div className="ann-list">
        {shown.length === 0 && (
          <section className="card">
            <Empty text={tab === 'unread' ? "You're all caught up." : 'No announcements here yet.'} />
          </section>
        )}
        {shown.map((a) => {
          const isUnread = !read.has(a.id)
          return (
            <button key={a.id} className={`ann ${isUnread ? 'unread' : ''}`} onClick={() => isUnread && markRead([a.id])}>
              <span className="ann-top">
                <span className={`pill ${catTone(a.category)}`}>{a.category}</span>
                {a.barangay && <span className="tag">BRGY. {a.barangay.toUpperCase()}</span>}
                <span className="grow" />
                <small className="muted">{when(a.date)}</small>
              </span>
              <b>{a.title}</b>
              <span className="ann-body">{a.body}</span>
              {isUnread && <span className="dot-unread" aria-label="Unread" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
