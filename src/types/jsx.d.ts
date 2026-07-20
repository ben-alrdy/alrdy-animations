/**
 * Ambient JSX types for `aa-*` attributes. Import once anywhere that's
 * compiled — typically `types/global.d.ts` or the top of your root layout:
 *
 * ```ts
 * import 'alrdy-animate/jsx'
 * ```
 *
 * Every JSX intrinsic element then accepts the documented `aa-*` attributes
 * with autocomplete and on-hover JSDoc. The same attribute names are read at
 * runtime by `init()`; the JSDoc here is the authoritative reference for what
 * each value means.
 *
 * **Attribute-value syntax (every value-bearing attribute):**
 *
 * - **Dashes** join one concept (`fade-up`, `text-blur-up`, `hover-bg-block`).
 * - **Spaces** separate independent flags on the same attribute
 *   (`aa-split="lines mask"`, `aa-trigger="load event:enter"`).
 * - **Pipe `|`** is a 2-bucket responsive shorthand: `"DESKTOP | MOBILE"`.
 *   Left-of-pipe applies at `>= breakpoints.md` (default 768px), right applies
 *   below it. Example: `aa-animate="fade-up | fade"` runs `fade-up` on desktop,
 *   `fade` on mobile.
 * - **`-sm` / `-md` / `-lg` / `-xl` suffixes** override at the named breakpoint
 *   and up (Tailwind semantics). Default breakpoints: 480/768/992/1280px.
 * - **Value `none`** opts out at that breakpoint (e.g. `aa-slider="snap | none"`
 *   disables the slider on mobile entirely).
 */

declare namespace JSX {
  interface AlrdyAnimateAttributes {
    /**
     * Animation preset. The presence of this attribute is what makes an
     * element animate at all (the FOUC guard hides anything with `aa-animate`
     * until `init()` flips `aa-ready` on it).
     *
     * **Appear presets** (feature: `appear`):
     * `fade` | `fade-up` | `fade-down` | `fade-left` | `fade-right` |
     * `zoom-in` | `zoom-out` | `slide-up` | `slide-down` | `slide-left` |
     * `slide-right` | `blur` | `rotate-*` (rotate, rotate-up, rotate-up-tl/tr/bl/br, rotate-ccw variants)
     *
     * **Text presets** (feature: `text`, requires `SplitText`):
     * `text-fade` | `text-fade-30` | `text-fade-10` | `text-fade-up` |
     * `text-fade-down` | `text-fade-left` | `text-fade-right` | `text-blur` |
     * `text-blur-up` | `text-blur-down` | `text-blur-left` | `text-blur-right` |
     * `text-scale` | `text-scale-up` | `text-scale-down` | `text-slide-up` |
     * `text-slide-down` | `text-tilt-up` | `text-tilt-down` | `text-oval-up` |
     * `text-oval-down` | `text-rotate` | `text-wave` | `text-block-<dir>` |
     * `text-marker-<dir>`
     * (`<dir>` = `up`|`down`|`left`|`right`; the direction suffix is required).
     * Pair with `aa-split` to control granularity. `text-wave` is the
     * scroll-driven accent wave (needs `aa-color`) — see the `aa-color` docs.
     *
     * **Reveal presets** (feature: `reveal`): `reveal-up` | `reveal-down` |
     * `reveal-left` | `reveal-right` | `reveal-center` | `reveal-oval-up` |
     * `reveal-oval-down` — clip-path entrances.
     *
     * **Slices presets** (feature: `slices`): `slices` | `slices-up` |
     * `slices-down` | `slices-left` | `slices-right`. Shutter-style reveal
     * with N rows scaling away. The mode (`cover`) and row count (integer)
     * are space-separated flags on the same value, e.g.
     * `aa-animate="slices-right 12 cover"`.
     *
     * Combine with `aa-trigger`, `aa-duration`, `aa-delay`, `aa-ease`,
     * `aa-intensity`, `aa-stagger` to tune the playback. Use `none` at a
     * breakpoint to skip animating there.
     */
    'aa-animate'?: string
    /** Breakpoint variant of `aa-animate`. Activates at `>= breakpoints.sm` (default 480px). Same accepted values; use `none` to opt out. */
    'aa-animate-sm'?: string
    /** Breakpoint variant of `aa-animate`. Activates at `>= breakpoints.md` (default 768px). Same accepted values; use `none` to opt out. */
    'aa-animate-md'?: string
    /** Breakpoint variant of `aa-animate`. Activates at `>= breakpoints.lg` (default 992px). Same accepted values; use `none` to opt out. */
    'aa-animate-lg'?: string
    /** Breakpoint variant of `aa-animate`. Activates at `>= breakpoints.xl` (default 1280px). Same accepted values; use `none` to opt out. */
    'aa-animate-xl'?: string

