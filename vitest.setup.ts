/**
 * Vitest setup: defaults so importing `lib/prisma.ts` does not throw during pure unit tests.
 */
process.env.TZ ??= "UTC";
process.env.DATABASE_URL ??=
    "postgresql://vitest:vitest@127.0.0.1:5432/vitest_placeholder?schema=public";
