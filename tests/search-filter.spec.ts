import { expect, test } from '../fixtures/test';

test.describe('Search & filter', () => {
  test('search "pliers", filter by category and sort by price low → high', async ({ productListPage }) => {
    await productListPage.goto();

    await productListPage.search('pliers');
    await expect(productListPage.searchCaption).toHaveText('Searched for: pliers');
    const searchResults = await productListPage.getProductNames();
    expect(searchResults.length).toBeGreaterThan(1);
    for (const name of searchResults) expect(name.toLowerCase()).toContain('pliers');

    await productListPage.filterByCategory('Pliers');
    await expect(productListPage.categoryFilter('Pliers')).toBeChecked();
    const filteredResults = await productListPage.getProductNames();
    expect(filteredResults.length).toBeGreaterThan(1);
    for (const name of filteredResults) expect(name.toLowerCase()).toContain('pliers');

    await productListPage.sortBy('price,asc');

    // Read the prices actually rendered on the page and verify their order ourselves,
    // rather than trusting the selected sort label.
    const prices = await productListPage.getProductPricesInCents();
    expect(prices.length).toBe(filteredResults.length);
    const expectedOrder = [...prices].sort((a, b) => a - b);
    expect(prices, `Prices on page (cents): ${prices.join(', ')}`).toEqual(expectedOrder);
  });
});
