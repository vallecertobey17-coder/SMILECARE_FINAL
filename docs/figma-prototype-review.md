# SMILECare Figma prototype – accuracy review (Nov 15, 2026)

Figma file: https://www.figma.com/design/XXXumgF8uHsZDSWIcZTqIM/SMILECARE
Reference: the live site (vallecertobey17-coder.github.io/SMILECARE_FINAL) and its source code (`src/lib/auth.ts` ROLE_ACCESS).

Every screen below was captured from the running site (demo data, signed in with the real demo account for each role), so the copy, numbers, sidebars and buttons are exactly what that role sees. Nothing was drawn by hand.

## 1. Summary of corrections

| # | Problem in the previous prototype | Correction |
|---|---|---|
| 1 | Only Resident and Administrator existed; every staff screen showed the admin sidebar and the "Juan Santos – Administrator" chip | Added complete screen sets for **Municipal Health Doctor (15)**, **Pharmacist (12)** and **Rolling Botika Staff (9)** on desktop and mobile. Each has its own sidebar/bottom nav, its own user chip, its own dashboard quick actions, and only the pages it is allowed by `ROLE_ACCESS` |
| 2 | The Doctor dashboard looked like the admin one | The Doctor dashboard now has **My appointment schedule** (only Doctors get it), and quick actions Record consultation / Record vaccination / Register walk-in / Post announcement / Load Rolling Botika |
| 3 | Restricted pages were reachable for every role | Role links only go to pages that role has: the Doctor has no Dispensing, Rolling Botika, Staff & roles. The Pharmacist has no Services, Consultations, Vaccinations, Announcements or Staff. Botika Staff has no Services, Vaccinations, Announcements, Analytics or Staff. A link whose page the role cannot open was not created |
| 4 | Mobile menu drawer listed admin pages for every role | New **role-specific menu drawers** (Doctor, Pharmacist, Botika Staff) with only that role's items plus Settings |
| 5 | Workflows jumped straight from the start to the end (no intermediate states) | 44 step-by-step states per device (see §3), all linked in order |
| 6 | Sign-in had no validation or filled states; demo-role chips all went to the admin dashboard | Sign-in: empty → **"missing details" error** → filled → dashboard. Demo chips Resident / Administrator / Doctor / Pharmacist / Rolling Botika Staff each open that role's dashboard |
| 7 | Health Personnel / Resident tabs on the sign-in screens signed you in as the wrong user type | Fixed: each tab's "Sign in securely" goes to the matching validation state |
| 8 | Row "•••" menus (resident verification, inventory, supplier orders) were not visible in captures | Re-captured with the menu open in its real position, in front of the table |
| 9 | Inventory stat icon showed as a black square | Replaced with the real pill icon |
| 10 | Mobile analytics: "System audit trail" tab was off-screen and unreachable for Doctor/Pharmacist | Tab row made horizontally scrollable and the tab linked |
| 11 | "Staff" naming hid that these screens are the Administrator's | Renamed to **Administrator** on all pages |

## 2. Prototype structure (page "4. Interactive Prototype")

Flow starting points (Present ▶ and pick one):

1–6 Desktop: Public website · Resident · Administrator · Doctor · Pharmacist · Rolling Botika Staff
7–12 Mobile: same six
Workflows: Staff sign-in & role selection · Resident sign-in/registration/forgot password · Book appointment / request medicine / E-Pila · Resident verification · Medicine dispensing · Supply requirement & supplier order · Record consultation · Call next E-Pila number

QA results:
- 274 prototype frames. Every one is reachable from a starting point.
- No screen is a dead end (every screen has at least one way out).
- No link points to a missing frame.
- New links added this pass: about 1,180 on desktop and 540 on mobile, including all workflow steps.

## 3. Workflows now represented (desktop + mobile)

| Workflow | States |
|---|---|
| Resident sign-in | Sign in → Error: missing details → Filled → Resident home |
| Staff sign-in | Sign in (Staff) → Error → Filled → Administrator dashboard; demo chips → each role dashboard |
| Registration | Create account → Filled → Home – Pending verification |
| Forgot password | Sign in → Forgot password → Back to sign in |
| Book appointment | Appointment & E-Pila → service type chosen → choose a service → pick a time → review → request received |
| Request medicine | request chosen → choose pickup → review order → request received |
| E-Pila | My E-Pila tab → site chosen → your ticket → Leave queue (back to tab) |
| Ask SMILE | Question typed → Answer |
| Nearest Rolling Botika | Location chosen → nearest unit → medicine availability expanded |
| Edit profile | Editing → Profile saved |
| Resident verification (Admin) | Residents → row actions open → pending resident profile → **Resident verified**; or → **Reject verification dialog** |
| Medicine dispensing (Pharmacist) | Dispense medicine form → Eligible for release → **Medicine released**; out-of-stock path → **Not eligible** (switch medicine to go back) |
| Inventory / supply (Admin) | Row actions; Suppliers & orders → New requirement → filled → **Requirement submitted** → order actions → Order from supplier → **Order sent** |
| Record consultation (Doctor) | Record consultation → details → **Consultation saved** |
| Call next (Botika Staff) | Rolling Botika & E-Pila → **Next number called** |

## 4. Screen-by-screen comparison (new role screens, desktop; mobile identical set)

