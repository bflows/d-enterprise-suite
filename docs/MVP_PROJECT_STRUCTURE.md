# Enterprise Suite MVP — Project Structure

This document maps the **MVP spec** to **backend modules**, **frontend routes/features**, and **data model**. It keeps the codebase company-scoped and ready for multi-company expansion while the UI defaults to Duct Daddy in v1.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Built By Daddy (Parent Org) — foundation only in MVP           │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ Duct Daddy│   │ HVAC Daddy│   │Plumb Daddy│  (future)
            │ (MVP)     │   │ (future)  │   │ (future)  │
            └───────────┘   └───────────┘   └───────────┘
                    │
    Per-company: users, customers, jobs, services, invoices,
                 payments, schedule, reporting, time tracking
```

- **Every core table is company-scoped** (`company_id` or via Employee → Company).
- **Roles are per-company** (Admin, Office/Dispatcher, Technician); permissions are hard-coded but checked against the user’s company context.
- **UI in MVP**: single company (Duct Daddy); no company switcher. Backend and DB stay company-aware.

---

## 2. MVP Section → Module Mapping

| MVP Section | Backend Module(s) | Frontend Feature(s) | Main Routes (App) |
|-------------|-------------------|---------------------|-------------------|
| **0) Companies** | `company` (existing) | `companies` (minimal) | Settings (admin) |
| **0.1–0.3) Customers, Jobs (data)** | `customers`, `jobs` | `customers`, `jobs` | `/customers`, `/jobs` |
| **1) Users & roles** | `auth`, `users`, `company` | `auth`, `users` | `/login`, `/users` |
| **1.2–1.3) Tech availability, user mgmt** | `users`, `availability` | `users`, `schedule` | `/users`, `/schedule` |
| **2) Customer management** | `customers` | `customers` | `/customers`, `/customers/[id]` |
| **3) Jobs / work orders** | `jobs` | `jobs` | `/jobs`, `/jobs/[id]`, `/jobs/new` |
| **4) Services / pricing** | `services` | `services` (pricebook) | `/services` |
| **5) Scheduling & dispatch** | `jobs`, `availability` | `schedule` | `/schedule` |
| **6) Technician mobile** | `jobs`, `auth` | `jobs`, `tech` | `/tech/today`, `/tech/job/[id]` |
| **7) Invoicing** | `invoices` | `invoices` | `/invoices`, `/invoices/[id]` |
| **8) Payments** | `payments` | `payments` (or under invoices) | `/invoices/[id]/payments` |
| **9) Reporting** | `reporting` | `reporting` | `/reports` |
| **10) Notifications** | `notifications` | (hooks + UI) | — |
| **11) Time tracking** | `time-tracking` | `time-tracking`, `reporting` | `/reports/payroll`, `/tech` |
| **12) Stability** | middleware, services, DB | — | — |

---

## 3. Backend Structure (Express + Prisma)

### 3.1 Folder Layout

```
backend/src/
├── server.ts                 # App entry, mount routes
├── lib/
│   └── prisma.ts            # Prisma client (existing)
├── middleware/
│   ├── auth.middleware.ts   # JWT/session, attach user (existing)
│   ├── company.middleware.ts # Resolve company (default Duct Daddy in MVP)
│   └── role.middleware.ts   # Require role (admin, dispatcher, technician)
├── constants/
│   └── roles.ts             # Role slugs (existing)
├── types/
│   └── express.d.ts         # Express augment (existing)
│
├── routes/                   # One file per domain
│   ├── auth.routes.ts       # login, refresh, logout (existing)
│   ├── company.routes.ts    # company CRUD / current (existing)
│   ├── user.routes.ts       # user CRUD, password reset, activate/deactivate
│   ├── customer.routes.ts   # customers, addresses, history
│   ├── job.routes.ts        # jobs CRUD, status, timeline, media
│   ├── service.routes.ts    # pricebook (catalog + line-item rules)
│   ├── schedule.routes.ts   # calendar, availability, assign/reassign
│   ├── invoice.routes.ts   # create from job, send, void
│   ├── payment.routes.ts   # record payment, receipts
│   ├── reporting.routes.ts # revenue, jobs completed, invoices, payroll
│   ├── notification.routes.ts # preferences, send (or internal only)
│   └── timeTracking.routes.ts # clock in/out, job actual times
│
├── controllers/              # Request/response; call services
│   ├── auth.controllers.ts  (existing)
│   ├── company.controllers.ts (existing)
│   ├── user.controllers.ts
│   ├── customer.controllers.ts
│   ├── job.controllers.ts
│   ├── service.controllers.ts
│   ├── schedule.controllers.ts
│   ├── invoice.controllers.ts
│   ├── payment.controllers.ts
│   ├── reporting.controllers.ts
│   ├── notification.controllers.ts
│   └── timeTracking.controllers.ts
│
├── services/                 # Business logic, validation, transactions
│   ├── token.service.ts     (existing)
│   ├── user.service.ts
│   ├── customer.service.ts
│   ├── job.service.ts
│   ├── service.service.ts   # pricebook + line-item rules
│   ├── schedule.service.ts  # availability, conflicts
│   ├── invoice.service.ts
│   ├── payment.service.ts
│   ├── reporting.service.ts
│   ├── notification.service.ts
│   ├── timeTracking.service.ts
│   └── audit.service.ts     # who changed what (12.2)
│
└── utils/                    # Pure helpers, error classes
    ├── errors.ts            # AppError, 401, 403, 404
    └── timezone.ts          # company timezone, UTC store (12.5)
