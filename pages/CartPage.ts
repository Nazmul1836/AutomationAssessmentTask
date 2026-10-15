import { expect, Locator, Page } from '@playwright/test';
import { toCents } from '../utils/money';

export interface CartLine {
  name: string;
  quantity: number;
  unitPriceCents: number;
  linePriceCents: number;
}

/** Step 1 of /checkout: the shopping cart table. */
export class CartPage {
  readonly rows: Locator;
  readonly cartTotal: Locator;
  readonly emptyMessage: Locator;
  readonly proceedButton: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.locator('table tbody tr').filter({ has: page.getByTestId('product-title') });
    this.cartTotal = page.getByTestId('cart-total');
    this.emptyMessage = page.getByText('The cart is empty. Nothing to display.');
    this.proceedButton = page.getByTestId('proceed-1');
  }

  async goto() {
    await this.page.goto('/checkout');
    await expect(this.rows.first()).toBeVisible();
  }

  row(productName: string): Locator {
    const exactTitle = new RegExp(`^\\s*${escapeRegExp(productName)}\\s*$`);
    return this.rows.filter({ has: this.page.getByTestId('product-title').filter({ hasText: exactTitle }) });
  }

  async getLines(): Promise<CartLine[]> {
    const lines: CartLine[] = [];
    for (const row of await this.rows.all()) {
      lines.push({
        name: (await row.getByTestId('product-title').innerText()).trim(),
        quantity: Number(await row.getByTestId('product-quantity').inputValue()),
        unitPriceCents: toCents(await row.getByTestId('product-price').innerText()),
        linePriceCents: toCents(await row.getByTestId('line-price').innerText()),
      });
    }
    return lines;
  }

  async getTotalInCents(): Promise<number> {
    return toCents(await this.cartTotal.innerText());
  }

  async setQuantity(productName: string, quantity: number) {
    const input = this.row(productName).getByTestId('product-quantity');
    const updated = this.page.waitForResponse(
      (r) => r.request().method() === 'PUT' && r.url().endsWith('/product/quantity'),
    );
    await input.fill(String(quantity));
    await input.press('Tab');
    const response = await updated;
    expect(response.ok(), `cart quantity update rejected: ${await response.text()}`).toBe(true);
    await expect(input).toHaveValue(String(quantity));
  }

  async remove(productName: string) {
    await this.row(productName).locator('a.btn-danger').click();
    await expect(this.row(productName)).toHaveCount(0);
  }

  async proceedToCheckout() {
    await this.proceedButton.click();
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
