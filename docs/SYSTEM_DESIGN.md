# IVCS - System Design Document

> **Last Updated**: February 4, 2026  
> **Status**: Phase 1 - Foundation (In Progress)  
> **Branch**: `adding-db`

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
| email     | String   | Unique, for authentication |
| name      | String   | Display name               |
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

### 4.2 User Booking Flow

```
1. User logs in
2. Browse teachers (filter by subject, availability)
3. View teacher's available slots
4. Select desired slot
5. Confirm booking details
6. Submit booking request
7. System checks for conflicts
8. If available: Create booking (PENDING or CONFIRMED)
9. Notify teacher of new booking
10. Notify user of confirmation
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

### 5.2 Folder Structure (Proposed)

```
ivcs-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── teachers/
│   │   │   ├── users/
│   │   │   └── timetable/
│   │   ├── teacher/
│   │   │   ├── availability/
│   │   │   └── bookings/
│   │   └── user/
│   │       ├── browse/
│   │       └── my-bookings/
│   ├── api/
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── teachers/
│   │   └── availability/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── forms/              # Form components
│   └── calendar/           # Timetable/calendar components
├── lib/
│   ├── prisma.ts           # Prisma client instance
│   ├── auth.ts             # Auth utilities
│   └── utils.ts            # Helper functions
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   └── SYSTEM_DESIGN.md    # This file
└── types/
    └── index.ts            # TypeScript type definitions
```

### 5.3 Database Schema (Prisma)

**Status**: ✅ Implemented (Feb 4, 2026) - Migration `20260204182111_init`

#### Models Overview

| Model | Table Name | Purpose |
|-------|------------|---------|
| `User` | `users` | Base user with role (ADMIN, TEACHER, USER), auth fields |
| `StudentProfile` | `student_profiles` | Extended student info, linked to enrollments |
| `TeacherProfile` | `teacher_profiles` | Extended teacher info: bio, availability |
| `Availability` | `availabilities` | Date-specific time slots teachers mark as available |
| `Package` | `packages` | Purchasable class packages with pricing and subjects |
| `Booking` | `bookings` | Scheduled sessions, links User → Teacher → Availability |
| `ClassMetadata` | `class_metadata` | Completed class records for history/reporting |
| `PackageBundle` | `package_bundles` | Marketing bundles grouping multiple packages |
| `PackageBundleItem` | `package_bundle_items` | Junction: Bundle ↔ Package with display order |
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

1. **snake_case table names**: All tables use `@@map()` for PostgreSQL convention
2. **Explicit junction tables**: All many-to-many relationships use explicit junctions for metadata support
3. **Package-centric model**: Teachers and Students link to Packages (not free-text subjects)
4. **Enrollment tracking**: StudentEnrollment tracks classes total/used, expiry, status
5. **Payment at booking level**: Enrollment created only after successful payment

#### New Tables (Feb 4, 2026)

**PackageBundle** - Marketing bundles
```
id, name, description, price, discountPercent,
isActive, isFeatured, validFrom, validUntil,
createdAt, updatedAt
```

**PackageBundleItem** - Bundle ↔ Package junction
```
id, bundleId, packageId, displayOrder, customPrice, createdAt
@@unique([bundleId, packageId])
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
| Explicit junction tables             | All M:M relations use explicit junctions for metadata & control      | 2026-02-04 |
| PackageBundle for marketing          | Group packages into purchasable bundles with custom pricing          | 2026-02-04 |
| Package-centric relationships        | Teachers/Students link to Packages, not free-text subjects           | 2026-02-04 |
| paymentId on Enrollment (not amount) | Links enrollment to payment record; amount tracked in Transaction table | 2026-02-04 |
| No expiration on packages            | Packages don't expire; removed expiresAt and EXPIRED status              | 2026-02-04 |
| Keep Package.subjects as String[]    | Describes topics within a package; doesn't need relational integrity | 2026-02-04 |

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

