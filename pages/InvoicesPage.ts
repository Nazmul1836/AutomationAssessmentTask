import { Locator, Page } from '@playwright/test';

/** My account → My invoices. */
export class InvoicesPage {
  readonly pageTitle: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.getByTestId('page-title');
    this.rows = page.locator('table tbody tr');
  }

  async goto() {
    await this.page.goto('/account/invoices');
  }

  row(invoiceNumber: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('cell', { name: invoiceNumber, exact: true }) });
  }

  /** Columns: Invoice Number | Billing Address | Invoice Date | Total | actions */
  billingAddressCell(invoiceNumber: string): Locator {
    return this.row(invoiceNumber).getByRole('cell').nth(1);
  }

  totalCell(invoiceNumber: string): Locator {
    return this.row(invoiceNumber).getByRole('cell').nth(3);
  }
}