    /**
     * What fires the animation. Values:
     *
     * - `scroll` (default if attribute is absent) — ScrollTrigger between
     *   `aa-scroll-start` and `aa-scroll-end`. Replays on re-enter unless
     *   `init({ again: false })`.
     * - `click` — element animates when clicked. The element itself becomes
     *   the click target.
     * - `load-once` — fires on the very first `init()` cycle of the page session.
     *   Subsequent `init()`s (e.g. after a Barba navigation) skip it. Use for
     *   page-transition flows where the leaving DOM is still on screen during
     *   the swap. Pair with the slow-network fallback recipe in
     *   `docs/recipes/load-fallback/`.
     * - `load` — fires on **every** `init()` cycle, including the first. Use
     *   in SPAs (Next.js App Router, etc.) where the same `AlrdyInit` component
     *   re-calls `init()` on route changes — `load` replays the entrance on
     *   each fresh route, including browser back/forward nav. Contrast with
     *   `load-once`, which only fires once per page session.
     * - `lcp` — like `load`, but optimised for the **Largest Contentful Paint**
     *   element (the hero's largest image/visual). The companion stylesheet
     *   paints it at first paint at a near-invisible `0.01` opacity — non-zero,
     *   so Chrome counts it as an LCP candidate *before* the JS bundle runs,
     *   instead of being hidden by the FOUC guard — then the entrance fades it
     *   to full. Use on a single above-the-fold element; pair with
     *   `fetchpriority="high"` / `loading="eager"` and keep the image in static
     *   HTML. Works with any opacity-bearing `aa-animate` (`fade`, `rotate*`,
     *   `blur`, `fade-up`…). Requires the updated inline `<head>` snippet (see
     *   `docs/installation/webflow/` and `docs/recipes/load-fallback/`).
     * - `event:<name>` — listens for `aa:trigger` custom events with
     *   `detail.name === '<name>'` dispatched on the element or any ancestor.
     *   Names ending in `-active` auto-pair with `-inactive` for reverse.
     *
     * **Multiple triggers** are space-separated, e.g.
     * `aa-trigger="load-once event:enter"` (load on first init, then re-fire on
     * `event:enter` thereafter). Use `load` alone for SPA route entry —
     * no need to pair with `load-once`.
     *
     * **Container inference** — if this attribute is omitted and the element is
     * inside `[aa-modal-name]`, `[aa-tabs-content]`, `[aa-tabs-visual]`,
     * `[aa-slider-item]`, or `[aa-stack-card]`, the trigger defaults to the
     * matching event (`event:modal-active` / `event:tab-active` /
     * `event:slide-active` / `event:card-active`). Set `aa-trigger="scroll"`
     * explicitly to opt out of inference. Inference is breakpoint-aware: when
     * the container's feature is disabled (`aa-tabs`/`aa-slider`/`aa-stack`
     * resolves to `none`) at the current breakpoint it emits no event, so the
     * inner animation falls back to scroll automatically.
     *
     * **Dispatching custom events** from your code:
     * `el.dispatchEvent(new CustomEvent('aa:trigger', { detail: { name: 'foo' }, bubbles: true }))`.
     */
    'aa-trigger'?: string
    /** Breakpoint variant of `aa-trigger`. Activates at `>= breakpoints.sm`. */
    'aa-trigger-sm'?: string
    /** Breakpoint variant of `aa-trigger`. Activates at `>= breakpoints.md`. */
    'aa-trigger-md'?: string
    /** Breakpoint variant of `aa-trigger`. Activates at `>= breakpoints.lg`. */
    'aa-trigger-lg'?: string
    /** Breakpoint variant of `aa-trigger`. Activates at `>= breakpoints.xl`. */
    'aa-trigger-xl'?: string

    /**
     * How to split text before animating. Values (space-separated; the first
     * token is the mode, remaining tokens are order-independent flags):
     *
     * - Mode: `chars` | `words` | `lines` | `lines-chars` | `lines-words`.
     * - `mask` (flag) — wrap each line in `overflow: clip` (typical for
     *   `text-slide-*` and `text-tilt-*`). Always line-level, never per-char or
     *   per-word — a per-unit mask would trap the moving unit.
     * - `index` (flag) — expose 1-based `--char` / `--word` / `--line` CSS
     *   custom properties on each split unit, so you can derive
     *   `transition-delay: calc((var(--char) - 1) * 0.024s)` for
     *   CSS-driven hover/load staggers without any JS.
     *
     * Examples: `aa-split="lines mask"`, `aa-split="chars"`,
     * `aa-split="chars index"`, `aa-split="lines-chars mask"`.
     *
     * Required by every `text-*` preset (feature: `text`, plugin: `SplitText`).
     * Also usable as a standalone utility on plain elements via the `split`
     * runtime — see `aa-split` docs for the standalone behaviour.
     */
    'aa-split'?: string
    /** Breakpoint variant of `aa-split`. Activates at `>= breakpoints.sm`. */
    'aa-split-sm'?: string
    /** Breakpoint variant of `aa-split`. Activates at `>= breakpoints.md`. */
    'aa-split-md'?: string
    /** Breakpoint variant of `aa-split`. Activates at `>= breakpoints.lg`. */
    'aa-split-lg'?: string
    /** Breakpoint variant of `aa-split`. Activates at `>= breakpoints.xl`. */
    'aa-split-xl'?: string

    /**
     * Per-step delay (seconds) when staggering across split units or direct
     * children. Negative values reverse the stagger order. If `aa-stagger` is
     * present without `aa-split` and the element has direct children, the
     * children are staggered.
     *
     * Defaults vary by split mode: chars `0.02`, words `0.05`, lines `0.1`,
     * default `0.1`. Override via `init({ stagger: { chars: 0.04 } })`.
     *
     * In line-grouped modes (`aa-split="lines-chars"` / `"lines-words"`) a
     * second number sets the per-line offset — `aa-stagger="0.02 0.2"`. Omit it
     * and the line offset defaults to the `lines` stagger (`0.1`), independent
     * of the unit. Origin/random/grid flags apply only to the unit stagger.
     */
    'aa-stagger'?: string | number
    /** Breakpoint variant of `aa-stagger`. Activates at `>= breakpoints.sm`. */
    'aa-stagger-sm'?: string | number
    /** Breakpoint variant of `aa-stagger`. Activates at `>= breakpoints.md`. */
    'aa-stagger-md'?: string | number
    /** Breakpoint variant of `aa-stagger`. Activates at `>= breakpoints.lg`. */
    'aa-stagger-lg'?: string | number
    /** Breakpoint variant of `aa-stagger`. Activates at `>= breakpoints.xl`. */
    'aa-stagger-xl'?: string | number

    /** Tween duration in seconds. Overrides `init({ duration })` (default `0.6`) for this element. */
    'aa-duration'?: string | number
    /** Breakpoint variant of `aa-duration`. Activates at `>= breakpoints.sm`. */
    'aa-duration-sm'?: string | number
    /** Breakpoint variant of `aa-duration`. Activates at `>= breakpoints.md`. */
    'aa-duration-md'?: string | number
    /** Breakpoint variant of `aa-duration`. Activates at `>= breakpoints.lg`. */
    'aa-duration-lg'?: string | number
    /** Breakpoint variant of `aa-duration`. Activates at `>= breakpoints.xl`. */
    'aa-duration-xl'?: string | number

