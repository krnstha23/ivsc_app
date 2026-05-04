# IVCS - System Design Document

> **Last Updated**: May 04, 2026 (**outbound booking confirmation email** via Nodemailer; **`EmailSendLog`** audit table; **admin `/email-logs`** page with resend; `.env.example` SMTP vars; **landing footer** Legal link **`/cancellation-and-refund-policy`**). Prior: May 03, 2026 pending booking flow; enrollments removed; bundle-only booking; past date/time validation on `/students` bundle wizard.
> **Status**: Phase 1–3 Complete (except payment); Phase 4 pending  
> **Branch**: `main`

---

## 1. System Overview

### 1.1 Purpose

IVCS is an **IELTS-oriented** practice platform: it connects **students** with **human examiners** for **live speaking** sessions, coordinates **writing** hand-in (PDF), supports **in-app teacher evaluation** and a **session room** for Meet links and outcomes, and sells access through **packages** and **bundles** with **Standard / Priority / Instant** lead-time pricing. The product is **not** “scheduling only”—scheduling, catalog, payments (when integrated), and the post-session workflow are one system.

### 1.2 Problem Statement

Delivering a credible mock-exam experience while operating at scale involves:

- **Scheduling:** teachers vary by day/week; students need fair, simple booking without seeing examiner identity prematurely; **double-booking** must be impossible for confirmed sessions.
- **Trust and revenue:** a **confirmed** seat should mean **payment has succeeded**; until then the product must not treat the slot as finally taken (see **§1.4**, **§1.5**, **§11**).
- **Exam-shaped workflow:** the **calendar slot** is for **speaking** (e.g. **Google Meet**); **writing** is submitted afterward (**PDF**); teachers **evaluate** in-app and students receive **email** (and in-app) outcomes.
- **Operations:** admins need **full control** over users, catalog, bundles, and scheduling overrides (see **§2**).

### 1.3 Solution

A centralized web application that:

1. Lets **teachers** publish **availability** (evolving from discrete rows toward **multi-block** days and **server-generated** segments per **§1.5**).
2. Lets **admins** manage **users**, **packages**, **bundles** (including **per–lead-time-tier prices** on each bundle), and **override** scheduling or act on behalf of teachers when needed.
3. Lets **students** book **speaking** sessions through **bundles** only (the **Book a Session** / `/students` flow). **Packages** remain an **admin-managed catalog**; students are directed to bundle booking instead of `/packages/[id]/book`. Flow: **date → preference → single offered slot** and **server-side teacher assignment** (**§1.6**).
4. Uses **`Booking.status` and `paymentStatus`** (mirrored in app until a payment-confirmation API exists) so that **only a non-cancelled booking** blocks a segment for other students. Students complete **checkout steps** (phone/email, QR) then receive **`PENDING`**; **`CONFIRMED`** is set only after **admin approval** (Option A, **§9**). **`paymentStatus`** is written alongside **`Booking.status`** (e.g. PENDING/PAID/FAILED) for future webhook integration — **§11** for full payment rules.
5. Provides a **session room** with an agreed **step order** (**§1.7**): Meet link → PDF upload → teacher evaluation → shared final evaluation (with **24h** student download window where applicable).

### 1.4 Product vision — target experience (agreed Mar 2026)

This section records the **intended end-state** for IVCS as an IELTS-oriented mock platform. The current codebase is primarily **scheduling + packages + bookings**; the items below are **targets** for future implementation unless already noted elsewhere in this document.

#### Scheduling vs exam parts

- A **calendar booking** is **only** for the **live speaking** session (human examiner). **Google Meet** is in scope for **creating/handling the meeting link**; delivery of the speaking test in the call is between teacher and student.
- **Writing** is **not** what the booked slot length is “for”: students submit a **PDF** after speaking (see below).
- **Session duration** is driven by the **bundle** (each bundle has a **fixed** length). **Teacher availability** is moving to **continuous time blocks** per day; the system **generates** bookable start times for students (see **§1.5**). The shipped app may still use discrete 15 / 30 / 45 teacher-created rows until that work lands.
- Some **bundles may omit speaking**; those flows must not assume a Meet booking (details to be defined when implemented).

#### Writing (PDF)

- **Near-term:** **PDF upload only** for written work; **typed answers** are a possible later iteration based on student feedback.
- **Order of operations:** PDF submission happens **after** the speaking session (teacher availability is for speaking only).
- **Deadline (working assumption):** **1 hour** after the speaking test to upload the PDF (configurable later).
- Implies **file storage**, validation, linkage to booking/enrollment, and **teacher access** to download/review.

#### Google Meet

- Speaking is conducted by a **human examiner**. The platform auto-generates a Google Meet link via the **Google Meet REST API v2** when the session room is first opened by any authorized user (student or teacher).
- **Implementation (Apr 2026):** `lib/google-meet.ts` uses a Google Workspace **service account with domain-wide delegation** to call `spaces.create`. The returned `meetingUri` is stored on `Booking.meetLink`. Recording is enabled automatically (`RECORD_ON_START`) — recordings land in the host's Google Drive.
- Required env vars: `GOOGLE_SERVICE_ACCOUNT_KEY` (service account JSON), `GOOGLE_MEET_HOST_EMAIL` (Workspace user to impersonate).

#### Teacher evaluation and notifications

- Teachers **submit evaluation in the application** after the session; the student receives the outcome via **email** (templates, queue, retries TBD). The **in-app session room** flow is specified in **§1.7**.

#### Booking confirmation email (admin approval path)

- **Implemented (May 2026):** When an **admin** confirms a **`PENDING`** booking (`confirmPendingBooking` in `app/(app)/bookings/actions.ts`), the system sets **`CONFIRMED`** / **`paymentStatus: PAID`**, then sends a **booking confirmation** email to the student via **Nodemailer** (`lib/booking-mail.ts`). **Recipient resolution:** `Booking.studentEmail` if set, otherwise the student **`User.email`**. Session details use **Asia/Kathmandu** wall time in the message body.
- **SMTP** is configured with environment variables (**§9.6**). If SMTP is missing or misconfigured, the booking **still confirms**; each send attempt is recorded in **`EmailSendLog`** with **`FAILED`** and an error summary—admins review this on **`/email-logs`**.

#### Payment

- **Product rule:** a time segment is **fully booked** (other students blocked) only after **payment completes** and the booking is in a **confirmed + paid** state. Use **`Booking.status`** and **`paymentStatus`** (and related fields) to represent checkout and completion—**not** a separate “hold” table as the primary model.
- **Checkout / webhooks / refunds:** intentionally **not** specified here; see **§11** (to be filled in after the rest of the app is complete).

#### Target student journey (high level)

1. Student chooses a **date**, provides a **preferred time**; the system offers **one** assigned slot (or nearest alternative); student **accepts** and completes **payment** — **confirmation that blocks the slot for others is gated on successful payment** (once integrated). Details in **§1.6**.
2. Student attends the **speaking** session at the scheduled time (**Meet**).
3. Within the configured window (e.g. **1 hour** after speaking), student uploads the **writing PDF** (session room **§1.7**).
4. Teacher submits **evaluation** in-app; **email** notifies the student; **final evaluation** is visible in the session room per **§1.7**.

#### Open design choices (defer to implementation)

- **Speaking-free bundles:** writing-only path, teacher assignment, evaluation, and whether a calendar slot exists at all.
- **Evaluation model:** single combined evaluation vs separate speaking/writing scores or notes.
- **Start of the PDF upload window:** e.g. scheduled slot end vs an explicit “speaking completed” signal from the teacher or system.

### 1.5 Teacher availability blocks, generated slots & booking categories (agreed updates)

This section refines **§1.4** for how teachers publish availability, how students see times, and how **Standard / Priority / Instant** relate to **bundles**. It is **target behavior** for implementation; the current schema/UI may still reflect the older “one row per fixed-duration slot” model.

#### Teacher availability input

- Teachers define **one or more continuous blocks** per calendar day (e.g. 10:00–18:00), **not** a single “whole day only” restriction.
- **Multiple blocks** on the same day are allowed (e.g. 10:00–12:00 and 14:00–18:00).
- This replaces (at product level) the prior flow where teachers primarily created individual **15 / 30 / 45** minute `Availability` rows, though migration/compatibility is an implementation detail.

#### Generated slots (server-side)

- The system **computes** candidate **session segments** by **partitioning** each teacher’s blocks for a given date into lengths equal to the **bundle’s fixed session duration** (plus business rules below).
- **Standard / Priority / Instant do not change session length.** Session length comes **only** from the **bundle** (separate purchasable/configured bundles, each with its own duration — design clarification: duration per bundle product; category affects **price and/or eligibility**, not length).
- **Gap rule:** for the **same teacher** on the **same calendar day**, there must be **10 minutes** between the **end** of one booked session and the **start** of the next offered/generated slot (buffer / turnaround). The generator must respect already-booked segments when proposing new times.
- **How students browse those segments** (anonymous, preference-based, single offer) is specified in **§1.6** — it replaces a raw “grid of all times × all teachers” for the student UI.

#### Lead-time categories (Standard / Priority / Instant)

- Categories apply when the **bundle/session is booked before the class start** (i.e. they are determined from **lead time** and/or **calendar-date rules** between **booking confirmation** and **session start**).
- **Timezone for boundary math:** use **UTC+5:45** (e.g. **Asia/Kathmandu**). Stakeholders deferred broader timezone policy; all comparisons below are in this offset unless extended later.
- **Definitions** (interpreted in **UTC+5:45**):
  - **Standard:** **Days after tomorrow** (calendar days after tomorrow in UTC+5:45 as measured from booking confirmation date).
  - **Priority:** **Tomorrow** (calendar day after confirmation date in UTC+5:45).
  - **Instant:** **Current day** (same calendar date as booking confirmation in UTC+5:45).
- **Clarification (bundle vs category):** the **three names** are **booking-time categories**; **each bundle** has its own **fixed session duration** and **three list prices** (**Standard / Priority / Instant**) configured in admin (**§5.3**). Category affects **price and eligibility**, not session length.

#### Payment and minimum notice

- A session must not be treated as **fully booked** for other students until **payment** succeeds and **`Booking` reflects the confirmed/paid state** (see **§1.4** and **§11**).
- There must be **enough time** after the student commits and **completes payment** before **session start** (processing buffer). **Exact minimum minutes** are **TBD** in **§11**; UX should block or warn when payment cannot complete before start.

#### Implementation notes (for engineers)

- Today’s **`Availability` ↔ `Booking` 1:1** model may need to evolve (e.g. parent **window** rows plus generated **bookable segments**, or many generated rows per window) so **multiple** sessions can fall inside one teacher block with **10** minute gaps.
- Slot-generation logic must run in **UTC+5:45** for category boundaries and local date rules stated above.

### 1.6 Student booking UX — preferred time, single offer, anonymous teachers

This section records the **agreed student-facing flow** for choosing a session when **multiple teachers** may have capacity at similar times. It complements **§1.5** (how segments are generated). **Implemented** (Apr 10, 2026): `findSlotForPreference` + `createBookingForSlot` in `packages/actions.ts`; student UI in `bundle-cards.tsx`.

#### Principles