**1.2 Authentication System (NEXT PRIORITY)**
- [ ] Choose auth strategy: **Recommendation: NextAuth.js v5 (Auth.js)**
  - Credentials provider for email/password
  - JWT sessions for stateless auth
  - Built-in CSRF protection
- [ ] Implement auth infrastructure
  - [ ] `lib/auth.ts` - Auth.js configuration
  - [ ] `lib/prisma.ts` - Singleton Prisma client
  - [ ] Password hashing utility (bcrypt or argon2)
- [ ] Auth API routes
  - [ ] `app/api/auth/[...nextauth]/route.ts`
- [ ] Session management and middleware
  - [ ] `middleware.ts` - Route protection
  - [ ] Role-based access control (RBAC) helpers

**1.3 User Registration & Onboarding**
- [ ] Registration flow
  - [ ] `app/(auth)/register/page.tsx` - Registration form
  - [ ] Server action: `actions/auth/register.ts`
  - [ ] Email validation (format + uniqueness)
  - [ ] Password strength requirements
  - [ ] Auto-create StudentProfile for USER role
- [ ] Login flow
  - [ ] `app/(auth)/login/page.tsx` - Login form
  - [ ] Error handling (invalid credentials, inactive account)
  - [ ] "Remember me" functionality
- [ ] Post-login redirect based on role

**1.4 Core UI Components**
- [ ] Design system foundation
  - [ ] `components/ui/button.tsx`
  - [ ] `components/ui/input.tsx`
  - [ ] `components/ui/card.tsx`
  - [ ] `components/ui/badge.tsx`
  - [ ] `components/ui/modal.tsx`
  - [ ] `components/ui/toast.tsx` (notifications)
- [ ] Layout components
  - [ ] `components/layout/navbar.tsx`
  - [ ] `components/layout/sidebar.tsx`
  - [ ] `components/layout/footer.tsx`
- [ ] Form components
  - [ ] `components/forms/form-field.tsx`
  - [ ] `components/forms/form-error.tsx`

---

### Phase 2: Core Features

**2.1 Teacher Management**
- [ ] Teacher dashboard layout
  - [ ] `app/(dashboard)/teacher/layout.tsx`
  - [ ] `app/(dashboard)/teacher/page.tsx` - Overview/stats
- [ ] Profile management
  - [ ] `app/(dashboard)/teacher/profile/page.tsx`
  - [ ] Edit bio, subjects, contact info
  - [ ] Profile completion indicator
- [ ] Availability management (CRITICAL)
  - [ ] `app/(dashboard)/teacher/availability/page.tsx`
  - [ ] Calendar interface for setting available slots
  - [ ] Bulk slot creation (e.g., "every Monday 9-5")
  - [ ] Individual date slot management
  - [ ] Visual conflict detection
  - [ ] Server actions: `actions/availability/*.ts`

**2.2 Student Features**
- [ ] Student dashboard
  - [ ] `app/(dashboard)/student/layout.tsx`
  - [ ] `app/(dashboard)/student/page.tsx` - Upcoming classes, quick actions
- [ ] Browse teachers
  - [ ] `app/(dashboard)/student/browse/page.tsx`
  - [ ] Filter by subject, availability, rating
  - [ ] Teacher cards with key info
  - [ ] Search functionality
- [ ] View teacher profile & availability
  - [ ] `app/(dashboard)/student/teachers/[id]/page.tsx`
  - [ ] Calendar view of available slots
  - [ ] Teacher bio, subjects, reviews

**2.3 Booking System (CORE)**
- [ ] Booking flow
  - [ ] Select slot → Confirm details → Submit
  - [ ] Real-time availability check (optimistic locking)
  - [ ] Server action with transaction: `actions/booking/create.ts`
- [ ] Booking management
  - [ ] `app/(dashboard)/student/bookings/page.tsx`
  - [ ] List: Upcoming, Past, Cancelled
  - [ ] Cancel booking (with policy enforcement)
  - [ ] Reschedule booking
- [ ] Teacher booking view
  - [ ] `app/(dashboard)/teacher/bookings/page.tsx`
  - [ ] Accept/decline pending bookings
  - [ ] View student details