    /** Delay in seconds before the tween starts. Default `0`. Combines additively with stagger. */
    'aa-delay'?: string | number
    /** Breakpoint variant of `aa-delay`. Activates at `>= breakpoints.sm`. */
    'aa-delay-sm'?: string | number
    /** Breakpoint variant of `aa-delay`. Activates at `>= breakpoints.md`. */
    'aa-delay-md'?: string | number
    /** Breakpoint variant of `aa-delay`. Activates at `>= breakpoints.lg`. */
    'aa-delay-lg'?: string | number
    /** Breakpoint variant of `aa-delay`. Activates at `>= breakpoints.xl`. */
    'aa-delay-xl'?: string | number

    /**
     * Ease curve. Accepts any GSAP ease string (`"power2.out"`, `"expo.inOut"`,
     * `"back.out(1.7)"`) or one of the named eases registered by the lib via
     * `CustomEase`: `osmo` | `energy` | `smooth` | `punch` | `relaxed` |
     * `jump` | `pop` | `elastic` | `anticipate` | `bounce` | `fade`.
     * Overrides `init({ ease })` (default `"power4.out"`).
     */
    'aa-ease'?: string
    /** Breakpoint variant of `aa-ease`. Activates at `>= breakpoints.sm`. */
    'aa-ease-sm'?: string
    /** Breakpoint variant of `aa-ease`. Activates at `>= breakpoints.md`. */
    'aa-ease-md'?: string
    /** Breakpoint variant of `aa-ease`. Activates at `>= breakpoints.lg`. */
    'aa-ease-lg'?: string
    /** Breakpoint variant of `aa-ease`. Activates at `>= breakpoints.xl`. */
    'aa-ease-xl'?: string

    /**
     * Intensity multiplier — `1` reproduces the design baseline for every
     * feature that reads this attribute; `2` doubles the effect, `0.5` halves
     * it. Applied to:
     *
     * - **fade-\* / rotate-up translate** — baseline `2rem` (scales with root
     *   font-size, so projects that override `:root { font-size }` per breakpoint
     *   keep visual proportion).
     * - **rotate** — baseline `5°` angle.
     * - **slide-\* translate** — baseline `100%` of the element's own size
     *   (element-relative; scales with element size, not root font-size — that's
     *   what keeps `slide-*` visually distinct from `fade-*`).
     * - **text-blur (all directions)** — baseline `2rem` per-char offset
     *   (root-font-size relative). No line mask — characters drift on the named axis.
     * - **text-slide / text-tilt / text-rotate** — baseline `110%` of the line
     *   height (line-mask reveal, element-relative).
     * - **text-fade directional** — baseline `60%` of the split unit (element-relative).
     * - **parallax / parallax-horizontal** — baseline `±10%` of the parallax range
     *   (viewport-relative).
     * - **stack** — scales rotation angles, scale offsets, blur radius, and
     *   translate distance baked into each preset.
     * - **hover-icon trail** — multiplies the 50ms gap between successive icons.
     * - **nav** — multiplies the internal `-150%` hide-translate (default 1
     *   already clears drop-shadows; raise to clear deeper ones).
     * - **marquee scrub** — multiplies the internal `±10vw` sweep (viewport-relative).
     * - **tabs scroll-pin** — multiplies the internal `30vh` per-tab range.
     *
     * **Rem caveat**: GSAP resolves `rem` to `px` once at tween creation. The
     * lib rebuilds tweens on breakpoint changes (via `gsap.matchMedia`), so
     * breakpoint-stepped root font-sizes are picked up automatically. A fluid
     * `clamp()` on `:root` locks in at breakpoint entry — animations won't
     * track a continuous root resize within a single breakpoint.
     *
     * Overrides `init({ intensity })`. Default `1`.
     */
    'aa-intensity'?: string | number
    /** Breakpoint variant of `aa-intensity`. Activates at `>= breakpoints.sm`. */
    'aa-intensity-sm'?: string | number
    /** Breakpoint variant of `aa-intensity`. Activates at `>= breakpoints.md`. */
    'aa-intensity-md'?: string | number
    /** Breakpoint variant of `aa-intensity`. Activates at `>= breakpoints.lg`. */
    'aa-intensity-lg'?: string | number
    /** Breakpoint variant of `aa-intensity`. Activates at `>= breakpoints.xl`. */
    'aa-intensity-xl'?: string | number

    /**
     * ScrollTrigger `start`. Standard GSAP syntax — `"top 80%"`, `"center 50%"`,
     * `"top top"`. Default `init({ scrollStart })` is `"top 85%"`.
     */
    'aa-scroll-start'?: string
    /** Breakpoint variant of `aa-scroll-start`. Activates at `>= breakpoints.sm`. */
    'aa-scroll-start-sm'?: string
    /** Breakpoint variant of `aa-scroll-start`. Activates at `>= breakpoints.md`. */
    'aa-scroll-start-md'?: string
    /** Breakpoint variant of `aa-scroll-start`. Activates at `>= breakpoints.lg`. */
    'aa-scroll-start-lg'?: string
    /** Breakpoint variant of `aa-scroll-start`. Activates at `>= breakpoints.xl`. */
    'aa-scroll-start-xl'?: string

    /**
     * ScrollTrigger `end`. Only used when `aa-scrub` is set — scrubbed
     * animations need a start AND end to map progress onto. Non-scrubbed
     * animations ignore this; they fire on enter and (with `init({ again })`)
     * reset once the element fully leaves the viewport, computed dynamically.
     * Default `init({ scrollEnd })` is `"bottom 60%"`.
     */
    'aa-scroll-end'?: string
    /** Breakpoint variant of `aa-scroll-end`. Activates at `>= breakpoints.sm`. */
    'aa-scroll-end-sm'?: string
    /** Breakpoint variant of `aa-scroll-end`. Activates at `>= breakpoints.md`. */
    'aa-scroll-end-md'?: string
    /** Breakpoint variant of `aa-scroll-end`. Activates at `>= breakpoints.lg`. */
    'aa-scroll-end-lg'?: string
    /** Breakpoint variant of `aa-scroll-end`. Activates at `>= breakpoints.xl`. */
    'aa-scroll-end-xl'?: string

