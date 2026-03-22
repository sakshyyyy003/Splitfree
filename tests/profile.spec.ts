import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
  });

  test('displays profile heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('displays profile picture section', async ({ page }) => {
    await expect(page.getByText('Profile picture')).toBeVisible();
  });

  test('shows avatar upload hint', async ({ page }) => {
    await expect(page.getByText('Click to upload. JPEG, PNG or WebP (max 2 MB).')).toBeVisible();
  });

  test('has name input field', async ({ page }) => {
    await expect(page.getByLabel('Name')).toBeVisible();
  });

  test('has description textarea', async ({ page }) => {
    await expect(page.getByLabel('Description')).toBeVisible();
  });

  test('has Save Changes button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible();
  });

  test('name field shows correct placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('description field shows correct placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder('Tell us about yourself')).toBeVisible();
  });

  test('can update profile name', async ({ page }) => {
    const nameInput = page.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill('E2E Test User');
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Button should be disabled during submission, then re-enabled
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeEnabled({ timeout: 10000 });
  });

  test('has change avatar button', async ({ page }) => {
    const avatarButton = page.getByRole('button', { name: 'Change avatar' });
    await expect(avatarButton).toBeVisible();
  });
});
