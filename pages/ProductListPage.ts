import { expect, Locator, Page, Response } from '@playwright/test';
import { toCents } from '../utils/money';

/** Home page: product grid with search, category filters and sorting. */
export class ProductListPage {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchCaption: Locator;
  readonly sortSelect: Locator;
  readonly productCards: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
    this.searchCaption = page.getByTestId('search-caption');
    this.sortSelect = page.getByTestId('sort');
    this.productCards = page.locator('a[data-test^="product-"]');
    this.productNames = page.getByTestId('product-name');
    this.productPrices = page.getByTestId('product-price');
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.productNames.first()).toBeVisible();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.refreshResultsVia(() => this.searchButton.click());
  }

  categoryFilter(category: string): Locator {
    return this.page.locator('#filters').getByLabel(category, { exact: true });
  }

  async filterByCategory(category: string) {
    await this.refreshResultsVia(() => this.categoryFilter(category).check());
  }

  /** @param option sort option value, e.g. "price,asc" */
  async sortBy(option: string) {
    await this.refreshResultsVia(() => this.sortSelect.selectOption(option));
  }

  async getProductNames(): Promise<string[]> {
    return (await this.productNames.allInnerTexts()).map((n) => n.trim());
  }

  async getProductPricesInCents(): Promise<number[]> {
    return (await this.productPrices.allInnerTexts()).map(toCents);
  }

  async openProduct(name: string) {
    await this.search(name);
    await this.productCards.filter({ has: this.page.getByText(name, { exact: true }) }).first().click();
    await this.page.waitForURL('**/product/**');
  }

  /**
   * Performs an action that triggers a product reload, waits for the products API response,
   * then waits until the grid renders exactly the products that response returned.
   * This replaces any fixed sleep and guarantees we never read a stale grid.
   */
  private async refreshResultsVia(action: () => Promise<unknown>) {
    const responsePromise = this.page.waitForResponse(isProductListResponse);
    await action();
    const response = await responsePromise;
    const body = (await response.json()) as { data: { name: string }[] };
    await expect(this.productNames).toHaveText(body.data.map((p) => p.name));
  }
}

function isProductListResponse(response: Response): boolean {
  const request = response.request();
  if (request.method() === 'OPTIONS' || request.method() === 'GET') return false; // list uses the HTTP QUERY method
  return /^\/products(\/search)?$/.test(new URL(response.url()).pathname) && response.ok();
}