    /**
     * Scrub the animation to scroll position. Accepts a number (smoothing
     * factor in seconds — `0.5` is a typical scrub) or `true` for instant
     * (no smoothing). When set, the animation plays between `aa-scroll-start`
     * and `aa-scroll-end` instead of firing once at the start.
     */
    'aa-scrub'?: string | number

    /**
     * CSS selector for the element whose viewport position drives this
     * animation's ScrollTrigger. Defaults to the animated element itself —
     * use this to anchor a deep-nested element to the section/wrapper that
     * actually defines the scroll moment.
     */
    'aa-anchor'?: string

    /**
     * Per-element override of the global `init({ again })` scroll-replay
     * default. `aa-again="false"` makes a scroll-triggered animation play once
     * and stay finished — it won't reset/replay when the element re-enters the
     * viewport; `aa-again="true"` forces replay even when the global default is
     * off. Only affects scroll-triggered animations (`appear` / `text` /
     * `reveal`); `load` / `event` / `scrub` animations ignore it. Handy for
     * animated content inside a slider/carousel that shouldn't re-fire as the
     * section scrolls past. Supports the `|` and `-sm/-md/-lg/-xl` responsive
     * forms like other value-bearing attributes.
     */
    'aa-again'?: string

    /**
     * Parallax start depth. Numeric multiplier, no unit. `0` = element doesn't
     * move (locked to viewport scroll); `1` = element moves at scroll speed
     * (i.e. no parallax); `0.5` = element moves at half speed (lags behind);
     * `-0.5` = element moves opposite the scroll direction. Pairs with
     * `aa-parallax-end` to define the depth across the scroll range.
     * Feature: `parallax`, plugin: `ScrollTrigger`.
     */
    'aa-parallax-start'?: string | number
    /** Parallax end depth. See `aa-parallax-start` for the value meaning. */
    'aa-parallax-end'?: string | number

    /**
     * Autoplay configuration for `aa-slider`, `aa-tabs`, and `aa-marquee`.
     * Presence of the attribute enables auto-motion. Values:
     *
     * - `<seconds>` — interval between auto-advances for slider/tabs, or the
     *   seconds-per-cycle duration for marquee (e.g. `"3"`).
     * - `<seconds> hover-pause` — pause on pointer hover/focus
     *   (e.g. `"3 hover-pause"`).
     * - `hover-slow` — (marquee only) ramp the loop down to 15% speed on hover.
     * - `none` — opt out at this breakpoint (e.g. `"4|none"`).
     * - `true` / `false` (boolean form in JSX) — use `init({ autoplay })`
     *   defaults; `false` disables autoplay even if a default is set.
     *
     * Slider/tabs default interval from `init({ autoplay })`:
     * `{ interval: 4, hoverPause: false }`. Marquee defaults to `40`s per cycle
     * and is **static** when `aa-autoplay` is absent (scrub may still apply).
     */
    'aa-autoplay'?: string | boolean | number
    /** Breakpoint variant of `aa-autoplay`. Activates at `>= breakpoints.sm`. */
    'aa-autoplay-sm'?: string | number
    /** Breakpoint variant of `aa-autoplay`. Activates at `>= breakpoints.md`. */
    'aa-autoplay-md'?: string | number
    /** Breakpoint variant of `aa-autoplay`. Activates at `>= breakpoints.lg`. */
    'aa-autoplay-lg'?: string | number
    /** Breakpoint variant of `aa-autoplay`. Activates at `>= breakpoints.xl`. */
    'aa-autoplay-xl'?: string | number

    /**
     * Marker for tabs containers. Place on the wrapper holding both toggles
     * and content panels. Toggles inside this wrapper get their `data-state`
     * managed automatically. Feature: `tabs`. Pair with `aa-tabs-toggle`,
     * `aa-tabs-content`, optionally `aa-tabs-visual`, `aa-tabs-progress`,
     * `aa-tabs-status`, `aa-tabs-initial`, and `aa-autoplay` for auto-rotate.
     */
    'aa-tabs'?: string | boolean
    /** Breakpoint variant of `aa-tabs`. Activates at `>= breakpoints.sm`. Use `none` to disable tabs at this breakpoint. */
    'aa-tabs-sm'?: string
    /** Breakpoint variant of `aa-tabs`. Activates at `>= breakpoints.md`. Use `none` to disable tabs at this breakpoint. */
    'aa-tabs-md'?: string
    /** Breakpoint variant of `aa-tabs`. Activates at `>= breakpoints.lg`. Use `none` to disable tabs at this breakpoint. */
    'aa-tabs-lg'?: string
    /** Breakpoint variant of `aa-tabs`. Activates at `>= breakpoints.xl`. Use `none` to disable tabs at this breakpoint. */
    'aa-tabs-xl'?: string
    /** Marker on each tab button/toggle inside an `[aa-tabs]` wrapper. The value matches the corresponding `aa-tabs-content` to pair them. */
    'aa-tabs-toggle'?: string
    /** Marker on each tab content panel. Value matches the paired `aa-tabs-toggle`. Animations inside default to `aa-trigger="event:tab-active"`. */
    'aa-tabs-content'?: string
    /** Marker on a per-tab visual (image, illustration). Animations inside default to `aa-trigger="event:tab-active"` like content panels. */
    'aa-tabs-visual'?: string
    /** Optional outer wrapper marker; lets the feature scope its query to a section when multiple tab groups share a page. */
    'aa-tabs-wrapper'?: string | boolean
    /** Marker on a progress-bar element inside the tabs wrapper. Drives a width animation tied to the autoplay interval. */
    'aa-tabs-progress'?: string | boolean
    /** Output: the feature writes the current tab name onto this element's `textContent` for screen-reader-friendly status. */
    'aa-tabs-status'?: string
    /** Which tab is active on first render. Match the value of one of the `aa-tabs-toggle` entries. Omit to start with the first tab. */
    'aa-tabs-initial'?: string | boolean

