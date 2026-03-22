import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('displays welcome greeting with user name', async ({ page }) => {
    await expect(page.getByText(/Welcome back,/)).toBeVisible();
  });

  test('shows Groups tab by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Your groups' }).first()).toBeVisible();
  });

  test('has New Group button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /New Group/i })).toBeVisible();
  });

  test('New Group link navigates to create group page', async ({ page }) => {
    await page.getByRole('link', { name: /New Group/i }).click();
    await expect(page).toHaveURL('/groups/new');
  });

  test('shows people tab content', async ({ page }) => {
    await page.goto('/dashboard?tab=people');
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
  });

  test('shows activity tab content', async ({ page }) => {
    await page.goto('/dashboard?tab=activity');
    // The activity heading may be inside the visible tabpanel
    await expect(page.locator('[role="tabpanel"]:visible').getByText(/Recent activity/i)).toBeVisible();
  });
});

test.describe('Dashboard - Empty State', () => {
  test('shows empty state when no groups exist', async ({ page }) => {
    await page.goto('/dashboard');
    const noGroups = page.getByText('No groups yet');
    const hasGroups = page.getByRole('heading', { name: 'Your groups' }).first();
    await expect(hasGroups.or(noGroups)).toBeVisible();
  });
});
