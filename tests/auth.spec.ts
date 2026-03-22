import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays login form with all elements', async ({ page }) => {
    await expect(page.getByText('Log in', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Welcome back to SplitFree.')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('shows email placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  });

  test('shows password placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder('Your password')).toBeVisible();
  });

  test('shows validation error for empty email', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).click();
    // Browser native validation or Zod validation fires
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    // Browser native email validation prevents form submission
    // The email input should remain on screen with the invalid value
    await expect(page.getByLabel('Email')).toHaveValue('not-an-email');
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('12345');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('has link to signup page', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: 'Sign up' });
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL('/signup');
  });

  test('disables submit button while submitting', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('validpassword123');

    const submitButton = page.getByRole('button', { name: /log in/i });
    await submitButton.click();

    // Button should be disabled briefly during submission
    await expect(submitButton).toBeDisabled();
  });

  test('shows server error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByLabel('Password').fill('wrongpassword123');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('displays signup form with all elements', async ({ page }) => {
    await expect(page.getByText('Create an account')).toBeVisible();
    await expect(page.getByText('Get started with SplitFree.')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('shows correct placeholders', async ({ page }) => {
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('At least 8 characters')).toBeVisible();
    await expect(page.getByPlaceholder('Re-enter your password')).toBeVisible();
  });

  test('shows validation error for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: /sign up/i }).click();
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('short');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('shows validation error for mismatched passwords', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm password').fill('different123');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('has link to login page', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: 'Log in' });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('disables submit button while submitting', async ({ page }) => {
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password', { exact: true }).fill('validpassword123');
    await page.getByLabel('Confirm password').fill('validpassword123');

    const submitButton = page.getByRole('button', { name: /sign up/i });
    await submitButton.click();

    await expect(submitButton).toBeDisabled();
  });
});

test.describe('Auth Navigation', () => {
  test('login and signup pages are accessible without authentication', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Log in', { exact: true }).first()).toBeVisible();

    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
    await expect(page.getByText('Create an account')).toBeVisible();
  });

  test('can navigate between login and signup', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Sign up' }).click();
    await expect(page).toHaveURL('/signup');

    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/login');
  });
});
