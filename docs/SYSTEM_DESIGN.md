# IVCS - System Design Document

> **Last Updated**: April 10, 2026  
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
3. Lets **students** book **speaking** sessions through **bundles** and **packages**, with a **target** flow of **date → preference → single offered slot** and **server-side teacher assignment** (**§1.6**).
4. Uses **`Booking` status and payment fields** (not a separate hold subsystem as the primary story) so that **only a paid, confirmed booking** blocks a segment for other students (**§1.4**); detailed payment mechanics are **deferred to §11**.
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
  - **Standard:** **≥ 48 hours** before session start (lead time from **confirmation** to **session start**).
  - **Priority:** **≥ 24 hours** and **< 48 hours** before session start (same lead-time definition).
  - **Instant:** **Same civil calendar day:** the **booking confirmation** timestamp and the **session start** fall on the **same calendar date** in **UTC+5:45** (e.g. if the student confirms on **Monday**, any session that **Monday** in that timezone is eligible for **Instant** pricing for that booking—not “until midnight Nepali” as a separate rule; the **date** match is the product rule). Sessions on a **different** calendar date use **Priority** or **Standard** by the **24h / 48h** cutoffs above.
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
3. The server considers all **valid generated segments** for that date and bundle (respecting **§1.5** gap rules, `bundleIds` / package rules, existing **confirmed/paid** bookings, and any **pending-checkout** rows represented via **`Booking` / payment state** per **§1.4**).
4. The server returns **one primary offering**: a single **concrete bookable segment** (specific start/end and internal teacher assignment) that **best matches** the preference (policy **TBD**: e.g. closest start at or after requested time, or minimum absolute delta—document in code when fixed).
5. If **no** segment matches the preference (or all matching segments are unavailable), the server responds with the **nearest** acceptable alternative(s) (e.g. next available start on that day, and/or a small list of alternates — **count and “nearest” definition TBD**).
6. When the student **accepts** the offered slot, the system creates or updates booking state so **payment** can complete; **blocking competing students** is expressed through **`Booking.status` / `paymentStatus`** (and timeouts/cleanup **TBD** in **§11**), not a separate hold entity as the primary design.

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
| **Admin**          | System administrator      | **Full control:** manage users, packages, and bundles; view and change bookings; **override scheduling**; **assign or reassign teachers**; perform **teacher-only** operations where the product allows (e.g. create or edit **availability** on behalf of a teacher). Exact UI surfaces evolve with implementation. |
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
| priceStandard    | Decimal  | Price for **Standard** lead-time tier (≥48h before session, **UTC+5:45**) |
| pricePriority    | Decimal  | Price for **Priority** tier (24–48h before session) |
| priceInstant     | Decimal  | Price for **Instant** tier (**same civil calendar day** as session in **UTC+5:45**) |
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

### 4.2 User Booking Flow (Package-First)

**Current implementation (shipped today):**

```
1. User (student) logs in
2. Option A (bundle discovery): Browse featured bundles from the "Students" page, search by date, and book an available slot
   - Creates a Booking tied to the Availability; `packageId` is optional (no enrollment required).
3. Option B (package booking): Browse packages, open package detail, and use the "Book a session" flow
   - Requires an ACTIVE StudentEnrollment with remaining classes.
4. Select an available slot and confirm
5. The server creates the Booking with status `CONFIRMED` immediately; payment checkout is not enforced yet.
6. If `packageId` is provided, the system increments `StudentEnrollment.classesUsed` in the same transaction as the booking.
```

**Target (per §1.4, §1.5, §1.6, §11):** introduce **payment-gated** confirmation so the slot is only **fully booked** after **successful payment**; represent checkout and timeouts via **`Booking.status`** and **`paymentStatus`**. Student flow becomes **date → preferred time → single offered slot → pay → confirmed**. Bundle **tier price** at checkout comes from **Standard / Priority / Instant** fields on **`PackageBundle`**.

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

**Sidebar pages by role (current — implemented, Apr 10 2026):**

