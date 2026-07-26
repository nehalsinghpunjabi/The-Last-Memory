/**
 * A production build that is safe to run while `next dev` is live.
 *
 * `next build` and `next dev` both write to the same distDir (.next). Building
 * while a dev server is running replaces the chunks that server is still serving
 * from, and the dev server then fails at runtime with
 * `TypeError: __webpack_modules__[moduleId] is not a function` (its in-memory
 * module registry points at chunk ids that no longer exist on disk) and
 * `Cannot find module './NNN.js'` from .next/server/webpack-runtime.js.
 *
 * This builds into a separate directory instead, so verification never disturbs
 * a running dev server. Cross-platform (no shell-specific env syntax).
 */
import { spawnSync } from 'node:child_process';

const distDir = process.env.NEXT_DIST_DIR || '.next-verify';
console.log(`Building into ${distDir} (dev server's .next is left untouched)\n`);

const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: distDir },
});

process.exit(result.status ?? 1);
