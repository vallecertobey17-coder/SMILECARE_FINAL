import { useState } from 'react'
import { ChevronRight, CalendarCheck, ShieldCheck, Check, Truck, History, MessageSquareText, Pill, X, HelpCircle } from 'lucide-react'
import { MUNICIPALITY, PROJECT } from '../config'

/** Smiling logo mark used on the landing page. */
function Smile({ size = 66 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 66 66" aria-hidden="true">
      <circle cx="33" cy="33" r="33" fill="#006398" />
      <circle cx="24" cy="27" r="3.6" fill="#9fd6ff" />
      <circle cx="42" cy="27" r="3.6" fill="#9fd6ff" />
      <path d="M19 37c3.5 8 24.5 8 28 0" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function Brand({ small }: { small?: boolean }) {
  return (
    <div className={`lp-brand ${small ? 'sm' : ''}`}>
      <Smile size={small ? 56 : 66} />
      <span>
        <b>
          SMILE<em>Care</em>
        </b>
        <small>Taytay Health, Closer to You</small>
      </span>
    </div>
  )
}

const FEATURES = [
  { icon: CalendarCheck, title: 'Easy appointments', text: 'Book a health service and join the e-pila before leaving home.' },
  { icon: Truck, title: 'Rolling Botika', text: 'Know when free medicines and services are coming to your barangay.' },
  { icon: History, title: 'Your health, in one place', text: 'Keep consultations, vaccinations, and medicine records safe and accessible.' },
  { icon: MessageSquareText, title: 'Ask SMILE', text: 'Get simple answers and guidance anytime in Filipino or English.' },
]

const STEPS = [
  { title: 'Create and verify your account', text: 'Use your Taytay address and one valid ID.' },
  { title: 'Choose a service', text: 'Check availability and reserve your preferred time.' },
  { title: 'Receive care', text: 'Bring your QR Health ID and follow your live queue.' },
]

export default function Home({ onLogin }: { onLogin: (kind: 'resident' | 'staff') => void }) {
  const [help, setHelp] = useState(false)
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="lp">
      <header className="lp-nav">
        <Brand />
        <nav>
          <button onClick={() => scrollTo('lp-services')}>Services</button>
          <button onClick={() => scrollTo('lp-how')}>How it works</button>
          <button onClick={() => onLogin('resident')}>Sign in</button>
          <button className="lp-btn" onClick={() => onLogin('resident')}>Create account</button>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-pill">Municipality of {MUNICIPALITY}, Rizal</span>
          <h1>
            Kalusugan na <span>abot-kamay.</span>
          </h1>
          <p>Access healthcare, medicines, and the Rolling Botika—simple, secure, and closer to every Taytayeño.</p>
          <div className="lp-cta">
            <button className="lp-btn lg" onClick={() => onLogin('resident')}>
              <ChevronRight size={22} /> Get started
            </button>
            <button className="lp-btn-outline lg" onClick={() => onLogin('resident')}>
              <CalendarCheck size={22} /> View Rolling Botika schedule
            </button>
          </div>
          <div className="lp-trust">
            <span><ShieldCheck size={20} /> Secure health records</span>
            <span><Check size={20} /> Free for Taytay residents</span>
          </div>
        </div>

        <div className="lp-visual" aria-hidden="true">
          <div className="lp-blob" />
          <div className="lp-ring" />
          <div className="lp-phone">
            <div className="lp-phone-top">
              <Smile size={34} />
              <span>9:41</span>
            </div>
            <p className="lp-greet">Magandang umaga,</p>
            <p className="lp-name">Maria!</p>
            <div className="lp-queue">
              <small>Your queue number</small>
              <b>A-027</b>
              <div className="lp-queue-foot">
                <span>Rolling Botika • Brgy. San Juan</span>
                <em>ON THE WAY</em>
              </div>
            </div>
            <div className="lp-apps">
              <span><i><CalendarCheck size={22} /></i>Book</span>
              <span><i><History size={22} /></i>Records</span>
              <span><i><Pill size={22} /></i>Medicines</span>
            </div>
          </div>
          <div className="lp-float lp-float-a">
            <i><Truck size={22} /></i>
            <span><b>Rolling Botika</b><small>Arriving in San Juan</small></span>
          </div>
          <div className="lp-float lp-float-b">
            <i className="lp-dr">DR</i>
            <span><b>Dr. Reyes</b><small>Consultation confirmed</small></span>
            <em><Check size={18} /></em>
          </div>
        </div>
      </section>

      <section className="lp-stats">
        <div><b>76,000+</b><span>Residents connected</span></div>
        <div><b>5</b><span>Barangays served</span></div>
        <div><b>24/7</b><span>Health record access</span></div>
        <div><b>Free</b><span>For verified residents</span></div>
      </section>

      <section className="lp-section" id="lp-services">
        <span className="lp-pill">One connected system</span>
        <h2>Care that moves with you</h2>
        <p className="lp-sub">Everything you need to manage your health and access municipal services.</p>
        <div className="lp-cards">
          {FEATURES.map(({ icon: I, title, text }) => (
            <div key={title} className="lp-card">
              <i><I size={24} /></i>
              <h3>{title}</h3>
              <p>{text}</p>
              <button onClick={() => onLogin('resident')}>
                Learn more <ChevronRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-steps" id="lp-how">
        <div>
          <span className="lp-pill dark">Simple and secure</span>
          <h2>Better health in three easy steps.</h2>
        </div>
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <em>{String(i + 1).padStart(2, '0')}</em>
              <span>
                <b>{s.title}</b>
                <small>{s.text}</small>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-section lp-about">
        <span className="lp-pill">About the project</span>
        <h2 className="lp-title-sm">{PROJECT.title}</h2>
        <p className="lp-sub">
          An integrated administrative and resident platform for the Municipality of {MUNICIPALITY}'s Rolling Botika program: free consultations, rapid blood sugar screenings, medicine
          distribution, eye and dental check-ups, and vaccinations.
        </p>
        <div className="lp-team">
          {PROJECT.team.map((m) => (
            <span key={m.name}>
              <b>{m.name}</b>
              <small>{m.role}</small>
            </span>
          ))}
        </div>
        <button className="lp-link" onClick={() => onLogin('staff')}>
          Municipal health personnel? Sign in here <ChevronRight size={18} />
        </button>
      </section>

      <footer className="lp-foot">
        <Brand small />
        <p>Serbisyong may malasakit para sa bawat Taytayeño.</p>
        <small>© {new Date().getFullYear()} Municipality of {MUNICIPALITY}, Rizal</small>
      </footer>

      <button className="lp-help" onClick={() => setHelp(true)} aria-label="Help">
        <HelpCircle size={26} />
      </button>
      {help && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setHelp(false)}>
          <div className="lp-help-card" role="dialog" aria-modal="true" aria-label="Need help?">
            <button className="icon-btn" onClick={() => setHelp(false)} aria-label="Close">
              <X size={20} />
            </button>
            <h3>Need help?</h3>
            <p>Our support team is here for you.</p>
            <ul>
              <li><b>Phone</b> {PROJECT.supportPhone}</li>
              <li><b>Email</b> {PROJECT.supportEmail}</li>
              <li><b>Hours</b> {PROJECT.supportHours}</li>
              <li><b>Address</b> {PROJECT.supportAddress}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
