# IVCS - System Design Document

> **Last Updated**: January 31, 2026  
> **Status**: Planning / Early Development  
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
| Auth     | TBD (NextAuth.js / Clerk / Custom)  | Depends on requirements                           |

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

```prisma
// Proposed schema - to be implemented in prisma/schema.prisma

enum Role {
  ADMIN
  TEACHER
  USER
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String
  passwordHash  String
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  teacherProfile  TeacherProfile?
  bookings        Booking[]       @relation("UserBookings")
}

model TeacherProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  bio         String?
  subjects    String[]
  hourlyRate  Decimal?
  isActive    Boolean  @default(true)

  // Relations
  user          User          @relation(fields: [userId], references: [id])
  availability  Availability[]
  bookings      Booking[]     @relation("TeacherBookings")
}

model Availability {
  id            String     @id @default(uuid())
  teacherId     String
  dayOfWeek     DayOfWeek
  startTime     String     // "HH:MM" format
  endTime       String     // "HH:MM" format
  isRecurring   Boolean    @default(true)
  specificDate  DateTime?  // For non-recurring slots

  // Relations
  teacher   TeacherProfile @relation(fields: [teacherId], references: [id])

  @@index([teacherId, dayOfWeek])
}

model Booking {
  id           String        @id @default(uuid())
  userId       String
  teacherId    String
  scheduledAt  DateTime
  duration     Int           // minutes
  status       BookingStatus @default(PENDING)
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // Relations
  user     User           @relation("UserBookings", fields: [userId], references: [id])
  teacher  TeacherProfile @relation("TeacherBookings", fields: [teacherId], references: [id])

  @@index([userId])
  @@index([teacherId])
  @@index([scheduledAt])
}
```

---

## 6. Design Decisions

### 6.1 Decisions Made

| Decision                         | Rationale                                                            | Date       |
| -------------------------------- | -------------------------------------------------------------------- | ---------- |
| PostgreSQL over SQLite           | Complex relational queries, concurrent access, production-ready      | 2026-01-31 |
| Prisma 7 with pg adapter         | Type safety, modern features, driver adapters for edge compatibility | 2026-01-31 |
| Single User table with Role enum | Simpler auth, shared attributes, role-based access control           | 2026-01-31 |
| Separate TeacherProfile          | Teachers have additional attributes not relevant to other roles      | 2026-01-31 |

### 6.2 Pending Decisions

| Decision            | Options                          | Considerations                         |
| ------------------- | -------------------------------- | -------------------------------------- |
| Authentication      | NextAuth.js, Clerk, Custom JWT   | Cost, features, self-hosted vs managed |
| Time zone handling  | Store UTC + user TZ, Store local | Multi-region support needs?            |
| Notification system | Email, In-app, Push              | User preferences, infrastructure       |
| Payment integration | Stripe, None                     | Is this a paid tutoring platform?      |

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

### Phase 1: Foundation (Current)

- [x] Project setup (Next.js, Tailwind, Prisma)
- [ ] Database schema implementation
- [ ] Basic authentication
- [ ] User registration/login

### Phase 2: Core Features

- [ ] Teacher profile management
- [ ] Availability CRUD
- [ ] User browsing teachers
- [ ] Basic booking flow

### Phase 3: Timetable & Admin

- [ ] Admin dashboard
- [ ] Calendar/timetable view
- [ ] Booking management
- [ ] Basic reporting

### Phase 4: Polish & Production

- [ ] Notifications (email)
- [ ] Advanced filtering/search
- [ ] Mobile responsiveness
- [ ] Performance optimization

---

## 9. Open Questions

1. **Is this a paid platform?** Do users pay for sessions?
2. **Class types?** 1-on-1 only, or group sessions?
3. **Session duration?** Fixed slots (30/60 min) or flexible?
4. **Approval workflow?** Do teachers approve bookings, or auto-confirm?
5. **Multi-language support?** Is i18n needed?

---

## 10. Changelog

| Date       | Changes                                | Author |
| ---------- | -------------------------------------- | ------ |
| 2026-01-31 | Initial system design document created | -      |
