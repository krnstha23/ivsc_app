# Implementation Notes

## 2026-04-28 - Docker build OOM mitigation for Next.js

### Design decisions made during development
- Updated Docker builder stage to use `NODE_OPTIONS=--max-old-space-size=4096` and call `npm run build -- --webpack` instead of hardcoding a smaller 1536MB heap.
- Kept `next.config.ts` aligned with Next 16 supported options (no deprecated `eslint` key).

### Discovered edge cases
- Next.js build workers can be SIGKILLed by container memory limits even when app code is valid.
- A lower heap cap in Docker can conflict with a higher local build config (`package.json` already uses 4096MB).

### Performance optimizations
- Reduced peak memory pressure in production image build path by aligning container heap configuration with project build scripts.

### User feedback incorporation
- Implemented directly from user-provided Docker build failure (`build worker ... SIGKILL`).

## 2026-04-28 - Faster post-login navigation

### Design decisions made during development
- Removed immediate `router.refresh()` after successful login in `components/login-form.tsx`; route navigation to `/dashboard` already fetches fresh server-rendered data.
- Added `router.prefetch(callbackUrl)` on the login page to warm the likely next route and reduce transition latency after credentials are accepted.
- Added short-lived JWT user-state recheck caching in `lib/auth.ts` (`TOKEN_USER_RECHECK_MS = 5 minutes`) to avoid hitting the database on every token callback while preserving periodic account/approval validation.

### Discovered edge cases
- Teacher/admin/user deactivation or teacher approval changes now propagate within the recheck window (up to 5 minutes) instead of on every callback.
- Login-time token creation still stamps `lastUserCheckAt` immediately, so first redirect after login avoids an extra DB validation pass.

### Performance optimizations
- Reduced one extra client-triggered navigation refresh after login.
- Reduced repeated `prisma.user.findUnique` calls from NextAuth JWT callback for active sessions with fresh token metadata.

### User feedback incorporation
- Implemented directly from user report that login-to-dashboard felt slow despite correct credentials.

## 2026-04-28 - Admin visibility for sessions list

### Design decisions made during development
- Expanded `/bookings/teaching` access from teacher-only to **ADMIN + TEACHER** at the page guard and sidebar navigation level.
- Kept teacher behavior unchanged (still scoped to own sessions), while admins get a global sessions list.
- Added admin-only identity columns (`Student`, `Teacher`) in desktop table and mobile cards; these fields are hidden for teachers.

### Discovered edge cases
- Admin does not have a `TeacherProfile`, so session query path must skip teacher-profile lookup for admins.
- “Complete session” action remains teacher-only to avoid privilege creep and preserve existing completion workflow.

### Performance optimizations
- Student/teacher relation data is selected only for admins; teacher view continues to fetch minimal booking fields.

### User feedback incorporation
- Implemented per user request that admins should see sessions and student/teacher names, with names visible only to admins.

## 2026-04-27 - Role-specific `/dashboard` home

### Design decisions made during development
- Replaced generic `SectionCards` with server-driven dashboards: `StudentDashboard`, `TeacherDashboard`, and `AdminDashboard` in `components/dashboard/`, with data loaders in `lib/dashboard-data.ts` (Prisma counts and limited lists).
- **USER:** KPIs (upcoming, completed, active enrollments), “Next up” + upcoming list with links to `/sessions/[id]/room`, shortcuts to book and bookings.
- **TEACHER:** KPIs (upcoming confirmed, completed all-time), next session with student name, queue list; empty state if no `TeacherProfile`.
- **ADMIN:** operational counts and link buttons to main admin routes.
- Removed `components/section-cards.tsx` as unused.

### Discovered edge cases
- Admin “sessions today” uses UTC day bounds to align with existing session time display.

### Performance optimizations
- Targeted `select` / `count` / `take: 5` where lists are capped.

### User feedback incorporation
- Built from the agreed role-based dashboard design (pipeline + deep links, no mock KPIs).

## 2026-04-27 - `/pricing` alias to home `#pricing`

### Design decisions made during development
- No `app/pricing` route: `proxy.ts` redirects `GET /pricing` (and `/pricing/`) to `/#pricing` on the marketing home page. The pricing tier “Select” links use `href="/pricing"` so they hit that redirect.

### Discovered edge cases
- None.

### Performance optimizations
- None.

### User feedback incorporation
- User asked for `/pricing` links without adding a new page; redirect keeps a single source of content (home section `id="pricing"`).

