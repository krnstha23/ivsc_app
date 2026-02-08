# Database Seed Plan

> **Purpose**: Define how the database is populated for local development, demos, and tests.

---

## 1. Goals

- **Reproducible dev data**: One command fills the DB with consistent, realistic data.
- **Correct ordering**: Respect foreign keys and relations (create users before profiles, packages before enrollments, etc.).
- **Safe defaults**: Use hashed passwords via existing `lib/passwords.ts`; no secrets in repo.
- **Idempotency**: Re-running the seed (e.g. after `prisma migrate reset`) should not fail; we use `create` with known IDs or upsert where helpful.

---

## 2. What to Seed

| Entity | Purpose |
|--------|--------|
| **User** | 1 admin, 2–3 teachers, 3–5 students; all with known test passwords (e.g. `password123`). |
| **StudentProfile** | One per student user. |
| **TeacherProfile** | One per teacher user (with optional `bio`). |
| **Package** | 3–5 packages (e.g. Math 10, English 10, Science 10) with names, descriptions, prices, `subjects[]`. |
| **PackageBundle** | 1–2 bundles (e.g. “Grade 10 Core”) with discount and optional `validFrom`/`validUntil`. |
| **PackageBundleItem** | Link bundles to packages with `displayOrder` and optional `customPrice`. |
| **TeacherPackage** | Assign each teacher to 1–2 packages. |
| **StudentEnrollment** | Enroll some students in packages (status ACTIVE, `classesTotal`/`classesUsed`). |
| **Availability** | 5–10 slots per teacher for upcoming dates (e.g. next 2 weeks), `startTime`/`endTime` in `"HH:MM"`. |
| **Booking** | 2–4 bookings linking students to teachers via availability (mix of PENDING/CONFIRMED/COMPLETED). |
| **ClassMetadata** | 1–2 completed class records for past dates. |

---

## 3. Dependency Order

Seeding must follow this order to satisfy FKs:

1. **User** (no dependencies)
2. **StudentProfile**, **TeacherProfile** (depend on User)
3. **Package**, **PackageBundle** (no dependencies)
4. **PackageBundleItem** (Package, PackageBundle)
5. **TeacherPackage** (TeacherProfile, Package)
6. **StudentEnrollment** (StudentProfile, Package)
7. **Availability** (TeacherProfile)
8. **Booking** (User, TeacherProfile, Availability, optional Package)
9. **ClassMetadata** (Package, TeacherProfile, User)

Use a single `prisma.$transaction([...])` where possible so the seed is all-or-nothing (optional but recommended for cleanliness).

---

## 4. Implementation Details

### 4.1 Location and runner

- **Seed script**: `prisma/seed.ts`
- **Runner**: `tsx` (already in devDependencies) so we can run TypeScript directly.
- **Config**: Prisma 7 reads the seed command from **`prisma.config.ts`** under `migrations.seed` (e.g. `"tsx prisma/seed.ts"`). The `package.json` `"prisma": { "seed": "..." }` entry is optional for tooling/documentation.
- **Run command**: `npm run db:seed` or `npx prisma db seed`. Ensure `DATABASE_URL` is set in `.env`.

### 4.2 Environment and client

- Load `dotenv` at top of `prisma/seed.ts`; `prisma.config.ts` also loads env for the CLI.
- **Prisma 7 (provider `prisma-client`)**: The seed must pass an **adapter** (or `accelerateUrl`) to `PrismaClient`. Use `pg` + `@prisma/adapter-pg`: create a `Pool` with `DATABASE_URL`, wrap it with `PrismaPg`, and pass it as `new PrismaClient({ adapter })`. Disconnect both Prisma and the pool in a `finally` block.
- Use relative imports from `prisma/seed.ts` (e.g. `../app/generated/prisma/client`, `../lib/passwords`) so the script works when run by `tsx prisma/seed.ts` without path aliases.
- Use `hashPassword` from `../lib/passwords` for all user passwords so they match app auth.

### 4.3 Test accounts (design decisions)

- **Admin**: e.g. `admin@ivcs.local` / `username: admin` / password `password123`.
- **Teachers**: e.g. `teacher1@ivcs.local`, `teacher2@ivcs.local`; usernames `teacher1`, `teacher2`.
- **Students**: e.g. `student1@ivcs.local` … `student5@ivcs.local`; usernames `student1` … `student5`.
- All use the same dev password (e.g. `password123`) hashed once and reused, or hash per user for clarity.

### 4.4 Idempotency and reset

- **Recommended**: Run seed only on a fresh or reset DB (e.g. `npx prisma migrate reset` runs migrations then seed).
- Avoid relying on “upsert by email” in seed unless we explicitly want re-runnable seed without reset; for simplicity, first version can assume “seed after reset” and use plain `create`.

---

## 5. Security and Conventions

- **Passwords**: Never commit plain-text passwords; seed only uses hashed values produced by `hashPassword`.
- **Environment**: `DATABASE_URL` must be set (e.g. in `.env`); seed does not require other secrets.
- **Documentation**: In README or CONTRIBUTING, state that default seed users (e.g. `admin@ivcs.local`) are for dev only and must not be used in production.

---

## 6. Future Considerations

- **Optional**: Add a `--minimal` flag (or a second script) that seeds only users + 1 package for fast CI.
- **Optional**: Use `faker` or similar for larger datasets if we add load-testing or demo needs.
- **Edge cases**: If we add unique constraints beyond email/username (e.g. phone), ensure seed data respects them.

---

## 7. Checklist

- [x] Add `migrations.seed` in `prisma.config.ts` (`"tsx prisma/seed.ts"`) and optional `"prisma".seed` in `package.json`.
- [x] Add npm scripts `db:seed` and `db:reset`.
- [x] Implement `prisma/seed.ts` with the entity order above, `hashPassword` for users, and Prisma 7 pg adapter.
- [ ] Document in README how to run migrations + seed for new contributors (optional).