- Students **must not see teacher names** during booking (identity is assigned server-side; Meet/link handoff can remain generic on the student side per **§1.4**).
- The UI stays **simple**: avoid listing every identical clock time once per hidden teacher.

#### Flow

1. Student selects **date** (and bundle / package context as applicable).
2. Student enters a **preferred time** (exact time, time window, or part-of-day — **precise control shape TBD** at implementation).
3. The server considers all **valid generated segments** for that date and bundle (respecting **§1.5** gap rules, `bundleIds` / package rules, existing **non-cancelled** bookings (PENDING, CONFIRMED, COMPLETED), and any **pending-checkout** rows represented via **`Booking` / payment state** per **§1.4**).
4. The server returns **one primary offering**: a single **concrete bookable segment** (specific start/end and internal teacher assignment) that **best matches** the preference (policy **TBD**: e.g. closest start at or after requested time, or minimum absolute delta—document in code when fixed).
5. If **no** segment matches the preference (or all matching segments are unavailable), the server responds with the **nearest** acceptable alternative(s) (e.g. next available start on that day, and/or a small list of alternates — **count and “nearest” definition TBD**).
6. When the student **accepts** the offered slot, the system creates a booking with **`status: PENDING`** and **`paymentStatus: PENDING`**; **blocks the slot** for other students immediately (all non-`CANCELLED` bookings are conflicts). **No enrollment / `classesUsed`** — that model was **removed** (May 2026). Success toast (client): *"Please check your email. You will receive the confirmation once the payment is complete."* (copy is **payment-oriented**; **admin still approves** before `CONFIRMED` — see **§9**). Admin confirms or rejects from the **Pending** view on `/bookings`.

#### Why this works with multiple teachers

- Many teachers may have a segment at **the same wall-clock time**; the student sees **one** row (“your session”) for that interaction, not N duplicate times.
- The **assignment algorithm** (agreed): among eligible teachers, choose the teacher with the **lowest count of confirmed sessions in the current week**, where **week boundaries follow the traditional Nepali calendar (Bikram Sambat)**. **Round-robin** breaks ties (stable rotation order to be defined in code, e.g. by `teacherId` or creation time). Implementation should use an **authoritative Bikram Sambat** library or data source for **week** boundaries.

#### Product copy

- Set expectations with short UX copy (e.g. that the system **schedules close to** the student’s preference when exact match is unavailable).

#### Operational note

- Stakeholders indicated typical **booking activity ends around early evening** (e.g. ~6pm local), which reduces awkward cross-midnight lead-time edge cases for **Instant** / same-day rules; exact cutoff **TBD** if enforced in software.

### 1.7 Session room — agreed step order (Option A, target)

A dedicated **session room** page is the hub for a **confirmed** speaking booking. Flow is **step-based** and **ordered** as follows (**Option A**, agreed). **Implemented** (Apr 10, 2026): `app/(app)/sessions/[bookingId]/room/page.tsx` + `components/session-room.tsx` + `app/(app)/sessions/actions.ts`. Writing-only bookings skip Step 1.

#### Route and access

- **Suggested path:** e.g. `/sessions/[bookingId]/room` (or `/bookings/[id]/room`) — one room per **confirmed** speaking booking.
- **Who may access:** the **student** (`Booking.userId`) and the **assigned teacher** (`Booking.teacherId` / `TeacherProfile`). **Admin** may have full access for support (see **§2**).
- **When the room is available:** e.g. from a configurable window **before** `scheduledAt` until after evaluation is published (exact open/close rules **TBD**).

#### Step 1 — Google Meet (speaking)

- Show the **Google Meet link** to **both** student and teacher.
- **Implementation (Apr 2026):** The link is **auto-generated server-side** when the room page is first loaded by any authorized user. `lib/google-meet.ts` calls the **Google Meet REST API v2** (`spaces.create`) using a service account with domain-wide delegation, then saves `meetingUri` to `Booking.meetLink`. No manual paste is required.
- Recording is enabled by default (`RECORD_ON_START`); recordings are stored in the host Workspace account's Google Drive.
- If the API call fails (misconfigured env vars, quota), the room still renders and shows an error notice in Step 1. `Booking.meetLink` remains null until the issue is resolved.

#### Step 1b — Writing Prompt (for bundles with `hasEvaluation`)

- The session room shows a **Writing Prompt** card before the upload step.
- **Students**: the card is **locked** (PDF hidden) until `scheduledAt ≤ now`. After the session starts, a "View Question PDF" button appears.
- **Teachers and admins**: always see the question immediately.
- The question is served via `/api/questions/[questionId]/view` which enforces role + session-started checks server-side.
- If no question was assigned (question bank was empty at booking time), a notice is shown.

#### Step 2 — Student writing PDF upload

- After speaking (or from session start for writing-only), the **student** uploads the **writing PDF** in the room (aligned with **§1.4** near-term PDF-only policy and **~1 hour** deadline assumption).
- Student can delete and re-upload until teacher evaluation is submitted.
- **Teacher** may see upload status / file access per implementation; gating (e.g. upload required before teacher evaluation) follows this step order.

#### Step 3 — Teacher evaluation (form)

- **Teacher only:** form to **evaluate** (structure **TBD:** rubric, band scores, free text).
- **Student** sees a **waiting** state until evaluation is submitted — **UX TBD**.
- Transition to step 4 when evaluation is **saved/submitted** (single source of truth in DB).

#### Step 4 — Final evaluation (student + teacher)

- **Both** student and teacher see the **final evaluation** (read-only).
- **Student:** may **download** the evaluation (e.g. PDF or generated export) for **24 hours** after the agreed publish timestamp (**TBD:** `evaluationPublishedAt` vs `submittedAt`). After expiry, **download** is denied; whether **on-screen view** remains **TBD**.
- **Teacher:** same content; download policy **TBD** (may omit 24h restriction for teachers).

#### Step state (avoid URL hacking)

- Prefer **server-derived** current step from persisted flags (`meetLink` present, **PDF uploaded**, `evaluationSubmittedAt`, etc.) rather than relying only on `?step=` query params.

#### Data model (to add when building)

- **`meetLink`** (and optional Meet metadata) on `Booking` or child table.
- **Writing submission** storage + linkage to `bookingId` (file path, virus scan status, **TBD**).
- **`Evaluation`** (or fields on `Booking`): structured + narrative content, **`submittedAt` / `publishedAt`**.
- **Download authorization:** server checks **role** + **24h window** for student on download route.

#### Security

- Authorize **every** load and mutation by **booking id** + session user vs booking’s **student** / **teacher** / **admin** as allowed.
- Do not expose Meet links or PDFs to unauthenticated or unrelated users.

#### Related flows

- **Email** to student when evaluation is ready remains per **§1.4**; the room is the **authoritative** place to view and (within window) **download**.

---

## 2. User Roles & Permissions

| Role               | Description               | Key Permissions                                                             |
| ------------------ | ------------------------- | --------------------------------------------------------------------------- |
| **Admin**          | System administrator      | **Full control:** manage users, packages, and bundles; view and change bookings; **override scheduling**; **assign or reassign teachers**; review **email delivery logs** and **resend** booking confirmation mail; perform **teacher-only** operations where the product allows (e.g. create or edit **availability** on behalf of a teacher). Exact UI surfaces evolve with implementation. |
| **Teacher**        | Instructor/tutor          | Manage own availability; view bookings where they are the teacher           |
| **User (Student)** | End user seeking sessions | Browse bundles/packages and create bookings; view confirmed bookings on calendar |

### 2.1 Role Hierarchy

```
Admin
  └── Full control over catalog (packages, bundles with tier pricing), users, and scheduling
  └── May act on behalf of teachers (e.g. availability) and override or reassign bookings
  └── Configures system behavior as implemented (no separate “limited admin” tier)

Teacher
  └── Can manage own availability
  └── Can view assigned confirmed bookings
  └── Cannot modify other teachers’ data unless product adds delegation

User (Student)
  └── Can browse and book
  └── Can view confirmed bookings
  └── Cannot access admin functions
```

---

## 3. Core Domain Entities

### 3.1 Entity Relationship Overview

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │   Teacher    │       │    Admin     │
│   (Student)  │       │              │       │              │
└──────┬───────┘       └──────┬───────┘       └──────────────┘
       │                      │
       │                      │
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│   Booking    │◄──────│ Availability │
│              │       │   Slot       │
└──────┬───────┘       └──────────────┘
       │
       ▼
