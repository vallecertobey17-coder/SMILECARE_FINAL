import { Truck, ListOrdered, Stethoscope, Pill, ArrowRight, ShieldCheck } from 'lucide-react'
import { Logo } from '../components/Layout'
import { MUNICIPALITY } from '../config'

const FEATURES = [
  { icon: Truck, title: 'Rolling Botika', text: 'Mobile pharmacy units bring free maintenance medicines closer to every barangay.' },
  { icon: ListOrdered, title: 'E-Pila', text: 'Virtual queueing at health centers — no more waiting in long lines.' },
  { icon: Stethoscope, title: 'Health Services', text: 'Consultations, BP checks, maternal and pediatric care on a published schedule.' },
  { icon: Pill, title: 'Medicine Dispensing', text: 'Accurate, recorded release of medicines with real-time inventory tracking.' },
]

export default function Home({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="home">
      <header className="home-nav">
        <Logo />
        <button className="btn btn-primary" onClick={onLogin}>Staff sign in <ArrowRight size={17} /></button>
      </header>
      <section className="home-hero">
        <div>
          <div className="eyebrow">{MUNICIPALITY} Municipal Health Office</div>
          <h1>Your health journey starts here.</h1>
          <p>Connect with {MUNICIPALITY}'s health services wherever you are. SMILECare brings residents, health workers and mobile units together in one place.</p>
          <div className="btn-row">
            <button className="btn btn-primary btn-lg" onClick={onLogin}><ShieldCheck size={18} /> Sign in to SMILECare</button>
          </div>
        </div>
        <blockquote className="home-quote">
          <p>“Hindi na kailangang pumila nang matagal. Malaking tulong sa aming seniors.”</p>
          <cite>— Aling Lorna, Brgy. Dolores</cite>
        </blockquote>
      </section>
      <section className="home-features">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card feature">
            <div className="stat-icon tone-teal"><Icon size={24} /></div>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
          </div>
        ))}
      </section>
      <footer className="home-foot muted small">© {new Date().getFullYear()} SMILECare • {MUNICIPALITY} Health Services</footer>
    </div>
  )
}
