import { defineConfig } from 'vitest/config';

import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        // Enables `describe`, `it`, `expect` globally
        globals: true,
        // Use Node.js environment (no browser APIs)
        environment: 'node',
        include: ['src/**/*.test.ts'],
        coverage: {
            reporter: ['text', 'json'],
        },
        // Set environment variables for tests
        env: {
            NODE_ENV: 'development',
            DEV_CLIENT_URL: 'http://localhost:3000',
            DEV_DOMAIN: 'localhost',
            ACCESS_TOKEN_SECRET: 'test-access-token-secret',
            REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
            MONGO_URI: 'mongodb://localhost:27017/test',
            MONGO_DB_NAME: 'test-db',
            BASE_ROUTE_PATH: '/api',
        },
    },
});