Columns: Figma frame · live-site source · matches live content · correct role chrome · linked in prototype

| Figma frame | Live source | Content | Role chrome | Linked |
|---|---|---|---|---|
| Doctor / Dashboard | #dashboard as Doctor | ✅ | ✅ | ✅ |
| Doctor / Residents | #residents as Doctor | ✅ | ✅ | ✅ |
| Doctor / Medicine inventory | #inventory as Doctor | ✅ | ✅ | ✅ |
| Doctor / Medicine inventory – Tab: Rolling Botika units | #inventory (tab click) as Doctor | ✅ | ✅ | ✅ |
| Doctor / Medicine inventory – Tab: Suppliers & orders | #inventory (tab click) as Doctor | ✅ | ✅ | ✅ |
| Doctor / Health services | #services as Doctor | ✅ | ✅ | ✅ |
| Doctor / Health services – Tab: Appointments | #services (tab click) as Doctor | ✅ | ✅ | ✅ |
| Doctor / Consultations | #consultations as Doctor | ✅ | ✅ | ✅ |
| Doctor / Vaccinations | #vaccinations as Doctor | ✅ | ✅ | ✅ |
| Doctor / Announcements | #announcements as Doctor | ✅ | ✅ | ✅ |
| Doctor / Analytics & reports | #analytics as Doctor | ✅ | ✅ | ✅ |
| Doctor / Analytics & reports – Tab: Health mapping | #analytics (tab click) as Doctor | ✅ | ✅ | ✅ |
| Doctor / Analytics & reports – Tab: Deployment planner | #analytics (tab click) as Doctor | ✅ | ✅ | ✅ |
| Doctor / Analytics & reports – Tab: System audit trail | #analytics (tab click) as Doctor | ✅ | ✅ | ✅ |
| Doctor / Settings | #preferences as Doctor | ✅ | ✅ | ✅ |
| Pharmacist / Dashboard | #dashboard as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Residents | #residents as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Medicine inventory | #inventory as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Medicine inventory – Tab: Rolling Botika units | #inventory (tab click) as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Medicine inventory – Tab: Suppliers & orders | #inventory (tab click) as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Medicine dispensing | #dispensing as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Rolling Botika & E-Pila | #botika as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Analytics & reports | #analytics as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Analytics & reports – Tab: Health mapping | #analytics (tab click) as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Analytics & reports – Tab: Deployment planner | #analytics (tab click) as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Analytics & reports – Tab: System audit trail | #analytics (tab click) as Pharmacist | ✅ | ✅ | ✅ |
| Pharmacist / Settings | #preferences as Pharmacist | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Dashboard | #dashboard as Rolling Botika Staff | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Residents | #residents as Rolling Botika Staff | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Medicine inventory | #inventory as Rolling Botika Staff | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Medicine inventory – Tab: Rolling Botika units | #inventory (tab click) as Rolling Botika Staff | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Medicine inventory – Tab: Suppliers & orders | #inventory (tab click) as Rolling Botika Staff | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Medicine dispensing | #dispensing as Rolling Botika Staff | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Consultations | #consultations as Rolling Botika Staff | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Rolling Botika & E-Pila | #botika as Rolling Botika Staff | ✅ | ✅ | ✅ |
| Rolling Botika Staff / Settings | #preferences as Rolling Botika Staff | ✅ | ✅ | ✅ |

Workflow frames (all captured from the live site at that step, all linked in sequence): see §3. The existing Public, Resident and Administrator screens from the previous pass were already captured from the live site. They are unchanged apart from the sign-in fixes and the Administrator rename.

## 5. Could not be inspected or fully represented

- **Free typing and real data changes.** Figma cannot accept input or store data. Typed values, saved records, stock deductions and queue numbers are shown as captured "after" states, not live updates.
- **Native dropdown lists** (barangay, medicine, unit selects) can't open in Figma. Clicking the field goes straight to the "selected" state.
- **Demo-role chips** fill credentials on the real site. In the prototype they go straight to that role's dashboard.
- **Modal forms for Doctor / Pharmacist / Botika Staff** other than the captured workflows. Examples: Record vaccination, New medicine, Add stock, Add unit, Post announcement for non-admin roles. Those buttons are not linked for those roles, so they never fall back to admin-chrome screens. The Administrator versions of these modals exist.
- **Row "•••" menus** on pages other than residents, inventory and supplier orders are not captured, so those buttons do nothing.
- **Pagination, filters, search and sort** (Filters, Previous/Next, Oldest first) are not represented.
- **Leaflet health map** is a static capture: no pan or zoom.
- **Ask SMILE** shows one captured question and answer. It is not a live chatbot.
- **Downloads, CSV export, print, backup/restore and "Reset demo data"** have no file output. Restore and Reset are shown as their confirmation dialogs only.
- **Offline behaviour, session timeout, toasts that auto-dismiss, and hover/focus animations** are not represented.
- **Mobile public header menu** was not captured.
- **Forgot password** shows the form only: no email is sent and there is no reset-link state.
- **On mobile, the row "•••" buttons sit off-screen** in horizontally scrolling tables. The matching row cells are linked instead.
- **The new role and workflow screens are editable layers but not yet componentized.** Their sidebar, header and bottom nav are plain frames, not instances of the design-system chrome components. The original Resident and Administrator screens keep their component instances.
