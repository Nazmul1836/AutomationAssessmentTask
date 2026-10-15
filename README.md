# Toolshop UI Automation

Automated UI tests for **[practicesoftwaretesting.com](https://practicesoftwaretesting.com)** (Toolshop demo), built with **Playwright + TypeScript** using the Page Object Model.

## Quick start

Prerequisite: **Node.js 18+** (tested on Node 22).

```bash
npm install && npm test
```

`npm install` also downloads the Chromium browser (via a `postinstall` hook), and `npm test` runs the whole suite in parallel.

| Command | What it does |
|---|---|
| `npm test` | Run all tests headless, in parallel |
| `npm run test:headed` | Run with a visible browser |
| `npm run test:ui` | Open Playwright UI mode (time-travel debugging) |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | TypeScript type check |
| `npx playwright test tests/cart.spec.ts` | Run a single spec |
| `npx playwright test -g "Gift Card"` | Run a single test by name |

## Tool and language choice

**Playwright with TypeScript**, because:

- **Auto-waiting and web-first assertions** (`toHaveText`, `toBeEnabled`, `expect.toPass`) make it practical to have **zero fixed sleeps**, which the brief requires.
- **Network awareness** (`waitForResponse`): Toolshop is an Angular SPA that reloads data through API calls, so tests synchronise on the real API response instead of guessing timings.
- **Isolation and parallelism built in.** Every test gets a fresh browser context (cookies and storage), and the runner is parallel by default.
- **Reporting built in.** The HTML report, screenshots, videos and **traces** of failed tests come with no extra plugins.
- **TypeScript** catches selector and data-shape mistakes at compile time, and the test data file is typed.

## Project structure

```
config/env.ts             URLs and credentials (env vars / .env, with demo defaults)
data/checkout-data.json   Test data for the data-driven checkout (product, address, 5 payment methods)
fixtures/test.ts          Custom Playwright fixtures: page objects, `loggedIn`, `throwawayUser`
pages/                    Page Objects
  LoginPage, AccountPage, ProductListPage, ProductPage,
  CartPage, CheckoutPage, InvoicesPage, components/Header
tests/                    Specs, one per feature area
  login.spec.ts  search-filter.spec.ts  cart.spec.ts  checkout.spec.ts
utils/money.ts            Price parsing to integer cents (no floating-point drift)
.github/workflows/        CI: runs on every push and PR, uploads report and traces
```

### Configuration

No URLs or credentials are hard-coded in tests; they all come from [`config/env.ts`](config/env.ts). Override them with environment variables or a `.env` file (copy [`.env.example`](.env.example)):

```
BASE_URL=https://practicesoftwaretesting.com
API_URL=https://api.practicesoftwaretesting.com
USER_EMAIL=customer@practicesoftwaretesting.com
USER_PASSWORD=welcome01
```

The defaults are the public demo values from the brief, so the suite runs without any setup.

## Test coverage

| Area | Test | Verifies |
|---|---|---|
| **Login** | valid credentials | Redirect to `/account`, "My account" title, user menu visible |
| | invalid password | `Invalid email or password` error, user stays on the login page |
| | empty fields | `Email is required` and `Password is required` |
| **Search & filter** | search → filter → sort | Results for "pliers" all contain "pliers"; the **Pliers** category filter is applied; after *Price (Low - High)* the **prices are read from the page** and checked to be in ascending order, rather than trusting the sort label |
| **Cart** | add, update, remove | Adds 2 different products (qty 2 and 1), updates one quantity, removes one item. After each step, every **line total = unit price × qty** and **cart total = sum of line totals**, using integer-cent arithmetic |
| **Checkout (E2E + data-driven)** | one test per payment method in `data/checkout-data.json` | login → add to cart → billing address → payment → confirm; checks the *Thanks for your order! Your invoice number is INV-…* message, then confirms that invoice appears under **My Invoices** with the correct total and billing address |

Data-driven checkout runs with **5 payment methods** from one data file: Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card. To add a case, add an entry. `fields` maps each field's `data-test` id to its value, and `<select>` fields are handled automatically.

## Design decisions

- **Page Object Model.** Tests only describe intent; locators and interaction details live in `pages/`. Page objects are injected through fixtures, so no test constructs them.
- **Stable selectors.** The app exposes `data-test` attributes, so `testIdAttribute` is set to `data-test` and `getByTestId()` is used throughout.
- **No fixed sleeps.** All synchronisation uses auto-waiting assertions, `waitForResponse` on the relevant API call, or `expect(...).toPass()` for retries. For example, after a search, filter or sort, `ProductListPage` waits for the products API response and then for the grid to render exactly the products in that response, so it never reads a stale grid.
- **Independent, parallel-safe tests.**
  - Each test has its own browser context, so its own cart. Carts are per browser session, not per account.
  - No test depends on another test's state or order.
  - Every test passes when run alone (`-g "<name>"`) and when the suite runs in parallel. The suite was also run 3× in parallel (`--repeat-each=3 --workers=6`) with 30/30 passing.
- **Account-lockout safety.** Toolshop **locks an account after 3 failed logins**, and after that even the correct password is rejected. If the invalid-password test used the shared customer account, repeated runs would lock it and break every checkout test. So that test **registers a fresh throwaway user through the API** (`throwawayUser` fixture) and fails the login against that user.
- **Billing address.** The checkout form auto-fills street, city and state from a postcode lookup, and the backend **rejects orders whose city does not match the country**. The test enters country, postcode and house number, waits for the lookup response, and asserts the form shows exactly the looked-up values. The step retries because the form is also re-initialised asynchronously from the user profile, which can wipe values typed too early.
- **Money as integer cents.** Avoids floating-point rounding errors when summing totals.

## Reports and debugging

- An **HTML report** is generated in `playwright-report/` on every run. Open it with `npm run report`.
- For failed tests, the report includes a **screenshot**, **video** and **Playwright trace**: `retain-on-failure` / `only-on-failure`, configured in [`playwright.config.ts`](playwright.config.ts). Open a trace from the report, or with `npx playwright show-trace test-results/<test>/trace.zip`.
- In CI, the HTML report is uploaded as a build artifact on every run, and `test-results/` (traces, screenshots, videos) is uploaded when tests fail.

## Continuous integration

[`.github/workflows/playwright.yml`](.github/workflows/playwright.yml) runs on every push and pull request. It installs dependencies, type-checks, runs the suite (4 workers, 1 retry on CI), and uploads the report. URLs and credentials can be overridden with repository variables and secrets (`BASE_URL`, `API_URL`, `USER_EMAIL`, `USER_PASSWORD`). Without them, it uses the demo defaults.

## Findings while automating

1. **Cart shows a wrong line total after a rejected quantity update.** For a product limited to one per cart (e.g. *Thor Hammer*), changing its quantity to 3 makes the API reject the update (`400 – "You can only have one Thor Hammer in the cart."`). The UI still shows the line total for quantity 3 ($33.42), while the cart total and the server keep quantity 1. No error is shown to the user. The cart test therefore uses *Claw Hammer*.
2. **The address form can silently lose user input.** Values typed into country, postcode and house number can be wiped when the form re-initialises from the user profile.
3. **Account lockout after 3 failed logins** is permanent for the session and has no self-service unlock, which is worth knowing for anyone sharing the demo accounts.

## Notes and limitations

- The target is a **shared public demo**. Its data resets periodically, and other people use the same accounts, so the tests avoid relying on pre-existing data. For example, they look up the invoice created in the same test rather than counting invoices.
- Each checkout run creates a real (demo) order on the `customer@` account.
- Only Chromium is configured, to keep runs fast. Adding Firefox or WebKit is a one-line change in `projects` in `playwright.config.ts`.

## How AI tools were used

I used **Claude Code** (an AI coding assistant) as a pair programmer:

- **Exploring the app.** It wrote throwaway Playwright scripts that dumped the `data-test` attributes, API calls and validation rules of each page, such as payment-method fields, the gift-card format and the postcode-lookup endpoint. This replaced manual DevTools inspection.
- **Scaffolding.** It generated the first version of the page objects, fixtures, specs, CI workflow and this README.
- **Debugging.** Failures were diagnosed from Playwright's error context, screenshots and network logs. This uncovered the account-lockout rule, the one-per-cart limit and the server-side address validation, and each one led to a design change described above.

I reviewed the generated code, steered the design decisions (fresh user for negative login, lookup-driven address, cent-based math), and verified stability by running each test in isolation and the full suite repeatedly in parallel.
