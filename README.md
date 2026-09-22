# PHOS Frontend

Next.js App Router UI for the PHOS clinic backend (`../phos-backend`).

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Ensure backend runs on port **4000** with `CORS_ORIGINS=http://localhost:3000`.

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

Default seed admin (from backend `.env`): see `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Phases

- **W0–W1**: foundation, API client, login, session
- **W2**: role sidebar, mobile menu, facility/department context, `/forbidden`
- **W3**: patient search, register, profile
- **W4**: reception — start visit, triage queue
- **W5**: nurse triage (`/nurse`, `/nurse/[encounterId]`)
- **W6**: doctor consultation (`/doctor`, `/doctor/[encounterId]`)
- **W7**: laboratory queue, orders, results, verify (`/laboratory`, `/laboratory/orders/[id]`)
- **W8**: pharmacy queue + dispense (`/pharmacy`, `/pharmacy/prescriptions/[id]`)
- **W9**: inventory stock, low/expiring, receive, adjust (`/inventory`)
- **W10**: billing — create/issue invoices (`/billing`, `/billing/invoices/[id]`)
- **W11**: cashier — payments & refunds (`/cashier`)
- **W12**: cash session open/close (`/reconciliation`)
- **W13**: notifications inbox, polling sync, sidebar unread badge (`/notifications`)
- **W14**: admin users & catalog (`/admin`), operational reports (`/reports`), audit placeholder (`/audit`)
- **W15**: network/offline banners, API error messages, error boundaries, consultation draft recovery

Contract notes: `docs/frontend-backend-contract.md`

## Deploy (Render + Vercel)

**Backend (Render)** — repo `phos-backend`, use `render.yaml` or manual Web Service:

- Build: `npm ci --include=dev && npm run build`
- Start: `npm run start:render` (runs migrations, then API)
- Health check: `/api/v1/health`
- Env: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥32 chars), `CORS_ORIGINS` = your Vercel site URL, `COOKIE_SECURE=true`
- One-time seed (Render Shell): `npx prisma db seed`

**Frontend (Vercel)** — import `phos-frontend`, framework Next.js:

- Env: `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api/v1`
- Redeploy after changing `NEXT_PUBLIC_*` variables.
