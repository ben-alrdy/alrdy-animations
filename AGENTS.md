<!--
  Last synced with src/ — **At v8.1.4-dev (2026-07-20)** — text colour work. (1) `aa-color` gains a consumer on **`text-fade*` / `text-blur*` / `text-scale*`**: an **accent colour pulse** — each char rests in its base colour, then a separate colour tween (base → accent → brief hold → base, ~1.2× the entry duration via `power2.out`/`power2.in` keyframes) lingers on the accent while the entry runs; the per-char stagger trails it as a gradient wave, scroll-tied under `aa-scrub`. Flagged via `colorWave` on the `TextAnim` entries; the bar path (`text-block-*` / `text-marker-*`) still reads `aa-color` as the reveal-bar colour. (2) New **`text-wave`** animation — the Osmo scroll-driven gradient wave, a *separate engine* (`setupColorWave`, bypasses the scrub-timeline): scroll sets an active-count, each activation fires a wall-clock forward-only accent pulse, so the accent band widens with scroll velocity, the base catches up on stop, and up-scroll shows no accent. `aa-color` required. No new attribute or plugin — `aa-color` was already registered and `text-wave` classifies as `text` (`/^text-/`). **At v8.1.2 (2026-07-13)** — slider gains a **`finite`** token: a bounded, non-looping track powered by a separate `finite-track.ts` engine (the delicate infinite `horizontalLoop` port is untouched). Nav + keyboard clamp at the first/last slide (arrow buttons get `.is-disabled` + `aria-disabled` there), Draggable is bounded (rubber-bands at the ends, no wrap), and autoplay rewinds to the first slide instead of no-op'ing at the last. Combines with `center` and `draggable`; select via `aa-slider="finite"`. Also corrected long-standing token drift — the phantom `snap` / `loop` values (never implemented) are removed from the `aa-slider` JSDoc and the recipes; the real flag set is `draggable` / `center` / `finite` / `none`. **At v8.1.0 (2026-07-01)** — **marquee overhaul (breaking).** The loop is now driven by **`aa-autoplay`** (same as slider/tabs): presence enables it, value = seconds-per-cycle (**default 40**), tokens `hover-pause` / `hover-slow`. **With no `aa-autoplay` the marquee is static** (a scrub sweep can still apply). Consequently `aa-duration` is **no longer read by marquee**, and the `paused` / `hover-pause` / `hover-slow` tokens are **removed from `aa-marquee`** (which now carries only `right` / `switch` / `draggable` / `none`). The **`[aa-marquee-scroller]` wrapper is now optional** — required only when scrubbing; a basic marquee is just `[aa-marquee] > [aa-marquee-track] > [aa-marquee-list]`. The scrub sweep travel moved off `aa-intensity` onto the scroller element itself: **`aa-marquee-scroller="30"` = ±30% of the marquee's own width per side** (default 20; width-relative, not viewport-relative, so it's consistent across browser widths), breakpoint-aware via `|` / `-sm/-md/-lg/-xl` (folded into the root config by a bespoke bind that merges the child's buckets; `aa-marquee-scroller` added to `VALUE_BEARING_ATTRS`). `aa-scrub` still gates the sweep + sets smoothness (already breakpoint-aware). Finally, **`aa-animate` on marquee items now works**: runtime clones are sanitized (aa-animate + companions + inline from-state stripped) so originals animate in on scroll while clones render solid — **strongly recommend `aa-again="false"`** on those items (the marquee travels through the viewport on scroll, so replay would re-fire the entrance). Also fixed a pre-existing **reverse-loop freeze**: a left-direction marquee built paused at loop-progress 0 (e.g. page loaded scrolled *past* it, so its viewport gate never let it advance) would freeze forever if `switch` (or a drag flick) then reversed it — a reversed GSAP loop sitting exactly on its start edge has no runway. `applyTimeScale` now nudges progress across the wrap-equivalent boundary (0↔1 render identically under the wrap modifier) before applying a boundary-facing timeScale. Migration: `aa-duration="30"`→`aa-autoplay="30"`; add bare `aa-autoplay` to keep default-speed loops; `aa-marquee="paused"`→drop autoplay; `aa-marquee="hover-pause"`→`aa-autoplay="hover-pause"`; `aa-intensity` on a scrub marquee→`aa-marquee-scroller="<n>"`. **At v8.0.10 (2026-06-30)** — new per-element **`aa-again`** attribute overrides the global `init({ again })` scroll-replay default: `aa-again="false"` plays a scroll-triggered animation once (no reset/replay when it re-enters the viewport), `aa-again="true"` forces replay even when the global default is off. Scroll-triggered features only (`appear` / `text` / `reveal`); `load` / `event` / `scrub` ignore it. Supports the `|` and `-sm/-md/-lg/-xl` responsive forms like other value-bearing attributes. Implemented via a new `parseBool` helper in `parse.ts` (`readAnimationConfig`) + registration in `VALUE_BEARING_ATTRS`. **At v8.0.9 (2026-06-29)** — `optimizeMobile` now accepts `'fade'` in addition to `true`/`false`. `true` makes `text-*` elements **simply visible** on small viewports (no animation, no flash — the previous fade is gone); `'fade'` keeps a fade but a softer/slower one (`0.8s`, `power2.out`, via new `DEFAULT_OPTIMIZE_MOBILE_FADE` in `state.ts`) instead of reusing the reduced-motion `0.4s` timing. Both modes drop the same heavy modules (`text`/`parallax`/`split`); `true` additionally skips the fade pass entirely (no extra ScrollTriggers). `AlrdyAnimate.options.optimizeMobile` now reads back the active mode (`true`/`'fade'`) or `false`. **At v8.0.8 (2026-06-26)** — `aa-trigger="instant"` and its `alrdy-animate/loader` splitter (both shipped in 8.0.6) are **removed**: `load` + a fast (~100 ms) `aa-fallback` covered the same above-the-fold need with smoother real-network results. Gone are the `instant` trigger kind, the `./loader` export + its separate build, and the Instant-hero recipe; the `dist` FOUC guard now excepts only `[aa-trigger~="lcp"]` (no longer `instant`). **At v8.0.6 (2026-06-26)** — `init()` now only `await`s `document.fonts.ready` when a **line** split is present (`scan().needsFontMetrics`), capped at 3s — char/word-only and non-text pages init sooner. **At v8.0.5 (2026-06-25)** — the slow-network / init-timeout fallback CSS (`@keyframes aa-fallback-appear` and the `html[aa-fallback]` / `html[aa-timeout]` reveal rules) no longer ships in `dist/alrdy-animate.css`; it now lives **only** in the optional inline `<head>` snippet (load-fallback recipe), which already inlines its own copy. The dist copy was inert without that snippet's JS (nothing else sets those attributes), and when both were present a cross-origin dist `<link>` won the duplicate-`@keyframes` collision and silently reverted any author customisation of the fallback motion. The **FOUC guard** and the **`lcp` `0.01` floor** stay in `dist` — the `import 'alrdy-animate/style'` (npm / Next.js) path relies on them. JS handling of `aa-fallback` / `aa-timeout` is unchanged. The fallback is now an inline-`<head>` concern in **every** environment (Webflow and bundled apps alike), since its timer can't live in the app bundle it's meant to outrun. **At v8.0.4 (2026-06-18)** — new `aa-trigger="lcp"`: a load-timed entrance for the Largest Contentful Paint element. The companion stylesheet paints the marked element at first paint at `0.01` opacity (an eligible LCP candidate before the bundle, instead of being hidden by the FOUC guard), then the appear feature pins `opacity:1` as the `gsap.from()` destination (the CSS floor would otherwise be read as the destination) and fades it to full. Works with any opacity-bearing `aa-animate`. The inline `<head>` snippet adds: the FOUC guard now excludes `[aa-trigger~="lcp"]`; `[aa-trigger~="lcp"]:not([aa-ready])` paints visible at `0.01`; `html[aa-fallback]`/`html[aa-timeout]` reveal it (fade / instant) since the load path skips its GSAP tween under `aa-fallback`. Existing Webflow users must re-paste the head snippet. Earlier at v8.0.0 (2026-06-11) — marquee gains a `hover-slow` token: `aa-marquee="hover-slow"` ramps the loop to 15% speed on hover (0.4s ease) and back on leave; same gating as `hover-pause` (touch-skipped, off when `draggable`), yields to `hover-pause` when both are set, composes with `switch`. Also: the Next.js page-transition recipe now handles popstate (browser back/forward) interrupting an in-flight transition. Earlier this release — modal a11y: cards now get `role="dialog"` + `aria-modal="true"` + an `aria-label` derived from their leading text block (truncated), triggers get `aria-haspopup="dialog"`, the fieldless-modal focus ring is suppressed (`[aa-modal-name]:focus { outline:none }`), and the anchored card focuses with `preventScroll`. Also: text split-unit will-change is now managed per-tween (the permanent `.aa-char`/`.aa-word` layer is gone except on hover-text hosts). Earlier this release — doc-sync for the 8.0.0 promotion: corrected the modal feature surface (the feature scans `[aa-modal-group]`, not `[aa-modal-name]`; documented the `aa-modal-group` container plus the lib-written `aa-modal-status` / `aa-modal-group-status` outputs), refreshed the text-preset roster (added `text-fade-30/-10`, directional `text-fade-*` / `text-blur-*`, `text-scale-up/-down`, `text-tilt-up/-down`, `text-oval-up/-down`, and the required-suffix `text-block-<dir>` / `text-marker-<dir>` forms; removed the nonexistent bare `text-tilt` / `text-marker` / `text-oval` / `text-block`), and fixed the slider/marquee plugin columns (`Draggable` + `InertiaPlugin` only — `ScrollTrigger` is opportunistic, not required). Earlier alpha.35 — event-triggered inner animations (inside modal / tabs / slider / stack) now honour `aa-delay` on every fire: the forward play was `play(0)`, whose time 0 sits *after* GSAP's delay, so the delay was silently skipped; it now uses `restart(true)`. Trigger inference is now orphan-safe: a container attribute with no matching root (e.g. a stray `aa-stack-card` inside a modal with no `aa-stack` ancestor) is skipped, so inner `aa-animate` elements fall through to the next enclosing container (`modal-active`) or scroll instead of inheriting a `card-active` event nothing ever emits and sitting paused forever. Modal auto-focus now targets the first form input (input/select/textarea) only — buttons/links are never auto-focused; a fieldless modal anchors focus on the card itself. Earlier alpha.34 — stack `aa-stack-out="perspective"`/`blur` `y` lift is a percentage of card height (`7% × intensity` / `3.5% × intensity`, via `translateY(%)`) so the peek stays proportional across screen sizes (a fixed lift gets swallowed on tall cards as `scale: 0.92` pulls the top edge down ~4% of height); with `perspective` the last card rises by *half* that lift (`3.5% × intensity` of its height) at the end of the stack to cover the receded card behind it (last card's bottom margin extended to supply the runway). Stack `aa-stack-in="fade"` now completes its fade at the midpoint of the entry travel (a separate tween) instead of at the lock point. Earlier alpha.33 — components inside modals and `display:none`-until-revealed containers (e.g. a form-success message) now work: sliders/marquees measure layout at init and were dead while hidden, so they re-measure on reveal via a `ResizeObserver` (a window resize never fires), and inside a modal their loop/autoplay gates on the modal's open/close lifecycle instead of scroll position (scroll-based gating misjudges `position:fixed` modals and froze the loop on resize when opened at a non-zero scroll). Earlier alpha.32 — `will-change` is no longer left permanently on `[aa-animate]` elements: the orchestrator (appear/reveal/slices) sets it on the animated targets only while a tween plays and clears it on settle (re-armed on `again` reset / event reverse). Fixes frosted navs — a permanent `will-change: transform` on the nav was neutralising a descendant's `backdrop-filter`. Earlier alpha.31 — nav `hide` is now GSAP-driven (yPercent tween toggled on scroll-direction, overwrite:'auto'); composes with an `aa-animate` entrance on the same nav, immune to author `transition` clobber, full GSAP ease vocab (incl. elastic/bounce). Earlier alpha.28 — documented the `--aa-ease-*` CSS custom properties (named eases reusable in plain CSS; elastic/bounce have no variable)
  and the aa-tabs-content padding rule (keep vertical padding/borders off the clip element — pad an inner div);
  fade-*/rotate-up translate baseline reduced 3rem → 2rem;
  breakpoint-aware container inference (disabled feature → scroll fallback)
  extended with `underline-in` / `underline` (animated underline bars,
  two-phase sweep on the always-on `underline`, queue-up interrupt) and
  `text` / `text reverse` (char or word lift via text-shadow + `clip-path`
  clipping, no overflow mutation).
  New `aa-hover-trigger` marker attribute on a wrapper makes descendants with
  `aa-hover` bind to that wrapper's mouseenter/leave instead of their own —
  letting one button combine background + icon + text hovers in a single
  region. SplitText is now auto-required (and only) when an `aa-hover` head
  is exactly `text`, and only on devices that report `(hover: hover)` so
  touch-only payloads don't pay for it. `aa-split="lines"` paired with the
  text head lifts the whole label as a single block (companion CSS forces
  `white-space: nowrap` on text-hover hosts). Earlier alpha.16 — feature
  module `scroll` renamed to `appear`
  (fade/slide/zoom/blur/rotate presets). `reveal`
  and `slices` are still distinct lazy chunks but now live as sibling files
  under `src/features/appear/` to mirror the docs grouping. Public `FeatureName`
  values are `'appear' | 'reveal' | 'slices' | …` — old `'scroll'` is gone (it
  collided with the `TriggerKind 'scroll'` and `aa-tabs="scroll"` mode anyway).
  Also: `reveal` now respects `aa-stagger` (clips each child individually) and
  `aa-anchor` (selector resolves to the ScrollTrigger element), bringing it to
  parity with `appear`. Earlier alpha.15 — stack: in/out scrub windows no
  longer overlap on tightly-packed cards (out clamps to the lock point), and
  the sticky-card default CSS is now zero-specificity via `:where()` with
  `top: 25vh` as the new default (was `4rem`) — author classes win without
  `!important`. Also: `text-blur-up` / `text-blur-down` no longer line-mask.
  All four directional blur variants now use the same shape: `chars` split,
  no mask, soft `2rem × intensity` drift on the named axis. Reach for
  `text-slide-*` or `text-tilt-*` when you want the line-clip reveal. Earlier alpha.12 — renamed `aa-distance`
  to `aa-intensity` across every feature (and the `init({ distance })` option
  to `init({ intensity })`). Hard cutover, no alias. `aa-intensity="1"` is the
  default everywhere and reproduces today's design baseline; `0.5` halves the
  effect, `2` doubles it. The three features whose old default wasn't 1 were
  rebased so the baseline lives inside the feature: nav (-150% slide-off baked
  in; old `aa-distance="1.5"` → new default `aa-intensity="1"`), marquee (10vw
  scrub sweep baked in; old `aa-distance="10"` → new default), tabs (30vh per
  tab baked in; old `aa-distance="30"` → new default). The raw-pixel scroll
  offset that used to live on `aa-distance` for `[aa-scroll-target]` links
  split off into `aa-scroll-offset` (joins the `aa-scroll-start` / `aa-scroll-end`
  family). Earlier alpha.11 extended the stack feature's rotation presets into
  two parallel families: `rotate*` (cards arrive tilted, settle flat) and
  `tilt*` (cards arrive flat, build up rotation by lock — Osmo splay-at-lock).
  Each family ships three variants: default centred fan `(0°, -5°, +5°, -5°,
  +5°, …)`, `*-cw` incremental clockwise ramp `(0°, +1°, +2°, +3°, …)`,
  `*-ccw` mirror. The `rotate` default magnitude was lowered from 15° → 5° to
  match the tilt family. All six rotation-touching flags are mutually exclusive
  (`tilt*` wins over `rotate*`; within each family `*-cw`/`*-ccw` wins over
  the default). Magnitudes scale with `aa-intensity`. Alpha.10 introduced the `stack`
  feature itself: `aa-stack` on the container + `aa-stack-card` on each
  card; card-active / card-inactive events drive `aa-animate` children
  inside via the existing container-inference system. CSS `position:
  sticky` (not ScrollTrigger pin) does the actual locking; GSAP only owns
  the in / lock / out transforms. Earlier alpha.7: added `loadDelay` init option
  (default `0.1s`) that pads every `aa-trigger="load"` / `"load-once"`
  animation so the entrance plays a beat after init() settles. Skipped on
  slow-load revisits (`html[aa-fallback]`). Earlier alpha.6: renamed
  `aa-trigger="page-enter"` to `aa-trigger="load"` and renamed the old
  first-init-only `aa-trigger="load"` to `aa-trigger="load-once"`; documented
  the global contract (window.gsap / Lenis / lenis / AlrdyAnimate); init() now
  safely re-attaches scroll-state + scroll-target across `keepGlobals: true`
  cycles.
  This file mirrors the public API surface for AI coding agents. When any
  public aa-* attribute, InitOptions field, feature module, or trigger kind
  changes in src/, update this file in the same commit. See CLAUDE.md
  "Keep AI affordances in sync" for the full update workflow.
-->

# alrdy-animate — agent reference

Attribute-driven scroll-animation and interactive-component library for Webflow and Next.js. GSAP (peer dependency) drives every animation; alrdy-animate is the orchestrator that turns `aa-*` HTML attributes into `gsap.fromTo` calls, ScrollTriggers, event listeners, and matchMedia bindings.

If you're an AI assistant writing code that uses this library, this file is the authoritative quick reference. Per-attribute autocomplete also lives in the TypeScript types at `alrdy-animate/jsx`.

---

## Quick start

**Webflow** — load GSAP + ScrollTrigger + (optionally CustomEase, SplitText, Flip, Draggable, InertiaPlugin, Lenis) via `<script defer>` tags, then the lib's UMD build. Call `AlrdyAnimate.init({...})` from a `DOMContentLoaded` listener. See the [Webflow guide](https://animate.alrdy.de/installation/webflow/) for the full head/footer snippets.

**Next.js**:

```bash
npm install alrdy-animate gsap lenis
```

```tsx
// app/_components/AlrdyInit.tsx
'use client'
import { useEffect } from 'react'
import 'alrdy-animate/style'

export function AlrdyInit() {
  useEffect(() => {
    let cancelled = false
    Promise.all([
      import('gsap').then(m => { (window as any).gsap = m.gsap }),
      import('gsap/ScrollTrigger').then(m => { (window as any).ScrollTrigger = m.ScrollTrigger }),
      import('gsap/CustomEase').then(m => { (window as any).CustomEase = m.CustomEase }),
      // import only the plugins you use (SplitText, Flip, Draggable, InertiaPlugin)
      import('lenis').then(m => { (window as any).Lenis = m.default }),
    ]).then(async () => {
      if (cancelled) return
      const { init } = await import('alrdy-animate')
      await init({ debug: process.env.NODE_ENV !== 'production' })
    })
    return () => { cancelled = true; (window as any).AlrdyAnimate?.destroy() }
  }, [])
  return null
}
```

Add `import 'alrdy-animate/jsx'` once in `types/global.d.ts` so JSX intrinsic elements accept `aa-*` attributes with autocomplete.

---

## Globals the lib reads and writes

Four `window` globals are in play. The lib *reads* peer dependencies (gsap, Lenis) and *writes* its public API + the Lenis instance. Knowing who owns which lets you skip writing your own integration shim.

| Global | Owner | Purpose |
|---|---|---|
| `window.gsap` | You (script tag UMD or `window.gsap = m.gsap`) | GSAP core. The lib detects it during `init()`. Never written by the lib. |
| `window.Lenis` (capital L) | You (script tag UMD or `window.Lenis = m.default`) | Lenis **constructor**. The lib reads this when `smoothScroll: true` to instantiate Lenis. Never written by the lib. |
| `window.lenis` (lowercase l) | The lib | Active Lenis **instance**, set once `smoothScroll` is initialised. Call `.scrollTo()`, `.stop()`, `.start()` directly. Persists across `destroy({ keepGlobals: true })`. Removed by plain `destroy()`. |
| `window.AlrdyAnimate` | The lib | Public API (`init`, `destroy`, `refresh`, `onResize`, `ready`, `options`). |

**Driving Lenis from app code** (mobile menu open/close, custom anchor scroll):

```js
// Pause Lenis while a menu is open
window.lenis?.stop()
// Restart and scroll smoothly to a section
window.lenis?.start()
window.lenis?.scrollTo('#features', { offset: -80, duration: 0.8 })
```

The lib's own scroll-target click handler (`[aa-scroll-target]`) uses `window.lenis` the same way — feel free to call it directly for anything outside that pattern.

---

## Attribute syntax conventions

Every value-bearing attribute follows the same grammar.

| Notation | Meaning | Example |
|---|---|---|
| `dash-joined-words` | One compound concept. | `fade-up`, `text-blur-up`, `hover-bg-block` |
| `space separated flags` | Independent modifiers on the same attribute, order-independent. | `aa-split="lines mask"`, `aa-trigger="load event:enter"` |
| `DESKTOP \| MOBILE` | Two-bucket responsive shorthand. **Left of pipe applies at `>= breakpoints.md` (default 768px), right applies below.** | `aa-animate="fade-up \| fade"` |
| `aa-foo-sm` / `-md` / `-lg` / `-xl` | Per-breakpoint override; activates at the named breakpoint and up (Tailwind semantics). | `aa-animate-md="text-slide-up"` |
| `none` | Opt out at that breakpoint. | `aa-slider="draggable \| none"` (disables slider on mobile) |

**Default breakpoints** (override via `init({ breakpoints })`): `{ sm: 480, md: 768, lg: 992, xl: 1280 }`.

The `|` shorthand and the `-sm/-md/-lg/-xl` suffixes both compile to exclusive width-based matchMedia ranges — exactly one variant is active at a time, and breakpoint exits auto-revert tweens.

---

## Trigger system (`aa-trigger`)

The six trigger kinds:

| Value | Behaviour |
|---|---|
| (omitted) or `scroll` | ScrollTrigger between `aa-scroll-start` and `aa-scroll-end`. Replays on re-enter unless `init({ again: false })` or `aa-again="false"` on the element. |
| `click` | Element animates when clicked. |
| `load-once` | Fires on the **first** `init()` cycle of the page session. Subsequent `init()`s (e.g. after a Barba navigation) skip it. Use for transitions where the new container is hidden behind a transition wrapper and re-firing the entrance would waste work. |
| `load` | Fires on **every** `init()` cycle, including the first. Use for SPAs (Next.js App Router, etc.) where the same root `AlrdyInit` component re-calls `init()` on route changes — the user is visually arriving at a "fresh" page even though it's the second, third, Nth init. |
| `lcp` | Load-timed like `load`, but optimised for the **Largest Contentful Paint** element (the hero's largest image/visual). The companion stylesheet paints it at first paint at `0.01` opacity — non-zero, so Chrome counts it as an LCP candidate *before* the bundle runs (a normal `opacity:0`/`visibility:hidden` entrance is excluded from LCP and defers it until init) — then the entrance fades it to full. Use on **one** above-the-fold element; pair with `fetchpriority="high"` / `loading="eager"` and keep it in static HTML. Works with any opacity-bearing `aa-animate`. **Requires the updated inline `<head>` snippet** (see installation / load-fallback recipe). |
| `event:<name>` | Listens for `aa:trigger` CustomEvents with `detail.name === '<name>'` on the element or any ancestor. |

**Choosing between `load-once` and `load`:** Barba / View Transitions / any flow where the leaving page is still on screen during the swap → `load-once` (avoids replaying behind the wrapper). Next.js App Router back/forward nav, or any SPA where each route is a clean visual arrival → `load`.

**Multiple kinds** are space-separated and additive: `aa-trigger="load-once event:enter"` or `aa-trigger="load event:enter"`.

**Container inference** — if `aa-trigger` is omitted and the element is inside one of these containers, it inherits the matching event trigger:

| Container attribute | Inferred trigger |
|---|---|
| `[aa-modal-name]` | `event:modal-active` |
| `[aa-tabs-content]` | `event:tab-active` |
| `[aa-tabs-visual]` | `event:tab-active` |
| `[aa-slider-item]` | `event:slide-active` |
| `[aa-stack-card]` | `event:card-active` |

Set `aa-trigger="scroll"` explicitly to opt out.

**Breakpoint-aware** — inference checks whether the container's feature is actually live at the current breakpoint. If the controlling attribute (`aa-tabs` / `aa-slider` / `aa-stack`) resolves to `none` there (e.g. `aa-stack="|none"` below `md`), the feature never emits its event, so the inner animation falls back to **scroll** instead of waiting forever. No `aa-trigger` needed for either mode.

**Orphan-safe** — a container attribute with no matching root (e.g. a stray `aa-stack-card` left inside a modal with no `aa-stack` ancestor, or `aa-tabs-content` outside any `aa-tabs`) is skipped during inference. The element falls through to the next enclosing container (here `modal-active`) or to scroll, rather than inheriting an event that nothing ever emits and sitting paused forever.

**Reverse pairing** — events named `<x>-active` automatically pair with `<x>-inactive` for the reverse animation. So `event:tab-active` on the active animation auto-listens for `event:tab-inactive` and reverses.

**Dispatching from your own code:**

```js
element.dispatchEvent(new CustomEvent('aa:trigger', {
  detail: { name: 'enter' },
  bubbles: true,
}))
```

---

## Animation presets (`aa-animate`)

Presence of `aa-animate` makes an element animate; the FOUC guard hides it until `init()` flips `aa-ready` on it.

**Appear presets** (feature: `appear`, plugin: `ScrollTrigger`):
`fade`, `fade-up`, `fade-down`, `fade-left`, `fade-right`, `zoom-in`, `zoom-out`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `blur`, `rotate`, `rotate-up`, `rotate-up-tl` / `-tr` / `-bl` / `-br`, `rotate-*-ccw` variants.

**Text presets** (feature: `text`, plugins: `ScrollTrigger` + `SplitText`):
`text-fade`, `text-fade-30`, `text-fade-10`, `text-fade-up`, `text-fade-down`, `text-fade-left`, `text-fade-right`, `text-blur`, `text-blur-up`, `text-blur-down`, `text-blur-left`, `text-blur-right`, `text-scale`, `text-scale-up`, `text-scale-down`, `text-slide-up`, `text-slide-down`, `text-tilt-up`, `text-tilt-down`, `text-oval-up`, `text-oval-down`, `text-rotate`, `text-wave` (scroll-driven accent wave — see below), `text-block-<dir>`, `text-marker-<dir>` (`<dir>` = `up`/`down`/`left`/`right`; the direction suffix is required — there is no bare `text-block` / `text-marker` / `text-tilt` / `text-oval`). Pair with `aa-split="chars"` / `"words"` / `"lines"` (+ optional `mask` / `index` flags) to control granularity. `mask` always wraps each line in `overflow: clip` (never per-char/word — that would trap the moving unit). `index` exposes a 1-based `--char` / `--word` / `--line` CSS variable on each split unit so you can derive `transition-delay` from CSS for hover/load staggers without JS.

**Accent colour pulse** — add `aa-color` to any `text-fade*`, `text-blur*`, or `text-scale*` element to enable a colour pulse. Each character rests in its base colour, then as it animates in a separate colour tween runs base → accent (`aa-color`, any CSS colour or `--var`) → brief hold → base. The pulse runs ~1.2× the entry duration and lingers on the accent, so the per-character stagger trails the accent as a gradient wave; add `aa-scrub` to tie it to scroll position, and `text-fade-30` / `text-fade-10` for a dim-to-bright look. Under `aa-scrub` the pulse is bound to scroll progress, so it reverses through the accent on up-scroll and has a fixed band. Without `aa-color` these presets behave as before. (`aa-color` on `text-block-*` / `text-marker-*` still sets the reveal-bar colour, not a wave.)

**`text-wave` — scroll-driven wave (Osmo engine).** A distinct animation with its own engine, not the pulse above. Scroll position only sets `activeCount = round(progress × units)`; each unit fires an independent **wall-clock** accent pulse the instant it crosses into the active set (forward only). Consequently: the accent band **widens with scroll velocity**, the base colour **catches up when you stop**, and scrolling **up shows no accent** (deactivation fades straight to the dim resting state). `aa-color` is required (the accent); base colour is the element's own computed `color`; units rest at ~0.2 opacity and brighten on activation. `aa-scrub` sets the scroll→activation smoothing (default `0.1`). Reduced-motion / optimizeMobile never reach the engine — core swaps `text-*` for a plain fade before the module loads. Implemented as a bespoke `setupColorWave` path in `src/features/text/index.ts` (bypasses the shared scrub-timeline orchestrator).

**Reveal presets** (feature: `reveal`, plugin: `ScrollTrigger`):
`reveal-up`, `reveal-down`, `reveal-left`, `reveal-right`, `reveal-center`, `reveal-oval-up`, `reveal-oval-down`. Clip-path entrances controlled by `aa-scroll-start/end` or `aa-scrub`.

**Slices presets** (feature: `slices`, plugin: `ScrollTrigger`):
`slices`, `slices-up`, `slices-down`, `slices-left`, `slices-right`. Shutter-style reveal with N rows that scale away. Add space-separated flags on the same `aa-animate` value: `cover` to invert (slices grow in to fill) and an integer to override the row count, e.g. `aa-animate="slices-right cover 12"`. Order-independent. Slice colour comes from the host's `currentColor`.

Tune any preset with `aa-duration`, `aa-delay`, `aa-ease`, `aa-intensity`, `aa-stagger`, `aa-again`. Use `none` at a breakpoint to skip.

---

## Feature reference

Twelve features ship; the scanner detects which ones are needed by which attributes are present and lazy-loads the modules.

| Feature | Triggering attributes | Required GSAP plugins | Purpose |
|---|---|---|---|
| `appear` | `aa-animate` (non-text, non-reveal, non-slices value) | `ScrollTrigger` | Scroll/load/event-triggered fades, slides, zooms, blur, rotate. |
| `text` | `aa-animate="text-*"` | `ScrollTrigger`, `SplitText` | Text-character / word / line animations via `aa-split`. |
| `reveal` | `aa-animate="reveal-*"` | `ScrollTrigger` | Clip-path entrances (inset / circle / oval). |
| `slices` | `aa-animate="slices..."` | `ScrollTrigger` | Shutter-style reveal — N rows scale away. Direction in name, mode/count as space flags. |
| `parallax` | `aa-parallax-start` / `aa-parallax-end` | `ScrollTrigger` | Depth-based scroll parallax (multiplier on scroll speed). |
| `slider` | `aa-slider` | `Draggable`, `InertiaPlugin` | Draggable carousel with optional autoplay. Loops infinitely by default; `aa-slider="finite"` is a bounded, non-looping track (nav clamps at the ends, drag is bounded, autoplay rewinds). Flags: `draggable` / `center` / `finite` / `none`. (`ScrollTrigger` is used only if loaded, to viewport-gate autoplay; not required.) |
| `marquee` | `aa-marquee` | `Draggable`, `InertiaPlugin` | Infinite-loop scroller. Loop enabled by **`aa-autoplay`** (value = seconds/cycle, default 40; tokens `hover-pause`/`hover-slow`); static without it. `aa-marquee` tokens: `right`, `switch`, `draggable`, `none`. Structure `[aa-marquee] > [aa-marquee-track] > [aa-marquee-list]`; add optional `[aa-marquee-scroller="<pct>"]` (sweep travel as % of marquee width) around the track for `aa-scrub` sweep. `aa-animate` on items animates originals in (clones sanitized; use `aa-again="false"`). (`ScrollTrigger` is used only if loaded, for `scrub` scroll-velocity coupling; not required.) |
| `tabs` | `aa-tabs` | `ScrollTrigger` | Tab switching with progress indicator + autoplay. The `aa-tabs-content` panel collapses via a height-to-0 tween + `overflow: hidden` — with `box-sizing: border-box` the rendered height can't shrink below the element's own vertical padding or border, so a padded panel leaves a phantom gap when closed. Keep `aa-tabs-content` bare (horizontal padding is fine) and put vertical padding / border / background on an inner div, or use margins on children (the clip swallows those). |
| `nav` | `aa-nav` | `ScrollTrigger`, `Flip` | Scroll-spy nav with animated current/hover indicator. The `hide` token is GSAP-driven: on the scroll-direction flip the feature tweens the nav's `yPercent` off-screen (`-150% × aa-intensity`) and back, with `overwrite: 'auto'` for smooth reversals. It runs through GSAP (not CSS) so it composes with any `aa-animate` entrance on the same nav (which owns `transform`) and isn't clobbered by author `transition` rules — add whatever transitions you like for the `is-scrolled`/`change` state. `aa-ease` accepts the full GSAP ease vocab here (incl. elastic/bounce). **Frosted nav:** put `backdrop-filter` on the same element that carries `aa-nav`/`aa-animate` (an element's own transform never breaks its own backdrop-filter), not a descendant. |
| `modal` | `aa-modal-group` | (none) | Fixed-position dialogs. The feature scans `[aa-modal-group]` (the container wrapping the card(s) + backdrop); each card is marked `[aa-modal-name]`, opened by `[aa-modal-target="<name>"]`, closed by `[aa-modal-close]` / `[aa-modal-backdrop]`. The lib writes `aa-modal-status` on each card and `aa-modal-group-status` on the container (`"active"` / `"not-active"`). A11y is automatic: focus trap + ESC + scroll lock; each card gets `role="dialog"` + `aria-modal="true"` (auto-named via `aria-label` from its leading text block, truncated), each trigger gets `aria-haspopup="dialog"`. Set an explicit `aria-label` on the card to override the derived name. |
| `hover` | `aa-hover` | (none — `SplitText` if any `aa-hover` value is exactly `text`, and the device matches `(hover: hover)`) | `block` / `curve` direction-aware bg, `icon-<dir>` icon swap (with `reverse` / `triple` flags), `underline-in` / `underline` animated underline bars (queue-up interrupt), `text` / `text reverse` char / word / line lift with text-shadow (granularity via `aa-split="chars" \| "words" \| "lines"`). Combine effects via `aa-hover-trigger` on a wrapper. |
| `cursor` | `aa-cursor` | (none) | Custom pointer tracking with state-driven styling. |
| `stack` | `aa-stack` | `ScrollTrigger` | Stacking-card layout: CSS `position: sticky` locks cards, scrubbed in/out tweens + optional lock pulse animate the lifecycle, `card-active` / `card-inactive` events drive `aa-animate` children inside each card. |

For each feature, animations inside the relevant container default to the inferred event trigger (see container inference table above) — you usually don't write `aa-trigger` yourself for tabs/sliders/modals.

---

## Public API

Exposed on `window.AlrdyAnimate` (UMD) and as named exports from `'alrdy-animate'` (ESM).

```ts
init(options?: InitOptions): Promise<void>
destroy(options?: DestroyApiOptions): void
refresh(): Promise<void>
onResize(fn: () => void, opts?: { debounce?: number }): () => void
ready(): Promise<void>          // resolves after the most recent init() finishes
options: ResolvedOptions         // live readonly snapshot — see "Custom GSAP scripts alongside v8"
```

### `InitOptions` defaults

| Option | Default | Notes |
|---|---|---|
| `duration` | `0.6` | Seconds. |
| `ease` | `'power4.out'` | Any GSAP ease or one of the lib's named eases (`osmo`, `energy`, `smooth`, `punch`, `relaxed`, `jump`, `pop`, `elastic`, `anticipate`, `bounce`, `fade`) — named eases need `CustomEase` loaded. |
| `intensity` | `1` | Multiplier for every feature that reads `aa-intensity` (fade/rotate/slide translate, parallax depth, stack transforms, text-fade/blur offsets, hover-icon trail timing, nav hide-clearance, tabs scroll-pin range). `1` reproduces each feature's design baseline; `0.5` halves, `2` doubles. **Baselines by family**: fade-\*/rotate-up `2rem`, text-blur (all directions) `2rem` (all root-font-size relative); slide-\*/text-slide-\*/text-tilt-\* line masks + hover-bg-block `100%` of element or line (element-relative); parallax `±10%` of range. (Marquee scrub travel is **not** `aa-intensity` — it's authored as a percent of the marquee width on `aa-marquee-scroller`.) Rem-based values track `:root { font-size }` and rebuild on breakpoint changes via `gsap.matchMedia` — so per-breakpoint stepped root sizes Just Work; a fluid `clamp()` on `:root` locks in at breakpoint entry. |
| `loadDelay` | `0` | Seconds added to every `aa-trigger="load"` / `"load-once"` entrance's delay. Load entrances are **paint-gated**: built paused and released one frame after the `aa-ready` reveal so a wall-clock tween can't advance during the heavy post-init layout/paint block (which surfaced the entrance already mid-fade on content-heavy pages). At the default `0` the entrance starts the moment it's painted; a positive `loadDelay` adds an intentional beat on top, measured from that first paint. Composes additively with per-element `aa-delay` (`aa-delay="0.3"` + `loadDelay: 0.1` fires `0.4s` after paint). Scroll / event / click / scrub triggers are unaffected. Skipped on slow-load revisits (`html[aa-fallback]`), where the entrance is already replaced by the inline CSS fallback. |
| `scrollStart` | `'top 85%'` | Default ScrollTrigger `start`. Used by every scroll-triggered animation. |
| `scrollEnd` | `'bottom 60%'` | Default ScrollTrigger `end`. Only used when `aa-scrub` is set. Non-scrubbed animations ignore this — the `again: true` reset point is computed dynamically (one viewport below the element), not from `scrollEnd`. |
| `scrubStart` | unset | Optional `start` override applied **only** when `aa-scrub` is set on the element. Lets you fire scrubs earlier than the non-scrubbed `scrollStart` (e.g. `'top 100%'` to give scrubs the full viewport pass). Per-element `aa-scroll-start` still wins. Honoured by every scroll-position-reading feature. |
| `again` | `true` | Replay scroll-triggered animations on re-enter. Override per element with `aa-again="false"` / `"true"`. |
| `stagger` | `{ chars: 0.02, words: 0.05, lines: 0.1, default: 0.1 }` | Per-split-mode stagger defaults (seconds). |
| `autoplay` | `{ interval: 4, hoverPause: false }` | Slider/tabs autoplay defaults. |
| `breakpoints` | `{ sm: 480, md: 768, lg: 992, xl: 1280 }` | Pixel widths for responsive variants. |
| `reducedMotion` | `true` | Behaviour under `(prefers-reduced-motion: reduce)`. `true` → appear/text/reveal collapse to opacity fade (0.4s, `power1.out`); hover + parallax skip; components stay functional. `false` → ignore. Object `{ duration, ease }` to customize fade timing. Snapshot at init. |
| `optimizeMobile` | `false` | When set and viewport < `breakpoints.md`, drop `text` + `parallax` + standalone `aa-split` (their modules never run — SplitText not loaded, no parallax scrub). `true` → text is simply made visible (no animation, fastest). `'fade'` → text gets a soft opacity fade (`0.8s`, `power2.out`). Parallax stays still either way. Appear/reveal/components run normally. Saving is JS runtime, not bytes (applies on Webflow too). Snapshot at init. `reducedMotion` overrides if both fire. |
| `smoothScroll` | `true` | Boolean or Lenis options object. Silently skipped if `window.Lenis` is absent. |
| `scrollState` | `true` | Writes `aa-scroll-direction` + `aa-scroll-started` on `<body>`; runs the `[aa-toggle-playstate]` IntersectionObserver. |
| `root` | `document` | Scope the scan to a subtree. Element-scoped inits skip global setup (smoothScroll, scrollState). |
| `presets` | _unset_ | Class → animation map. Resolved into a virtual `Map<Element, Config>` before scan; no DOM mutation. Per-element `aa-*` attributes always win. See [Class presets](#class-presets-init-presets-). |
| `debug` | `false` | Verbose console logging. |

### Class presets (`init({ presets })`)

Map a CSS class to one or more `aa-*` attributes at init time so you don't have to add attributes to every matching element. Built for the Webflow workflow: every `.heading-style-h2` animates the same way without opening each symbol.

```ts
init({
  presets: {
    'heading-style-h2': 'text-fade-up',                                // string → aa-animate only
    'heading-style-h3': { animate: 'text-blur-up', split: 'words' },   // object → bare keys prefixed with aa-
    'cta-button': { animate: 'fade-up', duration: '0.4|0.3' },         // pipe + suffix syntax work as in HTML
  },
})
```

**Resolution mechanics:**

- Resolved into an **in-memory `Map<Element, Config>`** before scan — never written as real DOM attributes. The browser inspector shows the elements unchanged.
- Each preset must include an `animate` value (or per-breakpoint variant like `animate-md`). Presets without one are skipped.
- **Per-element override rule**: if a matched element already has *any* `aa-*` attribute, the preset is skipped for that element. The explicit attribute always wins.
- **Resolution order**: object insertion order. The first preset entry that matches an element wins; later entries don't merge.
- **Reduced motion / `optimizeMobile`**: preset elements collapse to the same opacity-fade fallback as hand-authored attributes — no extra wiring.
- **FOUC**: the `visibility: hidden` until `aa-ready` guard only catches elements with `aa-animate` in the initial HTML, so preset elements are NOT FOUC-protected. Use presets for **below-the-fold** content; hand-author `aa-animate` on anything above the fold.

**Scope**: text (`text-*`) and appear (`fade-*`, `zoom-*`, `slide-*`, `blur-in`, `rotate-*`) animations. Feature-anchor attributes (`aa-tabs`, `aa-slider`, `aa-marquee`, `aa-nav`, `aa-modal-*`, `aa-cursor`, `aa-hover`) are out of the documented use case — those are single-element opt-ins.

### `DestroyApiOptions`

| Option | Default | Notes |
|---|---|---|
| `keepGlobals` | `false` | When `true`, leaves Lenis + scroll-state + scroll-target observers alive across the destroy/init cycle. Use from page-transition hooks. |
| `keepFromStates` | `false` | When `true`, kills tweens without reverting inline GSAP from-states. Use when the leaving DOM is still on screen during a page transition — pair with a leave hook that removes the wrapper shortly after. |

---

## Common recipes

### Fade-up on scroll with staggered children

```html
<div aa-animate="fade-up" aa-stagger="0.1">
  <div>One</div>
  <div>Two</div>
  <div>Three</div>
</div>
```

`aa-stagger` on a parent + direct children → children are individually staggered.

### Text characters fading in on load, desktop only

```html
<h1 aa-animate-md="text-fade-up" aa-split="chars" aa-stagger="0.03" aa-trigger="load-once">
  Headline
</h1>
```

`aa-animate-md` activates at `>= 768px`; below, no animation. `aa-trigger="load-once"` fires once per page session. For Next.js / SPAs where `init()` re-runs on every route change and you want the animation each time the user arrives, swap to `aa-trigger="load"`.

In line-grouped split modes (`aa-split="lines-chars"` / `"lines-words"`) `aa-stagger` accepts a second number for the per-line offset — `aa-stagger="0.02 0.2"` (chars 0.02s, lines 0.2s). Omit it and the line offset defaults to the `lines` stagger (`0.1`), independent of the unit.

### Hero animation on every Next.js route entry (back/forward nav)

```html
<h1 aa-animate="text-tilt-up" aa-trigger="load">Welcome</h1>
<a aa-animate="fade-up" aa-trigger="load">Get started</a>
```

In a Next.js App Router setup where `AlrdyInit` calls `destroy({ keepGlobals: true })` + `init()` on every `usePathname()` change, `load` fires the animation on the first paint AND on every subsequent route entry (including browser back/forward).

### Slider finite on desktop, draggable loop on mobile

```html
<div aa-slider="finite | draggable">
  <div aa-slider-item>...</div>
  <div aa-slider-item>...</div>
</div>
```

Pipe shorthand: **left of the pipe is desktop (`>= md`), right is mobile**. Here desktop gets a bounded, non-looping `finite` track; mobile gets the default infinite carousel with drag.

### Stacking cards with content that animates per-card

```html
<section
  aa-stack
  aa-stack-in="fade rotate"
  aa-stack-lock="bounce"
  aa-stack-out="perspective"
>
  <article aa-stack-card>
    <h2 aa-animate="fade-up">First card</h2>
    <p aa-animate="fade-up" aa-delay="0.15">Body copy fades up when the card enters.</p>
  </article>
  <article aa-stack-card>
    <h2 aa-animate="fade-up">Second card</h2>
    <p aa-animate="fade-up" aa-delay="0.15">Same animation, scoped to each card.</p>
  </article>
  <article aa-stack-card>
    <h2 aa-animate="fade-up">Third card</h2>
    <p aa-animate="fade-up" aa-delay="0.15">With perspective, the last card rises to cover the card behind it.</p>
  </article>
</section>
```

Each card is locked at `top: var(--aa-stack-top, 25vh)` via CSS sticky. The default is applied at zero specificity (via `:where()`), so any author class that sets `top` wins without `!important` — `.my-card { top: 6rem }` Just Works, including class-based styles authored in Webflow. The CSS variable (`style="--aa-stack-top: 6rem"`) is the no-CSS escape hatch. Children inside `[aa-stack-card]` inherit `event:card-active` automatically — they fade up at `aa-scroll-start` (default `top 85%`) and reverse on full exit (the same `again` reset as scroll-triggered animations elsewhere). `aa-stack` is a bare marker (the lifecycle is set via `aa-stack-in`/`-lock`/`-out`); add `aa-stack="|none"` to disable the JS below `md` — the in-card animations then fall back to scroll automatically. The CSS sticky is unconditional, so revert `position` yourself at that breakpoint.

**In-preset flags** (`aa-stack-in`): `fade` (completes at the *midpoint* of the entry travel — the card is fully opaque before it locks, while scale/rotation keep settling), `scale`, plus two parallel rotation families that share the same per-card curve but apply at different ends of the tween:

- `rotate` / `rotate-cw` / `rotate-ccw` — cards **arrive tilted**, settle flat at lock. Default = centred fan `(0°, -5°, +5°, -5°, +5°, …)`; `-cw` = clockwise ramp `(0°, +1°, +2°, +3°, …)`; `-ccw` = mirror.
- `tilt` / `tilt-cw` / `tilt-ccw` — cards **arrive flat**, build up to the same per-card curve by lock (Osmo splay-at-lock).

`none` skips. All six rotation flags are mutually exclusive — `tilt*` wins over `rotate*`, and within a family `*-cw`/`*-ccw` wins over the plain flag. Magnitudes scale with `aa-intensity`.

**Out-preset flags** (`aa-stack-out`): `fade`, `scale`, `perspective` (3D tilt-back), `blur`, `left`/`right`. The `perspective` and `blur` `y` lifts are a percentage of the card's own height (`7% × intensity` / `3.5% × intensity`, via `translateY(%)`) so the peek stays proportional across screen sizes — a fixed `rem` lift gets swallowed on tall cards because `scale: 0.92` pulls the top edge down by ~4% of height. The last card normally has no out animation, but with `perspective` it rises by *half* that lift (`3.5% × intensity` of its height) at the end of the stack to cover the receded card behind it (the last card's bottom margin is extended by that distance to supply the scroll runway).

### Page transition (Barba) leave hook

```js
// Inside Barba's leave hook, before the new container fades in:
AlrdyAnimate.destroy({ keepGlobals: true, keepFromStates: true })

// Inside Barba's enter hook, after the new container is in the DOM:
await AlrdyAnimate.init({ root: container, debug: false })
```

`keepGlobals: true` preserves Lenis and scroll observers across the navigation. `keepFromStates: true` keeps the leaving DOM frozen mid-animation instead of flashing to the visible state during the transition. See `docs/recipes/webflow-barba/` for the full lifecycle.

### Composite hover button (`aa-hover-trigger`)

Layer multiple hover effects on one button by putting `aa-hover-trigger` on the wrapper. Each child element keeps a single `aa-hover` effect with its own flags; all listen to the wrapper's mouseenter/leave via the trigger map. Per-element `aa-duration`/`aa-delay`/`aa-ease` keep timing independent so effects can sync or vary.

```html
<a aa-hover-trigger aa-hover="curve vertical" aa-color="#ef2528"
   aa-duration="0.5" aa-ease="power3.out">
  <span aa-hover="text" aa-color="#ffffff" aa-duration="0.5" aa-ease="power3.out">Click me</span>
  <span class="icon" aa-hover="icon-right reverse triple" aa-duration="0.55" aa-ease="power3.out">
    <svg viewBox="0 0 24 24" aria-hidden="true">…</svg>
  </span>
</a>
```

Hover anywhere on the link — even outside the icon or text — to fire all three effects from one event. For an underline + char-lift on the same word, nest two elements (no attribute composition needed):

```html
<a aa-hover-trigger>
  <span aa-hover="underline-in">
    <span aa-hover="text" aa-split="chars">Click me</span>
  </span>
</a>
```

Nested triggers: descendants belong to the innermost ancestor that carries `aa-hover-trigger`. If no `aa-hover-trigger` exists on the page, every `aa-hover` element is its own trigger.

### Custom event trigger

```html
<div aa-animate="fade-up" aa-trigger="event:reveal-me">…</div>
```

```js
document.querySelector('.trigger-button').addEventListener('click', () => {
  document.querySelector('[aa-trigger="event:reveal-me"]').dispatchEvent(
    new CustomEvent('aa:trigger', { detail: { name: 'reveal-me' }, bubbles: true })
  )
})
```

### Custom GSAP scripts alongside v8

When a Webflow / Next.js project loads alrdy-animate AND adds its own GSAP code (Osmo recipes, bespoke sliders, scroll-spy widgets), that custom code should reuse v8's detection + bus instead of duplicating it. Four interop primitives:

**1. Wait for ready, then run.** `init()` registers GSAP plugins, the named-ease CustomEase set, and detects motion / viewport state. Custom scripts that depend on any of those should await it:

```js
await AlrdyAnimate.ready()
// gsap, ScrollTrigger, SplitText (if loaded), CustomEase + named eases all registered
```

`ready()` resolves immediately if init has already completed. Each new `init()` / `refresh()` creates a fresh promise so re-inits can be awaited too.

**2. Read v8's detection state.** Don't re-call `window.matchMedia('(prefers-reduced-motion: reduce)')` or hardcode 768 as the mobile cutoff. Read `AlrdyAnimate.options` after ready:

```js
await AlrdyAnimate.ready()
const { reducedMotion, optimizeMobile, breakpoints, duration, ease } = AlrdyAnimate.options
const DURATION = reducedMotion ? 0.01 : duration
gsap.to(el, { duration: DURATION, ease })
```

Useful fields on `AlrdyAnimate.options`: `reducedMotion` (boolean, reflects active state), `optimizeMobile` (`true` / `'fade'` when viewport is below `breakpoints.md` and the option is enabled, else `false`), `breakpoints` (resolved pixel widths), and the lib defaults `duration`, `ease`, `intensity`, `scrollStart`, `scrollEnd`. The snapshot is updated on every `init()`/`refresh()`.

**3. Share the resize bus.** Don't attach a second `window.resize` listener — the lib already debounces one and refreshes ScrollTrigger. Subscribe to it:

```js
const off = AlrdyAnimate.onResize(() => myThing.remeasure(), { debounce: 150 })
// off() to unsubscribe
```

The bus runs in this order on every debounced resize: matchMedia re-evaluation → feature re-measure (marquee, slider, nav) → `ScrollTrigger.refresh()` → user-registered `onResize` callbacks.

**4. Use named eases as plain ease strings.** After `await ready()`, every named ease is registered globally on `gsap` via CustomEase. Just reference by name in any tween:

```js
gsap.to(el, { ease: 'smooth' })
```

Available names: `osmo`, `energy`, `smooth`, `punch`, `relaxed`, `jump`, `pop`, `elastic`, `anticipate`, `bounce`, `fade`. Canonical list lives in `src/core/named-eases.ts`.

**5. Reuse the named eases in plain CSS.** The companion stylesheet (`alrdy-animate/style`, imported for the FOUC guard) exports each CSS-expressible named ease as a `:root` custom property — usable in any CSS `transition`/`animation`, no JS needed:

```css
.button { transition: transform 0.4s var(--aa-ease-jump); }
```

| Variable | Value | | Variable | Value |
| --- | --- | --- | --- | --- |
| `--aa-ease-osmo` | `cubic-bezier(0.625, 0.05, 0, 1)` | | `--aa-ease-relaxed` | `cubic-bezier(0.7, 0, 0.3, 1)` |
| `--aa-ease-energy` | `cubic-bezier(0.32, 0.72, 0, 1)` | | `--aa-ease-jump` | `cubic-bezier(0.35, 1.5, 0.6, 1)` |
| `--aa-ease-smooth` | `cubic-bezier(0.38, 0.005, 0.215, 1)` | | `--aa-ease-pop` | `cubic-bezier(0.17, 0.67, 0.3, 1.33)` |
| `--aa-ease-punch` | `cubic-bezier(0.19, 1, 0.22, 1)` | | `--aa-ease-anticipate` | `cubic-bezier(0.8, -0.4, 0.5, 1)` |
| | | | `--aa-ease-fade` | `cubic-bezier(0.25, 0.1, 0.25, 1)` |

`elastic` and `bounce` are multi-segment curves with no `cubic-bezier()` equivalent, so they have **no CSS variable** — use them through GSAP (`aa-ease` / `ease`). And the GSAP names aren't CSS values: `transition: … osmo` won't work — in CSS always go through `var(--aa-ease-osmo)`. Canonical list lives in `src/css/alrdy-animate.css`.

**Worked example.** A "sticky features" pinned-scroll widget — written without v8-aware helpers vs. with them:

```js
// Without v8-aware helpers (duplicates detection, hardcodes ease + duration):
const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const DURATION = rm ? 0.01 : 0.75
const EASE = 'power4.inOut'
gsap.to(el, { clipPath: 'inset(0%)', duration: DURATION, ease: EASE })

// With v8-aware helpers (single source of truth):
await AlrdyAnimate.ready()
const { reducedMotion, duration } = AlrdyAnimate.options
gsap.to(el, { clipPath: 'inset(0%)', duration: reducedMotion ? 0.01 : duration, ease: 'smooth' })
```

---

## What's deferred / not supported

Don't suggest these — they aren't shipped in v8:

- **Accordion** — there is no dedicated `aa-accordion` feature. Use `aa-tabs` for the show-one-panel-at-a-time pattern (it handles the toggle/content pairing, ARIA state, and active-event triggering). When building one, structure each panel as `aa-tabs-content` (no vertical padding or border) wrapping an inner div that carries the spacing — see the tabs row in the feature table for why.
- **Pin** animations — to be rebuilt in v8.x.
- **Form-submit** feature — dropped, no production use.
- **Lazy-load image handler** — use native `loading="lazy"` instead.
- **CSS-only animations / `.in-view` IntersectionObserver** — every animation is GSAP-driven. The shipped CSS file carries split-utility classes, layout for the hover heads (`[aa-hover-bg]`, `[aa-hover-underline]`, `:where([aa-hover~="text"])`), structural marquee rules, the FOUC guard, the `lcp` `0.01` opacity floor, and a reduced-motion safety net. The slow-network fallback keyframe and the `html[aa-fallback]` / `html[aa-timeout]` reveal rules are **not** shipped here — they live only in the optional inline `<head>` snippet ([load-fallback recipe](https://animate.alrdy.de/recipes/load-fallback/)). The CSS import is **required** when using any hover head — drop the `import 'alrdy-animate/style'` (npm) or the `<link rel="stylesheet" href=".../alrdy-animate.css">` (CDN) and `block`/`curve`/`underline`/`underline-in`/`text` will render as unstyled spans / svgs.
- **Page transitions** are out of scope — `init/destroy/refresh` lifecycle hooks let users wire Barba (Webflow) or View Transitions (Next.js) themselves. See the recipes referenced above.

---

## Further reading

- Live docs with prose + interactive demos: https://animate.alrdy.de (or run `npm run docs:dev` locally on port 4321).
- One MDX page per animation lives under `docs/src/content/docs/animations/` (appear, components, text, hover, utilities).
- Per-attribute JSDoc lives in `alrdy-animate/jsx` (i.e. `src/types/jsx.d.ts`) — hover any `aa-*` attribute in your editor for the same content surfaced inline.
