# Claude Code instructions

This is the source repo for **alrdy-animate**, an attribute-driven scroll-animation and interactive-component library used by alrdy agency in Webflow projects and recent Next.js client sites. The v8 line is a full TypeScript + Vite rewrite, shipping under the `alpha` dist-tag and being promoted to a stable **8.0.0** `latest`.

## Read this first

The public API surface is documented in **`AGENTS.md`** (repo root) and the docs site under **`docs/src/content/docs/`** — those are canonical for how the library behaves. Older design/exploration notes live outside the repo in `~/.claude/plans/` (one file per session, kebab-named); they're history, not spec — trust the code, `AGENTS.md`, and the docs over them.

## Branches

- **`main`** — the single active branch. All work and every release tag live here. (The old `v8` dev branch was folded into `main` once v8 became the `latest` line — there's no longer a separate stable/dev split.)
- **`v7-maintenance`** — preserves the 7.3.5 tip for any v7 patches. Do not delete.

If a future major rewrite (v9) needs the same alpha-while-stable-holds pattern, branch `v8-maintenance` off `main`'s tip at that point (mirroring `v7-maintenance`) and develop v9 under the `alpha` dist-tag — don't recreate a permanent parallel dev branch.

## Stack and constraints

- **TypeScript** strict, with `verbatimModuleSyntax`, `noUnusedLocals`, `exactOptionalPropertyTypes`. See `tsconfig.json`.
- **Vite 7** for the lib build. Do not bump to Vite 8 until upstream publishes a working `darwin-universal` Rolldown binary — the install fails as of 2026-04. (As of 2026-08 the binary installs cleanly on darwin-arm64 in isolation — worth re-checking against the actual lib build before lifting this pin.)
- **Astro 7 + Starlight 0.41** for the docs site at `docs/`. Requires Node ≥ 22.12. Astro 7 hard-depends on `vite: ^8.0.13` (Rolldown-powered) — never pin/override `vite` below 8.x in `docs/package.json`. Doing so lets npm silently install classic Vite 7, under which Astro's `rolldownOptions`-based build config no-ops and the build fails with `rollupOptions.input should not be an html file when building for SSR` (Vite falls back to its `index.html` default for the internal SSR/prerender environment).
- **Node 22.22.2 (LTS jod)** is the project's pinned default via `nvm alias default 22.22.2`.
- **GSAP is a peer dependency, never bundled.** Vite config marks `gsap` and `gsap/*` plugins as external. Users provide it via `<script>` tag (Webflow) or `npm install gsap` (Next.js).
- **Webflow's GSAP acquisition made all Club plugins free** (SplitText, Draggable, Inertia, Flip, MorphSVG). Use them freely in feature modules.

## Architecture

High-level map — the directory tree itself is the source of truth; don't treat this as an exhaustive file list.

- **`src/core/`** — public API (`index.ts` → `init`/`destroy`/`refresh`/`onResize` + `window.AlrdyAnimate`) and the shared engine: `scanner` (finds `aa-*`, classifies feature), `settings` + `parse` (`|` shorthand + Tailwind breakpoint suffixes), `match-media` (wraps `gsap.matchMedia`), `registry` (lazy-loads features by name), `trigger`/`triggered-animation` (scroll vs `event:`/`click:`/`load` orchestrator), `presets` (class→animation resolution), `stagger`, `reduced-motion`, `viewport-gate`, `gsap-detect`, `resize`, `state`.
- **`src/features/`** — one folder per feature module: `appear` (fade/zoom/slide/blur/rotate; also hosts `reveal` and `slices` entry files), `text`, `parallax`, `tabs`, `marquee`, `nav`, `slider`, `modal`, `hover`, `cursor`, `stack`. Registry feature names: `appear, text, reveal, slices, parallax, tabs, marquee, nav, slider, modal, hover, cursor, stack, split`.
- **`src/split/`** — standalone `aa-split` utility (SplitText + regex fallback). **`src/smooth-scroll/`** — Lenis integration. **`src/css/alrdy-animate.css`** — split helper classes + reduced-motion safety net. **`src/types/`** — `index.ts` (public types), `jsx.d.ts` (ambient `aa-*` JSX types), `css.d.ts`.
- **`docs/`** — Astro + Starlight site (separate package). MDX pages under `src/content/docs/` (`installation/`, `initialization/`, `animations/`, `recipes/`); `components/Demo.astro` loads the lib from the built `dist/`.
- **`tests/`** — Playwright specs in `tests/animations/` and `tests/presets/`, driven against the docs dev server; `tests/helpers.ts` holds shared polling assertions.

The Vite build outputs a tree-shakeable ESM entry per feature plus an all-features UMD bundle; `gsap`, its plugins, and `lenis` are marked external (see `vite.config.ts`).

## Adding a new feature

Mirror the pattern in `src/features/appear/index.ts`:

1. Filter `ctx.elements` to those your feature handles.
2. For each element, call `ctx.responsive.bind(element, attrs, ({ config }) => ...)`. The callback runs inside `gsap.matchMedia()` so any `gsap.fromTo` / ScrollTrigger created there is auto-cleaned on breakpoint exit and on `destroy()`.
3. Read `config['aa-…']` for per-attribute options. Fall back to `ctx.options.…` for global defaults.
4. If you need event-based triggering (slider-active, accordion-open, custom), use `parseTrigger(config['aa-trigger'])` + `onCustomTrigger(...)` from `src/core/trigger.ts`. The custom event is `aa:trigger` with `detail.name`.
5. Declare `requiredPlugins: ['ScrollTrigger', 'SplitText', ...]` so the dev-mode warning lists them.

Add a docs page at `docs/src/content/docs/animations/<name>.mdx` and a Playwright spec at `tests/animations/<name>.spec.ts` (use `fade.spec.ts` as a template; prefer the retrying helpers in `tests/helpers.ts` over fixed `waitForTimeout` + single-sample reads, which flake under load).

## Commands

```sh
npm run build       # vite build + tsc declaration emit. Outputs dist/.
npm run dev         # vite watch mode
npm run typecheck   # tsc --noEmit (strict pass)
npm run docs:dev    # start Astro Starlight dev server on :4321
npm run docs:build  # build docs (Pagefind search index, sitemap)
npm test            # Playwright runs against docs:dev (auto-starts via webServer config)
npm run test:update # update Playwright snapshots
```

## Releasing

**CI owns publishing.** Never run `npm publish` from a laptop — `.github/workflows/publish.yml` does it on tag push, signed with GitHub Actions OIDC + npm provenance. A manual publish skips the provenance badge and races with the workflow (the workflow's precheck step now skips gracefully on duplicates, but the resulting unsigned tarball still loses the trust signal).

Flow:

```sh
# 1. Bump + commit + tag in one shot. (npm version refuses if the tree is dirty — commit first.)
npm version prerelease --preid alpha -m "chore: release v%s"   # 8.0.0-alpha.N → alpha.N+1
npm version 8.0.0                    -m "chore: release v%s"   # promote alpha → stable 8.0.0 (→ latest)
npm version patch                    -m "chore: release v%s"   # 8.0.0        → 8.0.1

# 2. Push commits + tag.
git push --follow-tags origin <branch>
```

The workflow derives the dist-tag from the version suffix: `-alpha.N` → `alpha`, `-beta.N` → `beta`, `-rc.N` → `rc`, no suffix → `latest`. **Tagging a suffixless `8.0.0` flips `latest` from v7 to v8 instantly and globally** — every `npm install alrdy-animate` and `@latest` CDN consumer jumps a major. Do it deliberately, with the suite green and the docs/CHANGELOG/AGENTS.md in sync.

## Visual verification

After implementing a feature, drive its docs demo through Playwright MCP (the `mcp__playwright__browser_*` tools) before reporting the task complete:

1. Start `npm run docs:dev` in the background; wait for `astro v6.x.y ready`.
2. `mcp__playwright__browser_navigate` to `http://localhost:4321/animations/<name>/`.
3. `mcp__playwright__browser_console_messages` to confirm the `[alrdy-animate] initialized` log line appears with the expected feature in `Features:` and the right plugins in `Plugins:`.
4. `mcp__playwright__browser_take_screenshot` and/or `_evaluate` to verify the animation runs (e.g. opacity transitions from 0 → 1 after `scrollIntoViewIfNeeded`).
5. Resize to 390×800 and 1280×800 to spot-check the responsive variants.
6. If you can't visually confirm the change, say so explicitly rather than claiming success.

**Screenshot output**: Playwright MCP is configured at the user level (the project `.mcp.json` no longer registers it). `browser_take_screenshot`'s `filename` arg resolves relative to CWD, so prefix explicit filenames with `playwright-output/` (gitignored) — e.g. `filename: "playwright-output/scroll-mid.png"` — to keep them out of the repo root.

## Conventions

- **Attribute prefix is `aa-`**, not `data-aa-`. Spec-permissive, matches HTMX precedent. Next.js users `import 'alrdy-animate/jsx'` once for autocomplete.
- **Attribute value syntax**:
  - **Dashes** join parts of a single compound name: `text-blur-up`, `fade-up`, `hover-bg-block`. One concept, one token.
  - **Spaces** separate independent flags/modifiers on the same attribute: `aa-split="lines mask"`. Order-independent and extensible.
  - **Pipes `|`** are reserved for responsive breakpoint variants (see below).
- **Responsive variants**: `|` shorthand splits at `md` (768px). Suffixes (`-sm`, `-md`, `-lg`, `-xl`) follow Tailwind semantics ("at this breakpoint and up"). Both compile to exclusive width ranges in `resolveRanges()`. Only one variant ever runs at once.
- **`none` as a value** opts out at that breakpoint (e.g. `aa-slider="snap|none"`).
- **JSDoc only on public types, never on implementation. No Storybook.** `src/types/jsx.d.ts` and `src/types/index.ts` carry per-attribute / per-option JSDoc — that's our AI-affordance surface (IDE hovers, Claude/Cursor autocomplete) and is mirrored in the shipped `AGENTS.md`. Internal modules stay comment-free; prose lives in `docs/src/content/docs/` (one MDX page per animation with attribute table + live `<Demo>`).
- **Bundle size budget**: core ≤ 5KB gzip; each feature module ≈ ≤ 5KB gzip (the real-world cost, since ESM consumers only pull the features they use). The all-features UMD bundles everything — currently ~32.6 KB gzip; watch that it doesn't balloon, but it's not the per-page cost.

## What's deferred

- **Pin** animations (rebuild from scratch in v8.x)
- **Form-submit** feature (no production use; dropped)
- **Theme registry** (dropped). Note: class-based **presets** *did* ship (`aa-*` resolved from a class map via `src/core/presets.ts`) — that replaced the old v7 "templates" concept.
- **Lazy-load image handler** (delegate to native `loading="lazy"`)
- **CSS-only animations / `.in-view` IntersectionObserver** — dropped. All animations are GSAP-driven; the shipped CSS file only carries split-utility classes and a reduced-motion safety net.
- **Page transitions** are out of scope; `init/destroy/refresh` lifecycle hooks let users wire Barba (Webflow) or View Transitions (Next.js) themselves. Recipes for this live in `docs/src/content/docs/recipes/`.

## Keep AI affordances in sync

Four artifacts mirror the public API surface and must stay in sync with the code:

- `src/types/jsx.d.ts` — JSDoc per `aa-*` attribute, surfaces in IDE hovers and AI autocomplete on every JSX element.
- `src/types/index.ts` — JSDoc on `InitOptions`, `DestroyApiOptions`, `PublicApi`, `ResolvedOptions`, and the supporting types.
- `AGENTS.md` (repo root, shipped via `package.json` `files`) — single-file reference loaded by Claude Code / Cursor / Aider when downstream projects depend on `alrdy-animate`.
- `docs/src/content/docs/animations/**` — prose + live demos.

**Trigger to update:** any commit that adds, removes, or changes the meaning of:

- a public `aa-*` attribute (new attribute, new accepted value, renamed value, removed alias);
- a field on `InitOptions` or `DestroyApiOptions` (incl. its default value);
- a feature module's `requiredPlugins` set;
- an entry in `src/core/trigger.ts` (new `TriggerKind`, new container in `INFERENCE_CONTAINERS`, new `-active`/`-inactive` semantics);
- the `DEFAULT_OPTIONS` or `DEFAULT_BREAKPOINTS` in `src/core/state.ts`.

**Workflow** — don't update on every WIP commit; wait until a feature lands on `main` (or its branch is merge-ready), then in **one focused commit**:

1. Update JSDoc in `src/types/jsx.d.ts` and `src/types/index.ts`.
2. Update the relevant section of `AGENTS.md` (feature reference table row, attribute list, recipe if recipe-worthy). Bump the `<!-- Last synced … -->` stamp at the top so consumers can tell whether their installed version's reference is fresh.
3. Update or add the matching `docs/src/content/docs/animations/<name>.mdx`.
4. If the change introduces a new accepted attribute value (e.g. a new `aa-animate` preset), add or update the matching entry in the JSDoc's listed values — agents otherwise won't suggest the new value.

If a session adds a public-API change without touching these artifacts, flag it in the PR description (or before committing) rather than landing the drift.

## When in doubt

Check `AGENTS.md`, the docs under `docs/src/content/docs/`, and the code. If a question isn't answered there or by this CLAUDE.md, surface it to the user (ben@alrdy.de) rather than guessing.
