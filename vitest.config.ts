import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/api/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
      '!tests/e2e/**',
    ],
    exclude: [
      'node_modules/**',
      '.git/**',
      '.next/**',
      '.worktrees/**',
      'tests/e2e/**',
      'playwright-report/**',
      'test-results/**',
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
