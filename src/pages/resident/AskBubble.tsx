import { useState } from 'react'
import { MessageCircleHeart } from 'lucide-react'
import AskSmile from './AskSmile'

/** Floating Ask SMILE bubble on every resident page (hidden on the Ask SMILE page itself). */
export function AskBubble({ route, go }: { route: string; go: (r: string) => void }) {
  const [open, setOpen] = useState(false)
  if (route === 'ask-smile') return null
  return (
    <>
      {open && <div className="click-away" onClick={() => setOpen(false)} />}
      {open && (
        <div className="ask-pop-wrap">
          <AskSmile compact onClose={() => setOpen(false)} onOpenPage={() => { setOpen(false); go('ask-smile') }} />
        </div>
      )}
      <button className={`ask-fab ${open ? 'on' : ''}`} onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close Ask SMILE' : 'Ask SMILE — your health assistant'} aria-expanded={open}>
        <MessageCircleHeart size={28} strokeWidth={1.8} />
        <span className="ask-fab-label">Ask SMILE</span>
      </button>
    </>
  )
}