    /**
     * Marker on the marquee viewport (apply `overflow: hidden`). Value tokens
     * are space-separated and order-independent: `right` (reverse direction),
     * `switch` (flip direction while scrolling up), `draggable`, `none` (skip
     * init at this breakpoint). Auto-motion is controlled by `aa-autoplay`
     * (like slider/tabs): add `aa-autoplay` to make the row loop (value = cycle
     * seconds, default `40`; tokens `hover-pause`, `hover-slow`); with no
     * `aa-autoplay` the marquee is static (but `aa-scrub` may still apply).
     * Add `aa-scrub` on the root to layer a scroll-driven horizontal sweep on
     * top of the loop — the sweep travel (in vw) is authored on the optional
     * `[aa-marquee-scroller]` wrapper. Required children:
     * `[aa-marquee-track]` > `[aa-marquee-list]`; wrap the track in
     * `[aa-marquee-scroller]` only when scrubbing. Feature: `marquee`.
     * Plugins: `ScrollTrigger`, plus `Draggable` + `InertiaPlugin` when
     * `draggable` is set.
     */
    'aa-marquee'?: string | boolean
    /**
     * Optional wrapper around `[aa-marquee-track]`, needed only when the root
     * carries `aa-scrub`. Its value is the scroll-driven sweep travel as a
     * **percent of the marquee's own width**: `aa-marquee-scroller="30"` → ±30%
     * per side (default `20` → ±20%). Width-relative (not viewport-relative), so
     * the sweep feels the same regardless of browser width. Composes with the
     * infinite loop on the track below it. Supports the `|` and `-sm/-md/-lg/-xl`
     * responsive forms (e.g. `"20|10"` = 20% desktop, 10% mobile). Omit the
     * wrapper entirely for a non-scrubbing marquee.
     */
    'aa-marquee-scroller'?: string | boolean
    /**
     * Marker on the infinite-loop layer (child of `[aa-marquee]`, or of
     * `[aa-marquee-scroller]` when scrubbing). The lib clones `[aa-marquee-list]`
     * into this element until the row fills the viewport, then drives the
     * looping translate on it. Author one list inside; the clones
     * (`aa-marquee-clone`) appear at runtime.
     */
    'aa-marquee-track'?: string | boolean
    /**
     * Marker on the authored cluster of items (child of `[aa-marquee-track]`).
     * This is the repeating unit — items inside it carry the spacing (use
     * `margin`, not `gap`), and the lib clones the whole list to fill the
     * viewport. The lib measures `scrollWidth` here to compute the seam.
     */
    'aa-marquee-list'?: string | boolean

    /**
     * Marker for scroll-spy navigation containers. Feature: `nav`.
     * Plugins: `ScrollTrigger`, `Flip`. Pair with `aa-nav-section` markers on
     * each navigable section, `aa-nav-current-indicator` / `aa-nav-hover-indicator`
     * for the moving highlight pill, and `aa-scroll-target` on links to enable
     * smooth-scroll-to-anchor.
     */
    'aa-nav'?: string | boolean
    /** Marker on each scroll-target section. Value matches the link's `aa-scroll-target` (or `href` anchor) to pair them. */
    'aa-nav-section'?: string
    /** Marker on the element that animates between active links via Flip. */
    'aa-nav-current-indicator'?: string | boolean
    /** Marker on the optional hover indicator element. Animates between hovered links. */
    'aa-nav-hover-indicator'?: string | boolean
    /**
     * On a link or button, value is the `aa-nav-section` value (or selector)
     * to scroll to. Wires Lenis (when active) for smoothed scroll-to-anchor.
     */
    'aa-scroll-target'?: string
    /**
     * Pixel offset applied to an `[aa-scroll-target]` link's target position.
     * Negative pulls the target above the viewport edge (useful when a fixed
     * header would otherwise overlap the anchor). Honoured by both Lenis and
     * the native `scrollTo` fallback. Default `0`.
     */
    'aa-scroll-offset'?: string | number

    /**
     * Marker for slider containers. Value carries optional flags (space-separated):
     * `draggable` | `center` | `finite` | `none`. The carousel loops infinitely
     * by default; `finite` makes it a bounded, non-looping track (nav clamps at
     * the ends, drag is bounded, autoplay rewinds to the first slide).
     * Feature: `slider`. Plugins: `Draggable`, `InertiaPlugin`. Pair with
     * `aa-slider-item` on each slide, optional `aa-slider-prev` / `aa-slider-next`
     * buttons, and `aa-autoplay` for auto-advance.
     */
    'aa-slider'?: string | boolean
    /** Marker on each slide. Animations inside default to `aa-trigger="event:slide-active"`. */
    'aa-slider-item'?: string | boolean
    /** Marker on the previous-slide button. Click handler is wired automatically. */
    'aa-slider-prev'?: string | boolean
    /** Marker on the next-slide button. Click handler is wired automatically. */
    'aa-slider-next'?: string | boolean
    /** Marker on dot/index navigation buttons. Value identifies which slide they jump to. */
    'aa-slider-button'?: string

