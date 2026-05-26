# D Enterprise Suite

Full-stack monorepo for the **Enterprise Suite MVP**: a faster, simpler replacement for Housecall Pro that office staff can use while on calls and technicians can use in the field, with a data model ready for multiple companies and trades later.

---

## Overview

**Core goal:** Replace Housecall Pro with a single system where office can dispatch and invoice quickly, and techs can manage jobs, update status, capture signatures, and sync in near real time — while the foundation supports multiple companies under one parent org (e.g. Duct Daddy now, HVAC Daddy / Plumb Daddy later).

**Organization model:**

- **Parent (Built By Daddy):** owns multiple companies.
- **Company:** business unit with its own services/pricebook, technicians & schedule, customers, jobs, invoices, payments, and reporting.

**MVP rule:** The UI can default to one company (e.g. Duct Daddy) with no company switcher in v1, but the database and permissions are **company-scoped** so we don’t rewrite when adding more companies.

**MVP scope (1.0):**

- **Companies & users** — Company profile (name, industry); users with roles (Admin, Office/Dispatcher, Technician); secure login; password reset; technician availability windows.
- **Customers** — Profiles (name, phones, email, notes); multiple service addresses; phone search; quick create; job and invoice history.
- **Jobs / work orders** — Full lifecycle (Draft → New → Scheduled → En Route → On Site → Completed → Invoiced → Paid / Cancelled); assigned tech; scheduled vs actual times; internal/tech notes; photos; timeline/audit; services completion tracker, quantities, and customer signature.
- **Services & pricing** — Company pricebook (name, flat price, quantity, active); job line items with unit price captured at job time (historical accuracy); discounts; admin overrides; minimum job pricing.
- **Scheduling & dispatch** — Week view by technician; drag-and-drop; availability and overlap rules; assign/reassign tech and time window.
- **Technician experience** — Mobile-first; today’s jobs; job details (customer, address, line items, notes, photos); status updates (Scheduled → En Route → On Site → Completed) synced to office.
- **Invoicing** — Invoice from completed job; line items from job; draft/sent/paid/void; preview; send by email/text; admin edits before send.
- **Payments** — Card, cash, check; partial payments; receipts; stored transaction/reference and recorded-by for stability.
- **Reporting** — Revenue by service/tech; jobs completed by service/tech; paid/unpaid invoices; payroll-ready hours (time clock + job actuals, CSV export).
- **Stability** — Company-scoped data; audit/activity logging; soft deletes; validation guardrails; timezone handling; backups; error handling and health checks.

**Go-live gate:** Office can create customer + job + schedule in under a minute, see live job status, and invoice/record payment; techs can view jobs, update status, edit quantities, upload photos, capture signature, and complete jobs reliably; owners get revenue and jobs-completed reporting plus payroll hour export; system preserves history, logs key actions, and recovers without data loss.

---

## Tech Stack

| Layer    | Technologies |
| -------- | ------------ |
| **Frontend** | Next.js 16, React 19, TypeScript, Redux Toolkit, Tailwind CSS |
| **Backend**  | Express 5, TypeScript, Prisma 7, PostgreSQL |
| **Auth**     | JWT (access + refresh), httpOnly cookies, bcrypt |

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** (local or hosted; connection string required)
- **npm** (included with Node.js)

---

## Getting Started

### 1. Clone and install

```bash
git clone <repository-url>
cd d-enterprise-suite
```

Install dependencies for both apps:

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Environment variables

**Backend** (`backend/.env`):

Create `backend/.env` with:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=..."
PORT=5000

JWT_ACCESS_SECRET="<long-random-string>"
JWT_REFRESH_SECRET="<different-long-random-string>"
REFRESH_EXPIRY_DAYS=14

