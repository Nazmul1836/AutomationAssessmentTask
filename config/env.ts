import 'dotenv/config';

/**
 * Single source of truth for environment-specific values.
 * Override any value with an environment variable or a local `.env` file (see `.env.example`).
 * The defaults are the public demo values from the assessment brief, so the suite runs out of the box.
 */
export const env = {
  baseUrl: process.env.BASE_URL || 'https://practicesoftwaretesting.com',
  apiUrl: process.env.API_URL || 'https://api.practicesoftwaretesting.com',
  user: {
    email: process.env.USER_EMAIL || 'customer@practicesoftwaretesting.com',
    password: process.env.USER_PASSWORD || 'welcome01',
  },
} as const;
