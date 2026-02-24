import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      exclude: [
        'node_modules/**',
        'tests/**',
        'database/init.js',
        '**/*.test.js',
        '**/*.spec.js',
        'vitest.config.js'
      ]
    },
    setupFiles: ['./tests/setup.js'],
    testTimeout: 10000,
    isolate: true,
    pool: 'threads',
    maxThreads: 4,
    minThreads: 1
  }
});
