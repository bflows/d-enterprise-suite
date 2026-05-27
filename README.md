

<p align="center">
  <a href="https://www.builtbydaddy.com/"><img src="docs/assets/logo.png" alt="D Enterprise Suite logo" width="96" /></a>
</p>

<h1 align="center">D Enterprise Suite</h1>

<p align="center">
  Field-service platform — dispatch, jobs, customers, scheduling, invoicing, and technician workflows.<br />
  A faster, simpler replacement for Housecall Pro with a <strong>company-scoped</strong> data model for multi-brand growth.
</p>

<p align="center">
  <a href="https://www.builtbydaddy.com/"><strong>Live app</strong></a>
  ·
  <a href="https://daddy-enterprise-suite-b4806aedb585.herokuapp.com/">API</a>
  ·
  <a href="https://github.com/bflows/d-enterprise-suite/issues">Report issue</a>
</p>

<p align="center">
  <a href="https://github.com/bflows/d-enterprise-suite/actions/workflows/ci.yml"><img src="https://github.com/bflows/d-enterprise-suite/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status" /></a>
  <a href="https://www.builtbydaddy.com/"><img src="https://img.shields.io/website?down_color=red&down_message=offline&label=frontend&up_color=brightgreen&up_message=online&url=https%3A%2F%2Fd-enterprise-suite.vercel.app" alt="Frontend deploy status" /></a>
  <a href="https://daddy-enterprise-suite-b4806aedb585.herokuapp.com/"><img src="https://img.shields.io/website?down_color=red&down_message=offline&label=api&up_color=brightgreen&up_message=online&url=https%3A%2F%2Fdaddy-enterprise-suite-b4806aedb585.herokuapp.com" alt="API deploy status" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000" alt="React" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=fff" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=fff" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=fff" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=fff" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Redux_Toolkit-764ABC?logo=redux&logoColor=fff" alt="Redux Toolkit" />
</p>

<p align="center">
  <a href="https://www.builtbydaddy.com/"><img src="https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel&logoColor=fff" alt="Vercel" /></a>
  <a href="https://daddy-enterprise-suite-b4806aedb585.herokuapp.com/"><img src="https://img.shields.io/badge/deploy-Heroku-430098?logo=heroku&logoColor=fff" alt="Heroku" /></a>
  <img src="https://img.shields.io/badge/Stripe-integrated-635BFF?logo=stripe&logoColor=fff" alt="Stripe" />
  <img src="https://img.shields.io/badge/Twilio-SMS-F22F46?logo=twilio&logoColor=fff" alt="Twilio" />
  <img src="https://img.shields.io/badge/SendGrid-email-1A82E2?logo=sendgrid&logoColor=fff" alt="SendGrid" />
  <img src="https://img.shields.io/badge/Cloudinary-media-3448C5?logo=cloudinary&logoColor=fff" alt="Cloudinary" />
  <img src="https://img.shields.io/badge/Google_Maps-enabled-4285F4?logo=googlemaps&logoColor=fff" alt="Google Maps" />
