// Sample records based on the SMILECare Figma screens and the project proposal.
// Used as offline demo data, and to fill the shared database once after deployment.
// Dates are relative to "today" so the demo always looks current.
import type { Collections, CollectionName } from './types'

type Seed = { [K in CollectionName]: Collections[K][] }

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
/** YYYY-MM-DD, `d` days from today */
const day = (d: number) => {
  const x = new Date(now)
  x.setDate(x.getDate() + d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}
/** ISO datetime, `d` days from today at hh:mm local */
const at = (d: number, hm = '09:00') => `${day(d)}T${hm}:00`
/** YYYY-MM, `m` months from this month */
const month = (m: number) => {
  const x = new Date(now.getFullYear(), now.getMonth() + m, 1)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`
}

export const DEMO_PASSWORD = 'SmileCare2026'

export const seed: Seed = {
  residents: [
    { id: 'res-aj', name: 'AJ F. Alanzalon', healthId: 'SC-TAY-2024-018429', barangay: 'San Juan', status: 'APPROVED', registered: day(-300), birthdate: '2007-01-04', contact: '0912 345 6789', address: 'Blk 2 Lot 1, BSIT Village, San Juan, Taytay, Rizal', email: 'aj@smilecare.demo', verifiedAt: day(-298), verifiedBy: 'Juan Santos' },
    { id: 'res-002', name: 'Maria Santos', healthId: 'SC-TAY-2024-018430', barangay: 'San Juan', status: 'APPROVED', registered: day(-1), verifiedAt: day(-1), verifiedBy: 'Juan Santos' },
    { id: 'res-003', name: 'Roberto Mendoza', healthId: 'SC-TAY-2024-019284', barangay: 'Dolores', status: 'PENDING', registered: day(-2), idDocument: 'barangay-certificate.jpg' },
    { id: 'res-004', name: 'Lorna Villanueva', healthId: 'SC-TAY-2024-017432', barangay: 'Dolores', status: 'APPROVED', registered: day(-5), verifiedAt: day(-5) },
    { id: 'res-005', name: 'Paolo Garcia', healthId: 'SC-TAY-2024-019301', barangay: 'Sta. Ana', status: 'REJECTED', registered: day(-6), remarks: 'Address outside Taytay' },
    { id: 'res-006', name: 'Teresita Villanueva', healthId: 'SC-TAY-2024-019322', barangay: 'San Isidro', status: 'PENDING', registered: day(-7), idDocument: 'voters-id.jpg' },
    { id: 'res-007', name: 'Vicente Cruz', healthId: 'SC-TAY-2024-019340', barangay: 'Muzon', status: 'APPROVED', registered: day(-14), walkIn: true, verifiedAt: day(-14) },
    { id: 'res-008', name: 'Lourdes San Juan', healthId: 'SC-TAY-2024-019355', barangay: 'San Juan', status: 'APPROVED', registered: day(-40), verifiedAt: day(-40) },
    { id: 'res-009', name: 'Eduardo Tolentino', healthId: 'SC-TAY-2024-019361', barangay: 'Dolores', status: 'APPROVED', registered: day(-45), verifiedAt: day(-45) },
    { id: 'res-010', name: 'Rosario Santos', healthId: 'SC-TAY-2024-019377', barangay: 'Sta. Ana', status: 'APPROVED', registered: day(-50), walkIn: true, verifiedAt: day(-50) },
  ],
  medicines: [
    { id: 'med-paracetamol', name: 'Paracetamol', strength: '500mg', form: 'tablet', stock: 3148, unit: 'tablets', expiry: month(0), reorderLevel: 200, location: 'Dispensary B', purpose: 'For fever and mild pain', usage: 'Usually taken every 4–6 hours as needed; do not exceed the dose on the label.' },
    { id: 'med-losartan', name: 'Losartan', strength: '50mg', form: 'tablet', stock: 816, unit: 'tablets', expiry: month(14), reorderLevel: 150, purpose: 'For high blood pressure', usage: 'Maintenance medicine, usually taken once a day at the same time. Take only as prescribed.' },
    { id: 'med-amoxicillin', name: 'Amoxicillin', strength: '500mg', form: 'capsule', stock: 120, unit: 'capsules', expiry: month(12), reorderLevel: 150, location: 'Dispensary A', purpose: 'Antibiotic for bacterial infections', usage: 'Requires a prescription. Finish the full course prescribed by your doctor.' },
    { id: 'med-metformin', name: 'Metformin', strength: '500mg', form: 'tablet', stock: 113, unit: 'tablets', expiry: month(1), reorderLevel: 100, purpose: 'For type 2 diabetes (blood sugar control)', usage: 'Maintenance medicine, usually taken with meals. Take only as prescribed.' },
    { id: 'med-amlodipine', name: 'Amlodipine', strength: '5mg', form: 'tablet', stock: 0, unit: 'tablets', expiry: month(5), reorderLevel: 100, purpose: 'For lower blood pressure and chest pain', usage: 'Maintenance medicine, usually once a day. Take only as prescribed.' },
    { id: 'med-salbutamol', name: 'Salbutamol Inhaler', strength: '100mcg', form: 'inhaler', stock: 64, unit: 'inhalers', expiry: month(9), reorderLevel: 20, purpose: 'For asthma and bronchospasms', usage: 'Reliever inhaler used during breathing difficulty. Follow the instructions given by your doctor.' },
    { id: 'med-omeprazole', name: 'Omeprazole', strength: '20mg', form: 'capsule', stock: 640, unit: 'capsules', expiry: month(10), reorderLevel: 100, purpose: 'For acid reflux and stomach ulcers', usage: 'Usually taken before breakfast.' },
    { id: 'med-cetirizine', name: 'Cetirizine', strength: '10mg', form: 'tablet', stock: 410, unit: 'tablets', expiry: month(7), reorderLevel: 80, purpose: 'For allergies (runny nose, itching)', usage: 'Usually once a day; may cause drowsiness.' },
    { id: 'med-ors', name: 'Oral Rehydration Salts', strength: '20.5g', form: 'sachet', stock: 95, unit: 'sachets', expiry: month(8), reorderLevel: 100, purpose: 'For dehydration from diarrhea', usage: 'Dissolve one sachet in the stated amount of clean water.' },
    { id: 'med-vitc', name: 'Ascorbic Acid (Vitamin C)', strength: '500mg', form: 'tablet', stock: 1260, unit: 'tablets', expiry: month(11), reorderLevel: 200, purpose: 'Vitamin supplement', usage: 'Usually one tablet a day.' },
  ],
  services: [
    { id: 'svc-001', name: 'Free Consultation', category: 'Free Consultation', location: 'San Juan Covered Court', barangay: 'San Juan', date: day(0), start: '08:00', end: '15:00', capacity: 85, booked: 62, status: 'ONGOING', unitId: 'unit-sj' },
    { id: 'svc-002', name: 'Rapid Blood Sugar Screening', category: 'Rapid Blood Sugar Screening', location: 'San Juan Covered Court', barangay: 'San Juan', date: day(0), start: '08:00', end: '12:00', capacity: 60, booked: 45, status: 'ONGOING', unitId: 'unit-sj' },
    { id: 'svc-003', name: 'Medicine Distribution', category: 'Medicine Distribution', location: 'Municipal Health Office', barangay: 'San Isidro', date: day(0), start: '08:00', end: '17:00', capacity: 120, booked: 89, status: 'ONGOING', unitId: 'unit-mho' },
    { id: 'svc-004', name: 'Free Consultation', category: 'Free Consultation', location: 'San Juan Covered Court', barangay: 'San Juan', date: day(6), start: '08:00', end: '15:00', capacity: 85, booked: 18, status: 'SCHEDULED', unitId: 'unit-sj' },
    { id: 'svc-005', name: 'Eye Check-up', category: 'Eye Check-up', location: 'Dolores Covered Court', barangay: 'Dolores', date: day(3), start: '08:00', end: '15:00', capacity: 60, booked: 21, status: 'SCHEDULED', unitId: 'unit-dol' },
    { id: 'svc-006', name: 'Dental Check-up', category: 'Dental Check-up', location: 'Muzon Barangay Hall', barangay: 'Muzon', date: day(9), start: '08:00', end: '12:00', capacity: 40, booked: 7, status: 'SCHEDULED', unitId: 'unit-muz' },
    { id: 'svc-007', name: 'Vaccination', category: 'Vaccination', location: 'Sta. Ana Health Center', barangay: 'Sta. Ana', date: day(13), start: '07:00', end: '11:00', capacity: 100, booked: 34, status: 'SCHEDULED', unitId: 'unit-sa' },
    { id: 'svc-010', name: 'Free Consultation', category: 'Free Consultation', location: 'Sta. Ana Health Center', barangay: 'Sta. Ana', date: day(0), start: '08:00', end: '14:00', capacity: 50, booked: 28, status: 'ONGOING', unitId: 'unit-sa' },
    { id: 'svc-008', name: 'Rapid Blood Sugar Screening', category: 'Rapid Blood Sugar Screening', location: 'Dolores Covered Court', barangay: 'Dolores', date: day(-20), start: '08:00', end: '12:00', capacity: 60, booked: 60, status: 'COMPLETED', unitId: 'unit-dol' },
    { id: 'svc-009', name: 'Free Consultation', category: 'Free Consultation', location: 'Dolores Covered Court', barangay: 'Dolores', date: day(-26), start: '08:00', end: '15:00', capacity: 85, booked: 85, status: 'COMPLETED', unitId: 'unit-dol' },
  ],
  units: [
    { id: 'unit-sj', name: 'Rolling Botika • San Juan', location: 'San Juan Covered Court', barangay: 'San Juan', coords: [14.5556, 121.1392], until: '15:00', served: 84, queue: 19, status: 'IN PROGRESS', kind: 'Rolling Botika', services: ['Free Consultation', 'Rapid Blood Sugar Screening', 'Medicine Distribution'], stock: { 'med-paracetamol': 400, 'med-losartan': 180, 'med-metformin': 60, 'med-salbutamol': 12, 'med-cetirizine': 90, 'med-vitc': 200 } },
    { id: 'unit-mho', name: 'Municipal Health Office', location: 'Taytay Municipal Health Office', barangay: 'San Isidro', coords: [14.5752, 121.1322], until: '17:00', served: 58, queue: 12, status: 'OPEN', kind: 'Health Office', description: 'General consultations & pharmacy', services: ['Free Consultation', 'Medicine Distribution', 'Vaccination'] },
    { id: 'unit-dol', name: 'Rolling Botika • Dolores', location: 'Dolores Covered Court', barangay: 'Dolores', coords: [14.5714, 121.1398], until: '15:00', served: 0, queue: 0, status: 'CLOSED', kind: 'Rolling Botika', services: ['Eye Check-up', 'Medicine Distribution'], stock: { 'med-paracetamol': 150, 'med-losartan': 60, 'med-omeprazole': 40 } },
    { id: 'unit-sa', name: 'Rolling Botika • Sta. Ana', location: 'Sta. Ana Health Center', barangay: 'Sta. Ana', coords: [14.5628, 121.1236], until: '14:00', served: 22, queue: 6, status: 'OPEN', kind: 'Rolling Botika', services: ['Free Consultation', 'Medicine Distribution', 'Vaccination'], stock: { 'med-paracetamol': 120, 'med-losartan': 40, 'med-cetirizine': 60, 'med-ors': 30 } },
    { id: 'unit-muz', name: 'Rolling Botika • Muzon', location: 'Muzon Barangay Hall', barangay: 'Muzon', coords: [14.5416, 121.1474], until: '12:00', served: 0, queue: 0, status: 'CLOSED', kind: 'Rolling Botika', services: ['Dental Check-up', 'Medicine Distribution'], stock: { 'med-paracetamol': 80, 'med-vitc': 120 } },
  ],
  announcements: [
    { id: 'ann-001', category: 'URGENT', title: 'Clinic hours adjusted due to heavy rain', body: 'The Municipal Health Office will close at 3:00 PM today. Emergency services remain available.', date: at(0, '10:24') },
    { id: 'ann-002', category: 'ROLLING BOTIKA', title: 'Next stop: Barangay Dolores', body: `Visit us on ${day(3)} at the Dolores Covered Court from 8:00 AM to 3:00 PM for free eye check-ups and medicine distribution.`, date: at(-1, '16:00'), barangay: 'Dolores' },
    { id: 'ann-003', category: 'ADVISORY', title: 'Free flu vaccination for senior citizens', body: 'Vaccinations are available while supplies last. Bring your senior citizen ID.', date: at(-6, '08:00') },
    { id: 'ann-004', category: 'APPOINTMENT', title: 'Pre-book your Rolling Botika visit', body: 'You can now reserve a consultation slot and request medicines before the Rolling Botika arrives in your barangay.', date: at(-9, '09:00') },
  ],
  appointments: [
    { id: 'apt-001', ref: 'APT-24001', residentId: 'res-aj', residentName: 'AJ F. Alanzalon', barangay: 'San Juan', kind: 'appointment', serviceId: 'svc-004', serviceName: 'Free Consultation', date: day(6), time: '9:30 - 10:00 AM', location: 'San Juan Covered Court', doctor: 'Dr. Alfredo Pascual', status: 'CONFIRMED', createdAt: at(-2, '13:10') },
    { id: 'apt-003', ref: 'APT-24003', residentId: 'res-009', residentName: 'Eduardo Tolentino', barangay: 'Dolores', kind: 'appointment', serviceId: 'svc-004', serviceName: 'Free Consultation', date: day(6), time: '10:00 - 10:30 AM', location: 'San Juan Covered Court', doctor: 'Dr. Barbara Pegg', status: 'CONFIRMED', createdAt: at(-1, '09:20'), notes: 'Hypertension follow-up' },
    { id: 'apt-002', ref: 'APT-24002', residentId: 'res-004', residentName: 'Lorna Villanueva', barangay: 'Dolores', kind: 'both', serviceId: 'svc-005', serviceName: 'Eye Check-up', date: day(3), time: '8:00 - 8:30 AM', location: 'Dolores Covered Court', status: 'PENDING', medicines: [{ medicineId: 'med-losartan', label: 'Losartan (50mg)', qty: 30 }], createdAt: at(-1, '18:00') },
  ],
  tickets: [
    { id: 'tkt-001', unitId: 'unit-sj', unitName: 'Rolling Botika • San Juan', number: 85, residentId: 'res-002', residentName: 'Maria Santos', purpose: 'Medicine Distribution', status: 'SERVING', createdAt: at(0, '08:40') },
  ],
  consultations: [
    { id: 'con-001', residentId: 'res-aj', residentName: 'AJ F. Alanzalon', barangay: 'San Juan', date: at(-60, '10:00'), type: 'Free Consultation', complaint: 'Blood pressure follow-up', bp: '138/88', findings: 'Elevated blood pressure', advice: 'Continue Losartan, monitor BP weekly', doctor: 'Dr. Alfredo Pascual', location: 'Rolling Botika • San Juan', unitId: 'unit-sj' },
    { id: 'con-002', residentId: 'res-aj', residentName: 'AJ F. Alanzalon', barangay: 'San Juan', date: at(-120, '09:30'), type: 'Rapid Blood Sugar Screening', bloodSugar: 104, findings: 'Fasting blood sugar slightly high', doctor: 'Dr. Angela Reyes', location: 'Taytay Municipal Laboratory' },
    { id: 'con-003', residentId: 'res-004', residentName: 'Lorna Villanueva', barangay: 'Dolores', date: at(-20, '09:00'), type: 'Rapid Blood Sugar Screening', bloodSugar: 168, findings: 'High blood sugar', advice: 'Referred for consultation', doctor: 'Dr. Barbara Pegg', location: 'Rolling Botika • Dolores', unitId: 'unit-dol' },
    { id: 'con-004', residentId: 'res-009', residentName: 'Eduardo Tolentino', barangay: 'Dolores', date: at(-26, '11:00'), type: 'Free Consultation', complaint: 'Headache and dizziness', bp: '150/95', findings: 'Hypertension', advice: 'Started on Losartan', doctor: 'Dr. Barbara Pegg', location: 'Rolling Botika • Dolores', unitId: 'unit-dol' },
    { id: 'con-005', residentId: 'res-008', residentName: 'Lourdes San Juan', barangay: 'San Juan', date: at(0, '09:15'), type: 'Free Consultation', complaint: 'Fever', bp: '120/80', findings: 'Viral fever', advice: 'Paracetamol, rest and fluids', doctor: 'Dr. Alfredo Pascual', location: 'Rolling Botika • San Juan', unitId: 'unit-sj' },
    { id: 'con-006', residentId: 'res-002', residentName: 'Maria Santos', barangay: 'San Juan', date: at(0, '08:50'), type: 'Rapid Blood Sugar Screening', bloodSugar: 132, findings: 'Borderline', doctor: 'Dr. Alfredo Pascual', location: 'Rolling Botika • San Juan', unitId: 'unit-sj' },
  ],
  vaccinations: [
    { id: 'vac-001', residentId: 'res-aj', residentName: 'AJ F. Alanzalon', barangay: 'San Juan', vaccine: 'Influenza', dose: 'Annual dose', date: at(-200, '10:00'), location: 'Municipal Health Office', administeredBy: 'Nurse Carla Diaz', lot: 'FLU-2026-118' },
    { id: 'vac-002', residentId: 'res-010', residentName: 'Rosario Santos', barangay: 'Sta. Ana', vaccine: 'Pneumococcal (PPV23)', dose: '1st dose', date: at(-12, '09:00'), location: 'Sta. Ana Health Center', administeredBy: 'Nurse Carla Diaz', lot: 'PNE-2026-031' },
    { id: 'vac-003', residentId: 'res-007', residentName: 'Vicente Cruz', barangay: 'Muzon', vaccine: 'Tetanus-diphtheria (Td)', dose: '2nd dose', date: at(-30, '14:00'), location: 'Municipal Health Office', administeredBy: 'Nurse Carla Diaz', nextDose: day(150) },
  ],
  dispensings: [
    { id: 'dis-001', ref: 'SC-' + day(-60).replace(/-/g, '').slice(2) + '-001', residentId: 'res-aj', residentName: 'AJ F. Alanzalon', items: [{ medicineId: 'med-losartan', label: 'Losartan (50mg)', qty: 30 }], status: 'COMPLETED', date: at(-60, '10:30'), source: 'unit-dol', verifiedBy: 'Ana Reyes, RPh' },
    { id: 'dis-002', ref: 'SC-' + day(-26).replace(/-/g, '').slice(2) + '-001', residentId: 'res-009', residentName: 'Eduardo Tolentino', items: [{ medicineId: 'med-losartan', label: 'Losartan (50mg)', qty: 30 }], status: 'COMPLETED', date: at(-26, '11:20'), source: 'unit-dol', verifiedBy: 'Ana Reyes, RPh' },
    { id: 'dis-003', ref: 'SC-' + day(0).replace(/-/g, '').slice(2) + '-001', residentId: 'res-008', residentName: 'Lourdes San Juan', items: [{ medicineId: 'med-paracetamol', label: 'Paracetamol (500mg)', qty: 10 }], status: 'COMPLETED', date: at(0, '09:30'), source: 'unit-sj', verifiedBy: 'Ana Reyes, RPh' },
    { id: 'dis-004', ref: 'SC-' + day(0).replace(/-/g, '').slice(2) + '-002', residentId: 'res-002', residentName: 'Maria Santos', items: [{ medicineId: 'med-metformin', label: 'Metformin (500mg)', qty: 30 }], status: 'PENDING', date: at(0, '09:45'), source: 'unit-sj' },
    { id: 'dis-005', ref: 'SC-' + day(-2).replace(/-/g, '').slice(2) + '-001', residentId: 'res-010', residentName: 'Rosario Santos', items: [{ medicineId: 'med-amlodipine', label: 'Amlodipine (5mg)', qty: 30 }], status: 'ERROR', date: at(-2, '11:02'), source: 'central', note: 'Out of stock' },
  ],
  transactions: [
    { id: 'tra-001', txId: 'TX-' + day(-40).replace(/-/g, '').slice(2) + '#001', service: 'Free Consultation', residentName: 'Lourdes San Juan', doctor: 'Dr. Alfredo Pascual', barangay: 'San Juan', amount: 0, date: at(-40, '09:00') },
    { id: 'tra-002', txId: 'TX-' + day(-26).replace(/-/g, '').slice(2) + '#001', service: 'Free Consultation', residentName: 'Eduardo Tolentino', doctor: 'Dr. Barbara Pegg', barangay: 'Dolores', amount: 0, date: at(-26, '11:00') },
    { id: 'tra-003', txId: 'TX-' + day(-20).replace(/-/g, '').slice(2) + '#001', service: 'Rapid Blood Sugar Screening', residentName: 'Lorna Villanueva', doctor: 'Dr. Barbara Pegg', barangay: 'Dolores', amount: 0, date: at(-20, '09:00') },
  ],
  audit: [],
  staff: [
    { id: 'stf-admin', name: 'Juan Santos', email: 'admin@smilecare.demo', role: 'Administrator', title: 'Municipal Health Officer', active: true },
    { id: 'stf-doc', name: 'Dr. Barbara Pegg', email: 'doctor@smilecare.demo', role: 'Municipal Health Doctor', title: 'Family Medicine', active: true },
    { id: 'stf-doc2', name: 'Dr. Alfredo Pascual', email: 'apascual@smilecare.demo', role: 'Municipal Health Doctor', title: 'General Medicine', active: true },
    { id: 'stf-rph', name: 'Ana Reyes, RPh', email: 'pharmacist@smilecare.demo', role: 'Pharmacist', title: 'Municipal Pharmacist', active: true },
    { id: 'stf-rb', name: 'Mark Villanueva', email: 'botika@smilecare.demo', role: 'Rolling Botika Staff', title: 'Rolling Botika • San Juan', active: true },
  ],
  support: [],
  suppliers: [
    { id: 'sup-001', name: 'Rizal Pharma Distributors', contact: 'Liza Manalo', email: 'orders@rizalpharma.example', supplies: 'Maintenance medicines (Losartan, Amlodipine, Metformin)', leadDays: 5, availability: 'Amlodipine available, ships in 5 days' },
    { id: 'sup-002', name: 'MedSupply PH', contact: 'Ramon Cruz', email: 'sales@medsupply.example', supplies: 'Antibiotics, analgesics, ORS, vitamins', leadDays: 3 },
  ],
  orders: [
    { id: 'ord-001', ref: 'PO-' + day(-3).replace(/-/g, '').slice(2) + '-01', medicineId: 'med-amlodipine', label: 'Amlodipine (5mg)', qty: 1000, status: 'ORDERED', requestedBy: 'Dr. Barbara Pegg', requestedRole: 'Municipal Health Doctor', reason: 'Out of stock; hypertension patients waiting', createdAt: at(-4, '10:00'), supplierId: 'sup-001', supplierName: 'Rizal Pharma Distributors', orderedAt: at(-3, '09:00'), expectedDate: day(2) },
    { id: 'ord-002', ref: 'REQ-' + day(-1).replace(/-/g, '').slice(2) + '-01', medicineId: 'med-amoxicillin', label: 'Amoxicillin (500mg)', qty: 300, status: 'REQUESTED', requestedBy: 'Dr. Barbara Pegg', requestedRole: 'Municipal Health Doctor', reason: 'Low stock for upcoming consultations', createdAt: at(-1, '15:30') },
  ],
  knowledge: [
    { id: 'kb-001', category: 'Rolling Botika', question: 'What is the Rolling Botika?', answer: 'The Rolling Botika is the mobile pharmacy and health service of the Municipality of Taytay. It visits barangays to give free consultations, blood sugar screenings, medicines, eye and dental check-ups, and vaccinations.', keywords: 'what is the rolling botika, ano ang rolling botika, what is rolling botika' },
    { id: 'kb-002', category: 'Eligibility', question: 'Who can get free medicines?', answer: 'Verified residents of Taytay can receive free medicines, subject to availability. Some medicines (like antibiotics) need a prescription from a doctor.', keywords: 'free, eligible, libre, who can' },
    { id: 'kb-003', category: 'Requirements', question: 'What should I bring to the Rolling Botika?', answer: 'Bring your SMILECare QR Health ID (or Health ID number), a valid ID, and your prescription if your medicine needs one.', keywords: 'bring, requirements, dalhin, id' },
    { id: 'kb-004', category: 'Account', question: 'How do I get verified?', answer: 'Register in SMILECare and upload one valid ID or barangay certificate showing your Taytay address. The Municipal Health Office reviews it, usually within a few days.', keywords: 'verify, verification, approved, pending' },
  ],
}
