import mappers from './index';

describe('scraper mappers', () => {
    describe('mapToKeywords', () => {
        it('returns null when both tool and target keywords are missing or empty', () => {
            expect(mappers.mapToKeywords(undefined, undefined)).toBeNull();
            expect(mappers.mapToKeywords([], [])).toBeNull();
            expect(mappers.mapToKeywords(undefined, [])).toBeNull();
            expect(mappers.mapToKeywords([], undefined)).toBeNull();
        });

        it('returns tool keywords when only the tool provides them', () => {
            expect(mappers.mapToKeywords(undefined, ['alpha'])).toEqual(['alpha']);
        });

        it('returns target keywords when only the target provides them', () => {
            expect(mappers.mapToKeywords(['beta'], undefined)).toEqual(['beta']);
        });

        it('merges tool then target keywords when both are present', () => {
            expect(mappers.mapToKeywords(['target-kw'], ['tool-kw'])).toEqual(['tool-kw', 'target-kw']);
        });
    });

    describe('mapToMaxPages', () => {
        it('returns null when neither tool nor target provides a valid maxPages', () => {
            expect(mappers.mapToMaxPages(undefined, undefined)).toBeNull();
            expect(mappers.mapToMaxPages(-1, undefined)).toBeNull();
            expect(mappers.mapToMaxPages(undefined, -1)).toBeNull();
        });

        it('returns target maxPages when the target value is valid', () => {
            expect(mappers.mapToMaxPages(3, 10)).toBe(3);
        });

        it('returns tool maxPages when only the tool value is valid', () => {
            expect(mappers.mapToMaxPages(undefined, 5)).toBe(5);
        });

        it('accepts zero as a valid maxPages', () => {
            expect(mappers.mapToMaxPages(0, 5)).toBe(0);
            expect(mappers.mapToMaxPages(undefined, 0)).toBe(0);
        });
    });
});