| Page              | Route              | ADMIN | TEACHER | USER (Student) |
|-------------------|--------------------|-------|---------|----------------|
| Dashboard         | /dashboard         | ✓     | ✓       | ✓               |
| Calendar          | /calendar          | ✓     | ✓       | ✓               |
| My Bookings       | /bookings          | —     | —       | ✓               |
| My Enrollments    | /enrollments       | —     | —       | ✓               |
| My Sessions       | /bookings/teaching | —     | ✓       | —               |
| Users             | /users             | ✓     | —       | —               |
| Manage Teachers   | /teachers/manage   | ✓     | —       | —               |
| Enrollments       | /enrollments       | ✓     | —       | —               |
| Teachers          | /teachers          | ✓     | ✓       | ✓               |
| Students          | /students          | ✓     | ✓       | ✓               |
| Packages          | /packages          | ✓     | ✓       | ✓               |
| Timetable         | /timetable         | ✓     | —       | —               |
| Reports           | /reports           | ✓     | —       | —               |

**Dashboard home:** Section cards visible to all roles.

**Route protection:** The `app/(app)/layout.tsx` enforces authentication. Pages with restricted access (e.g. `/users`) add role checks via `canAccess()`. Server actions also enforce their own role checks independently of pages.

### 5.3 Database Schema (Prisma)

**Status**: ✅ Implemented — baseline Feb 4, 2026; subsequent migrations include bundle tier pricing (`20260402120000_bundle_category_prices`, etc.). See `prisma/migrations/`.

#### Models Overview

| Model | Table Name | Purpose |
|-------|------------|---------|
| `User` | `users` | Base user with **username** (login), email, role (ADMIN, TEACHER, USER), auth fields |
| `StudentProfile` | `student_profiles` | Extended student info, linked to enrollments |
| `TeacherProfile` | `teacher_profiles` | Extended teacher info: bio, availability, `isApproved` (self-reg approval gate) |
| `Availability` | `availabilities` | Date-specific time slots teachers mark as available |
| `Package` | `packages` | Purchasable class packages with pricing |
| `Booking` | `bookings` | Scheduled sessions, links User → Teacher → Availability; includes `meetLink`, `bundleId`, `submissionStart`/`End` |
| `ClassMetadata` | `class_metadata` | Completed class records for history/reporting |
| `PackageBundle` | `package_bundles` | Marketing bundles: `priceStandard`/`Priority`/`Instant`, `duration` (0=writing-only), `hasEvaluation` |
| `StudentEnrollment` | `student_enrollments` | Junction: Student ↔ Package with enrollment tracking |
| `Evaluation` | `evaluations` | Teacher evaluation per booking: integer `score` + free-text `feedback` |
| `WritingSubmission` | `writing_submissions` | Student PDF uploads linked to bookings |
| `WritingQuestion` | `writing_questions` | IELTS writing question PDFs uploaded by teachers/admins; auto-assigned to eligible bookings |

#### Enums

| Enum | DB Type | Values |
|------|---------|--------|
| `Role` | `role` | ADMIN, TEACHER, USER |
| `BookingStatus` | `booking_status` | PENDING, CONFIRMED, CANCELLED, COMPLETED |
| `PaymentStatus` | `payment_status` | PENDING, PAID, REFUNDED, FAILED |
| `EnrollmentStatus` | `enrollment_status` | ACTIVE, COMPLETED, CANCELLED |

#### Key Design Decisions

1. **snake_case table names**: All tables use `@@map()` for PostgreSQL convention (e.g. `users`, `teacher_profiles`).
2. **camelCase column names**: All table columns use **camelCase** in the database (e.g. `userName`, `passwordHash`, `firstName`, `createdAt`). In Prisma, use the same camelCase field name so the generated client uses the correct column name in queries. New migrations must create columns in camelCase for consistency.
3. **Explicit junction tables**: Most many-to-many relationships use explicit junctions for metadata support (e.g. StudentEnrollment). Bundles store package membership via `packageIds[]`.
4. **Package-centric model**: Teachers and Students link to Packages (not free-text subjects)
5. **Enrollment tracking**: StudentEnrollment tracks classes total/used, expiry, status
6. **Payment integration status**: Payment-related fields (`paymentStatus`, `transactionId`, `paymentId`) exist, but payment checkout/webhook processing is not implemented yet; package-based booking currently increments `StudentEnrollment.classesUsed` when the booking is created

#### New Tables (Feb 4, 2026)

