import { Locator, Page } from '@playwright/test';

export class Header {
  readonly cartQuantity: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.cartQuantity = page.getByTestId('cart-quantity');
    this.userMenu = page.getByTestId('nav-menu');
  }
}
