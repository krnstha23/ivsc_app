# IVCS - System Design Document

> **Last Updated**: March 4, 2026  
> **Status**: Phase 1 Complete, Phase 2–3 In Progress  
> **Branch**: `main`

---

## 1. System Overview

### 1.1 Purpose

IVCS is a scheduling platform that bridges the gap between **users (students)** and **teachers**. The system enables:

- Teachers to define their availability
- Administrators to create and manage timetables
- Users to view and book available time slots with teachers

### 1.2 Problem Statement

Coordinating schedules between multiple teachers and users is complex:

- Teachers have varying availability across days/weeks
- Users need visibility into when teachers are free
- Conflicts must be prevented (double-booking)
- Schedule changes need to propagate to all affected parties

### 1.3 Solution

A centralized scheduling system that:

1. Allows teachers to input their available time slots
2. Provides an admin interface to create structured timetables
3. Enables users to browse and book sessions
4. Handles conflict detection and notifications

---

## 2. User Roles & Permissions

| Role               | Description               | Key Permissions                                                             |
| ------------------ | ------------------------- | --------------------------------------------------------------------------- |
| **Admin**          | System administrator      | Full CRUD on all entities, user management, system configuration            |
| **Teacher**        | Instructor/tutor          | Manage own availability, view assigned bookings, update profile             |
| **User (Student)** | End user seeking sessions | Browse teachers, view timetables, book available slots, manage own bookings |

### 2.1 Role Hierarchy

```
Admin
  └── Can manage Teachers and Users
  └── Can override any booking
  └── Can configure system settings

Teacher
  └── Can manage own availability
  └── Can view/accept/decline bookings
  └── Cannot modify other teachers

User (Student)
  └── Can browse and book
  └── Can cancel own bookings
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
| bio        | String   | Teacher description        |
| subjects   | String[] | Areas of expertise         |
| hourlyRate | Decimal  | Optional, if paid sessions |
| isActive   | Boolean  | Available for booking      |

#### Availability

| Field        | Type    | Description                       |
| ------------ | ------- | --------------------------------- |
| id           | UUID    | Primary key                       |
| teacherId    | UUID    | FK to Teacher                     |
| dayOfWeek    | Enum    | MON, TUE, WED, THU, FRI, SAT, SUN |
| startTime    | Time    | Slot start (e.g., 09:00)          |
| endTime      | Time    | Slot end (e.g., 10:00)            |
| isRecurring  | Boolean | Weekly recurring or one-time      |
| specificDate | Date    | If not recurring, specific date   |

#### Booking

| Field       | Type     | Description                              |
| ----------- | -------- | ---------------------------------------- |
| id          | UUID     | Primary key                              |
| userId      | UUID     | FK to User (student)                     |
| teacherId   | UUID     | FK to Teacher                            |
| scheduledAt | DateTime | Booked date and time                     |
| duration    | Int      | Duration in minutes                      |
| status      | Enum     | PENDING, CONFIRMED, CANCELLED, COMPLETED |
| notes       | String   | Optional notes from user                 |
| createdAt   | DateTime | Booking creation time                    |

#### Subject (Optional - for categorization)

| Field       | Type   | Description                        |
| ----------- | ------ | ---------------------------------- |
| id          | UUID   | Primary key                        |
| name        | String | Subject name (Math, English, etc.) |
| description | String | Subject description                |

---

## 4. Core User Flows

### 4.1 Teacher Availability Setup

```
1. Teacher logs in
2. Navigate to "My Availability"
3. Add time slots:
   - Select day(s) of week
   - Set start/end time
   - Choose recurring or specific date
