import rawCheckoutData from '../data/checkout-data.json';
import { Address } from '../pages/CheckoutPage';
import { formatCents } from '../utils/money';
import { expect, test } from '../fixtures/test';

interface CheckoutData {
  product: string;
  billingAddress: Address;
  paymentMethods: { label: string; method: string; fields: Record<string, string> }[];
}

const checkoutData = rawCheckoutData as CheckoutData;

/**
 * End-to-end checkout, data-driven: one test per payment method in data/checkout-data.json.
 * login → add to cart → address → payment → confirm → order appears under My Invoices.
 */
test.describe('Checkout end-to-end', () => {
  for (const payment of checkoutData.paymentMethods) {
    test(`order can be placed and invoiced using ${payment.label}`, async ({
      loggedIn,
      productListPage,
      productPage,
      header,
      cartPage,
      checkoutPage,
      invoicesPage,
    }) => {
      await productListPage.goto();
      await productListPage.openProduct(checkoutData.product);
      await productPage.addToCart(1);
      await expect(header.cartQuantity).toHaveText('1');

      await cartPage.goto();
      await expect(cartPage.rows).toHaveCount(1);
      const cartTotal = await cartPage.getTotalInCents();
      await cartPage.proceedToCheckout();

      await checkoutPage.continueAsSignedInUser();
      const billingAddress = await checkoutPage.fillBillingAddress(checkoutData.billingAddress);
      await checkoutPage.continueToPayment();
      await checkoutPage.payWith(payment.method, payment.fields);
      const invoiceNumber = await checkoutPage.confirmOrder();
      expect(invoiceNumber).toMatch(/^INV-\d+$/);

      await invoicesPage.goto();
      await expect(invoicesPage.pageTitle).toHaveText('Invoices');
      await expect(invoicesPage.row(invoiceNumber)).toHaveCount(1);
      await expect(invoicesPage.totalCell(invoiceNumber)).toHaveText(formatCents(cartTotal));
      await expect(invoicesPage.billingAddressCell(invoiceNumber)).toHaveText(billingAddress.street);
    });
  }
});
