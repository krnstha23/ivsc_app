import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pool: Pool | undefined;
    prismaCtor: typeof PrismaClient | undefined;
};

function getConnectionString() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set in environment.");
    }
    return connectionString;
}

function getDevPool(): Pool {
    if (!globalForPrisma.pool) {
        globalForPrisma.pool = new Pool({ connectionString: getConnectionString() });
    }
    return globalForPrisma.pool;
}

function createClient(pool: Pool) {
    return new PrismaClient({
        adapter: new PrismaPg(pool),
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "error", "warn"]
                : ["error"],
    });
}

// IMPORTANT:
// - Never call pool.end() in dev: Next.js HMR can keep old module instances alive.
// - If we end the shared pool, any still-referenced Prisma client will crash.

let prisma: PrismaClient;

if (process.env.NODE_ENV !== "production") {
    const pool = getDevPool();
    const needsNewClient =
        !globalForPrisma.prisma || globalForPrisma.prismaCtor !== PrismaClient;
    if (needsNewClient) {
        globalForPrisma.prisma = createClient(pool);
        globalForPrisma.prismaCtor = PrismaClient;
    }
    prisma = globalForPrisma.prisma!;
} else {
    const pool = new Pool({ connectionString: getConnectionString() });
    prisma = createClient(pool);
}

export { prisma };
