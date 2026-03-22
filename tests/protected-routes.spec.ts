import { test, expect } from '@playwright/test';

test.describe('Protected Route Access - Unauthenticated', () => {
  // These tests use a fresh browser context without auth cookies
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects unauthenticated user from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('redirects unauthenticated user from profile to login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('redirects unauthenticated user from groups/new to login', async ({ page }) => {
    await page.goto('/groups/new');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Protected Route Access - Authenticated', () => {
  test('authenticated user can access dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/Welcome back,/)).toBeVisible();
  });

  test('authenticated user can access profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('authenticated user can access create group page', async ({ page }) => {
    await page.goto('/groups/new');
    await expect(page).toHaveURL('/groups/new');
    await expect(page.getByText('Create a new group')).toBeVisible();
  });
});
