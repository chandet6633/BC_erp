const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'MungkhudShop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9091',
      },
    },
    {
      name: 'Management',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:9092',
      },
    },
  ],
});
