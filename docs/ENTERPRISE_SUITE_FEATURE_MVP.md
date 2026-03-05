# Enterprise Suite MVP

### Core Goal

Replace Housecall Pro with a faster, simpler system that office staff can use while answering calls and techs can use in the field — while the underlying structure is ready for multiple companies and trades later.

---

# 0) Definitions

### Organization (Parent)

- **Built By Daddy** is the parent org.
- It owns multiple companies (Duct Daddy now, HVAC Daddy / Plumb Daddy later).

### Company (Child)

- A company is a business unit with its own:
    - services/pricebook
    - technicians & schedule
    - invoices/payments
    - reporting

### MVP Rule

- UI can **default to Duct Daddy** (no company switching required in v1), but the database and permissions must be **company-aware** so we don’t rewrite later.

---

# 0.1) Companies

- Business Name
- Industry
- Employees
- Customers
- Services
- Jobs
- Invoices
- Payments

# 0.2) Customers

- First name
- Last name
- Display name
- Email
- Mobile phone
- Home phone
- Work phone
- Lead Source
- Address
- Company

# 0.3) Jobs

- Customer
- Start/end Date
- Start/end Time
- Technician Assigned
- Services
- Private notes
- Lead source

# 1) Users

# 

## 1.1 User Types

- Admin users
- Office / Dispatcher users
- Technician users

## 1.2 Technician Availability

- Availability schedule per technician (M–F 8AM–4PM)
- Used to restrict scheduling:
    - cannot schedule outside availability unless admin override

## 1.3 User Management

- Create / edit users
- Activate / deactivate users
- Assign role per user
- Password reset
- Secure login

## 1.4 Role-Based Permissions (Simple, Stable)

Hard-coded role permissions are fine for MVP, but **must be company-scoped**:

- Admin: all access (company-level)
- Office: customers, jobs, schedule, invoices, payments, reporting
- Technician: only assigned jobs + time tracking

---

# 2) Customer Management

## 2.1 Customer Profile Fields

- Name
- Primary phone number
- Email (optional)
- Customer notes

## 2.2 Search & Quick Create

- Phone number search (primary lookup)
- Quick-create customer (name + phone only)

## 2.3 Service Address Management

- Customers can have **multiple service addresses**
- Address fields:
    - address line 1/2, city, state, zip
    - address notes (gate code, pets, parking, etc.)

## 2.4 Customer History

- Customer job history
- Customer invoice history
- (Recommended for stability) customer payment history view

---

# 3) Jobs / Work Orders

## 3.1 Create Jobs

A job must include:

- Customer
- Service address
- Assigned technician (or unassigned in Draft/New)
- Scheduled date & time window (restricted by technician availability)

## 3.2 Job States (Complete + Real World)

- Draft (not on schedule)
- New
- Scheduled
- En Route
- On Site
- Completed
- Invoiced
- Paid
- Cancelled

## 3.3 Job Notes & Media

- Internal notes (office only)
- Tech notes
- Photo attachments (before/after/other)
- Job timeline/history (activity feed)

## 3.4 Job Timeline (Stability Requirement)

Log these events automatically:

- Created
- Scheduled / rescheduled (old → new)
- Assigned tech changes
- Status changes
- Price overrides
- Invoice sent
- Payment recorded
- Cancelled (with reason)

---

# 4) Services / Pricing (Line-Item Based)

## 4.1 Service Catalog (Pricebook)

Services are line items added to jobs.

### Service Fields

- Name
- Flat price
- Quantity
- Active / inactive toggle

## 4.2 Job Service Line Items

Each job contains its own service line items.

Each line item includes:

- Reference to service catalog item
- Quantity
- Unit price (copied at time of job/invoice)
- Discount (line-level)
- Line total

## 4.3 Pricing Rules (Duct Daddy MVP)

- Auto-calc totals
- Admin-only price override
- Discounts:
    - flat $ __enter amount
    - 10%
- Minimum job pricing (configurable)
- Dryer vent add-on pricing when combined with duct cleaning

## 4.4 Pricing Integrity (Critical)

- Historical accuracy: changing the catalog price **must not change old invoices**
- Store unit_price on the Job line item (and/or Invoice line item) at time of creation

---

# 5) Scheduling & Dispatch

## 5.1 Calendar (Week View)

- Technician-based scheduling columns
- Drag and drop jobs
- Job status visibility on the calendar card

## 5.2 Scheduling Rules

- Enforce technician availability
- Prevent overlaps (warn + admin override option)
- Allow reschedule while keeping job history intact

## 5.3 Dispatch Must-Haves

- Assign tech to job
- Reassign tech
- Adjust time window
- View job details quickly from schedule

---

# 6) Technician Mobile Experience

## 6.1 Technician Login

- Secure login
- Mobile-first UI (PWA or native is fine; must work well on phones)

## 6.2 Today’s Jobs

- List view of assigned jobs
- Clear statuses + scheduled window

## 6.3 Job Details View

- Customer name & phone (tap-to-call)
- Address (tap-to-navigate)
- Service line items (add, remove, modify quantity)
- Notes per service
- Upload photos (before/after/other)

## 6.4 Job Status Updates