## 2026-04-27 - Admin-only packages index; Rs. display

### Design decisions made during development
- The `/packages` listing (and create/edit/bundle admin routes) is restricted to **ADMIN** in `lib/auth.config.ts` middleware and in `app/(app)/packages/page.tsx`. Students and teachers still use `/packages/[id]`, `/packages/[id]/book`, and booking UIs.
- Sidebar “Packages” is **ADMIN** only. Public marketing CTAs that pointed at `/packages` now use `/register`.
- Money is shown with a shared `formatRs()` in `lib/format-rs.ts` (`Rs.` + `en-IN` grouping) across admin tables, package detail, bundle cards, and booking slot prices; landing tier cards use the same helper (whole rupees).

### Discovered edge cases
- Package detail “Back” link: admins go to `/packages`, others to `/dashboard` (non-admins no longer have a valid packages index).

### Performance optimizations
- None.

### User feedback incorporation
- Implemented per user request to limit the packages admin UI to admins and replace `$` / USD-style display with Rs. notation.

## 2026-04-27 - Landing page: mock → evaluation copy

### Design decisions made during development
- Replaced user-facing and SEO strings that said “mock” with evaluation-focused wording on `/` (`app/page.tsx`); renamed the listening demo component to `ListeningSectionPreview` so the home module no longer uses “Mock” in identifiers.

### Discovered edge cases
- None.

### Performance optimizations
- None.

### User feedback incorporation
- Implemented per user request to align landing copy with evaluation positioning.

## 2026-04-27 - Landing hero copy and CTA

### Design decisions made during development
- Hero headline now says “humans” instead of “real humans”; primary CTA reads “Book your evaluation”; evaluator disclaimer moved above the CTA row with spacing tuned (`mt-6` / `mt-5`).
- Removed the small-print paragraph below the landing pricing tier cards (placeholder / sign-in disclaimer).

### Discovered edge cases
- None.

### Performance optimizations
- None.

### User feedback incorporation
- Implemented per user request to adjust hero title, button label, and disclaimer placement.

## 2026-04-27 - Landing header: remove center nav links

### Design decisions made during development
- Removed the desktop center navigation links from `LandingHeader` so the bar is logo left and auth actions right only; marketing pages still exist at their URLs but are no longer linked from the header.

### Discovered edge cases
- None specific; same header is used on `/` and `[slug]` static landing routes.

### Performance optimizations
- None.

### User feedback incorporation
- Implemented per user request to simplify the home (landing) header.

## 2026-04-27 - IDOR hardening for reschedule slot lookup

### Design decisions made during development
- Enforced object-level authorization in `findSlotsForReschedule` using the same `canManageBooking` policy already used by booking mutations.
- Reused `cancelBookingSchema` to validate `bookingId` format before querying, keeping ID handling consistent across booking server actions.

### Discovered edge cases
- Unauthorized and non-existent booking IDs now both return `{ slots: [] }` to avoid exposing record existence through response differences.
- Sessions without a valid `userId` are treated as unauthorized and return the same empty result shape.

### Performance optimizations
- The booking lookup selects only fields required for authorization and slot generation (`id`, `userId`, `teacherId`, `bundleId`, `duration`).
- Teacher profile is resolved only for teacher/admin roles, avoiding unnecessary reads for student requests.

### User feedback incorporation
- This change was prioritized after a direct user request to address potential IDOR risk in reschedule slot lookup behavior.

## 2026-04-27 - Secrets hardening and server deployment reliability

### Design decisions made during development
- Replaced hardcoded Postgres credentials in `docker-compose.yml` with environment-variable interpolation so credentials are supplied from `.env`.
- Kept Postgres internal-only by removing host port mapping from the `db` service.
- Added `libc6-compat` and `openssl` packages in the container base image to improve Prisma/Node runtime compatibility on Alpine-based servers.

### Discovered edge cases
- `POSTGRES_PASSWORD` is now mandatory at compose render time; missing values fail fast before containers start.
- Compose interpolation values in `DATABASE_URL` now depend on `.env` being present and complete.

### Performance optimizations
- No runtime performance changes; container startup reliability improved by satisfying native library requirements upfront.

### User feedback incorporation
- Changes were implemented per user request to remove secrets from tracked source configuration and ensure server-ready Docker behavior.

## 2026-04-27 - XSS hardening for inline HTML/script sinks

