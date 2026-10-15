import { env } from '../config/env';
import { expect, test } from '../fixtures/test';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('valid credentials log the customer in', async ({ loginPage, accountPage, header }) => {
    await loginPage.login(env.user.email, env.user.password);

    await accountPage.waitForLoaded();
    await expect(accountPage.pageTitle).toHaveText('My account');
    await expect(header.userMenu).toBeVisible();
    await expect(loginPage.loginError).toBeHidden();
  });

  // Uses a freshly registered user: the app locks an account after 3 failed attempts,
  // so failing logins against the shared customer account would break other tests.
  test('invalid password shows an error and keeps the user on the login page', async ({
    page,
    loginPage,
    throwawayUser,
  }) => {
    await loginPage.login(throwawayUser.email, 'Wrong!Password1');

    await expect(loginPage.loginError).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('empty fields show required-field errors', async ({ page, loginPage }) => {
    await loginPage.submitButton.click();

    await expect(loginPage.emailError).toHaveText('Email is required');
    await expect(loginPage.passwordError).toHaveText('Password is required');
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