# Allowed origin for CORS (frontend URL)
FRONTEND_URL="http://localhost:3000"
```

**Frontend** (`frontend/.env.local`):

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

Use your actual backend URL in production.

**Production auth (stay signed in after refresh):** The refresh token is an httpOnly cookie. If the browser talks to the API on a **different domain** than the Next.js app (e.g. Vercel + Railway), cookies often fail on reload. Prefer the built-in proxy:

1. **Frontend (e.g. Vercel):** Set `API_PROXY_URL` to your backend URL (e.g. `https://your-api.railway.app`). **Do not** set `NEXT_PUBLIC_API_URL` in production (the app will call same-origin `/api/*`, proxied to the backend).
2. **Backend:** Set `FRONTEND_URL` to your live frontend URL exactly (scheme + host, no trailing slash), e.g. `https://your-app.vercel.app`.
3. Redeploy the frontend after changing env vars (`NEXT_PUBLIC_*` is baked in at build time).

If you must call the API host directly from the browser, set `COOKIE_CROSS_SITE=false` only when frontend and API share a site; otherwise leave production defaults (`SameSite=None; Secure` on the refresh cookie). Override with `REFRESH_COOKIE_SAME_SITE` if needed.

### 3. Database

From the repo root:

```bash
cd backend
npx prisma generate
npx prisma db push
# Or, for migrations: npx prisma migrate dev
cd ..
```

### 4. Run development servers

**Terminal 1 – API:**

```bash
cd backend && npm run dev
```

**Terminal 2 – Frontend:**

```bash
cd frontend && npm run dev
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)  
- **API:** [http://localhost:5000](http://localhost:5000) (or whatever `PORT` is in `backend/.env`)

---

## Project Structure

```
d-enterprise-suite/
├── backend/                 # Express API
│   ├── prisma/
│   │   └── schema.prisma    # DB models & migrations
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── lib/
│       └── server.ts
├── frontend/                # Next.js app
│   ├── app/                 # App Router pages & layouts
│   ├── components/
│   ├── features/            # Redux slices & auth
│   └── lib/                 # API client, auth helpers
└── README.md
```

---

## Scripts

| Location   | Command       | Description              |
| --------- | ------------- | ------------------------ |
| `backend` | `npm run dev` | API with hot reload       |
| `backend` | `npm start`   | Production API            |
| `backend` | `npx prisma generate` | Regenerate Prisma client |
| `backend` | `npx prisma db push`  | Sync schema to DB (dev)  |
| `frontend`| `npm run dev` | Next.js dev server       |
| `frontend`| `npm run build` | Production build       |
| `frontend`| `npm start`   | Production Next.js       |
| `frontend`| `npm run lint`| ESLint                   |

---

## Environment Variables Reference

| Variable             | App     | Required | Description |
| -------------------- | ------- | -------- | ----------- |
| `DATABASE_URL`       | Backend | Yes      | PostgreSQL connection string |
| `PORT`               | Backend | No       | API port (default `5000`) |
| `JWT_ACCESS_SECRET`  | Backend | Yes      | Secret for access tokens   |
| `JWT_REFRESH_SECRET` | Backend | Yes      | Secret for refresh tokens  |
| `REFRESH_EXPIRY_DAYS`| Backend | No       | Refresh token TTL in days (default `14`) |
| `FRONTEND_URL`       | Backend | No       | CORS origin (default `http://localhost:3000`) |
| `API_PROXY_URL`      | Frontend| No       | Backend URL for Next.js `/api/*` rewrites (production) |
| `API_URL`            | Frontend| No       | Server-side API URL fallback for rewrites / SSR |
| `NEXT_PUBLIC_API_URL`| Frontend| No       | Direct API URL in the browser (dev default `http://localhost:5000`; omit in prod to use proxy) |
| `COOKIE_CROSS_SITE`  | Backend | No       | Set `false` to force `SameSite=Lax` in production |
| `REFRESH_COOKIE_SAME_SITE` | Backend | No | Override refresh cookie SameSite (`lax`, `none`, `strict`) |

Do not commit real secrets. Use a secret manager or team-shared env templates for private deployment.

---

## License

Proprietary — internal use only. All rights reserved.