### Design decisions made during development
- Added centralized security helpers in `lib/security.ts` for inline script serialization and CSS token/color sanitization.
- Updated JSON-LD injection on the landing page to use escaped serialization instead of raw `JSON.stringify`.
- Hardened chart style injection by quoting selectors and allowing only sanitized CSS token names and color values.

### Discovered edge cases
- Characters like `<`, `>`, `&`, and Unicode line separators can break out of script contexts if not escaped.
- Dynamic CSS variable names or values can become injection vectors when interpolated into `dangerouslySetInnerHTML`.

### Performance optimizations
- Sanitization is lightweight string/regex validation and runs only when rendering chart styles or JSON-LD, adding negligible overhead.

### User feedback incorporation
- This hardening was implemented in response to a user-requested XSS prevention sweep across the app.

## 2026-04-27 - JWT/session revocation hardening

### Design decisions made during development
- Overrode `jwt` and `session` callbacks in `lib/auth.ts` (Node runtime) to re-check user state from the database on subsequent token usage.
- When a user is missing/deactivated, JWT claims are cleared and session is treated as unauthenticated.
- Refreshed role and username claims from DB during JWT callback to reduce stale-claim authorization drift.

### Discovered edge cases
- Edge auth (`lib/auth-edge.ts`) cannot use Prisma, so hard revocation checks are enforced in Node-side auth usage (`auth()` and session callback), not directly in proxy execution.
- Protected pages/actions that rely on `auth()` now consistently receive `null` for revoked/deactivated users.

### Performance optimizations
- User lookups in JWT callback select only required fields (`id`, `userName`, `role`, `isActive`) to keep per-request overhead minimal.

### User feedback incorporation
- This change was implemented after a user-requested security review for broken JWT token behavior.

## 2026-04-27 - Static page rich text editor (Tiptap)

### Design decisions made during development
- Replaced plain textarea content editing with a Tiptap-based editor in `components/static-page-form.tsx`.
- Added a dedicated reusable editor component `components/tiptap-editor.tsx` with a minimal toolbar (bold, italic, bullet list, ordered list).
- Kept `content` persisted as HTML so existing static-page workflows continue to use a single field.

### Discovered edge cases
- Existing static pages stored as plain text need normalization when loaded into Tiptap; the editor now converts legacy plain text into paragraph HTML.
- Empty rich-text documents can still emit structural HTML; submit flow validates non-empty plain-text content before sending.

### Performance optimizations
- Editor feature set is intentionally minimal (StarterKit + Link only) to avoid unnecessary payload and complexity.
- Sanitization uses allow-list rules and trims output before persistence.

### User feedback incorporation
- Rich text editing was added directly in response to user request for better static page content authoring.

## 2026-04-27 - Table action buttons switched to icon-only UI

### Design decisions made during development
- Updated table/list action cells to use icon-only buttons for compact layout and visual consistency.
- Added explicit `aria-label` attributes to preserve accessibility when text labels are removed.

### Discovered edge cases
- Action buttons inside clickable table rows require stop-propagation handling to avoid unintended row navigation.

### Performance optimizations
- No runtime performance impact; this is a presentational UI refinement.

### User feedback incorporation
- Implemented directly per user request to replace table action text buttons with icons.

## 2026-04-27 - Docker build OOM mitigation for Next.js production build

### Design decisions made during development
- Updated Docker builder command to invoke Next.js directly with a constrained heap (`--max-old-space-size=1536`) and explicit `--webpack` build mode.
- Kept the runtime image flow unchanged (standalone output copied into runner stage) to avoid deployment behavior changes.

### Discovered edge cases
- The `npm run build` script hardcodes `NODE_OPTIONS=--max-old-space-size=4096`, which can trigger OOM kills on lower-memory hosts when combined with Turbopack.
- Build-time static generation still logs a Prisma connection warning against the intentionally invalid build DB URL, but build output remains successful.

### Performance optimizations
- Switching Docker production builds to webpack reduced peak memory pressure enough for successful builds in constrained container environments.

### User feedback incorporation
- This mitigation was added immediately after user-reported `SIGKILL` failures during Docker image builds on server infrastructure.

## 2026-04-27 - Admin-created teacher availability with approved-teacher selector

### Design decisions made during development
- Extended the teacher availability flow so admins can create blocks on behalf of teachers from the same calendar dialog.
- Added a role-aware selector in the create dialog that appears only for admins and only lists approved/active teachers.
- Kept teacher self-service creation unchanged to preserve existing behavior for teacher accounts.

