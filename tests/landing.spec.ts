import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero section with tagline', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('SPLIT BILLS.');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('FRIENDSHIPS.');
  });

  test('displays subtitle text', async ({ page }) => {
    await expect(page.getByText('No more awkward money talks')).toBeVisible();
  });

  test('has Get Started Free CTA linking to signup', async ({ page }) => {
    const cta = page.getByRole('link', { name: 'GET STARTED FREE' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/signup');
  });

  test('has Log In button linking to login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: 'LOG IN' });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('displays feature blocks', async ({ page }) => {
    await expect(page.getByText('ADD EXPENSES')).toBeVisible();
    await expect(page.getByText('TRACK BALANCES')).toBeVisible();
    await expect(page.getByText('SETTLE UP')).toBeVisible();
  });

  test('displays stats section', async ({ page }) => {
    await expect(page.getByText('2M+')).toBeVisible();
    await expect(page.getByText('50Cr+')).toBeVisible();
    await expect(page.getByText('10L+')).toBeVisible();
    await expect(page.getByText('4.8')).toBeVisible();
  });

  test('displays bottom CTA section', async ({ page }) => {
    await expect(page.getByText('STOP KEEPING TABS.')).toBeVisible();
    const bottomCta = page.getByRole('link', { name: 'GET STARTED NOW' });
    await expect(bottomCta).toBeVisible();
    await expect(bottomCta).toHaveAttribute('href', '/signup');
  });

  test('navigates to signup page when CTA clicked', async ({ page }) => {
    await page.getByRole('link', { name: 'GET STARTED FREE' }).click();
    await expect(page).toHaveURL('/signup');
  });

  test('navigates to login page when Log In clicked', async ({ page }) => {
    await page.getByRole('link', { name: 'LOG IN' }).click();
    await expect(page).toHaveURL('/login');
  });
});
