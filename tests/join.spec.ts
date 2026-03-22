import { test, expect } from '@playwright/test';

test.describe('Join Group Page', () => {
  test('shows invalid invite page for bad invite code', async ({ page }) => {
    await page.goto('/join/invalid-code-12345');

    await expect(page.getByText('Invalid Invite Link')).toBeVisible();
    await expect(
      page.getByText('This invite link is invalid or the group no longer exists.')
    ).toBeVisible();

    const goHomeLink = page.getByRole('link', { name: 'Go Home' });
    await expect(goHomeLink).toBeVisible();
    await expect(goHomeLink).toHaveAttribute('href', '/');
  });

  test('Go Home link navigates to landing page', async ({ page }) => {
    await page.goto('/join/invalid-code-12345');
    await page.getByRole('link', { name: 'Go Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('shows SPLITFREE branding on join page', async ({ page }) => {
    await page.goto('/join/invalid-code-12345');
    await expect(page.getByText('SPLITFREE')).toBeVisible();
  });
});
