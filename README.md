# SMILECare

Health services management web app for the Taytay Municipal Health Office, built from the SMILECare Figma design.

**Live site (public):** https://vallecertobey17-coder.github.io/SMILECARE_FINAL/  
**Hosted app with shared database (claude.ai, share from its Share menu):** https://claude.ai/artifact/QvfkyC7hzBhYGbb8r8FqQB

The public site is deployed from the `gh-pages` branch (a copy of `dist/index.html`). To update it, run `npm run build` and replace `index.html` on that branch.

## Features

| Page | What it does |
| --- | --- |
| Home & Login | Public landing page, staff sign-in and account creation |
| Dashboard | Live KPIs, today's operations, inventory alerts, service quotas |
| Residents | Resident profiles, approve/reject verification, search & filters |
| Medicine Inventory | Stock levels, low-stock / expiring / expired status, restock |
| Health Services | Schedules, capacity, slot booking, status updates |
| Medicine Dispensing | Release medicines to residents (deducts stock automatically, blocks expired or insufficient stock) |
| Rolling Botika & E-Pila | Mobile units with live virtual queue ("Call next") |
| Analytics & Reports | KPIs vs last month, top services chart, audit trail, CSV/JSON export |
| Settings | Profile and data/sync status |

Responsive: a sidebar on desktop and a floating bottom tab bar on phones and tablets.

## Tech stack

- React 19 + TypeScript + Vite
- Icons exported from the Figma file (`src/assets/icons`) plus `lucide-react`
- Built as a single self-contained `index.html` (`vite-plugin-singlefile`)

## Data

- **Hosted on claude.ai:** records are stored in the artifact's shared database, so every staff member the page is shared with sees the same data live.
- **Anywhere else (e.g. `npm run dev`):** the app runs in offline demo mode with sample data saved in the browser's localStorage. Settings → *Reset demo data* restores it.

Staff sign-in accounts are stored per browser (passwords are salted SHA-256 hashes). This is a convenience lock, not server-side authentication. Real access control for the hosted app is who the page is shared with.

## Getting started

```bash
npm install
npm run dev      # local development server
npm run build    # outputs dist/index.html
npm run preview  # serve the production build
```

## Project structure

```
src/
  App.tsx              hash routing (#dashboard, #residents, ...) and auth gate
  config.ts            IT support contact details (fill these in) and municipality name
  index.css            design tokens and all styles
  lib/
    store.tsx          data layer: shared database, falling back to localStorage
    auth.ts            per-browser staff accounts
    seed.ts            sample records taken from the Figma screens
    types.ts, utils.ts
  components/          Layout (sidebar, header, bottom tab bar), Icon, shared UI
  pages/               one file per screen
```

## To do

- Fill in the real IT support email and phone in `src/config.ts`.
- The resident-facing "User" pages from the Figma file are not built yet.
