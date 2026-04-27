# Implementation Notes

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
