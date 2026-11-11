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