```

### 3.2 Prisma Model Groups (Company-Scoped)

All of these either have `companyId` or are tied to company via a relation (e.g. Job → Customer → Company). Use **soft deletes** where specified (12.3).

| Domain | Models (to add or extend) | Company-Scoped | Notes |
|--------|----------------------------|----------------|-------|
| **Auth / Users** | User, RefreshSession, Employee, Role, Company | via Employee | Existing; add deactivatedAt, lastLogin |
| **Customers** | Customer, CustomerAddress | companyId on Customer | Lead source, phones, addresses |
| **Jobs** | Job, JobServiceLineItem, JobStatusHistory, JobNote, JobMedia | companyId on Job | States (Draft→Paid), timeline, soft delete |
| **Services** | Service (pricebook) | companyId | name, flat price, active; soft delete |
| **Scheduling** | (Job + TechnicianAvailability or AvailabilitySlot) | — | Restrict by tech availability |
| **Invoices** | Invoice, InvoiceLineItem | companyId | From job; unit_price snapshot; status Draft/Sent/Paid/Voided |
| **Payments** | Payment | companyId | invoiceId, method, amount, transactionId (card), receipt |
| **Time tracking** | TimeClockEntry, (Job.actualStart/actualEnd) | companyId / job.companyId | Payroll-ready; edit log |
| **Audit** | AuditLog or ActivityLog | companyId | Who changed what (12.2) |

- **Pricing integrity (4.4)**: Store `unitPrice` (and discount) on `JobServiceLineItem` and `InvoiceLineItem` at creation time; do not change historical rows when catalog price changes.
- **Technician availability (1.2, 5.2)**: Model weekly slots or start/end per day; schedule service checks against these unless admin override.

---

## 4. Frontend Structure (Next.js App Router + Features)

### 4.1 Route Layout (app/)

```
app/
├── layout.tsx                 # Root layout, Redux Provider, auth state
├── page.tsx                   # Landing or redirect to /dashboard or /login
├── globals.css
│
├── (auth)/                    # Unauthenticated
│   ├── layout.tsx             # Centered card layout
│   ├── login/page.tsx
│   └── forgot-password/page.tsx
│
├── (dashboard)/               # Office / Admin — sidebar + main content
│   ├── layout.tsx             # Sidebar, Header, company context (Duct Daddy)
│   ├── dashboard/page.tsx     # Home / overview
│   ├── customers/
│   │   ├── page.tsx           # List, search (phone), quick create
│   │   ├── new/page.tsx       # Quick create (name + phone)
│   │   └── [id]/page.tsx     # Profile, addresses, job/invoice history
│   ├── jobs/
│   │   ├── page.tsx           # List, filters (status, tech, date)
│   │   ├── new/page.tsx      # Create job (customer, address, tech, time)
│   │   └── [id]/page.tsx     # Detail, timeline, notes, media, status
│   ├── schedule/
│   │   └── page.tsx          # Week view, tech columns, drag-drop
│   ├── services/
│   │   └── page.tsx          # Pricebook (name, price, active)
│   ├── invoices/
│   │   ├── page.tsx          # List (paid/unpaid)
│   │   └── [id]/page.tsx    # Detail, edit, send, record payment
│   ├── reports/
│   │   ├── page.tsx          # Revenue, jobs completed, invoices
│   │   └── payroll/page.tsx  # Hours by tech, CSV export
│   ├── users/                 # Admin (and dispatcher for office users)
│   │   └── page.tsx          # List, create, edit, activate/deactivate
│   └── settings/              # Admin
│       └── page.tsx          # Company info, timezone (12.5)
│
└── (tech)/                    # Technician — mobile-first
    ├── layout.tsx             # Bottom nav or simple header
    ├── today/page.tsx         # Today’s jobs list
    ├── job/[id]/page.tsx     # Job detail, status, line items, photos, signature
    └── time-clock/page.tsx   # Clock in/out (11.2)
