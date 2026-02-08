# IVCS - Interactive Virtual Class Scheduler

A scheduling platform that bridges the gap between **students** and **teachers**, enabling efficient timetable management and session booking.

## Features

- **Teacher Availability Management** - Teachers define their available time slots
- **Student Booking System** - Students browse and book sessions with teachers
- **Admin Timetable Control** - Administrators manage schedules and resolve conflicts
- **Conflict Prevention** - Automatic detection of double-bookings

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Database**: PostgreSQL
- **ORM**: Prisma 7

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Generate Prisma client and run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Documentation

See [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) for detailed system architecture and design decisions.

## Project Structure

```
ivcs-app/
├── app/           # Next.js App Router pages and API
├── components/    # Reusable React components
├── lib/           # Utilities and Prisma client
├── prisma/        # Database schema and migrations
├── docs/          # Project documentation
└── types/         # TypeScript type definitions
```

## License

Private project.