</p>

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Documentation](#documentation)
- [License](#license)

## About

**Organization model**

- **Parent org** (Built By Daddy): owns multiple companies.
- **Company**: business unit with its own users, customers, service pricebook, jobs, invoices, and reporting.

The MVP UI defaults to a single company (Duct Daddy) with no company switcher, but the database, auth context, and APIs are scoped by `companyId` so additional companies can be added without a rewrite.

## Features

Capabilities reflected in the current codebase (not the full future MVP spec):

| Area | Status |
|------|--------|
| **Auth** | Email/password login, JWT access tokens, httpOnly refresh cookies, password reset, role-based UI |
| **Roles** | `admin`, `dispatcher`, `technician`, `employee` (per company) |
| **Dashboard** | Role-specific home (office vs technician) |
| **Customers** | Profiles, addresses, notes, job history, phone search |
| **Service pricebook** | Service book with categories and line items (prices in USD cents) |
| **Jobs** | Lifecycle (`SCHEDULED` → `EN_ROUTE` → `ON_SITE` → `COMPLETED` / `CANCELLED`), line items, photos (Cloudinary), activity timeline |
| **Scheduling** | Week view, technician assignment, availability windows, overlap rules |
| **Invoicing & payments** | Stripe invoices per job, card payments in UI, webhook sync for paid/void/overdue |
| **Notifications** | SendGrid job confirmation/reschedule emails; Twilio SMS (scheduled, en route, 24h reminder cron) |
| **Time cards** | Clock in/out for eligible roles |
| **Maps** | Google Maps helpers for addresses and schedule street view |
| **Employees** | Admin employee management |

Planned or partial (see [docs/ENTERPRISE_SUITE_FEATURE_MVP.md](docs/ENTERPRISE_SUITE_FEATURE_MVP.md)): dedicated reporting UI, payroll export, multi-company switcher, signatures, and other MVP checklist items.

## Tech Stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Redux Toolkit, Tailwind CSS 4, Stripe.js |
| **Backend** | Express 5, TypeScript, Prisma 7, PostgreSQL |
| **Auth** | JWT (access + refresh), httpOnly cookies, bcrypt |
| **Integrations** | Stripe, Twilio, SendGrid, Cloudinary, Google Maps |

## Repository Structure

```
d-enterprise-suite/
├── backend/                    # Express API
│   ├── prisma/
│   │   ├── schema.prisma       # Data model & migrations
│   │   └── migrations/
│   ├── generated/prisma/       # Prisma client output
│   └── src/
│       ├── server.ts           # App entry, route mounting, cron
│       ├── controllers/
│       ├── routes/
│       ├── services/           # Tokens, email, SMS, reminders
│       ├── middleware/
│       └── lib/                # Prisma, Stripe, Twilio, SendGrid, etc.
├── frontend/                   # Next.js App Router
│   ├── app/                    # Pages (auth + dashboard routes)
│   ├── components/
│   ├── features/               # Redux slices (auth, time card, …)
│   └── lib/api/                # API client & domain helpers
├── docs/                       # Product spec & architecture notes (may lag code)
└── README.md
```

### API routes

| Prefix | Domain |
|--------|--------|
| `/api/auth` | Login, refresh, logout, password reset |
| `/api/company` | Company & employment context |
| `/api/customer` | Customers |
| `/api/service` | Service book / pricebook |
| `/api/availability` | Technician weekly availability |
| `/api/jobs` | Jobs, photos, status, scheduling |
| `/api/invoices` | Stripe invoices & payments |
| `/api/time-cards` | Clock in/out |
| `/api/job-activity` | Job audit timeline |
| `/api/maps` | Geocoding / Maps proxy |
| `/api/stripe/webhook` | Stripe invoice webhooks (raw body) |

### Frontend routes

| Route | Description |
|-------|-------------|
| `/login`, `/forgot-password` | Auth |
| `/dashboard` | Home |
| `/schedule` | Dispatch calendar |
| `/customers`, `/customers/[customerId]` | Customer list & detail |
| `/services`, `/services/[slug]/…` | Pricebook |
| `/job/[slug]` | Job detail & actions |
| `/employees` | Employee management (admin) |
| `/timecards` | Time clock |
| `/inbox` | Company inbox |

## Prerequisites

- **Node.js** `^20.19.0`, `^22.12.0`, or `>=24.0.0` (see `backend/package.json` `engines`)
- **PostgreSQL** (local or hosted)
- **npm**

Optional for full functionality: Stripe, Twilio, SendGrid, Cloudinary, and Google Maps accounts with API keys.

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/bflows/d-enterprise-suite.git
cd d-enterprise-suite

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

**Backend** — create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
PORT=5000

JWT_ACCESS_SECRET="<long-random-string>"
JWT_REFRESH_SECRET="<different-long-random-string>"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY_DAYS=7

FRONTEND_URL="http://localhost:3000"
```

**Frontend** — create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

See [Configuration](#configuration) for optional integration variables.

### 3. Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
# Or for a quick schema sync in dev only: npx prisma db push
```

### 4. Run locally

**Terminal 1 — API:**

```bash
cd backend && npm run dev
```

**Terminal 2 — Web:**

```bash
cd frontend && npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:5000](http://localhost:5000) (or your `PORT`)

## Configuration

### Core

| Variable | App | Required | Description |
|----------|-----|----------|-------------|
| `DATABASE_URL` | Backend | Yes | PostgreSQL connection string |
| `PORT` | Backend | No | API port (default `5000`) |
| `JWT_ACCESS_SECRET` | Backend | Yes | Access token signing secret |
| `JWT_REFRESH_SECRET` | Backend | Yes | Refresh token signing secret |
| `JWT_ACCESS_EXPIRY` | Backend | No | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRY_DAYS` | Backend | No | Refresh session length in days (default `7`) |
| `FRONTEND_URL` | Backend | No | CORS origin (default `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Frontend | Dev | Browser API base URL (default `http://localhost:5000`) |
| `API_PROXY_URL` | Frontend | Prod | Backend URL for Next.js `/api/*` rewrites |
| `API_URL` | Frontend | No | Server-side API URL fallback for rewrites / SSR |
| `COOKIE_CROSS_SITE` | Backend | No | Set `false` to force `SameSite=Lax` in production |
| `REFRESH_COOKIE_SAME_SITE` | Backend | No | Override refresh cookie (`lax`, `none`, `strict`) |
| `APP_TIMEZONE` | Backend | Recommended | IANA timezone for job times, emails, and SMS (e.g. `America/Chicago`) |
| `NEXT_PUBLIC_APP_TIMEZONE` | Frontend | Recommended | Same IANA value as `APP_TIMEZONE` so the schedule shows correct local times |
| `NODE_ENV` | Backend | No | `production` enables secure cookies and trust proxy |

Do not commit secrets. Use your host’s secret manager or private env templates.

### Stripe (invoicing & card payments)

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_PUBLISH_KEY` | For card UI | Publishable key (exposed to frontend via API) |
| `STRIPE_DEFAULT_CURRENCY` | No | Default `usd` |
| `STRIPE_INVOICE_DAYS_UNTIL_DUE` | No | Invoice due days |

Webhook endpoint: `POST /api/stripe/webhook` (configure in Stripe Dashboard).

### Twilio (SMS)

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | For SMS | Account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Auth token |
| `TWILIO_MESSAGING_SERVICE_SID` | One of | Messaging service |
| `TWILIO_PHONE_NUMBER` or `TWILIO_FROM_NUMBER` | One of | E.164 sender |
| `JOB_24H_REMINDER_CRON` | No | Set `0` to disable reminder cron |
| `JOB_24H_REMINDER_CRON_SCHEDULE` | No | Cron expression override |

Manual reminder run: `cd backend && npm run job-reminders`

### SendGrid (email)

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | API key |
| `SENDGRID_FROM_EMAIL` | Verified sender |
| `SENDGRID_FROM_NAME` | Display name (default `Duct Daddy`) |
| `SENDGRID_REPLY_TO_EMAIL` | Optional reply-to |
| `SENDGRID_JOB_CONFIRMATION_TEMPLATE_ID` | Dynamic template for confirmations |
| `SENDGRID_JOB_RESCHEDULE_TEMPLATE_ID` | Dynamic template for reschedules |

### Cloudinary (job photos)

| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |

### Google Maps

| Variable | Description |
|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Maps / geocoding for schedule and addresses |

## Development

### Scripts

| Location | Command | Description |
|----------|---------|-------------|
| `backend` | `npm run dev` | API with hot reload (`nodemon` + `tsx`) |
| `backend` | `npm start` | Production API |
| `backend` | `npx prisma generate` | Regenerate Prisma client |
| `backend` | `npx prisma migrate dev` | Create/apply migrations (dev) |
| `backend` | `npx prisma db push` | Push schema without migration (dev only) |
| `frontend` | `npm run dev` | Next.js dev server |
| `frontend` | `npm run build` | Production build |
| `frontend` | `npm start` | Production Next.js server |
| `frontend` | `npm run lint` | ESLint |

### Auth in production (cross-origin)

The refresh token is an httpOnly cookie. If the browser calls the API on a **different domain** than the Next.js app (e.g. Vercel + Railway), prefer the built-in proxy:

1. **Frontend:** Set `API_PROXY_URL` to the backend URL. Do **not** set `NEXT_PUBLIC_API_URL` in production (the app uses same-origin `/api/*`, rewritten to the backend).
2. **Backend:** Set `FRONTEND_URL` to the exact frontend origin (scheme + host, no trailing slash).
3. Redeploy the frontend after changing `NEXT_PUBLIC_*` variables (baked in at build time).

If the API must be called directly from the browser on another host, use production cookie defaults (`SameSite=None; Secure`) or adjust `COOKIE_CROSS_SITE` / `REFRESH_COOKIE_SAME_SITE`.

## Production Deployment

| Surface | Host | URL |
|---------|------|-----|
| **Frontend** | Vercel | [d-enterprise-suite.vercel.app](https://www.builtbydaddy.com/) |
| **API** | Heroku | [daddy-enterprise-suite…herokuapp.com](https://daddy-enterprise-suite-b4806aedb585.herokuapp.com/) |

**Backend (Heroku)**

- `npm run heroku-postbuild` runs `prisma generate` and `prisma migrate deploy`.
- Set all required env vars on the host.
- Expose the Stripe webhook URL publicly.

**Frontend (Vercel)**

- Set `API_PROXY_URL` to the deployed Heroku API URL.
- Set `FRONTEND_URL` on the API to `https://www.builtbydaddy.com/` (exact origin, no trailing slash).

Deploy status badges in the header use live HTTP checks against these URLs.

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/ENTERPRISE_SUITE_FEATURE_MVP.md](docs/ENTERPRISE_SUITE_FEATURE_MVP.md) | Full MVP product requirements and go-live criteria |
| [docs/MVP_PROJECT_STRUCTURE.md](docs/MVP_PROJECT_STRUCTURE.md) | Planned module/route mapping (may be ahead of or behind the code) |

When in doubt, treat **this README and the repo tree** as the source of truth for what is implemented today.

## License

Proprietary — internal use only. All rights reserved.
