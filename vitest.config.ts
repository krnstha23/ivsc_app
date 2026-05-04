import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        environment: "node",
        globals: false,
        setupFiles: ["./vitest.setup.ts"],
        include: ["**/*.test.ts", "**/*.test.tsx"],
        coverage: {
            provider: "v8",
            reporter: ["text", "text-summary", "html"],
            /** Focus on logic layers; UI routes/pages are covered via E2E if desired. */
            include: ["lib/**/*.ts", "app/**/actions.ts"],
            exclude: [
                "**/*.d.ts",
                "app/generated/**",
                "**/*.config.*",
                "prisma/**",
                ".next/**",
            ],
        },
        pool: "forks",
    },
    resolve: {
        alias: {
            "@": path.resolve(dir, "./"),
        },
    },
});
