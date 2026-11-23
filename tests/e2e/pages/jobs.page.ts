import type { Locator, Page } from '@playwright/test';

import { routes } from '../../../frontend/src/config/routes.config';

export class JobsPage {
    readonly page: Page;
    readonly heading: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Jobs', level: 1 });
    }

    async goto() {
        await this.page.goto(routes.jobs);
        await this.heading.waitFor();
    }

    jobCard(name: string) {
        return this.page.locator('[data-slot="card"]').filter({
            has: this.page.getByRole('heading', { name, level: 2, exact: true, includeHidden: true }),
        });
    }

    async openCreateFromPlaceholder() {
        await this.page.getByRole('button', { name: 'Create job' }).click();
        await this.page.getByRole('dialog', { name: 'Create job' }).waitFor();
    }

    async openCreateFromList() {
        await this.page.getByRole('button', { name: 'Create job' }).click();
        await this.page.getByRole('dialog', { name: 'Create job' }).waitFor();
    }

    async fillName(name: string) {
        await this.page.getByRole('dialog').filter({ hasText: /Create job|Edit job/ }).getByLabel('Name').fill(name);
    }

    async addScraperTool(keyword = 'e2e') {
        await this.page.getByRole('button', { name: 'Add target' }).click();
        const dialog = this.page.getByRole('dialog', { name: 'Add tool' });
        await dialog.waitFor();
        await dialog.getByLabel('Tool type').selectOption('scraper');
        await dialog.getByLabel('Max pages').fill('1');
        await dialog.getByPlaceholder('Enter a keyword...').fill(keyword);
        await dialog.getByPlaceholder('Enter a keyword...').press('Enter');
        await dialog.getByLabel('Target').selectOption('jobs-ch');
        await dialog.getByRole('button', { name: 'Add tool' }).click();
        await dialog.waitFor({ state: 'hidden' });
    }

    async fillFutureDailySchedule(status: 'Active' | 'Paused' = 'Active') {
        await this.page.getByLabel('Type').selectOption('daily');
        await this.page.getByRole('button', { name: /Start date/i }).click();

        const calendar = this.page.locator('[data-slot="calendar"]');
        await calendar.waitFor();
        await calendar.getByRole('button', { name: /next month/i }).click();
        await calendar.locator('button').filter({ hasText: /^15$/ }).first().click();

        await this.page.getByLabel('Start time').fill('18:00');
        await this.page.getByRole('radio', { name: status }).click();
    }

    async submitCreate() {
        await this.page.getByRole('dialog', { name: 'Create job' }).getByRole('button', { name: 'Create' }).click();
    }

    async submitEdit() {
        const sheet = this.page.getByRole('dialog', { name: 'Edit job' });
        const startTime = sheet.getByLabel('Start time');

        if (await startTime.isEnabled()) {
            await startTime.fill('18:00');
        }

        await sheet.getByRole('button', { name: 'Edit' }).click();
    }

    async openCardMenu(name: string) {
        await this.jobCard(name).getByRole('button', { name: 'Dropdown menu trigger' }).click();
    }

    async editJob(name: string) {
        await this.openCardMenu(name);
        await this.page.getByRole('menuitem', { name: 'Edit' }).click();
        await this.page.getByRole('dialog', { name: 'Edit job' }).waitFor();
    }

    async deleteJob(name: string) {
        await this.openCardMenu(name);
        await this.page.getByRole('menuitem', { name: 'Delete' }).click();
        await this.confirm('Delete job', 'Delete');
    }

    async confirm(title: string, label: string) {
        const dialog = this.page.getByRole('dialog', { name: title });
        await dialog.getByRole('button', { name: label }).click();
        await dialog.waitFor({ state: 'hidden' });
    }

    async runJob(name: string) {
        await this.jobCard(name).getByRole('button', { name: 'Run' }).click();
        await this.confirm('Run job', 'Run');
    }

    async stopJob(name: string) {
        await this.jobCard(name).getByRole('button', { name: 'Stop' }).click();
        await this.confirm('Stop job', 'Stop');
    }

    async pauseJob(name: string) {
        await this.jobCard(name).getByRole('button', { name: 'Pause' }).click();
        await this.confirm('Pause job', 'Pause');
    }

    async activateJob(name: string) {
        await this.jobCard(name).getByRole('button', { name: 'Activate' }).click();
        await this.confirm('Activate job', 'Activate');
    }
}