    /**
     * Required outer container for a modal group — the element the `modal`
     * feature scans and operates on. Wraps the modal card(s) and the backdrop.
     * No GSAP plugin required.
     */
    'aa-modal-group'?: string | boolean
    /**
     * Marker on a modal card inside `[aa-modal-group]`. The attribute value is
     * the modal's name — `aa-modal-name="signup"`. Triggers (`aa-modal-target`,
     * `aa-modal-close`) reference this name. Feature: `modal`.
     */
    'aa-modal-name'?: string
    /** On a button/link, the `aa-modal-name` of the modal to open. */
    'aa-modal-target'?: string
    /** Marker on a close button. Closes the nearest enclosing modal (or the named one if value is given). */
    'aa-modal-close'?: string | boolean
    /** Marker on the modal backdrop element. Click on the backdrop closes the modal. */
    'aa-modal-backdrop'?: string | boolean
    /** Written by the lib on each `[aa-modal-name]` card: `"active"` | `"not-active"`. Read-only. */
    'aa-modal-status'?: string
    /** Written by the lib on the `[aa-modal-group]` container: `"active"` | `"not-active"`. Read-only. */
    'aa-modal-group-status'?: string

    /**
     * Hover animation preset. Space-separated `head flag1 flag2 …`. Skipped on
     * touch-only devices (via `(hover: hover)` media query) so it never gets
     * stuck on tap.
     *
     * **Background fills** (inject a layer behind the host's content):
     *
     * - `block` — solid panel slides in from the cursor's entry edge.
     * - `curve` — same idea, leading edge is a soft curved wave.
     *
     *   Flags: `all` (default — closest of 4 edges), `vertical` / `horizontal`,
     *   or one of `top`/`bottom`/`left`/`right` to force.
     *
     * **Icon swap** (clones a descendant `<svg>` through a clip box):
     *
     * - `icon-<dir>` where `<dir>` is `up`, `down`, `left`, `right`,
     *   `up-right`, `up-left`, `down-right`, `down-left`. Original slides
     *   off; clone enters from the opposite side.
     *
     *   Flags: `reverse` (re-reverse on leave instead of one-shot),
     *   `triple` (two clones for a longer trail).
     *
     * **Underline** (injects a bar at the host's bottom edge — queue-up
     * interrupt model: full IN completes before OUT on quick flicks):
     *
     * - `underline-in` — no underline by default; sweeps in left → right on
     *   hover, retracts right-ward on leave.
     * - `underline` — underline always present; on hover the bar collapses
     *   toward the right edge then re-grows from the left in a two-phase
     *   sweep, ending in the same visible state. On `(hover: none)` devices the
     *   hover feature is skipped, so a static native `text-decoration` underline
     *   is painted via CSS instead (honouring `--aa-hover-underline-thickness`;
     *   offset is the browser default) so the link still reads as a link.
     *   `underline-in` gets no such fallback — its rest state is intentionally
     *   line-less.
     *
     *   CSS variables: `--aa-hover-underline-thickness` (default `0.0625em`),
     *   `--aa-hover-underline-offset` (default `0`; auto-set to `0.05em` on
     *   every `<p>` so inline links clear deep descenders. Positive pushes
     *   the bar further below the text, negative pulls it up into the host's
     *   content box).
     *
     * **Text** (char/word lift with `text-shadow` filling the original
     * position — uses `clip-path` for visual clipping, no overflow mutation):
     *
     * - `text` — one-shot scroll: chars tween up, instant invisible reset on
     *   completion. Each hover replays. Stateless.
     * - `text reverse` — stay-until-leave: chars stay up while hovered;
     *   mouseleave plays reverse. Queue-up interrupt model.
     *
     *   Pair with `aa-split="chars"` (default), `"words"`, or `"lines"` to
     *   pick the granularity — `lines` lifts the whole label as a single
     *   block (companion CSS enforces `white-space: nowrap` on text-hover
     *   hosts so multi-word labels stay on one line). Pair with `aa-stagger`
     *   for per-unit lag (no effect with `lines`, since there's only one unit).
     *   CSS variables: `--aa-hover-text-shift` (default `1.1em`),
     *   `--aa-hover-text-clip` (default `inset(0% 0% -15%)`).
     *   Requires GSAP `SplitText`.
     *
     * Pair with `aa-color` to override the bar/panel/text-shadow color
     * (default `currentColor`). Combine effects via [[aa-hover-trigger]] on a
     * wrapper. Feature: `hover`.
     */
    'aa-hover'?: string
    /** Breakpoint variant of `aa-hover`. Activates at `>= breakpoints.sm`. */
    'aa-hover-sm'?: string
    /** Breakpoint variant of `aa-hover`. Activates at `>= breakpoints.md`. */
    'aa-hover-md'?: string
    /** Breakpoint variant of `aa-hover`. Activates at `>= breakpoints.lg`. */
    'aa-hover-lg'?: string
    /** Breakpoint variant of `aa-hover`. Activates at `>= breakpoints.xl`. */
    'aa-hover-xl'?: string
    /**
     * Marker attribute on a wrapper element. Any descendant with `aa-hover`
     * binds its mouseenter/mouseleave to **this** wrapper, not its own host —
     * letting you build composite buttons where the background, icon, and
     * text each carry a single `aa-hover` effect but all fire from one shared
     * hover region.
     *
     * Each effect still runs against its own host element (DOM injection,
     * style scope) — only the event source changes. Per-element timing
     * attributes (`aa-duration`/`aa-delay`/`aa-ease`) stay independent so you
     * can make different effects sync or vary.
     *
     * If no `aa-hover-trigger` exists on the page, every `aa-hover` element is
     * its own trigger (current behavior preserved).
     *
     * Nested triggers: descendants belong to the innermost ancestor that
     * carries `aa-hover-trigger`.
     */
    'aa-hover-trigger'?: string | boolean
    /**
     * Accent / target color. Any CSS color (`#ff0033`, `rgb(...)`, named) or a
     * `--custom-prop` name (resolved against the element). Read by three
     * features:
     *
     * - **hover** — color the element fades to on hover; on its own or with
     *   `aa-hover` for combined direction-aware bg + colorize.
     * - **text `text-fade*` / `text-blur*` / `text-scale*`** — enables an accent
     *   color *pulse*: each character rests in its base color, then as it
     *   animates in it pulses through this accent (base → accent → brief hold →
     *   base). The pulse lingers past the entry, so the per-character stagger
     *   trails the accent as a gradient wave. Add `aa-scrub` to tie it to scroll
     *   position; `text-fade-30` / `text-fade-10` give the dim-to-bright look.
     * - **text `text-wave`** — *required* here: the accent the scroll-driven
     *   wave sweeps through. `text-wave` is a distinct engine (scroll sets how
     *   many chars are active; each activation fires a wall-clock accent pulse
     *   forward only) so the accent band widens with scroll speed, the base
     *   color catches up when you stop, and scrolling back up shows no accent.
     * - **text `text-block-*` / `text-marker-*`** — sets the reveal bar color.
     *
     * **Icon-hover caveat:** for the `icon-<dir>` head, `aa-color` sets `color`
     * on the clone — which only paints SVG `<path>` elements that use
     * `fill="currentColor"` / `stroke="currentColor"`. SVGs with literal
     * `fill="#000"` / `stroke="#000"` in their markup will not change colour;
     * patch the SVG to use `currentColor` for the override to take effect.
     */
    'aa-color'?: string
    /** Breakpoint variant of `aa-color`. Activates at `>= breakpoints.sm`. */
    'aa-color-sm'?: string
    /** Breakpoint variant of `aa-color`. Activates at `>= breakpoints.md`. */
    'aa-color-md'?: string
    /** Breakpoint variant of `aa-color`. Activates at `>= breakpoints.lg`. */
    'aa-color-lg'?: string
    /** Breakpoint variant of `aa-color`. Activates at `>= breakpoints.xl`. */
    'aa-color-xl'?: string

