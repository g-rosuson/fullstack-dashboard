// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { vi } from 'vitest';

import '@testing-library/jest-dom';

// JSDOM does not implement window.matchMedia, so any component that calls it
// (e.g. the shadcn useIsMobile hook) will throw at runtime in the test environment.
// This stub satisfies the API contract without simulating real media query behaviour.
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// JSDOM does not implement HTMLFormElement.requestSubmit, which is called internally
// by @testing-library/user-event when clicking a submit button inside a form.
// This polyfill falls back to a plain submit event so form submission tests work correctly.
HTMLFormElement.prototype.requestSubmit = function () {
    this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
};
