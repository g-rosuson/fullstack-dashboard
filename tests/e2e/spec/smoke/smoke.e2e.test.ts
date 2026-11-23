import { routes } from '../../../../frontend/src/config/routes.config';

import { test } from '../../fixtures/base';
import { expect } from '@playwright/test';
import features from '../../../../frontend/src/config/features.config';

test.describe('smoke', () => {
    test('[SMK-001] login page loads and primary UI is visible', async ({ loginPage }) => {
        await loginPage.goto();
        await expect(loginPage.heading).toBeVisible();
        await expect(loginPage.submitButton).toBeVisible();
        await expect(loginPage.form).toBeVisible();
    });

    test('[SMK-002] register route redirects to login when registration is disabled', async ({ page, loginPage }) => {
        test.skip(features.isRegistrationEnabled, 'Registration is enabled in frontend config');

        await page.goto(routes.register);

        await expect(page).toHaveURL(routes.login);
        await expect(loginPage.heading).toBeVisible();
    });

    test('[SMK-003] unknown route does not crash the app', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', error => pageErrors.push(error.message));

        const response = await page.goto('/does-not-exist');

        expect(response?.ok()).toBeTruthy();
        expect(pageErrors).toHaveLength(0);
        await expect(page).toHaveTitle(/Authentication/i);
    });

    test('[SMK-004] root redirects unauthenticated user to login', async ({ page, loginPage }) => {
        await page.goto(routes.root);

        await expect(page).toHaveURL(routes.login);
        await expect(loginPage.heading).toBeVisible();
    });
});
