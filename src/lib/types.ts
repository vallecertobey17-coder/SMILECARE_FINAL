export type ResidentStatus = 'APPROVED' | 'PENDING' | 'REJECTED'
export interface Resident {
  id: string
  name: string
  healthId: string
  barangay: string
  status: ResidentStatus
  registered: string // ISO date
  birthdate?: string
  contact?: string
  address?: string
}

export interface Medicine {
  id: string
  name: string
  strength: string // e.g. 500mg
  form: string // e.g. tablet
  stock: number
  unit: string // e.g. blister packs
  expiry: string // YYYY-MM
  reorderLevel: number
  location?: string
}
export type MedicineStatus = 'GOOD' | 'LOW STOCK' | 'EXPIRING SOON' | 'EXPIRED' | 'OUT OF STOCK'

export type ServiceStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED'
export interface Service {
  id: string
  name: string
  location: string
  date: string // YYYY-MM-DD
  start: string // HH:MM
  end: string // HH:MM
  capacity: number
  booked: number
  status: ServiceStatus
  category?: string
}

export type DispenseStatus = 'COMPLETED' | 'PENDING' | 'ERROR'
export interface DispenseItem {
  medicineId: string
  label: string // "Paracetamol (500mg)"
  qty: number
}
export interface Dispensing {
  id: string
  ref: string
  residentName: string
  items: DispenseItem[]
  status: DispenseStatus
  date: string // ISO datetime
  note?: string
}

export interface Transaction {
  id: string
  txId: string
  service: string
  residentName: string
  doctor: string
  barangay: string
  amount: number
  date: string // ISO datetime
}

export type UnitStatus = 'IN PROGRESS' | 'OPEN' | 'CLOSED'
export interface Unit {
  id: string
  name: string
  location: string
  until: string // HH:MM
  served: number
  queue: number
  status: UnitStatus
  kind: 'Rolling Botika' | 'Health Office'
  description?: string
}

export interface Collections {
  residents: Resident
  medicines: Medicine
  services: Service
  dispensings: Dispensing
  transactions: Transaction
  units: Unit
}
export type CollectionName = keyof Collections
export const COLLECTIONS: CollectionName[] = [
  'residents',
  'medicines',
  'services',
  'dispensings',
  'transactions',
  'units',
]