    /**
     * Custom cursor style. Place on a single element near `<body>` (typically
     * a `position: fixed` div). Values are space-separated style flags read by
     * the cursor module (e.g. `"follow"`, `"dot"`). Feature: `cursor`. No GSAP
     * plugin required. Use `aa-cursor-trigger` on hover targets to toggle
     * states, and `aa-cursor-*` (any suffix) for arbitrary CSS-driven variants.
     */
    'aa-cursor'?: string | boolean
    /**
     * Marker on hover targets that should change the cursor's style. The value
     * names a state the cursor module reads from `aa-cursor-<state>` styles.
     */
    'aa-cursor-trigger'?: string | boolean
    /**
     * Offset of the cursor element relative to the mouse, in percent of the
     * cursor element's own width/height. Two space-separated numbers: `"x y"`.
     * Place on the `[aa-cursor]` element. Default `"6 -140"` — cursor sits
     * slightly to the right of the mouse and 140% above it (bottom edge at
     * mouse). Examples: `"-50 -50"` (centered on mouse), `"0 0"` (top-left
     * corner at mouse), `"-100 -100"` (bottom-right corner at mouse).
     * Near the right/bottom viewport edge the cursor flips to fixed safe
     * offsets so it never clips off-screen.
     */
    'aa-cursor-offset'?: string
    /**
     * Catch-all for custom cursor state attributes. The cursor module reads
     * the suffix and toggles it on the cursor element when triggered.
     * Examples: `aa-cursor-link`, `aa-cursor-drag`, `aa-cursor-text`.
     */
    [key: `aa-cursor-${string}`]: string | boolean | undefined

    /**
     * IntersectionObserver-driven play/pause for any CSS animations on direct
     * children. Add to a marquee track or any always-running animation
     * container so off-screen elements don't waste CPU. No value needed —
     * presence is the marker. Requires `init({ scrollState: true })`
     * (the default).
     */
    'aa-toggle-playstate'?: string | boolean

    /**
     * Marker for stacking-card containers. Cards inside this element stick at
     * the top of the viewport (via CSS `position: sticky`) and stack on top of
     * each other as the page scrolls. Each card emits `card-active` /
     * `card-inactive` events when it crosses `aa-scroll-start` / fully leaves
     * the viewport, so `aa-animate` elements inside a card auto-fire on entry
     * and reverse on full exit — same trigger inference as slider/tabs/modal.
     *
     * `aa-stack` is a bare marker — the lifecycle is set via the `aa-stack-*`
     * attributes below; you don't pass a value. Use `none` (typically via the
     * `\|` shorthand, e.g. `aa-stack="|none"`, or a `-sm` / `-md` / `-lg` /
     * `-xl` suffix) to disable the JS at a breakpoint; the in-card animations
     * then fall back to scroll automatically. The CSS `position: sticky` is
     * unconditional, so revert `position` yourself at that breakpoint. Pair with
     * `aa-stack-card` on each card, optional `aa-stack-in` / `aa-stack-lock` /
     * `aa-stack-out` for the lifecycle animations, and `aa-intensity` /
     * `aa-scroll-start` to tune intensity and inner-content trigger. The
     * visual in/out tweens are always direct scroll-locked — `aa-scrub` is
     * not honoured (the card position is sticky-CSS, so smoothing only the
     * transform layer would desync). Feature: `stack`. Plugins: `ScrollTrigger`.
     */
    'aa-stack'?: string | boolean
    /** Breakpoint variant of `aa-stack`. Activates at `>= breakpoints.sm`. Use `none` to disable at this breakpoint. */
    'aa-stack-sm'?: string
    /** Breakpoint variant of `aa-stack`. Activates at `>= breakpoints.md`. Use `none` to disable at this breakpoint. */
    'aa-stack-md'?: string
    /** Breakpoint variant of `aa-stack`. Activates at `>= breakpoints.lg`. Use `none` to disable at this breakpoint. */
    'aa-stack-lg'?: string
    /** Breakpoint variant of `aa-stack`. Activates at `>= breakpoints.xl`. Use `none` to disable at this breakpoint. */
    'aa-stack-xl'?: string

    /**
     * Marker on each card inside `[aa-stack]`. The shipped stylesheet applies
     * `position: sticky; top: var(--aa-stack-top, 25vh)` at zero specificity
     * (via `:where()`), so any author class that sets `top` wins without
     * `!important`. Use regular CSS (`.my-card { top: 6rem }`) or the CSS
     * variable (`style="--aa-stack-top: 6rem"`) to override. Animations
     * inside default to `aa-trigger="event:card-active"`.
     */
    'aa-stack-card'?: string | boolean

