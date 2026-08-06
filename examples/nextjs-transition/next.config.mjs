import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode would double-fire effects in dev, which would re-run the
  // alrdy init+destroy cycle twice on every navigation and obscure the
  // transition timing. Disabled here for clarity of the demo; flip on if
  // you want to stress-test the lifecycle.
  reactStrictMode: false,
  // alrdy-animate is linked via `file:../..`, which resolves to a symlink
  // outside this project's own directory. Both tracing and Turbopack's
  // module resolution need their root widened to the repo root to see it —
  // they must be set to the same value, or Turbopack ignores its own root
  // (see https://github.com/vercel/next.js/issues/77562). This also covers
  // the "multiple lockfiles" warning outputFileTracingRoot used to silence.
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
}

export default nextConfig