┌──────────────┐
│  TimeSlot    │
│  (Schedule)  │
└──────────────┘
```

### 3.2 Entity Definitions

#### User (Base for all roles)

| Field     | Type     | Description                |
| --------- | -------- | -------------------------- |
| id        | UUID     | Primary key                |
| username  | String   | Unique; **used for login** (credentials) |
| email     | String   | Unique; for account/notifications       |
| name      | String   | Display name (firstName, middleName, lastName in DB) |
| role      | Enum     | ADMIN, TEACHER, USER       |
| createdAt | DateTime | Account creation timestamp |
| updatedAt | DateTime | Last modification          |

#### Teacher Profile (extends User)

| Field      | Type     | Description                |
| ---------- | -------- | -------------------------- |
| id         | UUID     | Primary key                |
| userId     | UUID     | FK to User                 |
| bio        | String?  | Optional teacher bio      |
| isActive   | Boolean  | Whether the teacher is available for booking |
| createdAt  | DateTime | Profile creation time     |
| updatedAt  | DateTime | Last profile update time  |

#### Availability

| Field        | Type    | Description                       |
| ------------ | ------- | --------------------------------- |
| id           | UUID    | Primary key                       |
| teacherId    | UUID    | FK to Teacher                     |
| date         | Date    | Slot date (no time component)    |
| startTime    | String  | "HH:MM" (interpreted as UTC wall time) |
| endTime      | String  | "HH:MM" (interpreted as UTC wall time) |
| bundleIds    | String[]| Optional PackageBundle IDs allowed to book (empty = all) |
| createdAt    | DateTime| Availability creation time       |
| updatedAt    | DateTime| Last availability update time   |

#### PackageBundle

| Field            | Type     | Description |
| ---------------- | -------- | ----------- |
| id               | UUID     | Primary key |
| name             | String   | Bundle display name |
| description      | String?  | Optional marketing copy |
| priceStandard    | Decimal  | Price for **Standard** lead-time tier (days after tomorrow, **UTC+5:45**) |
| pricePriority    | Decimal  | Price for **Priority** tier (tomorrow, **UTC+5:45**) |
| priceInstant     | Decimal  | Price for **Instant** tier (**current calendar day** as session in **UTC+5:45**) |
| discountPercent  | Decimal? | Optional bundle-level discount display |
| isActive         | Boolean  | Whether the bundle is offered |
| isFeatured       | Boolean  | Featured placement (e.g. Students page) |
| validFrom / validUntil | DateTime? | Optional catalog window |
| packageIds       | String[] | Package IDs included in the bundle |
| createdAt / updatedAt | DateTime | Audit |

#### Booking

| Field       | Type     | Description                              |
| ----------- | -------- | ---------------------------------------- |
| id          | UUID     | Primary key                              |
| userId      | UUID     | FK to User (student)                     |
| teacherId   | UUID     | FK to Teacher                            |
| availabilityId | UUID | One booking per availability slot      |
| scheduledAt | DateTime | Booked date and time                     |
| duration    | Int      | Duration in minutes                      |
| status      | Enum     | PENDING, CONFIRMED, CANCELLED, COMPLETED |
| notes       | String?  | Optional notes from user                 |
| studentPhone | String? | Student mobile number at booking time    |
| studentEmail | String? | Student email at booking time (editable) |
| packageId   | UUID?    | Optional linked package (when booking is package-based) |
| paymentStatus | Enum   | PENDING, PAID, REFUNDED, FAILED         |
| transactionId | String? | Optional payment transaction identifier |
| createdAt   | DateTime | Booking creation time                    |
| updatedAt   | DateTime | Last booking update time               |

---

## 4. Core User Flows

### 4.1 Teacher Availability Setup

```
1. Teacher logs in
2. Navigate to "Teachers" page (calendar)
3. Click a date to open the slot popup
4. Choose duration and start time
5. Optionally restrict the slot to one or more package bundles
6. Save availability (creates Availability rows)
7. New slots become bookable immediately
```

### 4.2 User Booking Flow (Bundle-first; May 2026)

**Current implementation:**

```
1. Student logs in
2. Opens **Book a Session** (`/students`), selects a bundle, searches by date / preferred time
3. Server returns a single offered slot (`findSlotForPreference`); optional nearest-slot messaging when not exact match
4. Confirm slot → Phone/Email modal → QR modal → **Confirm & book**
5. Creates `Booking` with `status: PENDING`, `paymentStatus: PENDING`, `packageId: null`; blocks slot for others (non-CANCELLED conflicts)
6. Toast: "Please check your email. You will receive the confirmation once the payment is complete." → redirect `/dashboard`
7. Admin confirms on `/bookings` (`tab=pending`) → `CONFIRMED` + `paymentStatus: PAID` (until §11 payment API refines this)
8. **Student `/bookings`**: lists **CONFIRMED** upcoming/past only; **PENDING** hidden. **Cancel/reschedule** apply to **CONFIRMED** bookings only (student cannot cancel **PENDING**)
9. **`/packages/[id]/book`** redirects to **`/students`**; package detail for students explains bundle booking only
10. **Writing-only bundles** (`duration === 0`): `createWritingOnlyBooking` also creates **PENDING** + admin approval
```

**Past date / time validation (bundle wizard — `/students`, `components/bundle-cards.tsx` + server actions):**

| Layer | Behavior |
| ----- | -------- |
| **Client** | `<input type="date">` sets **`min`** to **today’s calendar date in the browser’s local timezone** (`localCalendarDateString()`), so the native picker **disables past days** (replacing UTC-only `toISOString().slice(0, 10)`, which misaligned “today” near timezone boundaries). **`onChange`** rejects values **before `min`** (e.g. paste) with a toast and clears the field. **`Find slot`** rechecks before calling the server. |
| **Server** | **`findSlotForPreference`**: rejects when **`dateStr`** is **before** today’s UTC calendar date string (`now.toISOString().slice(0, 10)`), matching how **`scheduledAt`** is built (`…T${startTime}:00.000Z`). If the closest slot’s **`sessionStart` ≤ `now`**, returns **not found** plus **alternatives** and an explanatory message. **`createBookingForSlot`**: rejects when **`scheduledAt.getTime() ≤ Date.now()`** so direct action calls cannot book in the past. |

**Target (§11):** External payment confirmation webhooks and stricter **`paymentStatus`** rules — **`CONFIRMED`** remains **admin-gated** (Option A) unless product direction changes.

### 4.3 Admin Timetable Management

```
1. Admin logs in
2. Manage system data via the dashboard pages (users, packages, bundles)
3. View bookings using the shared Calendar page
4. Manual timetable editing, booking overrides, and bulk slot blocking are not implemented yet
```

---

## 5. Technical Architecture

### 5.1 Stack

| Layer    | Technology                          | Rationale                                         |
| -------- | ----------------------------------- | ------------------------------------------------- |
| Frontend | Next.js 16 (App Router)             | SSR, React Server Components, excellent DX        |
| Styling  | Tailwind CSS 4                      | Utility-first, rapid UI development               |
| Backend  | Next.js API Routes / Server Actions | Unified codebase, type safety                     |
| Database | PostgreSQL                          | Relational data, complex queries, ACID compliance |
| ORM      | Prisma 7                            | Type-safe queries, migrations, excellent DX       |
| Auth     | NextAuth.js v5 (Auth.js)            | Free, flexible, native Next.js support            |
| Icons    | **@solar-icons/react** (Solar icon set) | Static, clean, consistent; imported as named React components |
| Validation | **Zod v4**                            | Schema-based validation on all server actions; type-safe parsed output |
| Meet API | **googleapis** (Google Meet REST v2)  | Auto-generates Meet spaces with recording; server-side via service account + domain-wide delegation |

**Icons (standard):** The project uses **@solar-icons/react** as the single source for UI icons. Icons are imported directly as named components: `import { Widget4 } from '@solar-icons/react'` and rendered with `<Widget4 size={16} />`. The `weight` prop controls style variant (e.g. `weight="Bold"`). No wrapper files — import from `@solar-icons/react` directly in each consumer. **Do not introduce Tabler Icons or Lucide for new UI icons.**

### 5.2 Folder Structure (Current)

```
ivcs-app/
├── app/
│   ├── api/auth/[...nextauth]/route.ts
│   ├── (app)/                       # Protected app shell (sidebar + header)
│   │   ├── layout.tsx               # Auth check, SidebarProvider, SiteHeader
│   │   ├── loading.tsx              # Skeleton loading state
│   │   ├── error.tsx                # Error boundary with retry
│   │   ├── dashboard/
│   │   │   ├── page.tsx             # Section cards for all roles
│   │   │   └── [...slug]/page.tsx   # Placeholder sub-routes with role check
│   │   ├── users/
│   │   │   ├── page.tsx             # ADMIN: user list with filters
│   │   │   ├── new/page.tsx         # ADMIN: create user form
│   │   │   └── actions.ts           # createUser (Zod-validated, ADMIN-only)
│   │   ├── teachers/
│   │   │   ├── page.tsx             # Calendar + availability management
│   │   │   └── actions.ts           # createAvailability, getTeacherAvailability*
│   │   ├── students/page.tsx        # Calendar view
│   │   ├── packages/page.tsx        # Package list with filters
│   │   └── calendar/page.tsx        # Calendar view
│   ├── login/page.tsx
│   ├── register/
│   │   ├── page.tsx                 # Multi-step registration form
│   │   └── actions.ts               # createAccount (Zod-validated)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # shadcn primitives (no icon wrappers)
│   ├── app-sidebar.tsx              # Permission-based nav (filterByRole)
│   ├── site-header.tsx, nav-main, nav-user
│   ├── register-form.tsx            # Multi-step: details → user type → password
│   ├── create-user-form.tsx         # Admin create user form
│   ├── calendar.tsx, calendar-week-view.tsx
│   ├── teachers-calendar-with-popup.tsx, teachers-slot-form-dialog.tsx
│   ├── header-user-menu.tsx, theme-toggle.tsx
│   ├── logout-confirm-context.tsx, back-button-logout-handler.tsx
│   ├── packages-header-with-filter.tsx, users-header-with-filter.tsx
│   ├── email-send-log-table.tsx     # ADMIN: mail audit table + resend dialog
│   └── providers.tsx                # SessionProvider
├── lib/
│   ├── prisma.ts                    # Singleton + pg adapter
│   ├── auth.ts                      # NextAuth + Credentials (username)
│   ├── auth.config.ts               # Edge-safe config
│   ├── auth-edge.ts                 # Edge auth for proxy
│   ├── passwords.ts                 # hashPassword, verifyPassword
│   ├── permissions.ts               # Role, canAccess, filterByRole
│   ├── validations.ts               # Zod schemas for all server actions
│   ├── google-meet.ts               # Google Meet REST API v2: createMeetSpace (recording enabled)
│   ├── booking-mail.ts              # Nodemailer transport; booking confirmation templates; recipient resolution
│   ├── dispatch-booking-confirmation-email.ts  # Send + persist EmailSendLog (SENT/FAILED)
│   └── utils.ts                     # cn()
├── prisma/schema.prisma, migrations/
├── proxy.ts                         # Route protection (Next.js 16)
├── docs/SYSTEM_DESIGN.md
└── components.json
```

**Dashboard model (Feb 20, 2026):** **Single dashboard** at `/dashboard` for all roles. One app, one layout; only the **sidebar pages** (nav items) differ by role:

- **Admins** see **all pages** (shared + admin + teacher + user).
- **Admins**, **Teachers**, and **Users (students)** see the same top-level pages (Dashboard, Calendar, Teachers, Students, Packages).
- The `/users` page is **admin-only**.

Visibility is controlled by `allowedRoles` in `lib/permissions.ts`; the sidebar filters items with `filterByRole()`. Sub-routes (e.g. `/dashboard/bookings`) are protected so direct URL access respects the same permissions. No separate `/admin`, `/teacher`, or `/student` pages; all dashboard access is via `/dashboard`.

**Sidebar pages by role (current — implemented, May 01 2026):**

| Page              | Route              | ADMIN | TEACHER | USER (Student) |
|-------------------|--------------------|-------|---------|----------------|
| Dashboard         | /dashboard         | ✓     | ✓       | ✓               |
| Calendar          | /calendar          | ✓     | ✓       | ✓               |
| Bookings          | /bookings          | ✓ (all + Pending tab) | ✓ (teaching sessions) | ✓ (own bookings) |
| Users             | /users             | ✓     | —       | —               |
| Manage Teachers   | /teachers/manage   | ✓     | —       | —               |
| Teachers          | /teachers          | ✓     | ✓       | ✓               |
| Students          | /students          | ✓     | ✓       | ✓               |
| Packages          | /packages          | ✓     | ✓       | ✓               |
| Timetable         | /timetable         | ✓     | —       | —               |
| Reports           | /reports           | ✓     | —       | —               |
| Email log         | /email-logs        | ✓     | —       | —               |

**Note:** The legacy `/bookings/teaching` route permanently redirects to `/bookings`. The merged `/bookings` page uses role-based rendering:
- **Students**: See only their own bookings (Upcoming/Past tabs, `PENDING` bookings filtered out, no Pending tab)
- **Teachers**: See only their assigned teaching sessions (Upcoming/Past tabs, no Pending tab)
- **Admins**: See all bookings across all users (Upcoming/Past/Pending tabs; Pending tab is admin-only with confirm/reject actions)

**Dashboard home:** Section cards visible to all roles.

**Route protection:** The `app/(app)/layout.tsx` enforces authentication. Pages with restricted access (e.g. `/users`) add role checks via `canAccess()`. Server actions also enforce their own role checks independently of pages.

### 5.3 Database Schema (Prisma)

**Status**: ✅ Implemented — baseline Feb 4, 2026; subsequent migrations include bundle tier pricing (`20260402120000_bundle_category_prices`, etc.). See `prisma/migrations/`.

#### Models Overview

| Model | Table Name | Purpose |
|-------|------------|---------|
| `User` | `users` | Base user with **username** (login), email, role (ADMIN, TEACHER, USER), auth fields |
| `StudentProfile` | `student_profiles` | Extended student info |
| `TeacherProfile` | `teacher_profiles` | Extended teacher info: bio, availability, `isApproved` (self-reg approval gate) |
| `Availability` | `availabilities` | Date-specific time slots teachers mark as available |
| `Package` | `packages` | Purchasable class packages with pricing |
| `Booking` | `bookings` | Scheduled sessions, links User → Teacher → Availability; includes `meetLink`, `bundleId`, `submissionStart`/`End` |
| `ClassMetadata` | `class_metadata` | Completed class records for history/reporting |
| `PackageBundle` | `package_bundles` | Marketing bundles: `priceStandard`/`Priority`/`Instant`, `duration` (0=writing-only), `hasEvaluation` |
| `Evaluation` | `evaluations` | Teacher evaluation per booking: integer `score` + free-text `feedback` |
| `WritingSubmission` | `writing_submissions` | Student PDF uploads linked to bookings |
| `WritingQuestion` | `writing_questions` | IELTS writing question PDFs uploaded by teachers/admins; auto-assigned to eligible bookings |
| `EmailSendLog` | `email_send_logs` | One row per outbound SMTP attempt (booking confirmation); links **Booking**, student **User**, optional **triggeredBy** admin |

#### Enums

| Enum | DB Type | Values |
|------|---------|--------|
| `Role` | `role` | ADMIN, TEACHER, USER |
| `BookingStatus` | `booking_status` | PENDING, CONFIRMED, CANCELLED, COMPLETED |
| `PaymentStatus` | `payment_status` | PENDING, PAID, REFUNDED, FAILED |
| `EmailSendType` | `email_send_type` | BOOKING_CONFIRMED |
| `EmailSendStatus` | `email_send_status` | SENT, FAILED |
| `EmailSendTrigger` | `email_send_trigger` | BOOKING_CONFIRM, ADMIN_RESEND |
#### Key Design Decisions

1. **snake_case table names**: All tables use `@@map()` for PostgreSQL convention (e.g. `users`, `teacher_profiles`).
2. **camelCase column names**: All table columns use **camelCase** in the database (e.g. `userName`, `passwordHash`, `firstName`, `createdAt`). In Prisma, use the same camelCase field name so the generated client uses the correct column name in queries. New migrations must create columns in camelCase for consistency.
3. **Bundles ↔ packages**: `PackageBundle.packageIds[]` lists catalog packages in a bundle; no separate enrollment junction table (**StudentEnrollment removed**, migration `20260503120000_drop_student_enrollments`).
4. **Package-centric catalog**: Admins manage packages and bundles; students **book via bundles** on `/students`, not via `/packages/[id]/book`.
5. **Payment integration status**: `paymentStatus` and `transactionId` exist on `Booking` and are **updated in sync with booking lifecycle** (e.g. confirm → `PAID`, reject → `FAILED`); external payment-confirmation API **TBD** (**§11**).

#### New Tables (Feb 4, 2026)

**PackageBundle** - Marketing bundles (three **lead-time tier** prices)
```
id, name, description,
priceStandard, pricePriority, priceInstant,
discountPercent,
isActive, isFeatured, validFrom, validUntil,
packageIds[], createdAt, updatedAt
```

#### Removed Fields (Feb 4, 2026)

| Model | Removed Field | Reason |
|-------|---------------|--------|
| `StudentProfile` | `subjects String[]` | Replaced by Package relations via StudentEnrollment |
| `StudentProfile` | `packageId String?` | Replaced by StudentEnrollment (supports multiple) |
| `TeacherProfile` | `subjects String[]` | Removed; availability booking restrictions are expressed via `Availability.bundleIds` |

#### Username on User (Feb 8, 2026)

- **Migration** `20260208000000_add_username_to_users`: added `username String @unique` to `users`.
- Existing rows backfilled with `username = email` so current users can continue to log in.
- **Login**: Credentials provider and login form use **username** (not email); lookup by `prisma.user.findUnique({ where: { username } })`.

See `prisma/schema.prisma` for full implementation.

---

## 6. Design Decisions

### 6.1 Decisions Made

| Decision                             | Rationale                                                            | Date       |
| ------------------------------------ | -------------------------------------------------------------------- | ---------- |
| PostgreSQL over SQLite               | Complex relational queries, concurrent access, production-ready      | 2026-01-31 |
| Prisma 7 with pg adapter             | Type safety, modern features, driver adapters for edge compatibility | 2026-01-31 |
| Single User table with Role enum     | Simpler auth, shared attributes, role-based access control           | 2026-01-31 |
| Separate TeacherProfile              | Teachers have additional attributes not relevant to other roles      | 2026-01-31 |
| Added StudentProfile model           | Students need package association and subject preferences            | 2026-01-31 |
| Date-specific Availability (not recurring) | Simpler conflict detection, explicit slot management, no "exception" complexity | 2026-01-31 |
| Package model for paid sessions      | Platform is paid; students purchase class packages                   | 2026-01-31 |
| 1:1 Availability-to-Booking relation | One booking per slot prevents double-booking at schema level         | 2026-01-31 |
| ClassMetadata for completed classes  | Separate audit trail from bookings; supports reporting               | 2026-01-31 |
| firstName/middleName/lastName split  | Better for formal display and search                                 | 2026-01-31 |
| snake_case for all DB tables         | PostgreSQL naming convention; explicit @@map() on all models         | 2026-02-04 |
| camelCase for DB column names        | All table columns in camelCase (e.g. userName, passwordHash); use same field name in Prisma so generated client queries match | 2026-02-21 |
| Explicit junction tables             | All M:M relations use explicit junctions for metadata & control      | 2026-02-04 |
| PackageBundle for marketing          | Group packages into purchasable bundles; **three prices** per bundle (**Standard / Priority / Instant**) | 2026-02-04; tier columns 2026-04-02 |
| Writing Question Bank auto-assignment | Questions assigned at booking creation via `lib/writing-question-assigner.ts`; prioritises unseen questions then least-used fallback to avoid repeats per student | 2026-04-25 |
| Writing prompt locked until session starts | Students cannot see the question PDF until `scheduledAt ≤ now`; enforced both in UI and API route | 2026-04-25 |
| Teacher assignment for offered slot  | **Lowest** confirmed-session count in the **current Bikram Sambat (Nepali) week**; **round-robin** tie-break | 2026-04-02 |
| Admin operational authority          | **Full control**: scheduling overrides, teacher assign/reassign, acting on behalf of teachers where implemented | 2026-04-02 |
| Package-centric relationships        | Teachers/Students link to Packages, not free-text subjects           | 2026-02-04 |
| paymentId on Enrollment (not amount) | Links enrollment to payment record; amount tracked in Transaction table | 2026-02-04 |
| No expiration on packages            | Packages don't expire; removed expiresAt and EXPIRED status              | 2026-02-04 |
| Remove Package.subjects              | Simplify packages; remove array field and related UI/filtering       | 2026-03-04 |
| Username for login (User.username)    | Login credential is username (unique); email kept for account/notifications | 2026-02-08 |
| Next.js 16 proxy convention           | Use `proxy.ts` instead of deprecated `middleware.ts` for route protection | 2026-02-08 |
| Single dashboard, role-based nav only | One dashboard at `/dashboard` for all roles; admins see all sidebar pages, teachers only teacher-related, users only user-related (lib/permissions.ts); no separate /admin, /teacher, /student pages | 2026-02-20 |
| Use @solar-icons/react for all UI icons | Replaced the previous icon wrapper approach with static Solar icons. Named imports directly in consumers (`import { Widget4 } from '@solar-icons/react'`). No wrapper files, no animation overhead. | 2026-03-04 |
| Google Meet auto-generation on room load | Meet link created server-side in `room/page.tsx` on first load (student or teacher). Uses `lib/google-meet.ts` → Meet REST API v2 with domain-wide delegation. No manual paste; recording enabled by default. Graceful fallback if API unavailable. | 2026-04-25 |
| Package-first booking flow              | Students select packages (not teachers) → view teacher availability → book. Package-based bookings can be linked to StudentEnrollment to deduct remaining classes. | 2026-03-04 |
| Zod validation on all server actions    | Server actions are public endpoints; manual string checks are fragile. Zod schemas provide format validation, type safety, and composable error reporting. | 2026-03-04 |
| Role guards on server actions           | Page-level guards protect UI, but actions are callable directly. `createUser` now checks ADMIN role; `createAvailability` checks TEACHER role. | 2026-03-04 |
| Reschedule slot lookup authorization hardening | `findSlotsForReschedule` now enforces object-level access (`canManageBooking`) and returns the same empty shape for invalid/not-found/unauthorized to reduce IDOR enumeration risk | 2026-04-27 |
| Inline script/style XSS hardening | Added `lib/security.ts` helpers; JSON-LD serialization escapes script-breaking chars and chart CSS injection now sanitizes token names/colors before `dangerouslySetInnerHTML` | 2026-04-27 |
| JWT claim freshness + soft revocation checks | JWT callback now re-checks user state from DB (`isActive`, role, username) on token reuse; inactive/missing users are treated as unauthenticated sessions | 2026-04-27 |
| Docker secret hygiene + server runtime reliability | Compose uses env-substituted DB credentials (no hardcoded secrets), DB host port exposure removed, and container base includes compatibility packages for Alpine runtime | 2026-04-27 |
| Student phone + email capture on booking | Added `studentPhone` and `studentEmail` fields to `Booking` model; editable email (pre-filled from session) + validation in phone/email modal | 2026-04-30 |
| QR code payment flow | Added QR code modal between phone/email entry and booking confirmation; uses extracted QR image (`/qr-code.png`) displayed via `next/image` | 2026-04-30 |
| Multi-step booking modals | Flow: Confirm slot → Phone/Email modal → QR code modal → Confirm & book → Dashboard; validation on each step with toast notifications | 2026-04-30 |
| Nearest slot message | When searched time isn't available, shows "The searched time is not available, here is the nearest slot from the searched time and date" above the slot card; uses `isExactMatch` field in `FindSlotResult` | 2026-04-30 |
| Calendar-day lead-time categories | Updated **§1.5** lead-time definitions: **Standard** = days after tomorrow, **Priority** = tomorrow, **Instant** = current day (all in UTC+5:45). Replaced time-based cutoffs (48h/24h) with calendar-date rules matching `computeLeadTimeCategory()` in `lib/slot-generator.ts` | 2026-04-30 |
| Pending booking flow (bundle + writing-only) | `PENDING` + `paymentStatus: PENDING` on create; admin confirm → `CONFIRMED` + `PAID`; reject → `CANCELLED` + `FAILED` + `notes` | 2026-05-03 |
| Removed `StudentEnrollment` + enrollments admin UI | Migration `20260503120000_drop_student_enrollments`; deleted `/enrollments` routes; students book bundles only | 2026-05-03 |
| Merged `/bookings` + admin Pending tab | Role-based page; `?tab=pending`; `admin-pending-bookings` client UI | 2026-05-03 |
| Non-admin cannot cancel PENDING | Only `ADMIN` can cancel/reject pending; students reschedule/cancel `CONFIRMED` only | 2026-05-03 |
| Session room blocks `PENDING` | Redirect to dashboard if booking not confirmed | 2026-05-03 |
| Teacher load counts non-CANCELLED | `assignTeacher` / writing-only week counts include `PENDING` for fair assignment | 2026-05-03 |
| Bundle booking: no past dates/times | **Client:** local-calendar **`min`** on date input + validation on change / before search. **Server:** `findSlotForPreference` rejects past calendar date and past `sessionStart`; `createBookingForSlot` rejects `scheduledAt` ≤ now (**§4.2** table) | 2026-05-03 |
| **Outbound SMTP + mail audit log** | **Nodemailer** booking confirmation when admin confirms **`PENDING`** booking; **`EmailSendLog`** per attempt; admin **`/email-logs`** with **Resend** (recipient verification); env **`SMTP_*`**, **`MAIL_FROM`** (documented in **`.env.example`**) | 2026-05-04 |

### 6.2 Pending Decisions

| Decision            | Options                              | Recommendation                                       |
| ------------------- | ------------------------------------ | ---------------------------------------------------- |
| Time zone handling  | Store UTC + user TZ, Store local     | **UTC storage** for date-only and UTC wall times (current implementation); per-user timezone conversion is not modeled yet |
| Notification system | Email, In-app, Push                  | **Email + In-app** initially; push later             |
| Payment provider    | Stripe, Razorpay, PayPal             | **Stripe** - best API, but depends on region         |
| Recurring availability | Template-based generation vs manual | Manual for MVP; template generation in Phase 4       |

### 6.3 Future Additions (Identified)

| Model | Priority | Phase | Purpose |
|-------|----------|-------|---------|
| Notification | High | 2 | In-app notifications for booking events |
| Review | Medium | 2-3 | Student ratings/reviews for teachers |
| Transaction | High | 3 | Payment audit trail when payments go live |
| SessionNote | Low | 4 | Teacher notes on student progress |
| PromoCode | Low | 4 | Marketing discount codes |

---

## 7. Edge Cases & Considerations

### 7.1 Scheduling Conflicts

- **Double booking prevention**: Check existing bookings before confirming
- **Availability changes**: What happens to existing bookings if teacher removes availability?
- **Concurrent booking attempts**: Use database transactions with row locking

### 7.2 Time Zone Handling

- Store all times in UTC in database
- Render booking/slot times using UTC (current implementation); per-user timezone conversion is not implemented yet

### 7.3 Cancellation Policy

- How much notice required?
- Auto-cancel pending bookings after X hours?
- Refund policy (if paid)

### 7.4 Recurring Availability vs Exceptions

- Weekly recurring availability templates and exception rules are not implemented yet

---

## 8. Implementation Phases

### Phase 1: Foundation (Current - In Progress)

**1.1 Infrastructure (COMPLETED)**
- [x] Project setup (Next.js 16, Tailwind 4, Prisma 7)
- [x] PostgreSQL database configuration
- [x] Database schema design and implementation
- [x] Initial migration applied

**1.2 Authentication System** ✅ (Feb 8, 2026)
- [x] Auth strategy: NextAuth.js v5 (Auth.js)
  - Credentials provider for **username**/password (login by username, not email)
  - JWT sessions for stateless auth
  - Built-in CSRF protection
- [x] Auth infrastructure
  - [x] `lib/auth.ts` - NextAuth config + Credentials provider
  - [x] `lib/auth.config.ts` - Edge-compatible config (callbacks, pages)
  - [x] `lib/auth-edge.ts` - Edge-safe auth for proxy (no Prisma)
  - [x] `lib/prisma.ts` - Singleton Prisma client (pg adapter)
  - [x] `lib/passwords.ts` - bcrypt hash/verify
- [x] Auth API: `app/api/auth/[...nextauth]/route.ts`
- [x] Route protection: **`proxy.ts`** (Next.js 16 convention; middleware deprecated)
  - Protects `/dashboard`; redirects unauthenticated to `/login`
- [ ] RBAC helpers (optional; role in session for now)

**1.3 User Registration & Onboarding** ✅ (Mar 2026)
- [x] Registration flow (full)
  - [x] `app/register/page.tsx` - Multi-step form (details → user type → password)
  - [x] `app/register/actions.ts` - `createAccount` server action (Zod-validated)
  - [x] Username + email validation (format + uniqueness via Zod + DB check)
  - [x] Password strength requirements (min 8 chars via Zod)
  - [x] Auto-create StudentProfile for USER role, TeacherProfile for TEACHER
- [x] Login flow
  - [x] `app/login/page.tsx` - Login form (shadcn login-03 block, wired to username + signIn)
  - [x] Error handling (invalid credentials)
  - [x] SessionProvider (`components/providers.tsx`) for client-side signIn
  - [ ] "Remember me" (deferred)
- [x] Post-login: all roles land on `/dashboard`. Single dashboard; sidebar nav filtered by role (`lib/permissions.ts`); no separate admin/teacher/student pages

**1.4 Core UI Components** ✅ (Mar 2026)
- [x] Design system foundation (shadcn/ui initialized + login-03 + dashboard-01 blocks)
  - [x] `components/ui/` – button, input, card, label, separator, field, sheet, tooltip, skeleton, breadcrumb, select, tabs, table, toggle, badge, checkbox, dropdown-menu, drawer, avatar, sonner, sidebar, chart, toggle-group, dialog
  - [x] **Icons:** `@solar-icons/react` — imported directly as named components; no wrapper files
  - [x] `lib/utils.ts` – `cn()` (clsx + tailwind-merge); `tw-animate-css` for animations
  - [x] `lib/validations.ts` – Zod schemas for all server actions
- [x] Login/dashboard blocks, sidebar, header, section-cards, nav-*, calendar components
- [x] Loading skeleton (`app/(app)/loading.tsx`) and error boundary (`app/(app)/error.tsx`)
- [x] Logout confirmation dialog, back-button handler, theme toggle, header user menu

---

### Phase 2: Core Features

**2.1 Teacher Availability Management** (partially built)
- [x] Calendar-based availability input (`app/(app)/teachers/page.tsx`)
  - [x] `TeachersCalendarWithPopup` – calendar with slot count badges, click to add
  - [x] `TeachersSlotFormDialog` – pick date, duration, time to create availability
  - [x] `TeacherDayAvailabilityDialog` – 24hr timeline view of a day's slots
  - [x] Server actions (Zod-validated): `createAvailability`, `getTeacherAvailabilityForMonth`, `getTeacherAvailabilityForDay`
- [ ] Profile management (edit bio, subjects, hourly rate)
- [ ] Bulk slot creation (e.g., "every Monday 9–5")
- [ ] Visual conflict detection (overlapping slots)
- [ ] Delete/edit existing availability slots

**2.2 Student Features**
- [x] Students page with calendar (`app/(app)/students/page.tsx`) – placeholder
- [x] Browse packages (package list with filters on `/packages`)
- [x] View package details + available slots (from teacher availability) – `/packages/[id]` with booking section
- [ ] Student profile / enrolled packages view

**2.3 Booking System (CORE — package-first)**
- [x] Booking flow (package-first):
  - [x] Student browses packages → sees available slots (predetermined by teacher) → books
  - [x] Server action with transaction: create booking + deduct classesUsed on enrollment
  - [x] Slot generation engine (`lib/slot-generator.ts`): partitions teacher blocks by bundle duration + 10min gap
  - [x] Lead-time category computation (Standard/Priority/Instant) in UTC+5:45
  - [x] Teacher assignment: BS ISO week load + round-robin (`lib/bikram-sambat.ts`)
  - [x] Anonymous student booking UX: date + preferred time → single offered slot with price
  - [x] Writing-only bundle flow: student picks submission window, teacher assigned, PDF upload in session room
- [x] Booking management
  - [x] Student bookings page (`/bookings`): Upcoming, Past, Cancelled tabs
  - [x] Cancel booking (from calendar day view)
  - [x] Reschedule booking (students, from calendar day view)
- [x] Teacher booking view
  - [x] View assigned bookings (`/bookings/teaching`)
  - [x] Complete bookings (auto-confirm, no approval needed)

---

### Phase 3: Admin & Packages

**3.1 Admin Dashboard**
- [x] Single dashboard: `app/(app)/dashboard/` – shared layout for all roles
- [x] User management (`app/(app)/users/`)
  - [x] List all users with filter by name, username, role, active status
  - [x] Create user form (`/users/new`) with Zod-validated server action + ADMIN role guard
  - [x] Edit user (`/users/[id]/edit`): details, role, active, optional password reset
  - [x] Approve teachers (inline button on users page)
- [x] Teacher management (`/teachers/manage`): approve, activate/deactivate, stats, admin-create-availability

**3.2 Package Management**
- [x] Package listing (`app/(app)/packages/page.tsx`) with filter by name, active status
- [x] Package CRUD (create/edit/deactivate) – `/packages/new`, `/packages/[id]/edit`, delete in table
- [x] Student package assignment
  - [x] Assign packages to students (`/enrollments/assign`)
  - [x] Admin enrollment list and edits (`/enrollments`)
  - [x] Admin edit enrollment (classesTotal, status)
- [ ] Package purchase flow (student-facing — deferred to §11 with payment)

**3.3 Timetable View**
- [x] Master calendar (`/timetable`)
  - [x] Weekly view of all bookings with 7-column grid (Mon–Sun)
  - [x] Filter by teacher, student, status
  - [x] Week navigation (prev/next/today)
  - [ ] Drag-and-drop rescheduling (nice-to-have, deferred)
- [x] Reporting (`/reports`)
  - [x] Summary cards (total, this week, this month, active teachers)
  - [x] Teacher utilization table (completion rate)
  - [x] Status breakdown
  - [x] Monthly trend (last 6 months)
  - [ ] Revenue reports (deferred to §11 with payment)

---

### Phase 4: Polish & Production

**4.1 Notifications**
- [ ] In-app notifications
  - [ ] Notification model (database)
  - [ ] Real-time updates (consider Pusher/Ably or polling)
  - [ ] Notification bell in navbar
- [x] Email notifications (**partial — May 2026**)
  - [x] **Booking confirmation** on admin approve (**Nodemailer** + **`EmailSendLog`**; **`/email-logs`** admin audit + resend)
  - [ ] Additional templates: reminder, cancellation, evaluation-ready (**TBD**)
  - [ ] Scheduled reminders (24h before class)

**4.2 Payment Integration**
- [ ] Stripe integration
  - [ ] Checkout session for package purchase
  - [ ] Webhook handlers for payment events
  - [ ] Refund handling
  - [ ] Payment history

**4.3 UX Polish**
- [x] Loading states & skeletons (`app/(app)/loading.tsx`)
- [x] Error boundaries (`app/(app)/error.tsx`)
- [x] Dark mode (theme toggle in header + sidebar)
- [ ] Empty states with CTAs
- [ ] Mobile-responsive design audit
- [ ] Accessibility audit (WCAG 2.1 AA)

**4.4 Performance & Security**
- [ ] API rate limiting
- [x] Input validation (Zod schemas)
- [ ] SQL injection protection (Prisma handles this)
- [x] XSS protection (inline script/style sinks hardened)
- [x] IDOR mitigation for booking reschedule slot lookup
- [x] JWT/session revocation hardening (inactive user claim refresh)
- [x] Restrictive default CORS posture (no wildcard CORS headers configured)
- [x] Secrets-in-source hardening for deployment config (compose env interpolation, no hardcoded DB passwords)
- [ ] Database query optimization
- [ ] Image optimization (if teacher photos)
- [ ] Caching strategy (React Query / SWR)

**4.5 DevOps & Deployment**
- [ ] Environment configuration (dev/staging/prod)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Database backup strategy
- [ ] Error monitoring (Sentry)
- [ ] Analytics (optional)
- [ ] Production deployment (Vercel + managed Postgres)

---

## 9. Open Questions

1. ~~**Is this a paid platform?**~~ ✅ **ANSWERED**: Yes, Package model exists with pricing
2. ~~**Class types?**~~ ✅ **ANSWERED**: 1-on-1 only
3. ~~**Session duration?**~~ ✅ **ANSWERED**: Fixed per bundle (`PackageBundle.duration` in minutes; 0 = writing-only)
4. ~~**Approval workflow?**~~ ✅ **ANSWERED**: Auto-confirm (no teacher approval step)
5. ~~**Multi-language support?**~~ ✅ **ANSWERED**: Not required
6. **Cancellation policy?** How much notice required? Refund policy? *(Deferred to §11 with payment)*
7. ~~**Package expiration?**~~ ✅ **ANSWERED**: Packages don't expire
8. ~~**Teacher onboarding?**~~ ✅ **ANSWERED**: Self-registration with admin approval; can log in but pending state until approved; students auto-approved

---

## 10. Immediate Next Steps (Priority Order)

### Step 0: Schema Revision ✅ COMPLETED (Feb 4, 2026)
- [x] Update `prisma/schema.prisma` with all changes
- [x] Delete existing migration
- [x] Create fresh migration: `20260204182111_init`
- [x] Generate Prisma client

---

### Step 1: Prisma Client Setup

**Purpose:** Create singleton Prisma client to prevent connection exhaustion during development hot-reloads.

**Files to create:**
```
lib/
├── prisma.ts       # Singleton Prisma client
```

**Implementation:**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@/app/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Complexity:** Low (5 minutes)

---

### Step 2: Authentication System

**Purpose:** User registration, login, session management, route protection.

**Technology choices:**
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Auth library | NextAuth.js v5 (Auth.js) | Free, flexible, native Next.js support |
| Session strategy | JWT | Stateless, no session DB needed |
| Password hashing | bcryptjs | Battle-tested, well-supported |

**Dependencies to install:**
```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