---

### Phase 3: Admin & Packages

**3.1 Admin Dashboard**
- [ ] Admin layout & overview
  - [ ] `app/(dashboard)/admin/layout.tsx`
  - [ ] `app/(dashboard)/admin/page.tsx` - System stats, recent activity
- [ ] User management
  - [ ] `app/(dashboard)/admin/users/page.tsx`
  - [ ] List all users with role filter
  - [ ] Activate/deactivate accounts
  - [ ] Change user roles
  - [ ] Create teacher accounts
- [ ] Teacher management
  - [ ] `app/(dashboard)/admin/teachers/page.tsx`
  - [ ] Approve new teachers
  - [ ] View/edit teacher profiles
  - [ ] Manage teacher subjects

**3.2 Package Management**
- [ ] Package CRUD
  - [ ] `app/(dashboard)/admin/packages/page.tsx`
  - [ ] Create/edit packages (name, price, subjects, description)
  - [ ] Activate/deactivate packages
- [ ] Student package assignment
  - [ ] Assign packages to students
  - [ ] Track package usage/remaining classes
- [ ] Package purchase flow (student-facing)
  - [ ] `app/(dashboard)/student/packages/page.tsx`
  - [ ] View available packages
  - [ ] Purchase interface (Stripe integration placeholder)

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
- [ ] Loading states & skeletons
- [ ] Error boundaries
- [ ] Empty states with CTAs
- [ ] Mobile-responsive design audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Dark mode (optional)

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

**Files to create:**
```
lib/
├── auth.ts              # Main NextAuth configuration
├── auth.config.ts       # Edge-compatible config (for middleware)
├── passwords.ts         # Password hash/verify utilities

app/
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts  # Auth API endpoints (GET, POST)

├── (auth)/
│   ├── layout.tsx       # Auth pages layout (centered card)
│   ├── login/
│   │   └── page.tsx     # Login form
│   └── register/
│       └── page.tsx     # Registration form

actions/
└── auth/
    ├── register.ts      # Server action for registration
    └── login.ts         # Server action for login

middleware.ts            # Route protection

types/
└── next-auth.d.ts       # TypeScript augmentation for session
```

**Authentication flow:**
```
Registration:
  Form → Server Action → Validate → Hash Password → Create User + Profile → Redirect to Login

Login:
  Form → NextAuth Credentials → Find User → Verify Password → Create JWT → Set Cookie → Redirect to Dashboard

Route Protection:
  Request → Middleware → Check JWT → Allow or Redirect to Login

Role-based Redirect:
  ADMIN → /admin
  TEACHER → /teacher
  USER → /student
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
   - Find user by email
   - Verify password hash
   - Check `isActive` status
   - Return user object for JWT

4. **Middleware** (`middleware.ts`):
   - Protect: `/admin/*`, `/teacher/*`, `/student/*`
   - Redirect unauthenticated users to `/login`

5. **Registration** (`actions/auth/register.ts`):
   - Validate input
   - Check email uniqueness
   - Hash password
   - Create User + StudentProfile (transaction)
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
| 2 | Authentication | ⏳ Pending | Prisma client |
| 3 | UI components | ⏳ Pending | - (parallel) |
| 4 | Dashboard layouts | ⏳ Pending | Auth + UI |
| 5 | Core features | ⏳ Pending | Dashboards |

---

## 11. Changelog

| Date       | Changes                                                    | Author |
| ---------- | ---------------------------------------------------------- | ------ |
| 2026-01-31 | Initial system design document created                     | -      |
| 2026-01-31 | Database schema implemented with Package, StudentProfile   | -      |
| 2026-02-04 | Updated roadmap with detailed implementation phases        | -      |
| 2026-02-04 | Documented schema evolution and design decisions           | -      |
| 2026-02-04 | Added snake_case table naming convention (@@map)           | -      |
| 2026-02-04 | Added PackageBundle, PackageBundleItem models              | -      |
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
