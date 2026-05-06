import { describe, expect, it } from 'vitest';

import { listingKeyFrom, normalizeUrlForListingKey } from './index';

describe('listingKeyFrom', () => {
    it('is stable for the same portal and URL', () => {
        expect(listingKeyFrom('jobs-ch', 'https://example.com/job?utm=1#frag')).toBe(
            listingKeyFrom('jobs-ch', 'https://example.com/job?utm=1#other')
        );
    });

    it('differs when the portal differs', () => {
        expect(listingKeyFrom('jobs-ch', 'https://example.com/a')).not.toBe(
            listingKeyFrom('job-ich', 'https://example.com/a')
        );
    });
});

describe('normalizeUrlForListingKey', () => {
    it('drops the fragment', () => {
        expect(normalizeUrlForListingKey('https://a.com/path#hash')).toBe('https://a.com/path');
    });
});
