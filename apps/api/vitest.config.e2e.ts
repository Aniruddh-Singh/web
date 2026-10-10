import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    testTimeout: 30_000,
    // Files share one database and some tests change store settings, so run them in sequence.
    fileParallelism: false,
    hookTimeout: 60_000,
  },
});