**Files created (Feb 8, 2026):**
```
lib/
├── auth.ts              # NextAuth + Credentials (username/password)
├── auth.config.ts       # Edge-compatible config (for proxy)
├── auth-edge.ts         # Edge-safe auth (used by proxy.ts; no Prisma)
├── passwords.ts         # hashPassword, verifyPassword

app/api/auth/[...nextauth]/route.ts   # GET, POST handlers

app/login/page.tsx, app/register/page.tsx   # login wired; registration wired

proxy.ts                 # Route protection (Next.js 16 convention; middleware deprecated)

components/providers.tsx # SessionProvider for client signIn
components/login-form.tsx # Username + password, signIn('credentials')
```

**Still to create:** Post-registration profile onboarding polish (optional); `types/next-auth.d.ts` (optional).

**Authentication flow (implemented):**
```
Login:
  Form (username + password) → signIn('credentials') → Find User by username → Verify Password
  → JWT → Redirect to /dashboard

Route Protection:
  Request → proxy.ts (auth from lib/auth-edge) → Check session → Allow or Redirect to /login
  Protected paths: /dashboard, /users, /teachers, /students, /packages, /calendar

Dashboard (single, permission-based):
  All roles land on /dashboard. app/dashboard/layout.tsx provides shared shell (sidebar, header).
  app/dashboard/page.tsx renders cards + chart for all; Data Table section only for ADMIN (canAccess).
  AppSidebar uses useSession().role and filterByRole() from lib/permissions to show only allowed nav items.
  No separate /admin, /teacher, or /student routes.
```

