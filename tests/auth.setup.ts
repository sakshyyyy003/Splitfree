import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'playwright/.auth/user.json';

/**
 * This setup test logs in once and saves the authenticated state.
 * Other tests that need authentication can reuse this state.
 *
 * Set these environment variables before running:
 *   E2E_USER_EMAIL    — test account email
 *   E2E_USER_PASSWORD — test account password
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD environment variables are required for authenticated tests. ' +
      'Create a test account in your Supabase project and set these variables.'
    );
  }

  await page.goto('/login');

  // Wait for the form to be fully interactive
  const emailInput = page.getByLabel('Email');
  await expect(emailInput).toBeVisible();

  await emailInput.fill(email);
  await page.getByLabel('Password').fill(password);

  // Click submit and wait for navigation
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for redirect to dashboard after successful login
  await expect(page).toHaveURL('/dashboard', { timeout: 30000 });

  // Save signed-in state
  await page.context().storageState({ path: AUTH_FILE });
});
