import { test, expect, type Page } from '@playwright/test';

async function createTestGroup(page: Page, name: string): Promise<string> {
  await page.goto('/groups/new');
  await page.getByPlaceholder('e.g. Goa Trip 2026').fill(name);
  await page.getByRole('button', { name: /FRIENDS/i }).click();
  await page.getByRole('button', { name: /CREATE GROUP/i }).click();
  await expect(page).toHaveURL(/\/groups\/[a-f0-9-]+/, { timeout: 30000 });
  return new URL(page.url()).pathname;
}

test.describe('Add Expense Page', () => {
  let groupPath: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    const page = await context.newPage();
    groupPath = await createTestGroup(page, 'Expense Test Group');
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${groupPath}/expenses/new`);
  });

  test('displays add expense form with all sections', async ({ page }) => {
    await expect(page.getByText('Add a new expense')).toBeVisible();
    await expect(page.getByText('Amount')).toBeVisible();
    await expect(page.getByText('Description')).toBeVisible();
    await expect(page.getByText('Date')).toBeVisible();
    await expect(page.getByText('Paid by')).toBeVisible();
    await expect(page.getByText('Split Type')).toBeVisible();
    await expect(page.getByText('Category', { exact: true })).toBeVisible();
    await expect(page.getByText('Participants')).toBeVisible();
  });

  test('has ADD EXPENSE submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /ADD EXPENSE/i })).toBeVisible();
  });

  test('shows amount placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder('0')).toBeVisible();
  });

  test('shows description placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder('e.g. Dinner at Toit')).toBeVisible();
  });

  test('displays all split type options', async ({ page }) => {
    await expect(page.getByText('EQUAL')).toBeVisible();
    await expect(page.getByText('EXACT')).toBeVisible();
    await expect(page.getByText('PERCENT')).toBeVisible();
    await expect(page.getByText('SHARES')).toBeVisible();
  });

  test('displays all category options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Food/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Travel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Stay/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fun/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bills/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Shopping/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Other/i })).toBeVisible();
  });

  test('EQUAL split type is selected by default', async ({ page }) => {
    const equalButton = page.getByRole('button', { name: /EQUAL/i });
    await expect(equalButton).toHaveClass(/border-hotgreen/);
  });

  test('can select different split types', async ({ page }) => {
    const exactButton = page.getByRole('button', { name: /EXACT/i });
    await exactButton.click();
    await expect(exactButton).toHaveClass(/border-hotgreen/);
  });

  test('can select a category', async ({ page }) => {
    const foodButton = page.getByRole('button', { name: /Food/i });
    await foodButton.click();
    await expect(foodButton).toHaveClass(/bg-black/);
  });

  test('shows split preview when amount is entered', async ({ page }) => {
    await page.getByPlaceholder('0').fill('1000');
    await expect(page.getByText('Split Preview')).toBeVisible();
    await expect(page.getByText('Total')).toBeVisible();
  });

  test('shows validation errors for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /ADD EXPENSE/i }).click();
    await expect(page.getByText('Description is required')).toBeVisible();
  });

  test('creates an expense with equal split', async ({ page }) => {
    await page.getByPlaceholder('0').fill('500');
    await page.getByPlaceholder('e.g. Dinner at Toit').fill('E2E Test Dinner');
    await page.getByRole('button', { name: /Food/i }).click();
    await page.getByRole('button', { name: /ADD EXPENSE/i }).click();

    // Should redirect back to group page (not on /expenses/new anymore)
    await expect(page).not.toHaveURL(/\/expenses\/new/, { timeout: 30000 });
  });
});

test.describe('Expense in Group Detail', () => {
  let groupPath: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    const page = await context.newPage();
    groupPath = await createTestGroup(page, 'Expense View Group');

    // Create an expense
    await page.goto(`${groupPath}/expenses/new`);
    await page.getByPlaceholder('0').fill('1200');
    await page.getByPlaceholder('e.g. Dinner at Toit').fill('Test Expense');
    await page.getByRole('button', { name: /Food/i }).click();
    await page.getByRole('button', { name: /ADD EXPENSE/i }).click();
    await expect(page).not.toHaveURL(/\/expenses\/new/, { timeout: 30000 });

    await context.close();
  });

  test('shows the created expense in the expenses list', async ({ page }) => {
    await page.goto(groupPath);
    await expect(page.getByText('Test Expense')).toBeVisible();
  });
});