- Scheduled → En Route → On Site → Completed
- Must sync to office schedule in near real time

## 6.5 Completion Requirements (No Half-Finished Jobs)

To mark job “Completed”:

- Must have at least 1 service line item
- Must have required quantities entered
- Must capture customer signature (custom signature capture)

---

# 7) Invoicing (Fill This In for 1.0)

## 7.1 Invoice Creation

- Invoice generated from Completed job
- Invoice contains invoice line items copied from job service line items

## 7.2 Invoice Fields

- Subtotal
- Discounts
- Tax
- Total
- Status:
    - Draft
    - Sent
    - Paid
    - Voided (record-only)

## 7.3 Invoice Actions

- Preview invoice
- Edit invoice (admin only) prior to sending:
    - adjust quantities
    - adjust pricing
    - add discount
- Send invoice via:
    - email
    - text

---

# 8) Payments

## 8.1 Payment Methods

- Credit & debit cards
- Cash
- Check

## 8.2 Partial Payments

- Support multiple payments per invoice
- Invoice becomes Paid when sum(payments) >= invoice total

## 8.3 Receipts

- Send receipt via email / phone (text)
- Store receipt record in invoice + customer history

## 8.4 Payment Stability Requirements

- Card payments must store:
    - transaction id
    - amount
    - timestamp
    - status (succeeded/failed/refunded)
- Cash/check must store:
    - amount
    - reference (check # optional)
    - recorded_by user

---

# 9) Reporting

## 9.1 Revenue

- Revenue by service
- Revenue by tech

## 9.2 Jobs Completed

- Jobs completed by service
- Jobs completed by tech

## 9.3 Invoices

- Paid / unpaid

---

# 10) Notification

## 10.1 Tech Notifications

- Job assigned
- Schedule changes

## 10.2 Office Notifications

- Job completed
- Payment received

---

# 11) Time Tracking (Payroll-Ready Foundation) v1.0

You specifically want payroll tracking — so this must be built correctly now.

## 11.1 Job Time (Scheduled vs Actual)

Store BOTH:

- scheduled_start, scheduled_end
- actual_start, actual_end

Rules:

- actual_start is set when tech marks **On Site** (editable by admin)
- actual_end is set when tech marks **Completed** (editable by admin)
- keep a log of edits

## 11.2 Technician Time Clock (Recommended for Payroll)

Job time alone often isn’t enough for payroll (travel, gaps, standby).

Add a simple time clock:

- Clock In
- Clock Out
- Optional break tracking (can be 1.1)

### Time Entry Fields

- technician_id
- clock_in
- clock_out
- total_hours (computed)
- notes (optional)
- created_by / edited_by

## 11.3 Payroll Reporting

- Hours worked by technician (date range / pay period)
- On-site hours by technician (from actual job times)
- CSV export

---

# 12) Stability & “Perfect Foundation” Requirements (Non-Negotiable)

These are not “extra features.” They prevent chaos.

## 12.1 Company-Scoped Data Model (Future-Proofing)

Every core record must include `company_id`:

- users (via membership table)
- customers
- addresses
- jobs
- invoices
- payments
- services
- reports

UI can still default to Duct Daddy.

## 12.2 Audit / Activity Logging

Track who changed:

- schedule changes
- price overrides
- status changes
- payment edits

## 12.3 Soft Deletes

Do not hard delete critical records:

- services
- customers
- jobs
- invoices
    
    Use active/inactive or deleted_at.
    

## 12.4 Validation & Guardrails

- Prevent completing job without required info
- Prevent invoicing without services
- Prevent negative totals
- Prevent payment > remaining balance unless admin override

## 12.5 Timezone Handling

- Company timezone setting
- Store timestamps in UTC + display in company timezone

## 12.6 Backups & Recovery

- Daily automated backups
- Basic admin recovery plan (documented)

## 12.7 Error Handling & Monitoring (Must Exist)

- Centralized error logging
- Basic health checks
- Track failed notification sends
- Track failed payment events

---

# 13) Additional Features (Keep This Section for 1.1+)

(You can leave this as-is and expand later)

- Service bundles (duct + dryer)
- Duplicate job
- Saved notes / templates
- Global search (customers/jobs/invoices)
- Accounting integration
- Fleet/GPS
- Memberships/service plans
- Estimates/proposals (HVAC/Plumbing)

---

# 14) “Built By Daddy” Expansion Notes (Foundation Only)

This is NOT built in MVP UI, but the foundation supports it:

- Multiple companies under one parent org
- Per-company service catalog & pricing
- Per-company technicians & scheduling
- Per-company reporting
- Shared customer option later (not now)

---

# 15) MVP 1.0 Acceptance Criteria (Go-Live Gate)

You’re ready to replace Housecall Pro when:

Office can:

- create customer + job + schedule in under 1 minute
- schedule is constrained by tech availability
- see job statuses live
- invoice and record payment without manual math

Techs can:

- view today’s jobs
- update statuses
- edit service quantities
- upload photos
- capture signature
- complete the job reliably

Owners can:

- see revenue + jobs completed
- export payroll hours

System can:

- preserve history accurately (prices, invoices)
- log key actions (who changed what)
- recover from errors without data loss