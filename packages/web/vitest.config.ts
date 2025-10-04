import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    // Ensure vitest runs in non-interactive mode
    watch: false,
    // Disable UI mode
    ui: false,
    // Pass with no tests
    passWithNoTests: true,
  },
})
