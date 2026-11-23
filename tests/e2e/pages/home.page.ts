import type { Locator, Page } from '@playwright/test';

import { routes } from '../../../frontend/src/config/routes.config';

export class HomePage {
    readonly page: Page;
    readonly heading: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Home', level: 1 });
    }

    async goto() {
        await this.page.goto(routes.root);
    }
}