    /**
     * Scrubbed entry animation for stack cards, played as the card scrolls
     * from `top bottom` (card top at viewport bottom) toward its sticky lock
     * position. Flags are space-separated and compose:
     *
     * - `fade` — opacity 0 → 1, completing at the *midpoint* of the entry
     *   travel (the card is fully opaque before it locks; scale / rotation
     *   keep settling to lock)
     * - `scale` — scale `1 - 0.2 * aa-intensity` → 1 (e.g. 0.8 → 1 at intensity=1)
     * - `rotate` — cards **arrive tilted** and **settle flat**: centred fan
     *   `(0°, -5°, +5°, -5°, +5°, …)` × `aa-intensity` → 0°. First card stays
     *   flat; later cards alternate sides.
     * - `rotate-cw` — incremental clockwise ramp as from-state, settles flat:
     *   `(0°, +1°, +2°, +3°, …)` × `aa-intensity` → 0°. First card flat; each
     *   subsequent card arrives one more degree clockwise.
     * - `rotate-ccw` — mirror of `rotate-cw`: `(0°, -1°, -2°, -3°, …)` ×
     *   `aa-intensity` → 0°.
     * - `tilt` — inverse of `rotate`: cards **arrive flat** and **build up
     *   rotation** by lock, settling into a centred fan
     *   `(0°, -5°, +5°, -5°, +5°, …)` × `aa-intensity`. First card stays flat.
     * - `tilt-cw` — inverse of `rotate-cw`: arrives flat, locks into the
     *   clockwise ramp `(0°, +1°, +2°, +3°, …)` × `aa-intensity`.
     * - `tilt-ccw` — mirror of `tilt-cw`: `(0°, -1°, -2°, -3°, …)` ×
     *   `aa-intensity`.
     * - `none` — no entry animation
     *
     * The six rotation-touching flags all control the same property and are
     * mutually exclusive. If multiple are listed, `tilt*` wins over `rotate*`
     * (the lock-state value overrides the settle-flat reset), and within each
     * family directional variants win over the default (`*-cw`/`*-ccw` over
     * the plain flag).
     *
     * Example: `aa-stack-in="fade tilt-cw"`.
     */
    'aa-stack-in'?: string
    /** Breakpoint variant of `aa-stack-in`. Activates at `>= breakpoints.sm`. */
    'aa-stack-in-sm'?: string
    /** Breakpoint variant of `aa-stack-in`. Activates at `>= breakpoints.md`. */
    'aa-stack-in-md'?: string
    /** Breakpoint variant of `aa-stack-in`. Activates at `>= breakpoints.lg`. */
    'aa-stack-in-lg'?: string
    /** Breakpoint variant of `aa-stack-in`. Activates at `>= breakpoints.xl`. */
    'aa-stack-in-xl'?: string

    /**
     * Discrete one-shot animation played the moment a card reaches its sticky
     * lock position. Flags are space-separated (typically one):
     *
     * - `bounce` — Osmo-style stretch + elastic settle (`scaleX/Y` pulse)
     * - `pulse` — quick `scale: 1 → 1.03 → 1` with a back ease
     * - `none` — no lock animation (the `card-active` event still fires)
     *
     * Skipped under `(prefers-reduced-motion: reduce)`.
     */
    'aa-stack-lock'?: string
    /** Breakpoint variant of `aa-stack-lock`. Activates at `>= breakpoints.sm`. */
    'aa-stack-lock-sm'?: string
    /** Breakpoint variant of `aa-stack-lock`. Activates at `>= breakpoints.md`. */
    'aa-stack-lock-md'?: string
    /** Breakpoint variant of `aa-stack-lock`. Activates at `>= breakpoints.lg`. */
    'aa-stack-lock-lg'?: string
    /** Breakpoint variant of `aa-stack-lock`. Activates at `>= breakpoints.xl`. */
    'aa-stack-lock-xl'?: string

    /**
     * Scrubbed exit animation for stack cards, played as the *next* card
     * scrolls toward its lock position. Flags are space-separated and
     * compose; composite flags (`perspective`, `blur`, `left`, `right`)
     * override plain `fade` / `scale` where they share a property.
     *
     * - `fade` — opacity → 0
     * - `scale` — scale → `1 - 0.15 * aa-intensity` (e.g. 0.85 at intensity=1)
     * - `perspective` — 3D tilt-back (`rotationX`, scale, `y` lift of
     *   `7% * intensity` of card height)
     * - `blur` — `filter: blur(8 * intensity px)` + `y` lift of `3.5% * intensity`
     *   of card height
     * - `left` / `right` — slide `±4 * intensity rem` while fading out
     * - `none` — cards hold their settled state and the next card overlays
     *
     * The last card normally has no out animation (nothing overlays it). When
     * `perspective` is set, the last card instead rises by half that lift
     * (`3.5% * intensity` of its height) at the end of the stack so it covers
     * the receded card behind it rather than leaving a gap. Example:
     * `aa-stack-out="perspective"`.
     */
    'aa-stack-out'?: string
    /** Breakpoint variant of `aa-stack-out`. Activates at `>= breakpoints.sm`. */
    'aa-stack-out-sm'?: string
    /** Breakpoint variant of `aa-stack-out`. Activates at `>= breakpoints.md`. */
    'aa-stack-out-md'?: string
    /** Breakpoint variant of `aa-stack-out`. Activates at `>= breakpoints.lg`. */
    'aa-stack-out-lg'?: string
    /** Breakpoint variant of `aa-stack-out`. Activates at `>= breakpoints.xl`. */
    'aa-stack-out-xl'?: string
  }

  interface IntrinsicAttributes extends AlrdyAnimateAttributes {}

  interface HTMLAttributes<T> extends AlrdyAnimateAttributes {}
}

export {}
