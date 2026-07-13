# Changelog

All notable changes to **alrdy-animate**. Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

The `latest` dist-tag points to **v8.0.0** — `npm install alrdy-animate` resolves to v8. v7 stays installable at `npm install alrdy-animate@7`; the `alpha` dist-tag continues to track the newest v8 prerelease for early testing.

---

## v7 → v8 highlights

If you're upgrading from v7, here's what changes:

- **Full TypeScript rewrite** built with Vite 7. Strict-mode types ship in `dist/types/`; per-attribute JSDoc surfaces in IDE hovers and AI autocomplete via `import 'alrdy-animate/jsx'`.
- **CSS-only animation path is gone.** Every animation is now GSAP-driven. The shipped CSS file only carries split-utility classes and a reduced-motion safety net. `aa-load` (CSS-only load trigger) is replaced by `aa-trigger="load"` / `"load-once"` on a GSAP-animated element.
- **`gsap` and `lenis` are peer dependencies** — never bundled. Webflow users provide them via `<script>` tags; npm users install them alongside.
- **New trigger orchestrator** with `aa-trigger="<kind>"` and combinable values: `load-once`, `load`, `event:<name>`, `click:<name>`, scroll (default). Custom events fire via `dispatchEvent(new CustomEvent('aa:trigger', { detail: { name: ... } }))`.
- **Responsive variants via `|` shorthand and Tailwind-style breakpoint suffixes** (`-sm`, `-md`, `-lg`, `-xl`). Compiles to `gsap.matchMedia` ranges; only one variant runs at once.
- **Lifecycle hooks** (`init({ root })`, `destroy({ keepGlobals })`, `refresh()`, `ready()`) for SPA route changes and page transitions — see the [Webflow + Barba](https://animate.alrdy.de/recipes/webflow-barba/) and [Next.js page transitions](https://animate.alrdy.de/recipes/nextjs-transitions/) recipes.
- **Built-in Lenis smooth scroll** via `init({ smoothScroll: true })` — synced to `gsap.ticker`, instance exposed at `window.lenis`. ScrollToPlugin is no longer needed.
- **Reduced-motion + mobile-optimization options** built into init; decorative features auto-drop to fade fallbacks based on `prefers-reduced-motion` or small viewports.
- **`AGENTS.md` shipped in the package root** as a single-file reference for AI coding assistants (Claude Code, Cursor, Aider) — they can read it from `node_modules/alrdy-animate/` without web-fetching docs.

What v8 doesn't have yet: **Pin** animations (rebuild planned in v8.x), form-submit handler (dropped), theme registry (dropped — class-based **presets** replaced v7 templates). Lazy-loaded images delegate to native `loading="lazy"`.

---

## [8.1.2] — 2026-07-13

### Added
- **`aa-slider="finite"` — a non-looping slider mode.** The carousel still loops infinitely by default; `finite` makes it a bounded track with hard start/end bounds. Prev/next and keyboard **clamp** at the first/last slide (the arrow buttons get `.is-disabled` + `aria-disabled="true"` there so you can style the end state), **drag is bounded** (rubber-bands at the edges, never wraps), and **autoplay rewinds** to the first slide instead of stalling at the last. Combines with `center` and `draggable`. Implemented as a separate engine (`finite-track.ts`) so the infinite `horizontalLoop` path is untouched.

### Fixed
- **`aa-slider` JSDoc/reference listed `snap` and `loop` tokens that were never implemented.** Corrected to the real flag set: `draggable` / `center` / `finite` / `none`.

## [8.1.1] — 2026-07-02

### Fixed
- **Event-triggered split-text entrances no longer snap to their end state when a resplit lands mid-entrance.** An unrelated `ScrollTrigger.refresh()` — e.g. from a pinned section initialised alongside an `event:`-triggered hero — forces a synchronous layout read that can flush SplitText's `autoSplit` ResizeObserver, producing a **layout-identical re-split** (same lines, same width) that still replaces the split nodes and runs the internal `rebuild()`. While a just-fired entrance was still playing, `rebuild()` forced `progress(1).pause()`, so the split heading appeared instantly with no animation (non-split siblings were unaffected). `rebuild()` now restores the rebuilt tween to the progress the outgoing one had actually reached and keeps playing — covering both the mid-fade case and a resplit during the entrance's `aa-delay` (progress still `0`). A genuinely completed entrance had progress `1` and still settles paused at its end state, so scroll/scrub behaviour and legitimate refresh/resize re-measures of finished text are unchanged.

## [8.1.0] — 2026-07-01

### Changed
- **BREAKING — the marquee loop is now driven by `aa-autoplay`, not `aa-duration`** (unifying it with `aa-slider` / `aa-tabs`). Presence of `aa-autoplay` enables the loop; the value is the seconds-per-cycle duration (default **40**); tokens `hover-pause` / `hover-slow`. **With no `aa-autoplay` the marquee is static** (a scroll-driven `aa-scrub` sweep can still apply). The `paused` / `hover-pause` / `hover-slow` tokens are removed from `aa-marquee` — which now carries only `right` / `switch` / `draggable` / `none` — and `aa-duration` is no longer read by marquee. **Migration:** `aa-duration="30"` → `aa-autoplay="30"`; add a bare `aa-autoplay` to keep any default-speed loop moving (an attribute-less marquee is now static); `aa-marquee="paused"` → drop `aa-autoplay`; `aa-marquee="hover-pause"` → `aa-autoplay="hover-pause"`.
- **BREAKING — `[aa-marquee-scroller]` is now optional**, required only when scrubbing. A basic marquee is just `[aa-marquee] > [aa-marquee-track] > [aa-marquee-list]`; wrap the track in `[aa-marquee-scroller]` only to add an `aa-scrub` sweep. The scrub sweep travel moved off `aa-intensity` onto the scroller element as a **percent of the marquee's own width**: `aa-marquee-scroller="30"` = ±30% per side (default **20**). It's width-relative (not viewport-relative), so the sweep feels the same at any browser width; breakpoint-aware via `|` / `-sm/-md/-lg/-xl`. **Migration:** `aa-intensity` on a scrub marquee → `aa-marquee-scroller="<n>"`.

### Added
- **`aa-animate` on marquee items now works.** Put `aa-animate` (+ `aa-stagger`) on the `[aa-marquee-list]` element and its items reveal in sequence when the marquee scrolls into view. The library sanitizes the runtime clones (strips the animation attributes and any inline from-state across the whole animated subtree, including split-text spans) so duplicated items render solid instead of staying hidden — only the authored originals animate. Pair with `aa-again="false"` (the marquee travels through the viewport as the page scrolls, so replay would otherwise re-fire the entrance) and an early `aa-scroll-start="top 100%"`.
- **The draggable marquee blends the throw into the cruise loop.** On release, the inertia throw hands off to the loop the moment it decelerates to the loop's own cruise speed (in the flick direction), instead of coasting to a full stop and then restarting at cruise.

### Fixed
- **Marquees (and slider/tabs autoplay) no longer run while off-screen.** The viewport gate reflects its in-view state on creation, so a component that loads below the fold is paused until scrolled into view (and one loaded already in view starts immediately), rather than relying on a later scroll crossing.
- **Reverse-loop freeze.** A left-direction marquee built paused at loop-progress 0 (e.g. the page loaded scrolled past it) no longer freezes when `switch` or a drag flick reverses it — a reversed GSAP loop parked on its start edge has no runway, so the loop's `timeScale` application now nudges progress across the wrap-equivalent boundary (progress 0 and 1 render identically under the wrap modifier).

## [8.0.10] — 2026-06-30

### Added
- **`aa-again` — per-element override of the global `init({ again })` scroll-replay default.** `aa-again="false"` plays a scroll-triggered animation once and leaves it finished — it won't reset/replay when the element re-enters the viewport; `aa-again="true"` forces replay even when `init({ again: false })` is set globally. Only affects scroll-triggered animations (`appear` / `text` / `reveal`); `load`, `event`, and `scrub` triggers ignore it. Supports the `|` and `-sm/-md/-lg/-xl` responsive forms like other value-bearing attributes. Handy for animated content inside a slider/carousel that shouldn't re-fire as the section scrolls past. Implemented via a new `parseBool` helper in `parse.ts` (`readAnimationConfig`) plus registration in `VALUE_BEARING_ATTRS`; behaviour is unchanged when the attribute is absent.

## [8.0.9] — 2026-06-29

### Changed
- **`optimizeMobile` now accepts `'fade'` in addition to `true` / `false`.** `true` makes `text-*` elements simply visible on small viewports (no animation, no flash — the previous fade is gone); `'fade'` keeps a softer/slower fade (`0.8s`, `power2.out`, via `DEFAULT_OPTIMIZE_MOBILE_FADE`) instead of reusing the reduced-motion `0.4s` timing. Both modes drop the same heavy modules (`text` / `parallax` / `split`); `true` additionally skips the fade pass entirely (no extra ScrollTriggers). `AlrdyAnimate.options.optimizeMobile` reads back the active mode (`true` / `'fade'`) or `false`.

## [8.0.8] — 2026-06-26

### Removed
- **`aa-trigger="instant"` and the `alrdy-animate/loader` companion (the `./loader` export) have been removed.** Both shipped one patch earlier (8.0.6), but on real 4G testing `aa-trigger="load"` paired with a fast (~100 ms) `aa-fallback` produced a smoother above-the-fold entrance than the CSS-first-paint `instant` path — the instant animation's clock runs on the document timeline, so a render-blocking stylesheet advances (or completes) the entrance before the page is even visible. Rather than carry a second-best, maintenance-heavy feature (a separate Vite build, a DOM splitter, an inline `<head>` keyframe), `instant` is gone: the `instant` trigger kind, the `./loader` export and its `dist/loader.*` outputs, the Instant-hero recipe, and the `loader` build step are all removed. The `dist` FOUC guard now excepts only `[aa-trigger~="lcp"]`. **Migration:** switch `aa-trigger="instant"` heroes to `aa-trigger="load"` and use the [slow-network + init-timeout fallback](https://animate.alrdy.de/recipes/load-fallback/) snippet (now defaulting `aa-fallback` to 100 ms) for the fast first-paint reveal.

## [8.0.7] — 2026-06-26

### Fixed
- **Slow-network fallback no longer replays the entrance on split text (no "fade-in, then hide, then animate" flash).** When the inline-snippet CSS fallback (`aa-fallback`) had already revealed a `aa-trigger="load"` heading, the load orchestrator correctly skipped its GSAP entrance — but only marked it *fired*, not *complete*. `init()` clears `aa-fallback` at the end of init, and SplitText's `autoSplit` fires an initial resplit ~one frame later; that post-clear `rebuild()` no longer saw the flag, rebuilt the tween (rewinding the already-visible lines/chars to their from-state) and replayed it. The skip now marks the entrance complete, so every later resplit/resize rebuild short-circuits. Only affected split `text-*` heroes (plain `fade` elements never resplit). Verified on Chromium, Firefox, and WebKit.

## [8.0.6] — 2026-06-26

### Added
- **`aa-trigger="instant"` — CSS-driven, instant hero entrances.** A `instant` element animates via an inline `@keyframes aa-load-in` on the **first painted frame**, before the GSAP bundle loads, so above-the-fold heroes feel instant instead of waiting ~1–2s for the bundle + fonts. The library builds no GSAP tween for these elements (the appear/text feature setup and the reduced-motion pass skip any element whose triggers include `instant`); the inline keyframe is not gated on init, so it always runs to completion (a fast init can't cut it short) and uses `backwards` fill to revert to the natural state afterward — no re-animation, no flash, no clobbered hover transform. Motion comes from `aa-animate` (element-level `fade` / `fade-up` / `blur` / `zoom` / `slide` / `rotate`). Self-revealing, so it needs no `aa-timeout` safety net. The keyframe + reveal rules live **only** in the inline `<head>` snippet (they must be present at first paint, which the non-blocking `dist` stylesheet can't guarantee) — see the new **Instant hero** recipe. The only `dist` CSS change is the FOUC guard excluding `[aa-trigger~="instant"]`.
- **`alrdy-animate/loader` — optional no-GSAP companion (`./loader` export).** A ~0.9 KB-gzip module (`dist/loader.js` ESM + `dist/loader.iife.js` for inline `<script>`) that runs before the bundle and (a) maps `aa-delay`/`aa-duration`/`aa-ease` to the `--aa-load-delay`/`--aa-load-dur`/`--aa-load-ease` custom properties (so per-element timing works like a GSAP entrance; `aa-ease` accepts the CSS-expressible named eases), and (b) splits char/word `text-*` heroes into `.aa-char`/`.aa-word` (with `--char`/`--word` indices and an `.aa-sr-only` accessibility clone) so per-character cascades are instant too. Line-based `text-*` (slide/tilt/oval/rotate) fall back to an element-level fade — lines need font metrics the loader can't compute pre-bundle.

### Changed
- **`init()` only awaits `document.fonts.ready` when a line split is present.** Previously any `text` element blocked init on fonts; now the scanner flags `needsFontMetrics` (a line-mode split, where font swap changes wrapping) and only then awaits — capped at 3s. Char/word-only and non-text pages init noticeably sooner.

## [8.0.5] — 2026-06-25

### Changed
- **The slow-network / init-timeout fallback CSS no longer ships in `dist/alrdy-animate.css`.** The `@keyframes aa-fallback-appear` keyframe and the `html[aa-fallback]` / `html[aa-timeout]` reveal rules now live **only** in the optional inline `<head>` snippet ([load-fallback recipe](https://animate.alrdy.de/recipes/load-fallback/)). They were always inert without that snippet (nothing else sets those attributes), and when the snippet *is* present it inlines its own copies — so the dist copy was dead weight that also caused a duplicate-`@keyframes` collision: the cross-origin dist CSS loads *after* the inline snippet, so it silently won the keyframe-name collision and reverted any author customisation of the fallback motion. Removing it makes the snippet's keyframe the single source of truth (edit it directly — no override gymnastics). The FOUC guard and the `lcp` opacity floor **stay** in `dist` — the npm `import 'alrdy-animate/style'` path relies on them and they do real work without the snippet. No action needed for projects on the current head snippet; the JS handling of `aa-fallback` / `aa-timeout` is unchanged.

## [8.0.4] — 2026-06-18

### Added
- **`aa-trigger="lcp"` — a load-timed entrance optimised for Largest Contentful Paint.** A normal `aa-trigger="load"` fade hurts LCP: Chrome excludes `opacity:0` and `visibility:hidden` elements from LCP, and a load entrance is both until the bundle reveals it — so LCP waits for the JS. `lcp` instead has the companion stylesheet paint the marked element at first paint at `0.01` opacity (non-zero → an eligible LCP candidate *before* the bundle), skipping the FOUC guard; the appear feature then pins `opacity:1` as the `gsap.from()` destination (the CSS floor would otherwise be read as the destination) and fades it to full. Works with any opacity-bearing `aa-animate` (`fade`, `rotate*`, `blur`, `fade-up`…). Use on a single above-the-fold element and pair with `fetchpriority="high"`. **The inline `<head>` snippet gained LCP rules — existing Webflow users must re-paste it** (see installation / load-fallback recipe).

---

## [8.0.2] — 2026-06-11

### Fixed
- **Load-triggered split-text entrances no longer snap to their end state instead of animating.** SplitText's `autoSplit` fires a settling re-split (via its own internal ResizeObserver) ~a frame after the initial split, replacing the `.aa-char` / `.aa-line` nodes. When that re-split landed before a `aa-trigger="load"` / `"load-once"` entrance had finished, the orchestrator's `rebuild()` bailed out (it treated "entrance registered" as "entrance done"), stranding the tween on the orphaned original nodes — the text appeared with no animation. Whether it happened was a per-browser timing race (Firefox the usual loser, Chrome usually fine). The orchestrator now tracks entrance *completion* separately from registration and rebuilds the entrance against the fresh nodes when a re-split lands mid-flight, so the animation runs regardless of when the settling re-split fires. A genuine resize-driven re-split *after* the entrance completes is still a no-op (no wrongful replay).

## [8.0.1] — 2026-06-11

### Fixed
- **Character splits no longer break a word across lines.** `aa-split="chars"` (and any char-based text animation, e.g. `text-fade` / `text-blur`) now wraps chars in `.aa-word` containers, so each word stays an atomic inline-block box. Previously bare `.aa-char` spans let SplitText's line measurement put part of a word on one line and the rest on the next — a Safari-specific symptom, worsened by mid-text inline-block sub-spans (e.g. an underline wrapper around one word). Char tweens are unaffected.

## [8.0.0] — 2026-06-11

The v8 stable release — **promotes the `latest` dist-tag from v7.3.5 to v8**. The surface is everything described in [v7 → v8 highlights](#v7--v8-highlights) above, with the full delta documented in the migration guide.

### Added
- [v7 → v8 migration guide](https://animate.alrdy.de/installation/v7-to-v8/) (`docs/src/content/docs/installation/v7-to-v8.mdx`). Find-and-replace level coverage: removed CSS-only animation engine, `aa-load` → `aa-trigger="load[-once]"`, hover model change, `init()` option renames (`templates` → `presets`, `gsapFeatures` auto-loaded, `smoothScroll` flattened), `aa-split` separator (`&` → space), `aa-delay-mobile` → responsive `|` shorthand, `accordion` → `tabs`, and a per-value map of v7 animation names to their v8 equivalents (and which are deferred / removed).
- **Modal dialog semantics.** Cards now get `role="dialog"` + `aria-modal="true"` and an accessible name auto-derived (truncated) from the card's leading text block (`aria-label`); triggers get `aria-haspopup="dialog"`. Author-set values are respected. Focus trap / ESC / scroll lock are unchanged.
- **Marquee `hover-slow` token.** `aa-marquee="hover-slow"` ramps the loop down to 15% speed on pointer hover and back to full on leave (0.4s `power2.out`). Mirrors `hover-pause` gating (skipped on touch, disabled when `draggable`), yields to `hover-pause` when both are set, and composes with `switch` — the ramp respects whichever direction is live.
- The Next.js page-transition recipe now covers **popstate (browser back/forward) interrupting an in-flight transition** — the example `AlrdyProvider` cancels the running timeline and reconciles state when navigation is driven by the history stack rather than a `<Link>` click.

### Changed
- **Promoting 8.0.0 will flip the `latest` dist-tag from v7.3.5 to v8** — once promoted, every `npm install alrdy-animate` and `@latest` CDN consumer resolves to v8 (a major upgrade). v7 stays installable via `alrdy-animate@7`.

### Performance
- Text split-unit `will-change` is now managed per-tween by the orchestrator instead of a permanent CSS rule on every `.aa-char` / `.aa-word`, so text-heavy pages no longer carry hundreds of never-reclaimed compositor layers (hover-text keeps a scoped persistent hint).
- `init()` no longer makes a second full-DOM pass to decide whether `aa-hover="text"` needs SplitText — the scanner detects it during its single tree walk.

### Fixed
- Fieldless modals no longer open with a focus ring drawn around the card — focus still anchors there (trap intact), but the card's outline is suppressed since it's a non-interactive container. The suppression uses `!important` so it wins over common global focus-reset rules (e.g. `*[tabindex]:focus-visible { outline: … }`) that the card's `tabindex="-1"` would otherwise match.
- Stabilized the Playwright suite under CPU contention: timing-sensitive assertions now retry (`expect.poll` / `toPass` via `tests/helpers.ts`) instead of sampling animated state once after a fixed wait.

---

## [8.0.0-alpha.17] — 2026-05-22

### Fixed
- Strip `.css` side-effect imports from emitted `.d.ts` files. Previously the side-effect `import '../css/alrdy-animate.css'` in `src/core/index.ts` was preserved verbatim into `dist/types/core/index.d.ts` (because of `verbatimModuleSyntax`), but at that location the relative path resolves to `dist/types/css/` which doesn't exist (CSS ships flat at `dist/alrdy-animate.css`). Consumer `tsc` failed the resolution and fell back to `any` for the whole entry module — forcing downstream Next.js projects to hand-mirror `InitOptions` in a local `.d.ts`. Now stripped via a post-`tsc` build step; Vite still bundles the CSS the same way (source untouched). After upgrading, downstream consumers can replace their `InitOptions` mirror with `import type { InitOptions } from 'alrdy-animate'`.

---

## [8.0.0-alpha.7] — 2026-05-17

### Added
- **Next.js page transitions example** at `examples/nextjs-transition/`. Runnable Next 15 App Router demo of GSAP-driven page transitions where the leaving AND incoming pages are both visible during the transition (Osmo Supply's stacked-cards effect), wired into the lib's `init`/`destroy` lifecycle. (`ad6698b`)
- **Next.js page transitions recipe** at [`/recipes/nextjs-transitions/`](https://animate.alrdy.de/recipes/nextjs-transitions/). Covers the leave-before-push / enter-after-push state machine, the snapshot + handoff pattern, viewport prefetch via `<Link>`, and the gotchas around React's atomic route swap. (`5a92743`)
- **`loadDelay` init option** (default `0.1s`). Adds a tunable delay before `load` / `load-once` triggers fire, useful for staggering page-entry animations against custom intro timelines. (`8f77572`)

### Changed
- **`slices` feature split into a standalone module** with direction suffixes and flag syntax (`aa-animate="slices-up"`, `aa-animate="slices-up reverse"`). Previously bundled inside the `reveal` feature. **Breaking** for anyone who used the unprefixed `slices` syntax in alpha.6 — update to use the new direction suffix. (`97f4ff6`)
- Installation docs (`docs/installation/nextjs.mdx`) now link to the new transitions recipe and include a decision table for `aa-trigger="load"` vs `aa-trigger="load-once event:enter"` based on whether you're running a visual transition.

### Fixed
- `easeReverse` now emitted as a top-level tween property (not a timeline default). This makes per-tween reverse easing actually take effect on event-triggered exits. (`23ceeeb`)

### Chore
- `.gitignore` covers `examples/*/.next`, `next-env.d.ts`, `tsconfig.tsbuildinfo` so future Next.js examples don't track build cache. (`da468ad`)

---

## [8.0.0-alpha.6] — 2026-05-15

### Changed
- **Trigger orchestration lifted out of feature modules** into `src/core/trigger.ts`. Features now declare their trigger intent; the orchestrator handles event/click/scroll wiring uniformly. Also fixes a SplitText resize bug. (`3acb98e`)
- **Load triggers renamed**: `aa-trigger="page-enter"` is now `aa-trigger="load-once"`; the always-fires variant is now `aa-trigger="load"`. Old names continue to work as aliases for one beta cycle. Shared trigger helpers deduplicated across features. (`14a6fa0`)

---

## [8.0.0-alpha.5] — 2026-05-13

### Added
- **`aa-trigger="page-enter"`** for SPA route-entry animations. Fires after `init()` runs against the new route — designed for elements that should animate every time the user lands on a page, not just on the first visit. (Renamed to `load-once` in alpha.6.) (`cf87024`)

### Fixed
- `destroy({ keepGlobals: true })` now correctly re-attaches `[aa-scroll-target]` and `[aa-toggle-playstate]` listeners on subsequent `init()` calls. Previously, the global observers were preserved (correct) but the per-DOM listener bindings weren't refreshed (bug).

---

## [8.0.0-alpha.4] — 2026-05-12

### Fixed
- `scrubStart` is now honoured by `text`, `reveal`, and the reduced-motion fade-fallback pass. Previously only `scroll` respected it. (`329cadc`)

---

## [8.0.0-alpha.3] — 2026-05-12

### Added
- **Class-based animation presets** via `init({ presets })`. Map CSS class names to virtual `aa-*` attribute sets so designers can apply animations from a style guide without writing attribute syntax. The map is in-memory only — never mutates the DOM. Elements with any explicit `aa-*` attribute still win over their preset. (`c2060f2`)

---

## [8.0.0-alpha.2] — 2026-05-12

### Changed
- **CI publish workflow** now derives the npm dist-tag from the version suffix: `-alpha.N` → `alpha`, `-beta.N` → `beta`, `-rc.N` → `rc`, no suffix → `latest`. Prereleases no longer accidentally promote past v7 on `latest`. (`a26a4d5`)

---

## [8.0.0-alpha.1] — 2026-05-12

### Added
- **`text-scale`, `text-scale-up`, `text-scale-down`** preset family — scaling word-by-word reveals to complement the existing `text-slide` / `text-blur` / `text-fade` set. (`fdd0397`)
- **`aa-cursor-offset`** to override the custom-cursor pointer offset per `[aa-cursor]` element. (`d76a39f`)

### Changed
- **Docs site published to `animate.alrdy.de`** via GitHub Pages. README and `AGENTS.md` link to it; install URLs auto-pin to the package version of the docs build so `<script src="…@VERSION/dist/alrdy-animate.umd.cjs">` snippets stay valid even after the docs site updates. (`4036b1e`, `41693e5`)
- Editorial homepage hero + 3×3 section grid; GSAP / Lenis CDN scripts hoisted to Astro's `head` config so every demo page loads them consistently. (`23f8b84`, `51e7cd9`)
- Hover documentation structure aligned with the appear/text page templates. (`e44f9e5`)

---

## [8.0.0-alpha.0] — 2026-05-11

### Added — Foundation
- **Full TypeScript rewrite** of the library with Vite 7 build pipeline and strict-mode `tsc` declaration emit. (`3acb98e` and many)
- **Astro 6 + Starlight 0.38 documentation site** with per-animation pages, live `<Demo>` component, and Pagefind search. (`3f7216c`)
- **`AGENTS.md` shipped in package root** so AI coding agents (Claude Code, Cursor, Aider) get a single-file reference covering attributes, lifecycle, plugin requirements, and recipes — version-pinned via `node_modules/alrdy-animate/AGENTS.md`. Per-attribute JSDoc on `src/types/jsx.d.ts` powers IDE hovers. (`8d75e2c`)
- **`init({ root })` scoped scanning** so SPA route changes can re-init alrdy-animate against just the new subtree (Barba `data-barba="container"`, Next.js swapped `<main>`, etc.). (`9fc0257`)
- **`destroy({ keepGlobals, keepFromStates })`** for clean page-transition leaves. `keepGlobals` preserves Lenis + scroll-state observers across the swap; `keepFromStates` skips `clearProps` on the leaving DOM so un-fired scroll animations don't flash visible during a leave timeline. (`9fc0257`)
- **`ready()` + live `options` snapshot** exposed for outside GSAP scripts that need the same eases / motion preferences alrdy-animate is using. (`ad213d7`)
- **`aa-timeout` universal init-timeout safety layer** — inline `<head>` snippet reveals every `[aa-animate]` element at its natural state if `init()` hasn't fired by a tunable deadline (default 4s). Pairs with the `aa-fallback` CSS-keyframe path for the hero staircase. (`ea2a957`)
- **`init({ reducedMotion, optimizeMobile })`** options. Decorative features auto-drop to fade fallbacks based on `prefers-reduced-motion` or small viewports (gated on `md` breakpoint). (`014f2b4`)

### Added — Features
- **`scroll` (fade/zoom/slide/blur/rotate)** rebuilt around `gsap.fromTo` + ScrollTrigger; supports `aa-children`, `aa-scrub`, and the new responsive shorthand. (`f50bd52`)
- **`text` (text-fade / text-blur / text-slide / text-tilt / text-marker / text-oval / text-rotate / text-block)** with SplitText runtime and split-aware staggering. (`0d56c91`)
- **`reveal` (clip-path inset / circle / oval entrances)**. (`0d56c91`)
- **`slices`** (full-bleed sliced reveals). (`0d56c91`)
- **`parallax`** with `aa-parallax-start` / `aa-parallax-end` overrides. (`dc783dc`)
- **`tabs`** with optional `aa-autoplay` and progress indicator (port of v7's accordion, rebuilt API). (`7d5537b`)
- **`slider`** — draggable carousel using Draggable + InertiaPlugin, with trigger inference and paired events. (`6b22dcb`)
- **`marquee`** — infinite-loop scroller with three-wrapper structure and shipped structural CSS. (`5129d65`)
- **`nav`** — scroll-spy nav with current/hover indicators via Flip. (`21464db`)
- **`hover`** (`hover-bg-block`, colorize-on-hover) + **`cursor`** (custom pointer tracking) — both touch-only-device-aware. (`dc783dc`)
- **`modal`** — fixed-position dialogs with `aa-modal-name`/`-target`/`-close`/`-backdrop` and scroll-lock. (`75fded4`)

### Added — Integrations
- **Lenis smooth scroll** wired into `init({ smoothScroll: true | LenisOptions })`. Instance lives at `window.lenis`, synced to `gsap.ticker`. `aa-scroll-target` clicks delegate through Lenis when present. (`a04e956`, `61fcc52`, `7693599`)
- **Webflow + Barba page-transition recipe** with the lib's lifecycle hooks wired in. Includes the verbatim Osmo stacked-cards timeline + a no-pause pattern for content-reveal animations via `aa:trigger event:enter` dispatched from inside the leave timeline. (`222611b`)
- **`aa-trigger="load"`** + multi-trigger syntax (e.g. `"load-once event:enter"`) + slow-network CSS fallback recipe so heroes don't stay hidden if the bundle is slow. (`98004f9`)

### Added — Defaults
- **GSAP 3.15** custom ease `osmo` + `0.8s` default duration registered automatically by `init()`. (`362509a`, `5a1b3ae`)
- **`easeReverse`** on event-triggered exits using GSAP 3.15's new API. (`362509a`)
- **Centralised timing defaults**, split-aware stagger, **`aa-autoplay`** attribute. (`9db8413`)

### Removed
- **Pin animations** — to be rebuilt from scratch in a v8.x minor.
- **Form-submit feature** (no production use; dropped).
- **Templates / theme registry** (dropped).
- **Lazy-load image handler** — delegate to native `loading="lazy"`.
- **CSS-only animations / IntersectionObserver `.in-view`** path — all animations now GSAP-driven. The shipped CSS file only carries split-utility classes and a reduced-motion safety net.

---

## v7 and earlier

See the [v7-maintenance](https://github.com/ben-alrdy/alrdy-animate/tree/v7-maintenance) branch for v7 patches. v7's stable line continues at `latest` until v8 promotes.
