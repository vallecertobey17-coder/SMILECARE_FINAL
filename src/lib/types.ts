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
  email?: string // linked resident account
  walkIn?: boolean // registered in person by staff
  idDocument?: string // name of uploaded verification document
  idDocumentData?: string // small data URL preview of the document
  verifiedAt?: string
  verifiedBy?: string
  remarks?: string
}

export interface Medicine {
  id: string
  name: string
  strength: string // e.g. 500mg
  form: string // e.g. tablet
  stock: number // central health office stock
  unit: string // e.g. blister packs
  expiry: string // YYYY-MM
  reorderLevel: number
  location?: string
  purpose?: string // recorded purpose, shown to residents and used by Ask SMILE
  usage?: string // basic usage guidance
}
export type MedicineStatus = 'GOOD' | 'LOW STOCK' | 'EXPIRING SOON' | 'EXPIRED' | 'OUT OF STOCK'

/** The 5 community health programs from the SMILECare proposal (eye & dental split). */
export const PROGRAMS = [
  'Free Consultation',
  'Rapid Blood Sugar Screening',
  'Medicine Distribution',
  'Eye Check-up',
  'Dental Check-up',
  'Vaccination',
] as const

export type ServiceStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
export interface Service {
  id: string
  name: string
  location: string
  barangay?: string
  date: string // YYYY-MM-DD
  start: string // HH:MM
  end: string // HH:MM
  capacity: number
  booked: number
  status: ServiceStatus
  category?: string
  unitId?: string // Rolling Botika unit deployed for this service
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
  residentId?: string
  items: DispenseItem[]
  status: DispenseStatus
  date: string // ISO datetime
  note?: string
  source?: string // 'central' or a unit id
  verifiedBy?: string
  appointmentId?: string
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
  barangay?: string
  until: string // HH:MM
  served: number
  queue: number
  status: UnitStatus
  kind: 'Rolling Botika' | 'Health Office'
  description?: string
  stock?: Record<string, number> // medicineId -> quantity loaded on this unit
  services?: string[] // programs offered at this deployment
  coords?: [number, number] // deployment site (lat, lng)
}

export type AnnouncementCategory = 'URGENT' | 'ROLLING BOTIKA' | 'ADVISORY' | 'APPOINTMENT'
export interface Announcement {
  id: string
  title: string
  body: string
  category: AnnouncementCategory
  date: string // ISO datetime
  barangay?: string
  author?: string
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
export interface Appointment {
  id: string
  ref: string
  residentId: string
  residentName: string
  barangay?: string
  kind: 'appointment' | 'medicine' | 'both'
  serviceId?: string
  serviceName?: string
  date: string // YYYY-MM-DD
  time?: string // e.g. "9:30 - 10:00 AM"
  location: string
  doctor?: string
  medicines?: DispenseItem[]
  status: AppointmentStatus
  createdAt: string
  notes?: string
}

export type TicketStatus = 'WAITING' | 'SERVING' | 'DONE' | 'CANCELLED'
export interface Ticket {
  id: string
  unitId: string
  unitName: string
  number: number
  residentId: string
  residentName: string
  purpose: string
  status: TicketStatus
  createdAt: string
}

export interface Consultation {
  id: string
  residentId?: string
  residentName: string
  barangay?: string
  date: string // ISO datetime
  type: string // program, e.g. Free Consultation, Rapid Blood Sugar Screening
  complaint?: string
  bp?: string // "138/88"
  bloodSugar?: number // mg/dL
  findings?: string
  advice?: string
  doctor: string
  location: string
  unitId?: string
}

export interface Vaccination {
  id: string
  residentId?: string
  residentName: string
  barangay?: string
  vaccine: string
  dose: string
  date: string // ISO datetime
  location: string
  administeredBy: string
  lot?: string
  nextDose?: string // YYYY-MM-DD
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  role: string
  action: string // create | update | delete | login | backup | restore ...
  entity: string
  summary: string
}

export type StaffRole = 'Administrator' | 'Municipal Health Doctor' | 'Pharmacist' | 'Rolling Botika Staff'
export const STAFF_ROLES: StaffRole[] = ['Administrator', 'Municipal Health Doctor', 'Pharmacist', 'Rolling Botika Staff']
export interface Staff {
  id: string
  name: string
  email: string
  role: StaffRole
  title?: string
  active: boolean
}

export interface SupportRequest {
  id: string
  name: string
  email: string
  mobile?: string
  address?: string
  message: string
  createdAt: string
  status: 'OPEN' | 'RESOLVED'
}

/** External entity: medicine and supply suppliers (DFD process 6.0). */
export interface Supplier {
  id: string
  name: string
  contact: string
  phone?: string
  email?: string
  supplies: string // medicines / supplies they provide
  leadDays: number // usual delivery time
  availability?: string // latest stock availability reported by the supplier
}

export type SupplyOrderStatus = 'REQUESTED' | 'ORDERED' | 'DELIVERED' | 'CANCELLED'
/** Medicine/supply requirement → purchase order → delivery (DFD process 6.0). */
export interface SupplyOrder {
  id: string
  ref: string
  medicineId: string
  label: string
  qty: number
  status: SupplyOrderStatus
  requestedBy: string
  requestedRole: string
  reason?: string
  createdAt: string
  supplierId?: string
  supplierName?: string
  orderedAt?: string
  expectedDate?: string
  deliveredAt?: string
  deliveredQty?: number
  notes?: string
}

/** D5 Knowledge base used by Ask SMILE (DFD process 3.0). */
export interface KnowledgeEntry {
  id: string
  question: string
  answer: string
  category: string
  keywords: string // comma-separated
}

export interface Collections {
  residents: Resident
  medicines: Medicine
  services: Service
  dispensings: Dispensing
  transactions: Transaction
  units: Unit
  announcements: Announcement
  appointments: Appointment
  tickets: Ticket
  consultations: Consultation
  vaccinations: Vaccination
  audit: AuditEntry
  staff: Staff
  support: SupportRequest
  suppliers: Supplier
  orders: SupplyOrder
  knowledge: KnowledgeEntry
}
export type CollectionName = keyof Collections
export const COLLECTIONS: CollectionName[] = [
  'residents',
  'medicines',
  'services',
  'dispensings',
  'transactions',
  'units',
  'announcements',
  'appointments',
  'tickets',
  'consultations',
  'vaccinations',
  'audit',
  'staff',
  'support',
  'suppliers',
  'orders',
  'knowledge',
]