**PackageBundle** - Marketing bundles (three **lead-time tier** prices)
```
id, name, description,
priceStandard, pricePriority, priceInstant,
discountPercent,
isActive, isFeatured, validFrom, validUntil,
packageIds[], createdAt, updatedAt
```

**StudentEnrollment** - Student ↔ Package junction
```
id, studentId, packageId, enrolledAt,
status (EnrollmentStatus), classesTotal, classesUsed,
paymentId, createdAt, updatedAt
@@unique([studentId, packageId])
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
  - [x] Track package usage/remaining classes (`/enrollments`)
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
- [ ] Email notifications
  - [ ] Email service integration (Resend, SendGrid, etc.)
  - [ ] Templates: Booking confirmation, reminder, cancellation
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
- [ ] Input validation (Zod schemas)
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection
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
│   └── users/new/page.tsx    # ADMIN: create user
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
- [x] Student enrollment management (`/enrollments`): assign, edit, track
- [x] Timetable (`/timetable`) + Reports (`/reports`)

**Teacher:**
- [x] Profile setup (bio editing via `/profile`)
- [x] Availability management (calendar UI + create slots)
- [x] Availability edit/delete (unbooked slots)
- [x] View assigned bookings (`/bookings/teaching` + `/calendar`)
- [x] Complete bookings (mark as COMPLETED)
- [x] Session room: set Meet link, view PDF uploads, submit evaluation

**Student:**
- [x] Browse bundle offers and book slots via `/students` (anonymous, single-offered-slot UX)
- [x] Browse packages and book sessions via `/packages/[id]/book` (enrollment-aware)
- [x] View confirmed bookings via `/calendar`
- [x] Cancel/reschedule bookings (from calendar day view)
- [x] Dedicated "My bookings" page (`/bookings`) with Upcoming/Past/Cancelled tabs
- [x] My Enrollments page (`/enrollments`) with progress tracking
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
| 12 | Package CRUD + enrollment + assignment | ✅ Done | Packages |
| 13 | Session room (Meet, PDF upload, evaluation, download) | ✅ Done | Booking |
| 14 | Student bookings + teacher sessions pages | ✅ Done | Booking |
| 15 | Admin teacher management + timetable + reporting | ✅ Done | Dashboards |
| 16 | Writing-only bundle flow | ✅ Done | Session room |

### Next on the plan

**Phase 2–3 complete** (Apr 10, 2026). Remaining work is **Phase 4** (notifications, payment integration, polish, performance, DevOps) — see above. Payment and refund specifics are deferred to **§11**.

---

## 11. Deferred specifications: payment, refunds, and finance

> **Status:** Intentionally incomplete. The stakeholder will specify **payment and financial rules after the rest of the application is complete**. This section reserves headings only; no binding product rules here yet.

Planned topics to document later:

- **Payment provider** integration (API, checkout UI, webhooks, idempotency).
- **State machine** alignment with **`Booking.status`** and **`paymentStatus`**: pending checkout, success, failure, expiry, and how each affects **slot visibility** for other students.
- **Refunds** and **chargebacks**; **student-initiated cancellation** (must **free the teacher’s schedule**; refund amounts and timing TBD).
- **Reconciliation**, taxes, invoices, and admin reporting (if in scope).

Until this section is filled in, engineers should treat **§1.4**–**§1.6** as the **product intent** and keep the **current** codebase behavior (**immediate `CONFIRMED` booking** without payment) as a **known gap** documented in **§4.2**.

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

---

## 13. Public landing (`/`)

- **Layout reference:** `public/Frame.png` (Apr 2026) — banded backgrounds, serif headlines with accent `<em>`, card shadows, three pricing columns, `<details>` FAQ rows.
- **Exam preview:** `ListeningMock` only (no duplicate “experience” section); placed in `#experience` beside computer-delivered copy.
- **Pricing (home):** Static NPR amounts (**1400 / 1680 / 1820**) and tier labels from `public/price.png`; same card chrome as the feature grid (`#F7F7F7` band, white bordered cards, `#7C5CFF` primary **Select**). Replace with live catalog pricing when marketing is ready to wire DB.
- **Copy stance:** Marketing emphasizes **computer-based full mocks**, **human writing review**, and **reports** so the page stays truthful alongside §1.4 speaking/writing session flows.
