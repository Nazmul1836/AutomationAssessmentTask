import { Locator, Page } from '@playwright/test';

export class AccountPage {
  readonly pageTitle: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.getByTestId('page-title');
  }

  async waitForLoaded() {
    await this.page.waitForURL('**/account');
  }
}
