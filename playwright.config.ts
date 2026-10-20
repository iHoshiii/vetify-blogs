import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5177', ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev:client', url: 'http://127.0.0.1:5177', reuseExistingServer: !process.env.CI },
})
