#!/usr/bin/env node
// Regression guard for vite.config.ts's chunking rules. Rolldown/Rollup can
// silently duplicate `src/core/*` singleton modules across every feature
// chunk instead of routing them through the single shared `features/shared.js`
// chunk (this happened during the Vite 8 upgrade — see the CRITICAL comment
// in vite.config.ts). Wired into `npm run build`, so it fails the build —
// and therefore `prepublishOnly` / `.github/workflows/publish.yml` — before
// a broken bundle can ever reach npm.
//
// Checked against each chunk's own sourcemap `sources` array (not minified
// string content), so it survives minification and future refactors.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const FEATURES_DIR = join(import.meta.dirname, '..', 'dist', 'features')
const SHARED_CHUNK = 'shared.js.map'

// Mirrors featureChunk()'s classification rule in vite.config.ts.
const isSingletonSource = (src) =>
  /\/src\/core\/(?!index\.[jt]s$)/.test(src) ||
  /\/src\/split\/runtime\.[jt]s$/.test(src) ||
  /\/src\/types\//.test(src)

const mapFiles = readdirSync(FEATURES_DIR).filter((f) => f.endsWith('.js.map'))

if (mapFiles.length === 0) {
  console.error(`verify-chunk-structure: no sourcemaps in ${FEATURES_DIR} — was the build run with sourcemap: true?`)
  process.exit(1)
}
if (!mapFiles.includes(SHARED_CHUNK)) {
  console.error(`verify-chunk-structure: ${SHARED_CHUNK} not found — the shared singleton chunk is missing entirely.`)
  process.exit(1)
}

const leaks = []
for (const file of mapFiles) {
  if (file === SHARED_CHUNK) continue
  const map = JSON.parse(readFileSync(join(FEATURES_DIR, file), 'utf8'))
  for (const src of map.sources ?? []) {
    if (isSingletonSource(src)) leaks.push(`${src} -> ${file}`)
  }
}

if (leaks.length > 0) {
  console.error('verify-chunk-structure: core singleton module(s) leaked out of shared.js:')
  for (const leak of leaks) console.error(`  ${leak}`)
  console.error('\nEvery feature chunk must import core singleton state (trigger/resize/state) from shared.js, not duplicate it.')
  process.exit(1)
}

console.log(`verify-chunk-structure: OK (${mapFiles.length} feature chunks checked, singletons confined to ${SHARED_CHUNK})`)
