import type { Locator, Page } from '@playwright/test';

import { routes } from '../../../frontend/src/config/routes.config';

export class LoginPage {
    readonly page: Page;
    readonly heading: Locator;
    readonly submitButton: Locator;
    readonly form: Locator;
    readonly emailField: Locator;
    readonly passwordField: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Login' });
        this.submitButton = page.getByRole('button', { name: 'Login' });
        this.form = page.getByRole('form', { name: 'Authentication form' });
        this.emailField = page.getByLabel('Email');
        this.passwordField = page.getByLabel('Password');
    }

    async goto() {
        await this.page.goto(routes.login);
    }

    async login(email: string, password: string) {
        await this.emailField.fill(email);
        await this.passwordField.fill(password);
        await this.submitButton.click();
    }
}
