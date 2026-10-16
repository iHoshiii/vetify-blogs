import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { include: ['tests/**/*.test.{ts,tsx}'], testTimeout: 60000, hookTimeout: 120000,
    pool: 'forks', maxWorkers: 1, minWorkers: 1, fileParallelism: false },
})
