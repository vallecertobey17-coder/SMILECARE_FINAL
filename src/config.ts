// Project details from the SMILECare title proposal and the Figma "Need help?" screen.
export const MUNICIPALITY = 'Taytay'

export const PROJECT = {
  name: 'SMILECare',
  title: 'SMILECare: An Integrated Health Information System with AI Integration for Inventory and Scheduling',
  tagline: "An integrated health information system for the Municipality of Taytay's Rolling Botika mobile healthcare initiative.",
  team: [
    { name: 'Alanzalon, AJ F.', role: 'Project Leader' },
    { name: 'Capili, Renji Gian M.', role: 'Member' },
    { name: 'Compa, Alfredo Jr. P.', role: 'Member' },
    { name: 'Peñalosa, Jorge D.', role: 'Member' },
    { name: 'Vallecer, Tobey DS.', role: 'Member' },
  ],
  supportEmail: 'contact@smilecaretaytay.com',
  supportPhone: '(02) 8123-4567',
  supportAddress: 'Unit 5, Crochet Lane, Manila East Road, Brgy. San Juan, Taytay, Rizal 1920, Philippines',
  supportHours: 'Mon–Sun, 8:30 AM – 5:30 PM',
}

/** The community health programs SMILECare streamlines (proposal scope). */
export const PROGRAM_INFO = [
  { name: 'Free Consultations', text: 'General check-ups with municipal doctors during Rolling Botika visits.' },
  { name: 'Rapid Blood Sugar Screening', text: 'Quick blood sugar tests to catch diabetes early.' },
  { name: 'Medicine Distribution', text: 'Free maintenance and common medicines for eligible residents.' },
  { name: 'Eye & Dental Check-ups', text: 'Basic eye and dental assessments in your barangay.' },
  { name: 'Vaccinations', text: 'Flu, pneumococcal and other vaccines with your history on record.' },
]

// Kept for older imports.
export const SUPPORT = {
  email: PROJECT.supportEmail,
  phone: PROJECT.supportPhone,
  hours: PROJECT.supportHours,
}
