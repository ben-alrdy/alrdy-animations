import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const gsapGlobals: Record<string, string> = {
  gsap: 'gsap',
  'gsap/ScrollTrigger': 'ScrollTrigger',
  'gsap/SplitText': 'SplitText',
  'gsap/Draggable': 'Draggable',
  'gsap/InertiaPlugin': 'InertiaPlugin',
  'gsap/Flip': 'Flip',
}

const externalIds = [...Object.keys(gsapGlobals), 'lenis']

// Map each module to a stable chunk basename. Without an explicit `name`
// function, chunks get anonymous `index.js`, `index2.js`...`indexN.js`
// names (every feature's entry file is named `index.ts`).
//
// CRITICAL: all of `src/core/*` (except the entry, `core/index.ts`) and the
// split runtime go into a single shared chunk. These modules carry singleton
// state — the custom-event listener registry in `core/trigger.ts`, the
// shared resize bus in `core/resize.ts`, the internal `state` object in
// `core/state.ts`. If a feature chunk gets its own private copy, each copy
// gets its own state and cross-feature events silently stop working.
//
// Rolldown-specific pitfall (bit us during the Vite 8 upgrade): by default,
// `output.codeSplitting.groups[].includeDependenciesRecursively` is `true`,
// which vacuums a matched module's ENTIRE dependency tree into that same
// chunk before those dependencies get an independent chance to run through
// this function themselves — e.g. `appear/index.ts` matches 'appear', so
// `core/resize.ts` (its dependency) got pulled into the 'appear' chunk too,
// never reaching the `/src/core/` branch below. `includeDependenciesRecursively:
// false` (set on the ES output, further down) restores classic per-module
// classification: every module — dependency or not — is passed through this
// function independently. See scripts/verify-chunk-structure.mjs (wired into
// `npm run build`) — it fails the build if this regresses again.
//
// Sibling feature modules nested under an umbrella directory. Each is its own
// lazy chunk despite living next to a parent feature's `index.ts`. Internal
// helper files inside other feature dirs (e.g. hover/effects.ts) stay bundled
// into the parent chunk because they're not listed here.
const SIBLING_CHUNKS: Record<string, ReadonlySet<string>> = {
  appear: new Set(['reveal', 'slices']),
}

function featureChunk(id: string): string | undefined {
  const featureMatch = id.match(/\/src\/features\/([^/]+)\/([^/]+)\.[jt]s$/)
  if (featureMatch) {
    const [, dir, base] = featureMatch
    if (SIBLING_CHUNKS[dir]?.has(base)) return base
    // Any other file under a feature's own directory (helpers like
    // hover/effects.ts, tabs/state.ts, slider/nav.ts, not just index.ts)
    // belongs to that feature's chunk. Under the old recursive-capture
    // default these were swept in implicitly; with
    // includeDependenciesRecursively: false every module is classified
    // independently, so this has to be explicit or Rolldown auto-names
    // them into their own colliding chunks (state.js/state2.js etc.).
    return dir
  }
  if (/\/src\/split\/index\.[jt]s$/.test(id)) return 'split'

  // Everything else under src/core (excluding the entry file) and the split
  // runtime become a single shared chunk. Feature chunks import from here
  // instead of inlining their own copy.
  if (
    /\/src\/core\/(?!index\.[jt]s$)/.test(id) ||
    /\/src\/split\/runtime\.[jt]s$/.test(id) ||
    /\/src\/types\//.test(id)
  ) {
    return 'shared'
  }
  return undefined
}

export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: true,
    cssCodeSplit: false,
    // `formats` is intentionally omitted — the per-format `rollupOptions.output`
    // array below is the source of truth and would override it.
    lib: {
      entry: resolve(import.meta.dirname, 'src/core/index.ts'),
      name: 'AlrdyAnimate',
    },
    rollupOptions: {
      external: externalIds,
      // Rolldown docs (CodeSplittingGroup.includeDependenciesRecursively)
      // recommend pairing `includeDependenciesRecursively: false` (set on
      // the ES output below) with `preserveEntrySignatures:
      // 'allow-extension'` to avoid generating invalid/circular chunks.
      // This overrides Vite's lib-mode default of 'strict'.
      preserveEntrySignatures: 'allow-extension',
      output: [
        {
          format: 'es',
          entryFileNames: 'alrdy-animate.js',
          chunkFileNames: 'features/[name].js',
          // Paired with preserveEntrySignatures above, per Rolldown's
          // guidance for includeDependenciesRecursively: false.
          strictExecutionOrder: true,
          codeSplitting: {
            // The actual fix — see the CRITICAL comment above featureChunk().
            includeDependenciesRecursively: false,
            groups: [{ name: featureChunk }],
          },
        },
        // Dual UMD outputs (same bytes, different extensions):
        //   .umd.cjs → Node `require()` callers. Node uses the `.cjs` suffix
        //     as an unambiguous CommonJS marker, which is needed because
        //     `package.json` sets `"type": "module"` (so a plain `.js` would
        //     be treated as ESM and `require()` would throw ERR_REQUIRE_ESM).
        //   .umd.js  → browsers via CDN. jsDelivr et al serve `.cjs` with
        //     MIME `application/node`, which strict-MIME-checking browsers
        //     refuse to execute. `.js` is served as `application/javascript`
        //     and runs normally.
        {
          format: 'umd',
          entryFileNames: 'alrdy-animate.umd.cjs',
          name: 'AlrdyAnimate',
          // inlineDynamicImports is deprecated under Rolldown; codeSplitting:
          // false is the direct modern equivalent (identical bindingified
          // behavior — single-chunk output, no code splitting).
          codeSplitting: false,
          globals: { ...gsapGlobals, lenis: 'Lenis' },
        },
        {
          format: 'umd',
          entryFileNames: 'alrdy-animate.umd.js',
          name: 'AlrdyAnimate',
          codeSplitting: false,
          globals: { ...gsapGlobals, lenis: 'Lenis' },
        },
      ],
    },
  },
})
