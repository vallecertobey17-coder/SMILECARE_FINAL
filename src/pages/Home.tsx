import { Truck, ListOrdered, Stethoscope, Pill, Droplet, Eye, Syringe, ArrowRight, ShieldCheck, UserRound, QrCode, Bot, Bell, CalendarCheck, Boxes, BarChart3, MapPinned, WifiOff, History, Users } from 'lucide-react'
import { Logo } from '../components/Layout'
import { MUNICIPALITY, PROJECT } from '../config'

const PROGRAMS = [
  { icon: Stethoscope, title: 'Free Consultations', text: 'General check-ups with municipal doctors during Rolling Botika visits.' },
  { icon: Droplet, title: 'Rapid Blood Sugar Screening', text: 'Quick blood sugar tests to help catch diabetes early.' },
  { icon: Pill, title: 'Medicine Distribution', text: 'Free maintenance and common medicines for eligible residents.' },
  { icon: Eye, title: 'Eye & Dental Check-ups', text: 'Basic eye and dental assessments right in your barangay.' },
  { icon: Syringe, title: 'Vaccinations', text: 'Vaccines for residents, with your history kept on record.' },
]

const RESIDENT = [
  { icon: Bell, text: 'Announcements & schedule alerts' },
  { icon: Truck, text: 'Service bulletin & medicine availability' },
  { icon: CalendarCheck, text: 'Appointment pre-booking' },
  { icon: ListOrdered, text: 'Digital queue ticket (E-Pila)' },
  { icon: QrCode, text: 'Digital Health ID with QR code' },
  { icon: History, text: 'Your health-service history' },
  { icon: Bot, text: 'Ask SMILE — AI chatbot assistant' },
]
const ADMIN = [
  { icon: ShieldCheck, text: 'Role-based access for health personnel' },
  { icon: Boxes, text: 'Real-time inventory, central & per unit' },
  { icon: Users, text: 'Beneficiary profiling & walk-in registration' },
  { icon: Pill, text: 'Dispensing with eligibility checking' },
  { icon: Stethoscope, text: 'Consultation & vaccination records' },
  { icon: BarChart3, text: 'Health & medicine analytics' },
  { icon: MapPinned, text: 'Health mapping & smart deployment planning' },
  { icon: WifiOff, text: 'Offline sync, audit trail & backups' },
]

export default function Home({ onLogin }: { onLogin: (kind: 'resident' | 'staff') => void }) {
  return (
    <div className="home">
      <header className="home-nav">
        <Logo />
        <div className="btn-row">
          <button className="btn btn-outline sm hide-sm" onClick={() => onLogin('staff')}>Health personnel</button>
          <button className="btn btn-primary sm" onClick={() => onLogin('resident')}>Sign in <ArrowRight size={16} /></button>
        </div>
      </header>

      <section className="home-hero">
        <div>
          <div className="eyebrow">Municipality of {MUNICIPALITY} • Rolling Botika</div>
          <h1>Your health journey starts here.</h1>
          <p>{PROJECT.tagline} Book services, get your queue number and check medicine availability before the Rolling Botika arrives in your barangay.</p>
          <div className="btn-row">
            <button className="btn btn-primary btn-lg" onClick={() => onLogin('resident')}><UserRound size={18} /> I'm a resident</button>
            <button className="btn btn-ghost-light btn-lg" onClick={() => onLogin('staff')}><ShieldCheck size={18} /> I'm health personnel</button>
          </div>
        </div>
        <blockquote className="home-quote">
          <p>“Hindi na kailangang pumila nang matagal. Malaking tulong sa aming seniors.”</p>
          <cite>— Aling Lorna, Brgy. Dolores</cite>
        </blockquote>
      </section>

      <section className="home-section">
        <div className="section-head">
          <span className="eyebrow">Community health programs</span>
          <h2>Five programs, one system</h2>
          <p className="muted">SMILECare streamlines the essential community health programs of the Rolling Botika mobile healthcare initiative.</p>
        </div>
        <div className="home-features five">
          {PROGRAMS.map(({ icon: I, title, text }) => (
            <div key={title} className="card feature">
              <div className="stat-icon"><I size={24} /></div>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="platforms">
          <div className="card platform">
            <span className="eyebrow">Resident platform</span>
            <h2>Accessible digital services for residents</h2>
            <ul className="feat-list">
              {RESIDENT.map(({ icon: I, text }) => <li key={text}><I size={18} /> {text}</li>)}
            </ul>
            <button className="btn btn-primary" onClick={() => onLogin('resident')}>Create a resident account</button>
          </div>
          <div className="card platform">
            <span className="eyebrow">Administrative platform</span>
            <h2>Centralized records for municipal personnel</h2>
            <ul className="feat-list">
              {ADMIN.map(({ icon: I, text }) => <li key={text}><I size={18} /> {text}</li>)}
            </ul>
            <button className="btn btn-outline" onClick={() => onLogin('staff')}>Health personnel sign in</button>
          </div>
        </div>
      </section>

      <section className="home-section about">
        <div className="card">
          <span className="eyebrow">About the project</span>
          <h2 className="project-title">{PROJECT.title}</h2>
          <p className="muted">An integrated administrative and resident platform that centralizes health records, medicine distribution and distribution analytics for municipal personnel, while giving residents accessible digital services.</p>
          <div className="team">
            {PROJECT.team.map((m) => (
              <div key={m.name} className="member">
                <span className="avatar sm">{m.name.split(',')[0].slice(0, 1)}{m.name.split(',')[1]?.trim().slice(0, 1)}</span>
                <span><b>{m.name}</b><small className="muted">{m.role}</small></span>
              </div>
            ))}
          </div>
          <p className="muted small disclaimer">The AI chatbot gives general information only and does not diagnose or prescribe. Real-time features need an internet connection; offline transactions sync once connected.</p>
        </div>
      </section>

      <footer className="home-foot muted small">
        © {new Date().getFullYear()} {PROJECT.name} • Municipality of {MUNICIPALITY}, Rizal • {PROJECT.supportEmail} • {PROJECT.supportPhone}
      </footer>
    </div>
  )
}
