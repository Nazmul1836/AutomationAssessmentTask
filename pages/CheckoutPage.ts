import { expect, Locator, Page } from '@playwright/test';

export interface Address {
  country: string; // ISO code, e.g. "NL"
  postalCode: string;
  houseNumber: string;
}

/** Address as returned by the app's postcode lookup. */
export interface ResolvedAddress {
  street: string;
  city: string;
  state: string;
}

/** Steps 2–4 of /checkout: sign-in confirmation, billing address, payment and order confirmation. */
export class CheckoutPage {
  readonly signedInProceedButton: Locator;
  readonly addressProceedButton: Locator;
  readonly paymentMethodSelect: Locator;
  readonly finishButton: Locator;
  readonly paymentSuccessMessage: Locator;
  readonly orderConfirmation: Locator;

  constructor(private readonly page: Page) {
    this.signedInProceedButton = page.getByTestId('proceed-2');
    this.addressProceedButton = page.getByTestId('proceed-3');
    this.paymentMethodSelect = page.getByTestId('payment-method');
    this.finishButton = page.getByTestId('finish');
    this.paymentSuccessMessage = page.getByTestId('payment-success-message');
    this.orderConfirmation = page.getByText(/Thanks for your order! Your invoice number is INV-\d+/);
  }

  async continueAsSignedInUser() {
    await this.signedInProceedButton.click();
  }

  /**
   * Enters country, postal code and house number; the app then looks up street, city and state itself.
   * The backend rejects orders whose city does not match the country, so we keep the looked-up values
   * and verify the form shows exactly what the lookup returned.
   * The form is also re-initialised asynchronously from the user profile, which can wipe values typed
   * too early — hence the retrying block.
   */
  async fillBillingAddress(address: Address): Promise<ResolvedAddress> {
    const country = this.page.getByTestId('country');
    const postalCode = this.page.getByTestId('postal_code');
    const houseNumber = this.page.getByTestId('house_number');
    let resolved!: ResolvedAddress;

    await expect(async () => {
      const lookup = this.page.waitForResponse(
        (r) => {
          const url = new URL(r.url());
          return (
            url.pathname === '/postcode-lookup' &&
            url.searchParams.get('postcode') === address.postalCode &&
            url.searchParams.get('house_number') === address.houseNumber &&
            r.ok()
          );
        },
        { timeout: 5_000 },
      );
      await country.selectOption(address.country);
      await postalCode.fill(address.postalCode);
      await houseNumber.fill(address.houseNumber);
      resolved = await (await lookup).json();

      await expect(country).toHaveValue(address.country, { timeout: 1_000 });
      await expect(postalCode).toHaveValue(address.postalCode, { timeout: 1_000 });
      await expect(houseNumber).toHaveValue(address.houseNumber, { timeout: 1_000 });
      await expect(this.page.getByTestId('street')).toHaveValue(resolved.street, { timeout: 2_000 });
      await expect(this.page.getByTestId('city')).toHaveValue(resolved.city, { timeout: 1_000 });
      await expect(this.page.getByTestId('state')).toHaveValue(resolved.state, { timeout: 1_000 });
      await expect(this.addressProceedButton).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });

    return resolved;
  }

  async continueToPayment() {
    await this.addressProceedButton.click();
    await expect(this.paymentMethodSelect).toBeVisible();
  }

  /**
   * Selects a payment method and fills its method-specific fields.
   * `fields` maps each field's data-test id to the value to enter; <select> fields are handled automatically.
   */
  async payWith(method: string, fields: Record<string, string>) {
    await this.paymentMethodSelect.selectOption(method);
    for (const [testId, value] of Object.entries(fields)) {
      const field = this.page.getByTestId(testId);
      const tag = await field.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') await field.selectOption(value);
      else await field.fill(value);
    }
    await expect(this.finishButton).toBeEnabled();
    await this.finishButton.click();
    await expect(this.paymentSuccessMessage).toHaveText('Payment was successful');
  }

  /** Confirms the order and returns the generated invoice number. */
  async confirmOrder(): Promise<string> {
    // The same button switches from "Check payment" to "Confirm"; wait for the switch before clicking.
    await expect(this.finishButton).toHaveText('Confirm');
    await expect(this.finishButton).toBeEnabled();
    const invoiceCreated = this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/invoices',
    );
    await this.finishButton.click();
    const response = await invoiceCreated;
    expect(response.status(), `order creation failed: ${await response.text()}`).toBe(201);
    await expect(this.orderConfirmation).toBeVisible();
    const text = await this.orderConfirmation.innerText();
    return text.match(/INV-\d+/)![0];
  }
}