**Key implementation details:**

1. **Password utilities** (`lib/passwords.ts`):
   - `hashPassword(password)` - bcrypt with 12 salt rounds
   - `verifyPassword(password, hash)` - compare passwords

2. **Auth config** (`lib/auth.config.ts`):
   - Custom pages: `/login`, `/register`
   - JWT callback: Add `id` and `role` to token
   - Session callback: Add `id` and `role` to session
   - Authorized callback: Protect dashboard routes

3. **Credentials provider** (`lib/auth.ts`):
   - Find user by **username** (not email)
   - Verify password hash
   - Check `isActive` status
   - Return user object (id, email, name, role) for JWT

4. **Proxy** (`proxy.ts` – Next.js 16 convention; `middleware.ts` is deprecated):
   - Protect: `/dashboard` and `/dashboard/*`
   - Redirect unauthenticated users to `/login`
   - Uses `lib/auth-edge.ts` (edge-safe; no Prisma) to avoid loading Node-only code in Edge

5. **Registration** (`app/register/actions.ts` – implemented):
   - Validate input (username/email uniqueness, password policy)
   - Hash password
   - Create `User` + `StudentProfile` or `TeacherProfile` in a transaction
   - Redirect to login with `registered=1`

**Complexity:** Medium (core functionality)

---