```

- **Role-based access**: In dashboard layout, restrict menu and routes by role (Admin vs Office vs Technician). Technicians can be redirected to `(tech)` or see a simplified dashboard.
- **Company context**: One company (Duct Daddy) in MVP; store in Redux or context and send as `companyId` (or default header) on every API call.

### 4.2 Features (features/)

Align with backend domains and the table in §2:

```
features/
├── auth/           # Login, logout, session, password reset
├── users/          # User list, create/edit, roles, activate/deactivate
├── companies/      # Current company (minimal; settings in MVP)
├── customers/      # CRUD, search, addresses, history
├── jobs/           # CRUD, status, timeline, notes, media
├── schedule/       # Week calendar, assign/reassign, availability
├── services/       # Pricebook CRUD, active/inactive
├── invoices/       # Create from job, edit, send, void
├── payments/       # Record payment, methods, receipts
├── reporting/      # Revenue, jobs completed, invoices, payroll export
├── notifications/  # Preferences, in-app (toast/badge)
└── time-tracking/  # Time clock, job actual times (for payroll)
```

Each feature can have: `components/`, `api/` (or use `lib/api/endpoints`), `hooks/`, `types.ts`, `constants.ts` as needed.

### 4.3 Shared Code (existing pattern)

- **components/** — `ui/`, `forms/`, `layout/`, `feedback/`
- **lib/api/** — Axios instance, interceptors; optional `endpoints/customers.ts`, `jobs.ts`, etc.
- **store/** — Slices: auth, company (current), ui; typed hooks
- **types/** — Shared API/domain types (Customer, Job, Invoice, etc.)
- **constants/** — Routes, role slugs, job statuses, invoice statuses

---

## 5. Cross-Cutting (Stability — §12)

| Requirement | Backend | Frontend |
|-------------|---------|----------|
| **12.1 Company-scoped** | Every core model has companyId or link to company; middleware sets company context | Default company (Duct Daddy); all API calls in company context |
| **12.2 Audit** | audit.service + AuditLog; log schedule, price override, status, payment | — |
| **12.3 Soft deletes** | deletedAt or isActive on customers, jobs, services, invoices | Filter out deleted where appropriate; admin “show inactive” |
| **12.4 Validation** | Services: complete job rules, no invoice without services, no negative totals, payment &gt; balance | Same validations in forms; disable actions when invalid |
| **12.5 Timezone** | Store UTC; company timezone in Company; format in API or frontend | Display in company timezone; use lib/utils/datetime |
| **12.6 Backups** | Daily backups + doc in README or ops runbook | — |
| **12.7 Errors** | Centralized logger, health check route, log failed notifications/payments | Error boundaries, toast on fail, retry where appropriate |

---

## 6. Suggested Build Order (MVP 1.0)

Phases that respect dependencies and get you to “replace Housecall Pro” without big rework:

1. **Foundation**  
   - Company middleware (resolve company for request).  
   - Role middleware (require admin / dispatcher / technician).  
   - Extend Prisma: Customer, CustomerAddress, Job, JobServiceLineItem, JobStatusHistory, Service, Invoice, InvoiceLineItem, Payment, TimeClockEntry, AuditLog (or minimal activity table).  
   - Soft deletes and companyId everywhere.

2. **Customers & jobs (core)**  
   - Backend: customers + addresses, jobs + status + timeline.  
   - Frontend: customers list/detail/new, jobs list/detail/new.  
   - Enforce: job requires customer and service address; status flow.

3. **Services & pricing**  
   - Pricebook (Service); line items on job with unit price snapshot; discount/minimum/dryer add-on rules in service layer.

4. **Scheduling**  
   - Technician availability model and API; schedule (week) API; drag-drop or form to assign/reassign and set time window.  
   - Frontend: schedule page, conflict/availability checks.

5. **Technician experience**  
   - Tech routes and layout; today’s jobs; job detail (status, line items, notes, photos, signature).  
   - Completion rules: at least one line item, quantities, signature.  
   - actual_start / actual_end and status sync.

6. **Invoicing & payments**  
   - Invoice from completed job; copy line items with stored unit price; send (email/text); record payments (card/cash/check); partial payments; receipts.  
   - Validation: no negative totals; payment &gt; balance only with admin override.

7. **Reporting & time tracking**  
   - Revenue by service/tech; jobs completed; paid/unpaid invoices; payroll (hours by tech, CSV).  
   - Time clock (clock in/out) and job actual times with edit log.

8. **Notifications & polish**  
   - Tech: job assigned, schedule change.  
   - Office: job completed, payment received.  
   - Error handling, health check, backups doc.

---

## 7. MVP 1.0 Acceptance Checklist (from spec §15)

Use this as a go-live gate:

- **Office**: create customer + job + schedule in &lt; 1 min; schedule respects tech availability; live job statuses; invoice and record payment without manual math.  
- **Techs**: view today’s jobs; update statuses; edit quantities; upload photos; capture signature; complete job reliably.  
- **Owners**: revenue + jobs completed; export payroll hours.  
- **System**: historical accuracy (prices, invoices); audit of key actions; recovery path and error handling.

This structure keeps the **Enterprise Suite** company-scoped and ready for multiple companies and trades while you ship the Duct Daddy MVP.
