import { expect, Locator, Page } from '@playwright/test';
import { toCents } from '../utils/money';
import { Header } from './components/Header';

export class ProductPage {
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly quantityInput: Locator;
  readonly addToCartButton: Locator;
  readonly header: Header;

  constructor(private readonly page: Page) {
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.quantityInput = page.getByTestId('quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.header = new Header(page);
  }

  async getUnitPriceInCents(): Promise<number> {
    return toCents(await this.unitPrice.innerText());
  }

  /** Adds the product and waits for the cart API to accept it and the confirmation toast to appear. */
  async addToCart(quantity: number) {
    await this.quantityInput.fill(String(quantity));
    const added = this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/carts\/[^/]+$/.test(new URL(r.url()).pathname) && r.ok(),
    );
    await this.addToCartButton.click();
    await added;
    await expect(this.page.getByRole('alert').filter({ hasText: 'Product added to shopping cart.' }).first()).toBeVisible();
  }
}
