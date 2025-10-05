import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'dist/',
        'web-app/',
        'packages/'
      ],
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60
    },
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    exclude: ['node_modules', 'dist', 'web-app/tests'],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
