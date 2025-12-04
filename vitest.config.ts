// @version 2.2.293
/**
 * @description Vitest configuration for TooLoo.ai V3 Synapsys
 * @intent Configure unit testing with coverage tracking, starting at 0% threshold
 *         and increasing to 80% as coverage improves. Storybook integration is
 *         handled separately in src/web-app.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/_archive/**', 'src/web-app/**'],
    // Coverage configuration - starting at 0% threshold, increase to 80% over time
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/web-app/**',
        'src/**/index.ts',
      ],
      thresholds: {
        // Start at 0%, increase to 80% as coverage improves
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});