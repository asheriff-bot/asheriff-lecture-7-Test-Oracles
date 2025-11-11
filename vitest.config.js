import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/test/**/*.spec.js'],
    coverage: {
      include: ['src/**/*.js'],
      exclude: ['src/reference.js'],
      reporter: ['text', 'html', 'json']
    }
  }
});
