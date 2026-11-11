// Icons exported from the SMILECare Figma file. Each one keeps its native size
// and is drawn as a CSS mask so it takes the current text color.
import dashboard from '../assets/icons/dashboard.svg'
import residents from '../assets/icons/residents.svg'
import inventory from '../assets/icons/inventory.svg'
import services from '../assets/icons/services.svg'
import dispensing from '../assets/icons/dispensing.svg'
import botika from '../assets/icons/botika.svg'
import analytics from '../assets/icons/analytics.svg'
import settings from '../assets/icons/settings.svg'
import help from '../assets/icons/help.svg'
import logout from '../assets/icons/logout.svg'
import dots from '../assets/icons/dots.svg'
import search from '../assets/icons/search.svg'
import chevron from '../assets/icons/chevron.svg'
import filter from '../assets/icons/filter.svg'
import add from '../assets/icons/add.svg'
import statBell from '../assets/icons/stat-bell.svg'
import statX from '../assets/icons/stat-x.svg'
import pill from '../assets/icons/pill-mask.png'
import bellImg from '../assets/icons/bell.svg'
import r_appointment from '../assets/icons/r-appointment.svg'
import r_history from '../assets/icons/r-history.svg'
import r_ask from '../assets/icons/r-ask.svg'
import r_epila from '../assets/icons/r-epila.svg'
import r_schedule from '../assets/icons/r-schedule.svg'
import r_profile from '../assets/icons/r-profile.svg'
import r_announce from '../assets/icons/r-announce.svg'
import r_truck from '../assets/icons/r-truck.svg'
import r_clock from '../assets/icons/r-clock.svg'
import r_pin from '../assets/icons/r-pin.svg'
import r_book from '../assets/icons/r-book.svg'
import r_chat from '../assets/icons/r-chat.svg'
import r_qr from '../assets/icons/r-qr.svg'
import r_chev from '../assets/icons/r-chev.svg'
import r_arrow from '../assets/icons/r-arrow.svg'
import r_med from '../assets/icons/r-med.png'
import r_heart from '../assets/icons/r-heart.png'

const ICONS = {
  dashboard: [dashboard, 29.055, 24.931],
  residents: [residents, 28.0833, 20.0404],
  inventory: [inventory, 19.5, 19.613],
  services: [services, 21.4998, 19.2412],
  dispensing: [dispensing, 20, 23.6581],
  botika: [botika, 30.8333, 18.1224],
  analytics: [analytics, 29, 27.8105],
  settings: [settings, 21.8, 20.905],
  help: [help, 34.25, 28.132],
  logout: [logout, 24, 23.0156],
  dots: [dots, 22, 21],
  search: [search, 22, 21],
  chevron: [chevron, 15, 8],
  filter: [filter, 17, 16],
  add: [add, 20, 20],
  'stat-bell': [statBell, 28.0002, 28],
  'stat-x': [statX, 22, 21],
  pill: [pill, 31, 40],
  'r-appointment': [r_appointment, 25.125, 13.756],
  'r-history': [r_history, 26.989, 27],
  'r-ask': [r_ask, 24.5, 24.362],
  'r-epila': [r_epila, 25.779, 13.756],
  'r-schedule': [r_schedule, 25.75, 27],
  'r-profile': [r_profile, 19.5, 22],
  'r-announce': [r_announce, 25.7501, 26.9956],
  'r-truck': [r_truck, 39.0175, 27.9062],
  'r-clock': [r_clock, 16.924, 16.5],
  'r-pin': [r_pin, 24.6783, 24],
  'r-book': [r_book, 21.537, 24],
  'r-chat': [r_chat, 19.4805, 18],
  'r-qr': [r_qr, 28.7914, 28],
  'r-chev': [r_chev, 7.66959, 13.5],
  'r-arrow': [r_arrow, 24.6783, 24],
  'r-med': [r_med, 23, 35],
  'r-heart': [r_heart, 24, 42],
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const [src, w, h] = ICONS[name]
  return (
    <span
      aria-hidden="true"
      className={`ficon ${className}`}
      style={{ width: w, height: h, WebkitMaskImage: `url("${src}")`, maskImage: `url("${src}")` }}
    />
  )
}

/** The header bell keeps its original light-blue circle and blue stroke. */
export function BellIcon() {
  return <img src={bellImg} width={61.9377} height={61.9377} alt="" aria-hidden="true" className="bell-img" />
}
