import { routes } from '../../../../frontend/src/config/routes.config';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { test } from '../../fixtures/authenticated';
import {
    createJob,
    isBackendAvailable,
    mapToFutureSchedule,
    mapToJobPayload,
    registerUser,
    buildTestEmail,
} from '../../helpers/api';
import { JobsPage } from '../../pages/jobs.page';
import { LoginPage } from '../../pages/login.page';
import type { RegisteredTestUser } from '../../types';

/**
 * Logs in and opens /jobs.
 */
const loginToJobs = async (page: Page, loginPage: LoginPage, testUser: RegisteredTestUser) => {
    const jobsPage = new JobsPage(page);

    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await expect(page).toHaveURL(routes.root);
    await jobsPage.goto();
    await expect(page).toHaveURL(routes.jobs);

    return jobsPage;
};

// TODO: Fix for webkit, how do we run only webkit locally and reproduce this issue?
test.describe.skip('jobs', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async () => {
        if (!(await isBackendAvailable())) {
            throw new Error(
                'Backend and MongoDB must be running (e.g. docker compose -f docker-compose.e2e.yml up -d mongo --wait && cd backend && npm run start:e2e)'
            );
        }
    });

    test('[CLIENT-JOBS-CRT-002] create without schedule appears running', async ({ page, loginPage, testUser }) => {
        const jobsPage = await loginToJobs(page, loginPage, testUser);
        const name = `Run now ${Date.now()}`;

        await jobsPage.openCreateFromPlaceholder();
        await jobsPage.fillName(name);
        await jobsPage.addScraperTool();
        await jobsPage.submitCreate();

        await expect(jobsPage.jobCard(name)).toBeVisible();
        await expect(jobsPage.jobCard(name).getByText('Running')).toBeVisible({ timeout: 30_000 });
    });

    test('[CLIENT-JOBS-CRT-007] / [CLIENT-JOBS-TLR-002] create with active schedule persists after reload', async ({
        page,
        loginPage,
        testUser,
    }) => {
        const jobsPage = await loginToJobs(page, loginPage, testUser);
        const name = `Scheduled active ${Date.now()}`;

        await jobsPage.openCreateFromPlaceholder();
        await jobsPage.fillName(name);
        await jobsPage.addScraperTool('listings');
        await jobsPage.fillFutureDailySchedule('Active');
        await jobsPage.submitCreate();

        await expect(jobsPage.jobCard(name)).toBeVisible();
        await expect(jobsPage.jobCard(name).getByText('Active', { exact: true })).toBeVisible({ timeout: 30_000 });
        await expect(jobsPage.jobCard(name).getByText('Next run')).toBeVisible();

        await page.reload();
        await jobsPage.heading.waitFor();
        await expect(jobsPage.jobCard(name).getByText('Active', { exact: true })).toBeVisible({ timeout: 30_000 });

        await jobsPage.editJob(name);
        await expect(page.getByRole('dialog', { name: 'Edit job' }).getByText('scraper')).toBeVisible();
    });

    test('[CLIENT-JOBS-CRT-008] create with stopped schedule shows Paused', async ({ page, loginPage, testUser }) => {
        const jobsPage = await loginToJobs(page, loginPage, testUser);
        const name = `Scheduled paused ${Date.now()}`;

        await jobsPage.openCreateFromPlaceholder();
        await jobsPage.fillName(name);
        await jobsPage.addScraperTool();
        await jobsPage.fillFutureDailySchedule('Paused');
        await jobsPage.submitCreate();

        await expect(jobsPage.jobCard(name).getByText('Paused', { exact: true })).toBeVisible({ timeout: 30_000 });
        await expect(jobsPage.jobCard(name).getByRole('button', { name: 'Activate' })).toBeVisible();
    });

    test('[CLIENT-JOBS-UPD-001] edit name persists after reload', async ({ page, loginPage, testUser }) => {
        await createJob(testUser.accessToken, mapToJobPayload('Beta', mapToFutureSchedule()));
        const jobsPage = await loginToJobs(page, loginPage, testUser);
        const renamed = `Beta renamed ${Date.now()}`;

        await expect(jobsPage.jobCard('Beta')).toBeVisible();
        await jobsPage.editJob('Beta');
        await jobsPage.fillName(renamed);
        await jobsPage.submitEdit();

        await expect(page.getByRole('dialog', { name: 'Edit job' })).toBeHidden({ timeout: 10_000 });
        await expect(jobsPage.jobCard(renamed)).toBeVisible();
        await expect(jobsPage.jobCard(renamed).getByText('Running')).toHaveCount(0);

        await page.reload();
        await jobsPage.heading.waitFor();
        await expect(jobsPage.jobCard(renamed)).toBeVisible({ timeout: 30_000 });
    });

    test('[CLIENT-JOBS-DEL-001] delete with confirmation removes the job after reload', async ({
        page,
        loginPage,
        testUser,
    }) => {
        await createJob(testUser.accessToken, mapToJobPayload('To delete', mapToFutureSchedule()));
        const jobsPage = await loginToJobs(page, loginPage, testUser);

        await expect(jobsPage.jobCard('To delete')).toBeVisible();
        await jobsPage.deleteJob('To delete');
        await expect(jobsPage.jobCard('To delete')).toHaveCount(0);

        await page.reload();
        await jobsPage.heading.waitFor();
        await expect(jobsPage.jobCard('To delete')).toHaveCount(0);
        await expect(page.getByText('No jobs exist yet, create your first job to get started.')).toBeVisible();
    });

    test('[CLIENT-JOBS-UNQ-001] duplicate name on create stays on the sheet', async ({ page, loginPage, testUser }) => {
        await createJob(testUser.accessToken, mapToJobPayload('Alpha', mapToFutureSchedule()));
        const jobsPage = await loginToJobs(page, loginPage, testUser);

        await jobsPage.openCreateFromList();
        await jobsPage.fillName('Alpha');
        await jobsPage.addScraperTool();
        await jobsPage.submitCreate();

        await expect(page.locator('[data-slot="toast"][data-type="error"]')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('dialog', { name: 'Create job' })).toBeVisible();
        await expect(jobsPage.jobCard('Alpha')).toHaveCount(1);
    });

    test('[CLIENT-JOBS-UNQ-002] duplicate name on rename keeps the original name', async ({
        page,
        loginPage,
        testUser,
    }) => {
        await createJob(testUser.accessToken, mapToJobPayload('Alpha', mapToFutureSchedule()));
        await createJob(testUser.accessToken, mapToJobPayload('Gamma', mapToFutureSchedule()));
        const jobsPage = await loginToJobs(page, loginPage, testUser);

        await jobsPage.editJob('Gamma');
        await jobsPage.fillName('Alpha');
        await jobsPage.submitEdit();

        await expect(page.locator('[data-slot="toast"][data-type="error"]')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('dialog', { name: 'Edit job' })).toBeVisible();
        await expect(jobsPage.jobCard('Gamma')).toHaveCount(1);
        await expect(jobsPage.jobCard('Alpha')).toHaveCount(1);
    });

    test('[CLIENT-JOBS-LST-003] list shows only the owner’s jobs', async ({ page, loginPage, testUser }, testInfo) => {
        const other = await registerUser(buildTestEmail(testInfo.workerIndex + 100));
        await createJob(other.accessToken, mapToJobPayload('Other user job', mapToFutureSchedule()));
        await createJob(testUser.accessToken, mapToJobPayload('Mine', mapToFutureSchedule()));
        const jobsPage = await loginToJobs(page, loginPage, testUser);

        await expect(jobsPage.jobCard('Mine')).toBeVisible();
        await expect(jobsPage.jobCard('Other user job')).toHaveCount(0);
    });

    test('[CLIENT-JOBS-SSC-001] / [CLIENT-JOBS-SSC-002] pause and activate a scheduled job', async ({
        page,
        loginPage,
        testUser,
    }) => {
        await createJob(testUser.accessToken, mapToJobPayload('Scheduled', mapToFutureSchedule('idle')));
        const jobsPage = await loginToJobs(page, loginPage, testUser);

        await expect(jobsPage.jobCard('Scheduled').getByText('Active', { exact: true })).toBeVisible({
            timeout: 30_000,
        });
        await jobsPage.pauseJob('Scheduled');
        await expect(jobsPage.jobCard('Scheduled').getByText('Paused', { exact: true })).toBeVisible({
            timeout: 30_000,
        });

        await jobsPage.activateJob('Scheduled');
        await expect(jobsPage.jobCard('Scheduled').getByText('Active', { exact: true })).toBeVisible({
            timeout: 30_000,
        });
    });

    test('[CLIENT-JOBS-RUN-001] / [CLIENT-JOBS-STP-001] / [CLIENT-JOBS-STR-001] run and stop update without reload', async ({
        page,
        loginPage,
        testUser,
    }) => {
        await createJob(testUser.accessToken, mapToJobPayload('On demand'));
        const jobsPage = await loginToJobs(page, loginPage, testUser);
        const card = jobsPage.jobCard('On demand');

        await expect(card).toBeVisible();
        await expect(card.getByText(/Running|Inactive/)).toBeVisible({ timeout: 30_000 });

        if (await card.getByText('Inactive').isVisible()) {
            await jobsPage.runJob('On demand');
        }

        await expect(card.getByText('Running')).toBeVisible({ timeout: 30_000 });
        await jobsPage.stopJob('On demand');
        await expect(card.getByText('Running')).toHaveCount(0, { timeout: 30_000 });
    });

    test('[CLIENT-JOBS-STR-002] hydrates schedule status on connect', async ({ page, loginPage, testUser }) => {
        await createJob(testUser.accessToken, mapToJobPayload('Hydrate me', mapToFutureSchedule('idle')));
        const jobsPage = await loginToJobs(page, loginPage, testUser);

        await expect(jobsPage.jobCard('Hydrate me').getByText('Active', { exact: true })).toBeVisible({
            timeout: 30_000,
        });
        await expect(jobsPage.jobCard('Hydrate me').getByRole('button', { name: 'Pause' })).toBeVisible();
    });
});
