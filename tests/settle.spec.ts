import { test, expect } from '@playwright/test';

test.describe('Settle Up Page - Empty State', () => {
  let groupPath: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000/groups/new');
    await page.getByPlaceholder('e.g. Goa Trip 2026').fill('Settle Empty Group');
    await page.getByRole('button', { name: /TRIP/i }).click();
    await page.getByRole('button', { name: /CREATE GROUP/i }).click();
    await expect(page).toHaveURL(/\/groups\/[a-f0-9-]+/, { timeout: 30000 });

    groupPath = new URL(page.url()).pathname;
    await context.close();
  });

  test('shows all settled up message when no debts', async ({ page }) => {
    await page.goto(`${groupPath}/settle`);
    await expect(page.getByText('Everyone is settled up!')).toBeVisible();
    await expect(
      page.getByText('There are no outstanding balances in this group.')
    ).toBeVisible();
  });

  test('has Back to group button in empty state', async ({ page }) => {
    await page.goto(`${groupPath}/settle`);
    await expect(page.getByRole('button', { name: 'Back to group' })).toBeVisible();
  });

  test('has page title', async ({ page }) => {
    await page.goto(`${groupPath}/settle`);
    await expect(page.getByText('Settle up')).toBeVisible();
  });

  test('has Back to group navigation link', async ({ page }) => {
    await page.goto(`${groupPath}/settle`);
    const backLink = page.getByRole('link', { name: /Back to group/i }).first();
    await expect(backLink).toBeVisible();
  });
});
