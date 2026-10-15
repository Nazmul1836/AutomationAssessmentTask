import { test as base, expect } from '@playwright/test';
import { env } from '../config/env';
import { AccountPage } from '../pages/AccountPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { Header } from '../pages/components/Header';
import { InvoicesPage } from '../pages/InvoicesPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductListPage } from '../pages/ProductListPage';
import { ProductPage } from '../pages/ProductPage';

export interface Credentials {
  email: string;
  password: string;
}

interface Fixtures {
  loginPage: LoginPage;
  accountPage: AccountPage;
  header: Header;
  productListPage: ProductListPage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  invoicesPage: InvoicesPage;
  /** Logs in through the UI with the configured customer account. */
  loggedIn: void;
  /** A brand-new customer registered through the API, unique to the test. */
  throwawayUser: Credentials;
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  header: async ({ page }, use) => use(new Header(page)),
  productListPage: async ({ page }, use) => use(new ProductListPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  invoicesPage: async ({ page }, use) => use(new InvoicesPage(page)),

  loggedIn: async ({ loginPage, accountPage }, use) => {
    await loginPage.goto();
    await loginPage.login(env.user.email, env.user.password);
    await accountPage.waitForLoaded();
    await use();
  },

  throwawayUser: async ({ request }, use, testInfo) => {
    const user: Credentials = {
      email: `qa.${Date.now()}.${testInfo.workerIndex}.${Math.random().toString(36).slice(2, 8)}@example.com`,
      password: 'Str0ng!Pass#2026',
    };
    const response = await request.post(`${env.apiUrl}/users/register`, {
      data: {
        first_name: 'QA',
        last_name: 'Automation',
        dob: '1990-01-01',
        phone: '0612345678',
        email: user.email,
        password: user.password,
        address: { street: 'Main 1', city: 'Amsterdam', state: 'NH', country: 'NL', postal_code: '1011AB' },
      },
    });
    expect(response.status(), await response.text()).toBe(201);
    await use(user);
  },
});

export { expect };
