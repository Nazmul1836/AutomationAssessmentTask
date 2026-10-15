import { CartPage } from '../pages/CartPage';
import { expect, test } from '../fixtures/test';

const PRODUCT_A = 'Combination Pliers';
// Note: avoid "Thor Hammer" here — the shop limits it to one per cart (see README "Findings").
const PRODUCT_B = 'Claw Hammer';

/** Asserts every line total equals unit price × quantity and the cart total equals the sum of line totals. */
async function expectCartMathToBeCorrect(cartPage: CartPage, expectedUnitPrices: Record<string, number>) {
  const lines = await cartPage.getLines();
  for (const line of lines) {
    expect(line.unitPriceCents, `unit price of ${line.name}`).toBe(expectedUnitPrices[line.name]);
    expect(line.linePriceCents, `line total of ${line.name}`).toBe(line.unitPriceCents * line.quantity);
  }
  const sumOfLines = lines.reduce((sum, line) => sum + line.linePriceCents, 0);
  expect(await cartPage.getTotalInCents(), 'cart total').toBe(sumOfLines);
  return lines;
}

test.describe('Cart', () => {
  test('add two products, update a quantity, remove an item and verify totals', async ({
    productListPage,
    productPage,
    header,
    cartPage,
  }) => {
    const unitPrices: Record<string, number> = {};

    await productListPage.goto();
    await productListPage.openProduct(PRODUCT_A);
    unitPrices[PRODUCT_A] = await productPage.getUnitPriceInCents();
    await productPage.addToCart(2);
    await expect(header.cartQuantity).toHaveText('2');

    await productListPage.goto();
    await productListPage.openProduct(PRODUCT_B);
    unitPrices[PRODUCT_B] = await productPage.getUnitPriceInCents();
    await productPage.addToCart(1);
    await expect(header.cartQuantity).toHaveText('3');

    await test.step('cart contains both products with correct totals', async () => {
      await cartPage.goto();
      await expect(cartPage.rows).toHaveCount(2);
      await expect(cartPage.row(PRODUCT_A).getByTestId('product-quantity')).toHaveValue('2');
      await expect(cartPage.row(PRODUCT_B).getByTestId('product-quantity')).toHaveValue('1');
      await expectCartMathToBeCorrect(cartPage, unitPrices);
    });

    await test.step('updating a quantity recalculates line and cart totals', async () => {
      await cartPage.setQuantity(PRODUCT_B, 3);
      const expectedLine = unitPrices[PRODUCT_B] * 3;
      await expect(cartPage.row(PRODUCT_B).getByTestId('line-price')).toHaveText(`$${(expectedLine / 100).toFixed(2)}`);
      await expect(header.cartQuantity).toHaveText('5');
      await expectCartMathToBeCorrect(cartPage, unitPrices);
    });

    await test.step('removing an item leaves only the other product', async () => {
      await cartPage.remove(PRODUCT_A);
      await expect(cartPage.rows).toHaveCount(1);
      await expect(header.cartQuantity).toHaveText('3');
      const lines = await expectCartMathToBeCorrect(cartPage, unitPrices);
      expect(lines).toEqual([
        { name: PRODUCT_B, quantity: 3, unitPriceCents: unitPrices[PRODUCT_B], linePriceCents: unitPrices[PRODUCT_B] * 3 },
      ]);
    });
  });
});
