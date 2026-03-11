import { describe, expect, it } from 'vitest';

import config from './index';

describe('config', () => {
    describe('config object structure', () => {
        it('should export config object with all required properties', () => {
            expect(config).toHaveProperty('isDeveloping');
            expect(config).toHaveProperty('clientUrl');
            expect(config).toHaveProperty('domain');
            expect(config).toHaveProperty('accessTokenSecret');
            expect(config).toHaveProperty('refreshTokenSecret');
            expect(config).toHaveProperty('mongoURI');
            expect(config).toHaveProperty('mongoDBName');
            expect(config).toHaveProperty('basePath');
        });

        it('should have correct data types for all properties', () => {
            expect(typeof config.isDeveloping).toBe('boolean');
            expect(typeof config.clientUrl).toBe('string');
            expect(typeof config.domain).toBe('string');
            expect(typeof config.accessTokenSecret).toBe('string');
            expect(typeof config.refreshTokenSecret).toBe('string');
            expect(typeof config.mongoURI).toBe('string');
            expect(typeof config.mongoDBName).toBe('string');
            expect(typeof config.basePath).toBe('string');
        });

        it('should have non-empty string values for required string properties', () => {
            expect(config.clientUrl.length).toBeGreaterThan(0);
            expect(config.domain.length).toBeGreaterThan(0);
            expect(config.accessTokenSecret.length).toBeGreaterThan(0);
            expect(config.refreshTokenSecret.length).toBeGreaterThan(0);
            expect(config.mongoURI.length).toBeGreaterThan(0);
            expect(config.mongoDBName.length).toBeGreaterThan(0);
            expect(config.basePath.length).toBeGreaterThan(0);
        });

        it('should have valid URL format for clientUrl', () => {
            expect(config.clientUrl).toMatch(/^https?:\/\/.+/);
        });

        it('should have valid URL format for mongoURI', () => {
            expect(config.mongoURI).toMatch(/^mongodb:\/\/.+/);
        });

        it('should have boolean value for isDeveloping based on NODE_ENV', () => {
            // This test verifies that the config is properly initialized
            // The actual value depends on the current NODE_ENV
            expect(typeof config.isDeveloping).toBe('boolean');
        });
    });
});