### Discovered edge cases
- A teacher role alone is insufficient when the teacher profile is not approved; admin create flow now validates target teacher approval server-side as well.
- Admin dialog handles empty approved-teacher lists by showing guidance and disabling create until a valid selection exists.

### Performance optimizations
- Approved teacher options are fetched only when the day dialog is opened by an admin, avoiding unnecessary data loading for teacher users.

### User feedback incorporation
- Implemented directly from user request for admins to choose approved teachers when creating availability blocks.

## 2026-04-27 - Block login for unapproved teachers

### Design decisions made during development
- Credentials `authorize` now rejects teacher accounts whose `teacher_profiles.isApproved` is false by throwing `CredentialsSignin` with a dedicated `code` (`teacher_not_approved`) so the login client can show a specific warning toast without implying a wrong password.
- JWT refresh path clears the session when an approved teacher becomes unapproved (or has no profile), matching the login gate.

### Discovered edge cases
- Teachers without a `TeacherProfile` row are treated as not approved for sign-in.

### User feedback incorporation
- Login page shows `toast.warning` with the admin-approval message when that credentials code is returned.

## 2026-04-27 - Sidebar: Teachers link for teacher role

### Design decisions made during development
- Included `TEACHER` in `allowedRoles` for the main **Teachers** (`/teachers`) nav item so approved teachers can open the availability calendar from the sidebar; it was previously admin-only, which left teachers on **Calendar** (`/calendar`) only and blocked discoverability of availability creation.

### User feedback incorporation
- Addressed report that the sidebar did not show the teachers page for teachers, preventing availability creation.

## 2026-04-27 - Calendar admin-only + day timeline card layout

### Design decisions made during development
- Restricted `/calendar` to **ADMIN** in the sidebar, on the calendar page (server redirect), in the edge `authorized` callback (so non-admins hitting `/calendar` go to `/dashboard`), and in calendar server actions so counts/day data are not returned to other roles.
- Reworked day-view timeline booking cards to a single horizontal row: **left** stack for time range, student name, and teacher name; **right** column for action buttons (stacked on narrow widths, row on `sm+`).

### Discovered edge cases
- With calendar admin-only, `viewerMayReschedule` is enabled for admins so reschedule controls remain useful on the admin timeline.

### User feedback incorporation
- Matches request for admin-only calendar access and clearer timeline card layout.

## 2026-04-27 - Remove student “My Enrollments” page

### Design decisions made during development
- Removed the **My Enrollments** sidebar entry and the student-only `/enrollments` UI; students still see enrollment usage on **package detail** (`/packages/[id]`) and when booking (`/packages/[id]/book`).
- Kept **admin** enrollment management at `/enrollments`, `/enrollments/assign`, `enrollment-actions.tsx`, and `enrollments/actions.ts`; edge `authorized` now treats `/enrollments*` as **ADMIN-only** (same pattern as `/calendar`).

### User feedback incorporation
- Implemented per request to drop the redundant student enrollments page and related surface area.

## 2026-04-27 - Admin delete/edit any teacher availability block

### Design decisions made during development
- Extended `deleteAvailability` and `updateAvailability` so **ADMIN** may act on any availability row without a linked booking; **TEACHER** remains restricted to their own `teacherProfile` rows.
- Day dialog shows **Edit** / **Delete** for every slot when the viewer is an admin (`isAdmin`), and only for **own** slots when the viewer is a teacher.

### Discovered edge cases
- Booked slots stay immutable for both roles (existing booking guard unchanged).

## 2026-04-27 - Overlapping teacher availability on create

### Design decisions made during development
- `createAvailability` and `adminCreateAvailability` now **merge** a new window with any **same teacher, same day** availability rows that **overlap** (half-open intervals; touching boundaries do not overlap). Overlapping rows **with a booking** cannot be absorbed and return a clear error instead.
- `updateAvailability` **rejects** changes that would overlap a **different** row on the target day (excluding the row being edited), since merge semantics for edits are easier to get wrong in the UI.

### User feedback incorporation
- Addresses friction when adding a block that crosses an existing unbooked window so creation behaves predictably instead of leaving duplicate overlapping rows.

## 2026-04-27 - Logout: hard session clear

### Design decisions made during development
- Confirmed logout uses `signOut` with `redirect: true` and `redirectTo: /login` so the Auth.js sign-out POST runs and the browser performs a full navigation to the login page, avoiding any chance of stale `SessionProvider` client state after a soft `redirect: false` + `router.push` path.

### User feedback incorporation
- Tightened after request to ensure session data is cleared when the user confirms logout.
