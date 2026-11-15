import { useEffect, useState } from 'react'
import { BrandMark } from './BrandMark'

/** Starting animation: the SMILECare mark pops in, the wordmark slides in beside it, then it fades into the app.
 *  Plays every time the site is opened or reloaded, on any page (tap to skip). */
export function Splash() {
  const [phase, setPhase] = useState<'show' | 'out' | 'done'>('show')
  useEffect(() => {
    if (phase === 'done') return
    const a = setTimeout(() => setPhase('out'), 1500)
    const b = setTimeout(() => setPhase('done'), 2000)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])
  if (phase === 'done') return null
  return (
    <div className={`splash ${phase === 'out' ? 'out' : ''}`} role="presentation" onClick={() => setPhase('done')}>
      <div className="splash-inner">
        <span className="splash-mark"><BrandMark size={84} /></span>
        <span className="splash-wm"><b>SMILE</b><i>Care</i></span>
      </div>
      <p className="splash-tag">Integrated Health Information System • Taytay, Rizal</p>
      <span className="splash-bar"><span /></span>
    </div>
  )
}
