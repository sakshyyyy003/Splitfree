import { test, expect } from '@playwright/test';

test.describe('Create Group Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/groups/new');
  });

  test('displays create group form', async ({ page }) => {
    await expect(page.getByText('Create a new group')).toBeVisible();
    await expect(page.getByText('Group Name')).toBeVisible();
    await expect(page.getByText('Category')).toBeVisible();
    await expect(page.getByText('Cover Photo', { exact: true })).toBeVisible();
  });

  test('has Back link to dashboard', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /Back/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/dashboard');
  });

  test('shows group name placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder('e.g. Goa Trip 2026')).toBeVisible();
  });

  test('displays all category options', async ({ page }) => {
    await expect(page.getByText('TRIP')).toBeVisible();
    await expect(page.getByText('HOME')).toBeVisible();
    await expect(page.getByText('COUPLE')).toBeVisible();
    await expect(page.getByText('WORK')).toBeVisible();
    await expect(page.getByText('FRIENDS')).toBeVisible();
    await expect(page.getByText('OTHER')).toBeVisible();
  });

  test('has CREATE GROUP submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /CREATE GROUP/i })).toBeVisible();
  });

  test('can select a category', async ({ page }) => {
    const tripButton = page.getByRole('button', { name: /TRIP/i });
    await tripButton.click();
    await expect(tripButton).toHaveClass(/border-hotgreen/);
  });

  test('shows cover photo upload button', async ({ page }) => {
    await expect(page.getByText('Add cover photo')).toBeVisible();
  });

  test('shows optional file format hint', async ({ page }) => {
    await expect(page.getByText('Optional. JPEG, PNG or WebP (max 5 MB).')).toBeVisible();
  });

  test('creates a group and redirects to group detail', async ({ page }) => {
    await page.getByPlaceholder('e.g. Goa Trip 2026').fill('Playwright Test Group');
    await page.getByRole('button', { name: /TRIP/i }).click();
    await page.getByRole('button', { name: /CREATE GROUP/i }).click();

    await expect(page).toHaveURL(/\/groups\/[a-f0-9-]+/, { timeout: 30000 });
  });
});

test.describe('Group Detail Page', () => {
  let groupUrl: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000/groups/new');
    await page.getByPlaceholder('e.g. Goa Trip 2026').fill('E2E Detail Test Group');
    await page.getByRole('button', { name: /FRIENDS/i }).click();
    await page.getByRole('button', { name: /CREATE GROUP/i }).click();
    await expect(page).toHaveURL(/\/groups\/[a-f0-9-]+/, { timeout: 30000 });

    groupUrl = new URL(page.url()).pathname;
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(groupUrl);
  });

  test('displays group name and emoji', async ({ page }) => {
    await expect(page.getByText('E2E Detail Test Group')).toBeVisible();
    await expect(page.getByText('🎉')).toBeVisible();
  });

  test('has Back to dashboard link', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /Back to dashboard/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/dashboard');
  });

  test('shows balance status', async ({ page }) => {
    await expect(page.getByText('All settled up')).toBeVisible();
  });

  test('has Add Expense link with plus icon', async ({ page }) => {
    const addExpenseLink = page.locator(`a[href*="/expenses/new"]`);
    await expect(addExpenseLink).toBeVisible();
  });

  test('displays three tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Balances' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Members' })).toBeVisible();
  });

  test('Expenses tab is default active', async ({ page }) => {
    const expensesTab = page.getByRole('tab', { name: 'Expenses' });
    await expect(expensesTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Balances tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Balances' }).click();
    await expect(page.getByText('Running balances')).toBeVisible();
  });

  test('Balances tab shows summary cards', async ({ page }) => {
    await page.getByRole('tab', { name: 'Balances' }).click();
    await expect(page.getByText('Money owed back', { exact: true })).toBeVisible();
    await expect(page.getByText('Money still due', { exact: true })).toBeVisible();
    await expect(page.getByText('Suggested settlements', { exact: true })).toBeVisible();
  });

  test('can switch to Members tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Members' }).click();
    // The Members tab heading is in the CardTitle, check for it
    await expect(page.getByText('Everyone currently in the group')).toBeVisible();
  });

  test('Members tab shows current user as admin', async ({ page }) => {
    await page.getByRole('tab', { name: 'Members' }).click();
    await expect(page.getByText('Admin').first()).toBeVisible();
  });

  test('has settings link for admin', async ({ page }) => {
    const settingsLink = page.getByRole('link', { name: 'Group settings' });
    await expect(settingsLink).toBeVisible();
  });

  test('Add Expense navigates to expense form', async ({ page }) => {
    await page.locator(`a[href*="/expenses/new"]`).click();
    await expect(page).toHaveURL(/\/groups\/[a-f0-9-]+\/expenses\/new/);
  });
});