### Step 3: UI Component Library

**Purpose:** Reusable, consistent UI components.

**Recommendation:** shadcn/ui

**Setup:**
```bash
npx shadcn@latest init
npx shadcn@latest add button input label card form toast dialog select table
```

**Icons:** Use **@solar-icons/react** for UI. Import named components directly in the consuming file (no icon wrapper files).
```ts
import { Widget4 } from "@solar-icons/react"
```
Do not add Tabler Icons or Lucide for UI; use Solar icons for new and replacement icons.

**Minimum components needed:**
| Component | Usage |
|-----------|-------|
| Button | Actions, submit |
| Input | Form fields |
| Label | Form labels |
| Card | Content containers |
| Form | Form validation (react-hook-form + zod) |
| Toast/Sonner | Notifications |
| Dialog | Modals |
| Select | Dropdowns |
| Table | Data display (admin) |

**File structure:**
```
components/
├── ui/                  # shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── forms/               # Custom form components
│   └── auth-form.tsx
└── layout/              # Layout components
    ├── navbar.tsx
    ├── sidebar.tsx
    └── footer.tsx
```

---

### Step 4: Dashboard Layouts

**Purpose:** Role-based dashboard shells with navigation.

**File structure:**
```
app/
├── api/auth/[...nextauth]/route.ts
├── proxy.ts
├── (app)/                      # Protected app shell (sidebar + header)
│   ├── layout.tsx              # Auth check + sidebar + header
│   ├── dashboard/page.tsx     # Dashboard home
│   ├── dashboard/[...slug]/page.tsx # Role-gated placeholders
│   ├── calendar/page.tsx      # Shared calendar for confirmed bookings
│   ├── teachers/page.tsx      # Availability management (teacher slot creation)
│   ├── students/page.tsx      # Bundle browsing + slot booking
│   ├── packages/page.tsx      # Package list
│   ├── packages/[id]/page.tsx # Package detail
│   ├── packages/[id]/book/page.tsx # Package booking flow (enrollment-aware)
│   ├── users/page.tsx         # ADMIN: user list
│   ├── users/new/page.tsx    # ADMIN: create user
│   └── email-logs/page.tsx   # ADMIN: outbound email audit log
├── login/page.tsx
└── register/page.tsx
```

**Navigation items per role:**

| Admin | Teacher | Student |
|-------|---------|---------|
| Dashboard (/dashboard) | Dashboard (/dashboard) | Dashboard (/dashboard) |
| Calendar (/calendar) | Calendar (/calendar) | Calendar (/calendar) |
| Users (/users) | — | — |
| Teachers (/teachers) | Teachers (/teachers) | Teachers (/teachers) |
| Students (/students) | Students (/students) | Students (/students) |
| Packages (/packages) | Packages (/packages) | Packages (/packages) |

---

### Step 5: Core Features

**Phase 2 features by role:**

**Admin:**
- [x] User management (list + filters + create + edit + role change + activate/deactivate)
- [x] Package CRUD (create/edit/deactivate)
- [x] Bundle CRUD (create/edit/deactivate) with tier pricing + duration + evaluation toggle
- [x] Teacher approval (self-registration → pending → admin approves from `/users` or `/teachers/manage`)
- [x] Teacher management page (`/teachers/manage`): approve, toggle active, stats, admin-create-availability
- [x] ~~Student enrollment management~~ **removed** (May 2026) — bundle-only student booking; packages are catalog-only for students
- [x] Timetable (`/timetable`) + Reports (`/reports`)

**Teacher:**
- [x] Profile setup (bio editing via `/profile`)
- [x] Availability management (calendar UI + create slots)
- [x] Availability edit/delete (unbooked slots)
- [x] View assigned bookings (`/bookings` + `/calendar`)
- [x] Complete bookings (mark as COMPLETED)
- [x] Session room: set Meet link, view PDF uploads, submit evaluation

**Student:**
- [x] Browse bundle offers and book slots via `/students` (anonymous, single-offered-slot UX)
- [x] Package detail is **catalog**; booking via `/students` (bundle flow); `/packages/[id]/book` redirects to `/students`
- [x] View confirmed bookings via `/calendar`
- [x] Cancel/reschedule bookings (from calendar day view)
- [x] Dedicated "My bookings" page (`/bookings`) with Upcoming/Past/Cancelled tabs
- [x] ~~Enrollment progress~~ removed with enrollments model
- [x] Session room: view Meet link, upload writing PDF, view evaluation + 24h download
- [x] Writing-only bundle flow: choose submission window, upload PDF

---

### Implementation Order

| Order | Task | Status | Depends On |
|-------|------|--------|------------|
| 0 | Database schema | ✅ Done | - |
| 1 | Prisma client | ✅ Done | Database |
| 2 | Authentication (lib, API, proxy, login UI, role redirect) | ✅ Done | Prisma client |
| 3 | UI components (shadcn init + blocks + Solar icons) | ✅ Done | - |
| 4 | Registration flow (multi-step form + server action) | ✅ Done | Auth + UI |
| 5 | Dashboard layouts (`app/(app)/` route group, sidebar, header) | ✅ Done | Auth + UI |
| 6 | Admin user management (list, create, filters) | ✅ Done | Dashboards |
| 7 | Teacher availability (calendar, slot creation, day view, edit/delete) | ✅ Done | Dashboards |
| 8 | Package listing (list, filters, CRUD) | ✅ Done | Dashboards |
| 9 | Zod validation + loading/error states + role guards on actions | ✅ Done | All above |
| 10 | Booking system (package-first + slot generation + assignment) | ✅ Done | Availability + Packages |
| 11 | Profile management (teacher/student) | ✅ Done | Auth |
| 12 | Package CRUD + bundles | ✅ Done | Packages |
| 13 | Session room (Meet, PDF upload, evaluation, download) | ✅ Done | Booking |
| 14 | Student bookings + teacher sessions pages | ✅ Done | Booking |
| 15 | Admin teacher management + timetable + reporting | ✅ Done | Dashboards |
| 16 | Writing-only bundle flow | ✅ Done | Session room |

