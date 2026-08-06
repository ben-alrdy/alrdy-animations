import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run docs:dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    // Astro 7's `astro dev` auto-detects AI-agent environments (via
    // `am-i-vibing`) and silently daemonizes itself in the background —
    // the wrapping process then exits immediately, which Playwright reads
    // as "the webServer process exited early". Any truthy value here
    // disables that auto-detection (see astro/dist/cli/dev/index.js:
    // `agentDetected = !process.env.ASTRO_DEV_BACKGROUND && isRunByAgent()`).
    env: { ASTRO_DEV_BACKGROUND: '1' },
  },
})
