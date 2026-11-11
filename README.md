# SMILECare

**SMILECare: An Integrated Health Information System with AI Integration for Inventory and Scheduling**

A working prototype for System Analysis and Design, built from the SMILECare Figma design (Admin and User pages) and the project proposal. It supports the Municipality of Taytay's Rolling Botika mobile healthcare initiative with an **administrative platform** for municipal health personnel and a **resident platform**.

**Project team:** Alanzalon, AJ F. (Project Leader) • Capili, Renji Gian M. • Compa, Alfredo Jr. P. • Peñalosa, Jorge D. • Vallecer, Tobey DS.

**Live demo:** https://vallecertobey17-coder.github.io/SMILECARE_FINAL/

## Demo accounts

On the sign-in page, tap a demo chip to sign in instantly (password `SmileCare2026`):

| Chip | Email | What you'll see |
| --- | --- | --- |
| Resident | aj@smilecare.demo | Resident platform (AJ F. Alanzalon, verified) |
| Administrator | admin@smilecare.demo | Everything, including Staff & Roles and Backup |
| Doctor | doctor@smilecare.demo | Municipal Health Doctor: appointment schedule, consultations, vaccinations, inventory (view) & supply requests, analytics |
| Pharmacist | pharmacist@smilecare.demo | Inventory, dispensing, analytics |
| Rolling Botika Staff | botika@smilecare.demo | Unit inventory, E-Pila, dispensing, consultations |

You can also register a new resident (with ID upload) and verify them as the Administrator.

Data is sample data saved in your browser. **Settings → Reset demo data** restores it.

## How the system follows the DFD

| DFD element | In SMILECare |
| --- | --- |
| **External entities** | Taytayeños (Residents) → resident platform • Municipal Health Office Staff → Administrator, Pharmacist and Rolling Botika Staff roles • Municipal Health Doctor → Doctor role • Suppliers → Medicine Inventory → Suppliers & orders |
| **1.0 Manage User Account** | Registration with resident document, verification status, staff accounts (Staff & Roles), audit log entries |
| **2.0 Schedule Appointment** | Resident booking → appointment confirmation and E-Pila queue ticket; staff see the Appointment Requests and Queue lists in Health Services → Appointments |
| **3.0 Provide Information** | Announcements, notifications, schedule & availability, Ask SMILE chatbot (uses D5 Knowledge base) |
| **4.0 Record Health Service** | Consultations (medical assessment, recommendations) and vaccinations → resident health records |
| **5.0 Generate Health Analytics** | Analytics & Reports (overview, health mapping), sent to staff and doctors |
| **6.0 Monitor Medicine Inventory** | Central & unit stock, inventory alerts, doctor's medicine/supply requirements, supplier orders, deliveries and stock availability |
| **7.0 Generate Schedule** | Analytics → Deployment planner (deployment recommendation from appointment requests and health data) |
| **8.0 Manage Deployment Schedule** | Health Services → Deployment schedule (shown to residents in Schedule, and to doctors as their appointment schedule) |
| **D1 Resident Record** | `residents` |
| **D2 Appointment & Queue Record** | `appointments`, `tickets` |
| **D3 Medicine Inventory** | `medicines`, unit stock, `orders`, `suppliers` |
| **D4 Schedule Record** | `services`, `units` |
| **D5 Knowledge base** | `knowledge` (Announcements → Knowledge base) |
| **D6 Health Record** | `consultations`, `vaccinations`, `dispensings` |
| **D7 Audit Log** | `audit` (Analytics → System audit trail) |

## Feature map (proposal → system)

### Administrative platform
| # | Proposal feature | Where |
| --- | --- | --- |
| 1 | User authentication & role-based access control | Sign-in (Health Personnel tab), Staff & Roles, menus filtered by role |
| 2 | Real-time smart inventory management | Medicine Inventory → Central health office / Rolling Botika units, low-stock & expiry alerts |
| 3 | Digital beneficiary profiling & QR ID system | Residents: QR Health ID, scan/find by ID, walk-in registration, histories |
| 4 | Dispensing management with eligibility checking | Medicine Dispensing: eligibility panel, pharmacist verification, resident requests |
| 5 | Consultation management | Consultations |
| 6 | Vaccination management | Vaccinations |
| 7 | Health & medicine analytics | Analytics & Reports → Overview |
| 8 | Offline data synchronization | Works offline; changes queue on the device and sync when back online (header status) |
| 9 | Health mapping reports | Analytics → Health mapping (barangay-level, CSV export) |
| 10 | Smart deployment recommendation | Analytics → Deployment planner (+ medicine demand forecast, optional AI plan) |
| 11 | Audit trail | Analytics → System audit trail (every create/update/delete/sign-in) |
| 12 | Data backup and recovery | Settings → Backup & recovery (download, restore, automatic daily backups) |

### Resident platform
| # | Proposal feature | Where |
| --- | --- | --- |
| 1 | User authentication & resident verification | Sign-in (Resident tab) → register with ID upload → admin verifies |
| 2 | Online announcements | Announcements (All / Unread / Appointments / Advisories) |
| 3 | Service bulletin availability | Schedule → services per deployment |
| 4 | Notification & schedule alerts | Bell notifications, barangay alerts in Schedule |
| 5 | Medicine & service availability checker | Schedule → "Check medicine availability" |
| 6 | Appointment pre-booking | Appointment & E-Pila → Book Appointment / Request Medicine |
| 7 | Digital queue ticket (E-Pila) | Appointment & E-Pila → My E-Pila (staff "Call next" updates it live) |
| 8 | Beneficiary profiling & history tracking | Profile & QR ID, Health History |
| 9 | AI chatbot assistant | Ask SMILE (general information only; no diagnosis or prescription) |

## Suggested presentation flow

1. **Homepage** → programs, platforms, team.
2. **Resident** chip → Home → Schedule (check availability) → Appointment & E-Pila (book + request medicine, get a queue number) → Ask SMILE → Profile & QR ID.
3. **Administrator** chip → Residents (scan `SC-TAY-2024-018429`, verify Roberto Mendoza) → Dispensing (eligibility check, release) → Rolling Botika & E-Pila (Call next) → Analytics tabs → Settings (backup).
4. **Doctor** chip → appointment schedule on the dashboard, Medicine Inventory → Suppliers & orders → request medicine; then as **Administrator**, order it from a supplier and record the delivery (stock goes up).
5. **Pharmacist** chip → show the smaller, role-based menu.

## Tech stack

React 19 + TypeScript + Vite, built into a single `index.html`. Icons exported from the Figma file (`src/assets/icons`) plus `lucide-react`; QR codes via `qrcode`.

```bash
npm install
npm run dev      # local development server
npm run build    # outputs dist/index.html
```

The demo site is the `gh-pages` branch (a copy of `dist/index.html`).

## Notes and limitations

- Accounts and data are stored in the browser for demonstration; this prototype is not meant for real patient data.
- Ask SMILE gives general information from the medicine records. When hosted inside Claude it can use AI; on the public demo it uses built-in answers.
- Figma screens that weren't available (for example some mobile layouts) were designed in the same style.