### Next on the plan

**Phase 2–3 complete** (Apr 10, 2026). Remaining work is **Phase 4** (notifications, payment integration, polish, performance, DevOps) — see above. Payment and refund specifics are deferred to **§11**.

---

## 9. Pending Booking Flow (May 2026)

**Status:** **Implemented** (code + DB, May 2026). New bookings from bundle (and writing-only) flows are **`PENDING`** until an **admin** confirms. **`StudentEnrollment` removed** — no `classesUsed` increment/decrement.

### 9.1 Overview

Students complete the booking wizard → **`PENDING`** + **`paymentStatus: PENDING`**. **Admin** approves → **`CONFIRMED`** + **`paymentStatus: PAID`** (interim mapping until payment API in **§11**). **Reject** → **`CANCELLED`**, **`paymentStatus: FAILED`**, reason appended to **`notes`**. Merged **`/bookings`** for all roles; **`/bookings/teaching`** redirects to **`/bookings`**. **Pending** bookings do not appear in **student** or **teacher** lists; **session room** redirects if **`PENDING`**.

### 9.2 Requirements

| # | Requirement | Details |
|---|-------------|---------|
| 1 | **Booking status on submission** | Student booking creates `Booking` with `status: PENDING` (changed from `CONFIRMED`) |
| 2 | **Slot blocking** | PENDING bookings block slots for other students (treated as conflicts in slot generation and booking checks) |
| 3 | **No enrollment** | `StudentEnrollment` model **dropped**; no class-quota tracking on booking |
| 4 | **Admin-only Pending tab** | New "Pending" tab visible only to `ADMIN` users on the merged `/bookings` page |
| 5 | **Admin confirmation** | Admin can confirm pending bookings (changes status `PENDING` → `CONFIRMED`) |
| 6 | **Admin rejection** | Admin can reject pending bookings with a **mandatory** rejection reason |
| 7 | **Rejection cleanup** | On rejection: set `status: CANCELLED`, `paymentStatus: FAILED`, append reason to `notes` (`[REJECTED] <reason>`); slot freed via non-CANCELLED conflict rules |
| 8 | **Student visibility** | Students cannot see their own PENDING bookings (filtered out from student bookings view) |
| 9 | **Merged bookings page** | Merge `/bookings` (student) and `/bookings/teaching` (teacher) into a single `/bookings` page with role-based rendering |
| 10 | **Teacher access** | Teachers see only their assigned sessions (Upcoming/Past tabs, no Pending tab) |
| 11 | **Admin access** | Admins see all bookings (Upcoming/Past/Pending tabs) |
| 12 | **Route redirect** | Legacy `/bookings/teaching` permanently redirects to `/bookings` |
| 13 | **Reject reason storage** | Rejection reason stored in existing `Booking.notes` field (append format: `\n[REJECTED] <reason>`) |
| 14 | **Cancel rules** | Students may **cancel/reschedule** only **`CONFIRMED`** bookings. **PENDING** handled by **admin** (confirm/reject). Non-admin roles cannot cancel **PENDING** |
| 15 | **Bundle-only student booking** | Package book route redirects to `/students`; no package-enrollment booking path |

### 9.3 Implementation reference (shipped)

| Area | Location |
|------|-----------|
| Create **`PENDING`** booking | `createBookingForSlot`, `createWritingOnlyBooking` in `app/(app)/packages/actions.ts` |
| Slot conflicts / teacher load | `lib/slot-generator.ts` (`generateSlots`, `assignTeacher`) |
| Merged bookings UI | `app/(app)/bookings/page.tsx`; `components/bookings-sessions-section.tsx`; `components/admin-pending-bookings.tsx` |
| Confirm / reject actions | `app/(app)/bookings/actions.ts` (confirm calls **`dispatchBookingConfirmationEmail`** after status update) |
| Outbound confirmation mail + **`EmailSendLog`** | `lib/booking-mail.ts`, `lib/dispatch-booking-confirmation-email.ts` |
| Admin mail audit UI | `app/(app)/email-logs/page.tsx`; `components/email-send-log-table.tsx`; **`resendBookingConfirmationAsAdmin`** in `app/(app)/email-logs/actions.ts` |
| Teaching redirect | `app/(app)/bookings/teaching/page.tsx` → `/bookings` |
| Session room guard | `app/(app)/sessions/[bookingId]/room/page.tsx` |
| Student toast | `components/bundle-cards.tsx` |
| Past date/time enforcement | Same as **§4.2**: `bundle-cards.tsx` + `findSlotForPreference` / `createBookingForSlot` in `packages/actions.ts` |

### 9.4 Data model impact

- **Dropped:** `StudentEnrollment`, `EnrollmentStatus` (migration `20260503120000_drop_student_enrollments`).
- **Booking:** `status`, `paymentStatus`, `notes`; **`packageId`** usually **null** for bundle bookings.

### 9.5 Updated user flows

**Student booking flow:** bundle wizard → **`PENDING`** → toast (payment copy) → **`/dashboard`** → listing hides **`PENDING`** until **`CONFIRMED`**.

**Admin:** **`/bookings?tab=pending`** → Confirm (**`CONFIRMED`** / **`PAID`**) or Reject (**`CANCELLED`** / **`FAILED`** + **`notes`**).

### 9.6 Outbound email (booking confirmation) & admin delivery log

**Status:** **Implemented** (May 2026).

**Purpose:** Notify the student when an admin confirms a pending booking; persist an **audit trail** of every SMTP attempt (success or failure) for operations.

**Libraries:** **`nodemailer`** (v7.x, aligned with optional NextAuth peer). **`lib/booking-mail.ts`** builds plain-text + HTML bodies, creates the transport from env, and exposes **`sendBookingConfirmedEmail`**. **`lib/dispatch-booking-confirmation-email.ts`** resolves package/bundle labels, calls send, then **`prisma.emailSendLog.create`**—always **one log row per attempt**.

**Trigger:** **`BOOKING_CONFIRM`** — runs immediately after `confirmPendingBooking` updates the booking to **`CONFIRMED`** (admin user id stored on the log when available). **`ADMIN_RESEND`** — admin-only server action after verifying the typed recipient matches **`resolveBookingRecipientEmail`** for that booking.

**Data model (`EmailSendLog`, migration `20260504060013_add_email_send_logs`):**

| Field | Notes |
|-------|--------|
| `bookingId`, `userId` (student) | FKs; cascade on booking delete |
| `type` | `BOOKING_CONFIRMED` (extensible for future mail types) |
| `toEmail` | Snapshot address used; **`(none)`** if no recipient (logged as **FAILED**) |
| `status` | **`SENT`** or **`FAILED`** |
| `errorMessage` | Short SMTP/config error text when **FAILED** |
| `trigger` | **`BOOKING_CONFIRM`** or **`ADMIN_RESEND`** |
| `triggeredByUserId` | Admin user for confirm/resend; nullable |
| `createdAt` | Attempt timestamp |

**Admin UI:** **`/email-logs`** (sidebar **Email log**, admin-only). Tabular history (newest first, cap 1000 rows); columns include status, error summary, trigger, admin username. **Resend** opens a dialog: admin must **type the recipient email** matching the booking’s resolved address before **`ADMIN_RESEND`** is executed. **Students do not** have a mail-log page.

**Configuration (see `.env.example`):** Minimum **`SMTP_HOST`** and **`MAIL_FROM`**. Optional **`SMTP_PORT`** (default **587**), **`SMTP_SECURE`** (`true` for typical **465** SSL), **`SMTP_USER`** / **`SMTP_PASSWORD`** when the relay requires auth. Missing host/from → send fails with a clear error string stored on the log; **booking confirmation in the DB is unchanged**.

---

## 10. Design Decisions for Pending Flow

| Decision | Rationale | Date |
| -------- | ---------- | ---- |
| **CONFIRMED** only after admin (Option A) | Payment/checkout UI can complete before admin approval; **product** confirmation is admin-gated until §11 changes this | 2026-05-03 |
| **`paymentStatus` mirrored from lifecycle** | Same row stores **`paymentStatus`** for future APIs; confirm sets **`PAID`**, reject sets **`FAILED`** (interim) | 2026-05-03 |
| PENDING bookings block slots | Non-**`CANCELLED`** bookings are scheduling conflicts | 2026-05-03 |
| Removed **StudentEnrollment** | Bundle-only booking; no class quota | 2026-05-03 |
| Rejection reason in **`notes`** | No extra columns; append **`[REJECTED]`** | 2026-05-03 |
| Students/teachers never see **PENDING** in lists | Pending queue is **admin-only**; session room blocked for **PENDING** | 2026-05-03 |
| Merged **`/bookings`** | One route; teacher legacy path redirects | 2026-05-03 |
| Local **`min`** date + server **`scheduledAt`** check | Students cannot pick or submit bundle slots in the past (**§4.2**) | 2026-05-03 |
| Outbound **SMTP** + **`EmailSendLog`** | Nodemailer confirmation on admin approve; audit row per attempt; resend with recipient verification; **no student-facing log** | 2026-05-04 |

---

## 11. Deferred specifications: payment, refunds, and finance

> **Status:** Intentionally incomplete. The stakeholder will specify **payment and financial rules after the rest of the application is complete**. This section reserves headings only; no binding product rules here yet.

Planned topics to document later:

- **Payment provider** integration (API, checkout UI, webhooks, idempotency).
- **State machine** alignment with **`Booking.status`** and **`paymentStatus`**: pending checkout, success, failure, expiry, and how each affects **slot visibility** for other students.
- **Refunds** and **chargebacks**; **student-initiated cancellation** (must **free the teacher’s schedule**; refund amounts and timing TBD).
- **Reconciliation**, taxes, invoices, and admin reporting (if in scope).

Until this section is filled in, engineers should treat **§1.4**–**§1.6** and **§9** as the **product intent**. Bookings start **`PENDING`**; **`CONFIRMED`** follows **admin approval**; **`paymentStatus`** is updated in parallel for future gateway integration (**§4.2**).

---

## 12. Changelog

