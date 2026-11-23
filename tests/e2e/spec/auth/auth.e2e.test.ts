import { routes } from '../../../../frontend/src/config/routes.config';
import features from '../../../../frontend/src/config/features.config';
import { expect } from '@playwright/test';

import { test } from '../../fixtures/authenticated';
import { isBackendAvailable } from '../../helpers/api';
import { E2E_TEST_PASSWORD } from '../../constants';
import { DashboardPage } from '../../pages/dashboard.page';
import { HomePage } from '../../pages/home.page';

test.describe('auth', () => {
    test.beforeEach(async () => {
        if (!(await isBackendAvailable())) {
            throw new Error(
                'Backend and MongoDB must be running (e.g. docker compose -f docker-compose.e2e.yml up -d mongo --wait && cd backend && npm run start:e2e)'
            );
        }
    });

    test.describe('login and logout', () => {
        test('[AUTH-E2E-001] successful login redirects to home', async ({ page, loginPage, testUser }) => {
            const homePage = new HomePage(page);

            await loginPage.goto();
            await loginPage.login(testUser.email, testUser.password);

            await expect(page).toHaveURL(routes.root);
            await expect(homePage.heading).toBeVisible();
        });

        test('[AUTH-E2E-002] wrong password keeps user on login', async ({ page, loginPage, testUser }) => {
            await loginPage.goto();
            await loginPage.login(testUser.email, 'WrongPassword1!');

            await expect(page).toHaveURL(routes.login);
            await expect(loginPage.heading).toBeVisible();
        });

        test('[AUTH-E2E-003] unknown email keeps user on login', async ({ page, loginPage }) => {
            await loginPage.goto();
            await loginPage.login('unknown-user@example.com', E2E_TEST_PASSWORD);

            await expect(page).toHaveURL(routes.login);
            await expect(loginPage.heading).toBeVisible();
        });

        test('[AUTH-E2E-004] logout returns user to login', async ({ page, loginPage, testUser }) => {
            const homePage = new HomePage(page);
            const dashboardPage = new DashboardPage(page);

            await loginPage.goto();
            await loginPage.login(testUser.email, testUser.password);
            await expect(homePage.heading).toBeVisible();

            await dashboardPage.logout();

            await expect(page).toHaveURL(routes.login);
            await expect(loginPage.heading).toBeVisible();
        });

        test('[AUTH-E2E-005] empty login form does not navigate away', async ({ page, loginPage }) => {
            await loginPage.goto();
            await loginPage.submitButton.click();

            await expect(page).toHaveURL(routes.login);
            await expect(loginPage.heading).toBeVisible();
        });

        test('[AUTH-E2E-006] authenticated user visiting login redirects to home', async ({
            page,
            loginPage,
            testUser,
        }) => {
            const homePage = new HomePage(page);

            await loginPage.goto();
            await loginPage.login(testUser.email, testUser.password);
            await expect(homePage.heading).toBeVisible();

            // Client-side navigation preserves the in-memory session (full page.goto would reset Zustand).
            await page.evaluate(loginPath => {
                window.history.pushState({}, '', loginPath);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }, routes.login);

            await expect(page).toHaveURL(routes.root);
            await expect(homePage.heading).toBeVisible();
        });
    });

    test.describe('registration', () => {
        test.skip(!features.isRegistrationEnabled, 'Registration is disabled in frontend config');

        test('[AUTH-E2E-010] register route renders registration form', async ({ page }) => {
            await page.goto(routes.register);

            await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();
            await expect(page.getByLabel('First name')).toBeVisible();
        });
    });

    test.describe('protected routes and session', () => {
        test('[AUTH-E2E-020] protected route redirects unauthenticated user to login', async ({ page, loginPage }) => {
            await page.goto(routes.jobs);

            await expect(page).toHaveURL(routes.login);
            await expect(loginPage.heading).toBeVisible();
        });

        test('[AUTH-E2E-021] session bootstrap via refresh cookie after reload', async ({
            page,
            loginPage,
            testUser,
        }) => {
            const homePage = new HomePage(page);

            await loginPage.goto();
            await loginPage.login(testUser.email, testUser.password);
            await expect(homePage.heading).toBeVisible();

            await page.reload();

            await expect(page).toHaveURL(routes.root);
            await expect(homePage.heading).toBeVisible();
        });

        test('[AUTH-E2E-022] authenticated user can reach jobs without re-login', async ({
            page,
            loginPage,
            testUser,
        }) => {
            await loginPage.goto();
            await loginPage.login(testUser.email, testUser.password);
            await expect(page).toHaveURL(routes.root);

            await page.goto(routes.jobs);

            await expect(page).toHaveURL(routes.jobs);
            await expect(page.getByRole('heading', { name: 'Jobs', level: 1 })).toBeVisible();
        });

        test('[AUTH-E2E-023] cleared session cookies redirect to login on reload', async ({
            page,
            loginPage,
            testUser,
        }) => {
            const homePage = new HomePage(page);

            await loginPage.goto();
            await loginPage.login(testUser.email, testUser.password);
            await expect(homePage.heading).toBeVisible();

            await page.context().clearCookies();
            await page.reload();

            await expect(page).toHaveURL(routes.login);
            await expect(loginPage.heading).toBeVisible();
        });
    });
});
