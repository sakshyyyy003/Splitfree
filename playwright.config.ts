import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  reporter: 'html',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000,
  },
  projects: [
    // Auth setup — runs first, saves session state
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Public pages — no auth needed
    {
      name: 'public-mobile',
      testMatch: /landing|auth|join/,
      testIgnore: /auth\.setup/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'public-desktop',
      testMatch: /landing|auth|join/,
      testIgnore: /auth\.setup/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Protected pages — require auth setup to run first
    {
      name: 'authenticated-mobile',
      testMatch: /dashboard|group|expense|settle|profile|protected/,
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'authenticated-desktop',
      testMatch: /dashboard|group|expense|settle|profile|protected/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