| Date       | Changes                                                    | Author |
| ---------- | ---------------------------------------------------------- | ------ |
| 2026-01-31 | Initial system design document created                     | -      |
| 2026-01-31 | Database schema implemented with Package, StudentProfile   | -      |
| 2026-02-04 | Updated roadmap with detailed implementation phases        | -      |
| 2026-02-04 | Documented schema evolution and design decisions           | -      |
| 2026-02-04 | Added snake_case table naming convention (@@map)           | -      |
| 2026-02-04 | Added PackageBundle models                                 | -      |
| 2026-02-04 | Added StudentEnrollment model (replaces subjects/packageId)| -      |
| 2026-02-04 | Added TeacherPackage model (replaces subjects)             | -      |
| 2026-02-04 | Removed amountPaid/expiresAt from StudentEnrollment        | -      |
| 2026-02-04 | Removed EXPIRED from EnrollmentStatus enum                 | -      |
| 2026-02-04 | Added paymentId to StudentEnrollment                       | -      |
| 2026-02-04 | Identified future tables: Notification, Review, Transaction| -      |
| 2026-02-04 | Database migration completed: `20260204182111_init`        | -      |
| 2026-02-04 | Detailed Step 1-5 implementation plan documented           | -      |
| 2026-02-04 | Auth decision finalized: NextAuth.js v5                    | -      |
| 2026-02-08 | Step 1 completed: Prisma client singleton in `lib/prisma.ts` | -      |
| 2026-02-08 | Username added to User model; migration `20260208000000_add_username_to_users` (backfill existing rows) | -      |
| 2026-02-08 | Auth lib: `lib/auth.ts`, `lib/auth.config.ts`, `lib/auth-edge.ts`, `lib/passwords.ts`; Credentials by **username** | -      |
| 2026-02-08 | Auth API `app/api/auth/[...nextauth]/route.ts`; route protection via **proxy.ts** (Next.js 16; middleware deprecated) | -      |
| 2026-02-08 | Login: shadcn login-03 block, username + signIn, SessionProvider; post-login redirect from /dashboard by role | -      |
| 2026-02-08 | Dashboard: /dashboard redirects by role; /admin = dashboard-01 block; /teacher, /student placeholders | -      |
| 2026-02-08 | shadcn init + login-03 + dashboard-01 blocks; lib/utils.ts, tw-animate-css; register placeholder page | -      |
| 2026-02-08 | Prisma client uses pg adapter (Pool + PrismaPg) for Prisma 7 compatibility | -      |
| 2026-02-08 | Doc updated: planning, folder structure, Phase 1.2/1.3/1.4 status, proxy convention | -      |
| 2026-02-20 | Single dashboard: one app at /dashboard; admins see all sidebar pages, teachers only teacher-related, users only user-related; lib/permissions.ts; sub-route placeholders + role check; doc updated | -      |
| 2026-02-20 | Removed app/admin, app/teacher, app/student pages; auth protects only /dashboard | -      |
| 2026-02-21 | Icons: standardized on @solar-icons/react for UI; named imports directly in components (no icon wrappers) | -      |
| 2026-03-10 | Package-first booking: `getAvailableSlotsForPackage`, `getEnrollmentForPackage`, `createBooking` (Zod + USER role guard, transaction booking + classesUsed). Package detail `/packages/[id]` links to booking page `/packages/[id]/book`; `PackageBookingSection` (slot list, confirm modal, success/error). Packages table links name to detail. Edge case: avoid `@solar-icons/react` on this route tree (SSR createContext error); use emoji. DESIGN_DOC: Phase 2.2/2.3 and 3.2 updated; step 10 done. | -      |
| 2026-02-21 | DB: users.userName (camelCase); Prisma model field renamed to userName so generated client uses correct column; SYSTEM_DESIGN.md: all columns camelCase | -      |
| 2026-03-14 | Removed `teacher_packages` linkage; teacher booking restrictions now expressed via `Availability.bundleIds` (teacher slot popup) | -      |
| 2026-03-30 | Public home (`app/page.tsx`) redesigned as ExamBridge-style marketing landing: palette `#0B0B0F` / `#F7F7F7` / `#7C5CFF`, Playfair Display headings via `layout.tsx`, hero uses `public/hero.png`, responsive header with mobile menu (`components/landing-header.tsx`); feature screenshots approximated with inline UI mocks for Listening / writing feedback / report. | -      |
| 2026-03-30 | **Gap fill (profile, availability, users, bookings):** `/profile` + `updateOwnProfile` (user fields + teacher bio when a `TeacherProfile` exists). Teachers can **edit/delete** unbooked slots (`updateAvailability`, `deleteAvailability`, UI under day availability dialog). **Admin user edit** at `/users/[id]/edit` (`updateUser`: role, active, optional password reset); **createUser** now creates `StudentProfile` / `TeacherProfile` when applicable. **cancelBooking** / **rescheduleBooking** + open-slot helpers in `packages/actions`; calendar **day bookings** dialog exposes cancel (student/teacher/admin) and reschedule (students). Proxy protects `/profile`. | -      |
| 2026-03-30 | **Product vision (§1.4):** Documented agreed target experience—speaking-only calendar bookings (Meet link), PDF writing after speaking (~1h window), teacher evaluation + email to student, payment-gated confirmation, bundle variants without speaking, and deferred design questions. | -      |
| 2026-03-31 | **§1.5 Availability & categories:** Teachers add **multi-block** day ranges (not only whole-day); students get **generated** start times from blocks using **bundle-fixed** duration + **10 min** same-teacher same-day gap. **Standard (≥48h) / Priority (24–48h) / Instant** from lead time before class in **UTC+5:45**; category affects **price/eligibility**, not length. **Payment buffer** before session start (minutes TBD). Notes on schema migration from 1:1 Availability–Booking. | -      |
| 2026-04-01 | **§1.6 Student booking UX:** **Date → preferred time → single offered slot** with **server-assigned teacher** (students **never** see teacher names). **Nearest** alternative(s) if preference unavailable; **hold** on accept until payment; assignment policy TBD. §1.5 retitled “generated slots (server-side)” and references §1.6 for presentation. Target journey in §1.4 updated. Optional note on ~6pm booking cutoff. | -      |
| 2026-04-02 | **Stakeholder + doc alignment:** Rewrote **§1.1–§1.3** (IELTS/speaking/writing/session-room). **§1.7 Option A:** (1) Meet, (2) **student PDF**, (3) teacher eval, (4) final eval + student **24h** download. **Payment** via **`Booking` status / `paymentStatus`**; mechanics **deferred to §11**. **Instant** = **same civil calendar day** in **UTC+5:45**. **§1.6:** **Bikram Sambat week** load + **round-robin** tie-break; status-based blocking (no primary “hold” table). **§2:** **admin full control**. **§4.2** / **§5.3:** shipped vs target booking; **`PackageBundle`** tier columns **`priceStandard` / `pricePriority` / `priceInstant`**. New **§11** deferred finance; **§12** changelog. | -      |
| 2026-04-10 | **Phase 2-3 complete.** Schema: `duration` + `hasEvaluation` on `PackageBundle`; `isApproved` on `TeacherProfile`; `meetLink`, `bundleId`, `submissionStart/End` on `Booking`; `Evaluation` + `WritingSubmission` models. Bundle form (duration, eval toggle, 3 prices). Teacher self-reg approval. Slot generation (`lib/slot-generator.ts`). Student single-offered-slot UX. Session room (4-step). Writing-only bundles. Student bookings + enrollments. Teacher sessions. Admin: manage teachers, enrollments, timetable, reports. Open questions resolved. | -      |
| 2026-04-25 | **Google Meet API integration:** `lib/google-meet.ts` — Meet REST API v2 via `googleapis`; service account + domain-wide delegation; `RECORD_ON_START` enabled. `room/page.tsx` auto-generates link on first load for speaking sessions; stores to `Booking.meetLink`. `session-room.tsx` `MeetLinkStep` simplified to display-only; shows error notice if generation failed. `googleapis` added to dependencies. Env vars: `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_MEET_HOST_EMAIL`. | -      |
| 2026-04-25 | **Writing Question Bank:** New `WritingQuestion` model (`writing_questions` table). `lib/writing-question-assigner.ts` — unseen-first, least-used fallback assignment logic. Questions auto-assigned in `createBookingForSlot` + `createWritingOnlyBooking` for bundles with `hasEvaluation`. `/question-bank` page (admin + teacher) for uploading/managing questions. `/api/questions/[questionId]/view` for secure PDF serving. Session room gains `WritingPromptStep` — locked to students until `scheduledAt ≤ now`. `Booking` gains `writingQuestionId` FK. | -      |
| 2026-04-20 | **Public landing (`app/page.tsx`):** Rebuilt to match `Frame.png` rhythm (hero, three cards, experience band, three-tier pricing, FAQ accordions, multi-column footer). **`ListeningMock`** is the only large UI mock, right column of `#experience`; hero stays **`/hero.png`**. **Pricing:** static NPR tier amounts per `public/price.png` (**1400 / 1680 / 1820**), cards use same system as feature band (light section, white `rounded-2xl` cards, accent **Select**). Inline writing/report mocks removed; messaging folded into cards. **`components/landing-header.tsx`:** center nav (md+) to `#features`, `#experience`, `#pricing`, `/packages`. | -      |
| 2026-04-27 | **Security hardening pass (5 issues):** IDOR fix for `findSlotsForReschedule` with object-level auth parity; XSS hardening for inline JSON-LD/style sinks via `lib/security.ts`; JWT claim refresh + deactivation handling in auth callbacks; restrictive CORS posture verified (no permissive headers); secrets-in-source reduction in Docker/Compose + deployment docs updates. | -      |
| 2026-05-03 | **Past date/time validation (bundle booking):** `bundle-cards.tsx` — date **`min`** uses **local** calendar today; toast + clear on invalid input; guard before **Find slot**. **`findSlotForPreference`** / **`createBookingForSlot`** (`packages/actions.ts`) — reject past calendar date, past offered slot start, and **`scheduledAt ≤ now`**. Documented **§4.2**, **§6.1**, **§9.3**, **§10**. | -      |
| 2026-05-04 | **Outbound booking confirmation email:** **Nodemailer** (`lib/booking-mail.ts`) + **`dispatchBookingConfirmationEmail`** after **`confirmPendingBooking`**. New **`EmailSendLog`** model + migration **`20260504060013_add_email_send_logs`**; enums **`EmailSendType`**, **`EmailSendStatus`**, **`EmailSendTrigger`**. Admin-only **`/email-logs`** (`components/email-send-log-table.tsx`, **`email-logs/actions.ts`** resend with recipient match). **`.env.example`** SMTP variables. Doc updates: **§1.4**, **§2**, **§5.2–5.3**, **§6.1**, **§9.3**, **§9.6**, Phase **4.1**, changelog. | -      |
| 2026-05-04 | **Public landing footer (Legal):** **`app/page.tsx`** — added **`/cancellation-and-refund-policy`** next to Terms & Privacy (`Cancellation & Refund Policy`). Renders via **`app/[slug]/page.tsx`** + **`StaticPage`** (`slug` must exist and be active in admin **Static Pages**). **§13** updated. | -      |

---

## 13. Public landing (`/`)

- **Layout reference:** `public/Frame.png` (Apr 2026) — banded backgrounds, serif headlines with accent `<em>`, card shadows, three pricing columns, `<details>` FAQ rows.
- **Exam preview:** `ListeningMock` only (no duplicate “experience” section); placed in `#experience` beside computer-delivered copy.
- **Pricing (home):** Static NPR amounts (**1400 / 1680 / 1820**) and tier labels from `public/price.png`; same card chrome as the feature grid (`#F7F7F7` band, white bordered cards, `#7C5CFF` primary **Select**). Replace with live catalog pricing when marketing is ready to wire DB.
- **Copy stance:** Marketing emphasizes **computer-based full mocks**, **human writing review**, and **reports** so the page stays truthful alongside §1.4 speaking/writing session flows.
- **Footer — Legal (`app/page.tsx`):** Column lists **`/terms-and-conditions`**, **`/privacy-policy`**, and **`/cancellation-and-refund-policy`** (“Cancellation & Refund Policy”). Each path is served by the **public static page** route **`app/[slug]/page.tsx`**, backed by **`StaticPage.slug`** in the database (admin **Static Pages**). Ensure an active page row exists with **`slug = cancellation-and-refund-policy`** or the link returns **404**.
