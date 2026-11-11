// Demo records taken from the SMILECare Figma screens.
// Used to fill the shared database once after deployment, and as offline demo data.
import type { Collections, CollectionName } from './types'

type Seed = { [K in CollectionName]: Omit<Collections[K], 'id'>[] }

export const seed: Seed = {
  residents: [
    { name: 'Maria Santos', healthId: 'SC-018429', barangay: 'San Juan', status: 'APPROVED', registered: '2026-11-10' },
    { name: 'Roberto Mendoza', healthId: 'SC-019284', barangay: 'Dolores', status: 'PENDING', registered: '2026-11-09' },
    { name: 'Lorna Villanueva', healthId: 'SC-017432', barangay: 'San Isidro', status: 'APPROVED', registered: '2026-11-06' },
    { name: 'Paolo Garcia', healthId: 'SC-019301', barangay: 'Sta. Ana', status: 'REJECTED', registered: '2026-11-05' },
    { name: 'Teresita Villanueva', healthId: 'SC-019322', barangay: 'Dolores', status: 'PENDING', registered: '2026-11-04' },
    { name: 'Vicente Cruz', healthId: 'SC-019340', barangay: 'San Juan', status: 'APPROVED', registered: '2026-10-28' },
  ],
  medicines: [
    { name: 'Paracetamol', strength: '500mg', form: 'tablet', stock: 3148, unit: 'blister packs', expiry: '2026-11', reorderLevel: 200, location: 'Dispensary B' },
    { name: 'Losartan', strength: '50mg', form: 'tablet', stock: 816, unit: 'blister packs', expiry: '2028-01', reorderLevel: 150 },
    { name: 'Amoxicillin', strength: '500mg', form: 'capsule', stock: 120, unit: 'blister packs', expiry: '2027-11', reorderLevel: 150, location: 'Dispensary A' },
    { name: 'Metformin', strength: '500mg', form: 'tablet', stock: 113, unit: 'blister packs', expiry: '2026-12', reorderLevel: 100 },
    { name: 'Amlodipine', strength: '5mg', form: 'tablet', stock: 0, unit: 'blister packs', expiry: '2027-03', reorderLevel: 100 },
    { name: 'Omeprazole', strength: '20mg', form: 'capsule', stock: 640, unit: 'blister packs', expiry: '2027-08', reorderLevel: 100 },
    { name: 'Naproxen', strength: '220mg', form: 'tablet', stock: 410, unit: 'blister packs', expiry: '2027-05', reorderLevel: 80 },
    { name: 'Guaifenesin', strength: '100mg', form: 'tablet', stock: 95, unit: 'blister packs', expiry: '2027-02', reorderLevel: 100 },
    { name: 'Loperamide', strength: '2mg', form: 'capsule', stock: 260, unit: 'blister packs', expiry: '2027-09', reorderLevel: 60 },
  ],
  services: [
    { name: 'General Consultation', location: 'Municipal Health Office', date: '2026-10-09', start: '08:00', end: '17:00', capacity: 50, booked: 50, status: 'COMPLETED', category: 'OPD Clinical stream' },
    { name: 'Blood Pressure Check', location: 'San Juan Gym', date: '2026-10-30', start: '08:00', end: '12:00', capacity: 100, booked: 100, status: 'COMPLETED', category: 'Triage vital checks' },
    { name: 'Eye-check Up', location: 'Taytay Doctors', date: '2026-11-11', start: '08:00', end: '15:00', capacity: 450, booked: 312, status: 'ONGOING', category: 'Ophthalmology' },
    { name: 'Rolling Botika', location: 'Lupang Arenda', date: '2026-11-13', start: '10:00', end: '15:00', capacity: 120, booked: 40, status: 'SCHEDULED', category: 'Pharmacy dispensary' },
    { name: 'Dental Check Up', location: 'Hi-Precision', date: '2026-11-27', start: '08:00', end: '15:00', capacity: 45, booked: 12, status: 'SCHEDULED', category: 'Dental' },
    { name: 'Maternal Care', location: 'Manila East Medical Center', date: '2026-12-04', start: '08:00', end: '12:00', capacity: 30, booked: 4, status: 'SCHEDULED', category: 'OB-GYN & infant center' },
    { name: 'Pediatric Check Up', location: 'Municipal Health Office', date: '2026-12-18', start: '07:00', end: '11:00', capacity: 40, booked: 9, status: 'SCHEDULED', category: 'Pediatrics' },
  ],
  dispensings: [
    { ref: 'SC-261001-676', residentName: 'Lourdes San Juan', items: [{ medicineId: '', label: 'Paracetamol (500mg)', qty: 1 }, { medicineId: '', label: 'Naproxen (220mg)', qty: 1 }], status: 'COMPLETED', date: '2026-10-01T09:12:00' },
    { ref: 'SC-261001-677', residentName: 'Vicente Cruz', items: [{ medicineId: '', label: 'Omeprazole (20mg)', qty: 2 }, { medicineId: '', label: 'Metformin (500mg)', qty: 1 }], status: 'COMPLETED', date: '2026-10-01T09:40:00' },
    { ref: 'SC-261001-678', residentName: 'Teresita Villanueva', items: [{ medicineId: '', label: 'Amoxicillin (500mg)', qty: 1 }], status: 'PENDING', date: '2026-10-01T10:05:00' },
    { ref: 'SC-261001-679', residentName: 'Francisco Mendoza', items: [{ medicineId: '', label: 'Losartan (50mg)', qty: 1 }], status: 'COMPLETED', date: '2026-10-01T10:31:00' },
    { ref: 'SC-261001-680', residentName: 'Antonio Esguerra', items: [{ medicineId: '', label: 'Amlodipine (5mg)', qty: 1 }], status: 'ERROR', date: '2026-10-01T11:02:00', note: 'Out of stock' },
    { ref: 'SC-261001-681', residentName: 'Eduardo Tolentino', items: [{ medicineId: '', label: 'Metformin (500mg)', qty: 1 }, { medicineId: '', label: 'Losartan (50mg)', qty: 2 }], status: 'COMPLETED', date: '2026-10-01T11:20:00' },
    { ref: 'SC-261001-682', residentName: 'Rosario Santos', items: [{ medicineId: '', label: 'Guaifenesin (100mg)', qty: 1 }, { medicineId: '', label: 'Loperamide (2mg)', qty: 1 }], status: 'PENDING', date: '2026-10-01T11:48:00' },
  ],
  transactions: [
    { txId: 'SEP2601#001', service: 'General Medical Checkup', residentName: 'Tala Nicole Valdez', doctor: 'Sabine Callas', barangay: 'Dolores', amount: 400, date: '2026-09-01T09:00:00' },
    { txId: 'SEP2601#002', service: 'General Consultation', residentName: 'Alain Guillotin', doctor: 'Rene de Petrichor', barangay: 'Dolores', amount: 400, date: '2026-09-01T10:30:00' },
    { txId: 'SEP2602#001', service: 'Medicine Dispensing', residentName: 'Navia Caspar', doctor: 'Sandrone Guillotin', barangay: 'San Juan', amount: 250, date: '2026-09-02T08:45:00' },
    { txId: 'SEP2602#002', service: 'Blood Pressure Check', residentName: 'Jayce Talis', doctor: 'Cecil Heimerdinger', barangay: 'San Isidro', amount: 150, date: '2026-09-02T11:15:00' },
    { txId: 'SEP2602#003', service: 'Maternal Care', residentName: 'Rosalyne Lohefalter', doctor: 'Yumemizuki Mizuki', barangay: 'Dolores', amount: 600, date: '2026-09-02T14:20:00' },
    { txId: 'SEP2603#001', service: 'Medicine Dispensing', residentName: 'Jean Gunnhildr', doctor: 'Barbara Pegg', barangay: 'Sta. Ana', amount: 300, date: '2026-09-03T09:10:00' },
    { txId: 'SEP2603#002', service: 'Medicine Dispensing', residentName: 'Maria Santos', doctor: 'Barbara Pegg', barangay: 'San Juan', amount: 200, date: '2026-09-03T10:00:00' },
    { txId: 'OCT2601#001', service: 'General Consultation', residentName: 'Lorna Villanueva', doctor: 'Barbara Pegg', barangay: 'San Isidro', amount: 400, date: '2026-10-01T09:30:00' },
    { txId: 'OCT2601#002', service: 'Blood Pressure Check', residentName: 'Roberto Mendoza', doctor: 'Cecil Heimerdinger', barangay: 'Dolores', amount: 150, date: '2026-10-01T13:00:00' },
  ],
  units: [
    { name: 'Rolling Botika • San Juan', location: 'Club Manila East Grounds', until: '14:00', served: 84, queue: 19, status: 'IN PROGRESS', kind: 'Rolling Botika' },
    { name: 'Municipal Health Office', location: 'Taytay Town Center', until: '17:00', served: 58, queue: 12, status: 'OPEN', kind: 'Health Office', description: 'General consultations' },
    { name: 'Rolling Botika • Dolores', location: 'Brgy. Dolores Covered Court', until: '15:00', served: 31, queue: 7, status: 'OPEN', kind: 'Rolling Botika' },
  ],
}
