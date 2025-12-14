// @version 3.3.577
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts'],
    globals: true,
    environment: 'node',
  },
});
