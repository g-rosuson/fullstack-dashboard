import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = dirname(fileURLToPath(import.meta.url));

loadEnv({
    path: resolve(__dirname, '.env.integration.test'),
    // Applied keys win over inherited shell/.env so Docker hostname (`mongo`) cannot leak into host-side Vitest.
    override: true,
});

// Integration tests (HTTP + Mongo + real middleware). Run: npm run test:integration
// Env defaults: `.env.integration.test` (loaded above; keys in file override existing process.env).
// Vitest sets NODE_ENV=test in workers; `src/config` only accepts development|production — force development here.
// Specs live under test/integration/. Singleton-heavy app: forks pool + singleFork.
export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
        environment: 'node',
        include: ['test/integration/**/*.test.ts'],
        passWithNoTests: true,
        testTimeout: 60_000,
        hookTimeout: 60_000,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
        coverage: {
            reporter: ['text', 'json'],
        },
    },
});
