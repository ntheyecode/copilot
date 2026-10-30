// WorkCoPilot end-to-end suite. Run with `npm run e2e` (see e2e/README.md).
//
// Every edition project boots its OWN real server per worker (free port, fresh
// temp data dir, fake AI and webhook receiver at the network boundary), so the
// editions never share state and a worker never sees another worker's data.
// Kept out of `npm test` on purpose: unit runs stay fast.
import { defineConfig, devices } from '@playwright/test'

// Other sessions run suites on this PC too (24 threads): cap browsers at 6.
const WORKERS = Number(process.env.E2E_WORKERS) || 6

export default defineConfig({
  testDir: '.',
  outputDir: '../.e2e-results/artifacts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,              // flakes get real waits, never retries that hide failures
  workers: WORKERS,
  reporter: [
    ['list'],
    ['json', { outputFile: '../.e2e-results/results.json' }],
    ['html', { outputFolder: '../.e2e-results/html', open: 'never' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
  },
  projects: [
    { name: 'all', testDir: './specs', use: { edition: 'all' } },
    { name: 'saas', testDir: './specs', use: { edition: 'saas' } },
    { name: 'paid', testDir: './specs', use: { edition: 'paid' } },
    // The desktop overlay drives real windows on this desktop: one at a time.
    { name: 'floater', testDir: './floater', workers: 1, use: { edition: 'all' } },
  ],
})
