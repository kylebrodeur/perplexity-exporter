import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  dts: true,
  splitting: false,
  treeshake: true,
  minify: false,
  platform: 'node',
  external: ['playwright'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
