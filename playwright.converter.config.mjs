import os from 'os';
import { defineConfig, devices } from '@playwright/test';

const darwinMajor = process.platform === 'darwin'
  ? Number(os.release().split('.')[0])
  : 0;
const webkitSupported = !(process.platform === 'darwin' && darwinMajor <= 21);

/** @type {import('@playwright/test').Project[]} */
const projects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
];

if (webkitSupported) {
  projects.push({ name: 'webkit', use: { ...devices['Desktop Safari'] } });
}

export default defineConfig({
  testDir: 'tests/converter-browser',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --config vite.converter-harness.config.js',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects,
});
