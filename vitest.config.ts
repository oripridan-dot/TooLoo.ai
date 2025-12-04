// @version 3.3.3
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
    // Improve test isolation and stability
    isolate: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    // File watching configuration to avoid ENOENT errors
    watch: false, // Disable watch by default, use --watch flag when needed
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.timestamp-*.mjs',
      '**/*.timestamp-*.js',
    ],
    // Timeouts for stability
    testTimeout: 10000,
    hookTimeout: 10000,
    // Better error reporting
    reporter: ['verbose'],
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
  // Optimize for Codespaces/containers
  esbuild: {
    target: 'node18',
  },
});