4. Save availability
5. System validates no self-conflicts
6. Availability visible to users
```

### 4.2 User Booking Flow (Package-First)

```
1. User (student) logs in
2. Browse packages (filter by price, teacher)
3. Select a package
4. View available time slots (predetermined by teacher's manual availability input)
5. Select desired slot
6. Confirm booking details
7. Submit booking request
8. System checks for conflicts
9. If available: Create booking (PENDING or CONFIRMED)
10. Deduct from student's enrolled package (classesUsed++)
11. Notify teacher of new booking
12. Notify student of confirmation
```

### 4.3 Admin Timetable Management

```
1. Admin logs in
2. Navigate to "Timetable Management"
3. View weekly/monthly calendar
4. Can manually:
   - Assign teachers to slots
   - Block certain time periods
   - Override existing bookings
   - Bulk import availability
5. Generate reports on utilization
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
│   └── utils.ts                     # cn()
├── prisma/schema.prisma, migrations/
├── proxy.ts                         # Route protection (Next.js 16)
├── docs/SYSTEM_DESIGN.md
└── components.json
```

**Dashboard model (Feb 20, 2026):** **Single dashboard** at `/dashboard` for all roles. One app, one layout; only the **sidebar pages** (nav items) differ by role:

- **Admins** see **all pages** (shared + admin + teacher + user).
- **Teachers** see **only teacher-related pages** (shared + teacher: Dashboard, Analytics, Lifecycle, Availability, My Bookings, Settings, Help, Search).
- **Users (students)** see **only user-related pages** (shared + user: Dashboard, Analytics, My Bookings, Browse Teachers, My Packages, Settings, Help, Search).

Visibility is controlled by `allowedRoles` in `lib/permissions.ts`; the sidebar filters items with `filterByRole()`. Sub-routes (e.g. `/dashboard/bookings`) are protected so direct URL access respects the same permissions. No separate `/admin`, `/teacher`, or `/student` pages; all dashboard access is via `/dashboard`.

**Sidebar pages by role (current — implemented):**

| Page       | Route        | ADMIN | TEACHER | USER (Student) |
|------------|--------------|-------|---------|----------------|
| Dashboard  | /dashboard   | ✓     | ✓       | ✓               |
| Calendar   | /calendar    | ✓     | ✓       | ✓               |
| Users      | /users       | ✓     | —       | —               |
| Teachers   | /teachers    | ✓     | ✓       | ✓               |
| Students   | /students    | ✓     | ✓       | ✓               |
| Packages   | /packages    | ✓     | ✓       | ✓               |

**Dashboard home:** Section cards visible to all roles.

**Route protection:** The `app/(app)/layout.tsx` enforces authentication. Pages with restricted access (e.g. `/users`) add role checks via `canAccess()`. Server actions also enforce their own role checks independently of pages.

### 5.3 Database Schema (Prisma)

**Status**: ✅ Implemented (Feb 4, 2026) - Migrations `20260204182111_init`, `20260208000000_add_username_to_users`, `20260221000000_rename_username_to_camelcase` (users.userName).

#### Models Overview

| Model | Table Name | Purpose |
|-------|------------|---------|
| `User` | `users` | Base user with **username** (login), email, role (ADMIN, TEACHER, USER), auth fields |
| `StudentProfile` | `student_profiles` | Extended student info, linked to enrollments |
| `TeacherProfile` | `teacher_profiles` | Extended teacher info: bio, availability |
| `Availability` | `availabilities` | Date-specific time slots teachers mark as available |
| `Package` | `packages` | Purchasable class packages with pricing |
| `Booking` | `bookings` | Scheduled sessions, links User → Teacher → Availability |
| `ClassMetadata` | `class_metadata` | Completed class records for history/reporting |
| `PackageBundle` | `package_bundles` | Marketing bundles grouping multiple packages (stores membership via `packageIds[]`) |
| `StudentEnrollment` | `student_enrollments` | Junction: Student ↔ Package with enrollment tracking |
| `TeacherPackage` | `teacher_packages` | Junction: Teacher ↔ Package assignment |

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
3. **Explicit junction tables**: Most many-to-many relationships use explicit junctions for metadata support (e.g. TeacherPackage, StudentEnrollment). Bundles store package membership via `packageIds[]`.
4. **Package-centric model**: Teachers and Students link to Packages (not free-text subjects)
5. **Enrollment tracking**: StudentEnrollment tracks classes total/used, expiry, status
6. **Payment at booking level**: Enrollment created only after successful payment

#### New Tables (Feb 4, 2026)

**PackageBundle** - Marketing bundles
```
id, name, description, price, discountPercent,
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

**TeacherPackage** - Teacher ↔ Package junction
```
id, teacherId, packageId, createdAt
@@unique([teacherId, packageId])
```

#### Removed Fields (Feb 4, 2026)

| Model | Removed Field | Reason |
|-------|---------------|--------|
| `StudentProfile` | `subjects String[]` | Replaced by Package relations via StudentEnrollment |
| `StudentProfile` | `packageId String?` | Replaced by StudentEnrollment (supports multiple) |
| `TeacherProfile` | `subjects String[]` | Replaced by Package relations via TeacherPackage |

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
| PackageBundle for marketing          | Group packages into purchasable bundles with custom pricing          | 2026-02-04 |
| Package-centric relationships        | Teachers/Students link to Packages, not free-text subjects           | 2026-02-04 |
| paymentId on Enrollment (not amount) | Links enrollment to payment record; amount tracked in Transaction table | 2026-02-04 |
| No expiration on packages            | Packages don't expire; removed expiresAt and EXPIRED status              | 2026-02-04 |
| Remove Package.subjects              | Simplify packages; remove array field and related UI/filtering       | 2026-03-04 |
| Username for login (User.username)    | Login credential is username (unique); email kept for account/notifications | 2026-02-08 |
| Next.js 16 proxy convention           | Use `proxy.ts` instead of deprecated `middleware.ts` for route protection | 2026-02-08 |
| Single dashboard, role-based nav only | One dashboard at `/dashboard` for all roles; admins see all sidebar pages, teachers only teacher-related, users only user-related (lib/permissions.ts); no separate /admin, /teacher, /student pages | 2026-02-20 |
| Use @solar-icons/react for all UI icons | Replaced animated itshover wrappers with static Solar icons. Named imports directly in consumers (`import { Widget4 } from '@solar-icons/react'`). No wrapper files, no animation overhead. | 2026-03-04 |
| Package-first booking flow              | Students select packages (not teachers) → view teacher-predetermined availability → book. Packages are the entry point, tied to teachers via TeacherPackage. | 2026-03-04 |
| Zod validation on all server actions    | Server actions are public endpoints; manual string checks are fragile. Zod schemas provide format validation, type safety, and composable error reporting. | 2026-03-04 |
| Role guards on server actions           | Page-level guards protect UI, but actions are callable directly. `createUser` now checks ADMIN role; `createAvailability` checks TEACHER role. | 2026-03-04 |

### 6.2 Pending Decisions

| Decision            | Options                              | Recommendation                                       |
| ------------------- | ------------------------------------ | ---------------------------------------------------- |
| Time zone handling  | Store UTC + user TZ, Store local     | **UTC storage** + client-side conversion             |
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
- Convert to user's local time zone on display
- Teachers and users may be in different time zones

### 7.3 Cancellation Policy

- How much notice required?
- Auto-cancel pending bookings after X hours?
- Refund policy (if paid)

### 7.4 Recurring Availability vs Exceptions

- Teachers may have weekly recurring slots
- Need ability to mark exceptions (holidays, sick days)
- "Available every Monday 9-11 EXCEPT Jan 15"

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
  - [ ] Real-time availability check (optimistic locking; currently re-fetch after book)
- [ ] Booking management
  - [ ] Student bookings page: Upcoming, Past, Cancelled
  - [ ] Cancel booking (with policy enforcement)
  - [ ] Reschedule booking
- [ ] Teacher booking view
  - [ ] View assigned bookings
  - [ ] Accept/decline pending bookings

---

### Phase 3: Admin & Packages

**3.1 Admin Dashboard** (partially built)
- [x] Single dashboard: `app/(app)/dashboard/` – shared layout for all roles
- [x] User management (`app/(app)/users/`)
  - [x] List all users with filter by name, username, role, active status
  - [x] Create user form (`/users/new`) with Zod-validated server action + ADMIN role guard
  - [ ] Edit/activate/deactivate accounts
  - [ ] Change user roles
- [ ] Teacher management (approve, edit profiles, assign packages)

**3.2 Package Management** (partially built)
- [x] Package listing (`app/(app)/packages/page.tsx`) with filter by name, active status
- [x] Package CRUD (create/edit/deactivate) – `/packages/new`, `/packages/[id]/edit`, delete in table
- [ ] Student package assignment
  - [ ] Assign packages to students
  - [ ] Track package usage/remaining classes
- [ ] Package purchase flow (student-facing with Stripe placeholder)

**3.3 Timetable View**
- [ ] Master calendar
  - [ ] `app/(dashboard)/admin/timetable/page.tsx`
  - [ ] Weekly/monthly view of all bookings
  - [ ] Filter by teacher, student, subject
  - [ ] Drag-and-drop rescheduling (nice-to-have)
- [ ] Reporting
  - [ ] Booking statistics
  - [ ] Teacher utilization
  - [ ] Revenue reports (if payments active)

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
2. **Class types?** 1-on-1 only, or group sessions? *(Assume 1-on-1 for MVP)*
3. **Session duration?** Fixed slots (30/60 min) or flexible? *(Need to decide)*
4. **Approval workflow?** Do teachers approve bookings, or auto-confirm? *(Recommend: auto-confirm for available slots)*
5. **Multi-language support?** Is i18n needed? *(Defer to Phase 4+)*
6. **Cancellation policy?** How much notice required? Refund policy?
7. ~~**Package expiration?**~~ ✅ **ANSWERED**: Packages don't expire
8. **Teacher onboarding?** Admin creates teachers, or self-registration with approval?

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

app/login/page.tsx, app/register/page.tsx   # login wired; register placeholder

proxy.ts                 # Route protection (Next.js 16 convention; middleware deprecated)

components/providers.tsx # SessionProvider for client signIn
components/login-form.tsx # Username + password, signIn('credentials')
```

**Still to create:** `actions/auth/register.ts`, full registration form, `types/next-auth.d.ts` (optional).

**Authentication flow (implemented):**
```
Login:
  Form (username + password) → signIn('credentials') → Find User by username → Verify Password
  → JWT → Redirect to /dashboard

Route Protection:
  Request → proxy.ts (auth from lib/auth-edge) → Check session → Allow or Redirect to /login
  Protected paths: /dashboard (and /dashboard/*)

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

5. **Registration** (`actions/auth/register.ts` – not yet implemented):
   - Validate input (username + email uniqueness)
   - Hash password
   - Create User (username, email, …) + StudentProfile (transaction)
   - Redirect to login

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

**Icons:** Use **itshover** only. Add icons with:
```bash
npx shadcn@latest add https://itshover.com/r/<icon-name>.json
```
Example: `arrow-back-icon`, `layout-dashboard-icon`, `filter-icon`. Icons live in `components/ui/` and require the `motion` package. Do not add Tabler Icons or Lucide for UI; use itshover for all new and replacement icons.

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
├── (auth)/                     # Public - auth pages
│   ├── layout.tsx              # Centered card layout
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── (dashboard)/                # Protected - all dashboards
│   ├── layout.tsx              # Shared shell (navbar)
│   ├── page.tsx                # Redirect based on role
│   │
│   ├── admin/
│   │   ├── layout.tsx          # Admin sidebar
│   │   ├── page.tsx            # Admin home (stats)
│   │   ├── users/page.tsx
│   │   ├── packages/page.tsx
│   │   └── bundles/page.tsx
│   │
│   ├── teacher/
│   │   ├── layout.tsx          # Teacher sidebar
│   │   ├── page.tsx            # Teacher home
│   │   ├── profile/page.tsx
│   │   ├── availability/page.tsx
│   │   └── bookings/page.tsx
│   │
│   └── student/
│       ├── layout.tsx          # Student sidebar
│       ├── page.tsx            # Student home
│       ├── browse/page.tsx     # Browse teachers
│       ├── packages/page.tsx   # View/purchase packages
│       └── bookings/page.tsx   # My bookings
```

**Navigation items per role:**

| Admin | Teacher | Student |
|-------|---------|---------|
| Dashboard | Dashboard | Dashboard |
| Users | My Profile | Browse Teachers |
| Teachers | Availability | My Packages |
| Packages | My Bookings | My Bookings |
| Bundles | | |
| Reports | | |

---

### Step 5: Core Features

**Phase 2 features by role:**

**Admin:**
- [ ] User management (list, activate/deactivate, change role)
- [ ] Package CRUD
- [ ] Bundle CRUD
- [ ] Teacher approval (if self-registration)

**Teacher:**
- [ ] Profile setup (bio, packages)
- [ ] Availability management (calendar UI)
- [ ] View assigned bookings
- [ ] Accept/complete bookings

**Student:**
- [ ] Browse teachers (filter by package)
- [ ] View teacher availability
- [ ] Book sessions
- [ ] View/manage bookings
- [ ] View enrolled packages

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
| 7 | Teacher availability (calendar, slot creation, day view) | ✅ Partial | Dashboards |
| 8 | Package listing (list, filters) | ✅ Partial | Dashboards |
| 9 | Zod validation + loading/error states + role guards on actions | ✅ Done | All above |
| 10 | **Booking system (package-first flow)** | ✅ Done | Availability + Packages |
| 11 | Profile management (teacher/student) | ⏳ Pending | Auth |
| 12 | Package CRUD + enrollment + purchase | ✅ Partial (CRUD done) | Packages |

### Next on the plan (Mar 10, 2026)

1. ~~**Booking system (package-first)**~~ ✅ Done: Package detail page `/packages/[id]` with slot list and `createBooking` (transaction: booking + deduct enrollment). Students click package name to view & book.
2. **Package CRUD**: Admin create/edit/deactivate done. Assign teachers to packages (TeacherPackage) – UI pending.
3. **Profile management**: Teachers edit bio; students view enrolled packages and class usage.
4. **Edit/delete availability**: Teachers can modify or remove existing availability slots.
5. **User management completion**: Edit/deactivate users, change roles.

---

## 11. Changelog

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
| 2026-02-21 | Icons: standardised on itshover only; all UI icons from components/ui (itshover); design doc and Phase 1.4 / Step 3 updated to always use new icons | -      |
| 2026-03-10 | Package-first booking: `getAvailableSlotsForPackage`, `getEnrollmentForPackage`, `createBooking` (Zod + USER role guard, transaction booking + classesUsed). Package detail `/packages/[id]` links to booking page `/packages/[id]/book`; `PackageBookingSection` (slot list, confirm modal, success/error). Packages table links name to detail. Edge case: avoid `@solar-icons/react` on this route tree (SSR createContext error); use emoji. DESIGN_DOC: Phase 2.2/2.3 and 3.2 updated; step 10 done. | -      |
| 2026-02-21 | DB: users.userName (camelCase); Prisma model field renamed to userName so generated client uses correct column; SYSTEM_DESIGN.md: all columns camelCase | -      |
