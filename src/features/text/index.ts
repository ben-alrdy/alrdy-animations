import type { GsapTimeline } from '../../core/gsap-detect'
import { bindFeature, type FeatureContext, type FeatureModule } from '../../core/registry'
import { readAnimationConfig, resolveAnchor } from '../../core/parse'
import { matchAnimateValue, type ResolvedPreset } from '../../core/presets'
import type { Config } from '../../core/settings'
import {
  buildStagger,
  defaultStaggerFor,
  parseStaggerSpec,
  type StaggerValue,
} from '../../core/stagger'
import {
  setupTriggeredAnimation,
  toTimelineVars,
  type TriggerVars,
} from '../../core/triggered-animation'
import { resolveTriggers } from '../../core/trigger'
import { applySplit, parseSplit, type SplitMode, type SplitResult } from '../../split/runtime'

type GsapTarget = Element | Element[] | NodeList
type State = Record<string, number | string>

interface SetupParams {
  element: Element
  split: SplitResult
  intensity: number
}

interface SetupResult {
  targets: GsapTarget
  fromState: State
  toState: State
  cleanup?: () => void
}

interface TextAnim {
  defaultSplit: SplitMode
  maskLines?: boolean
  /**
   * Opt this animation into the `aa-color` accent wave: when `aa-color` is
   * present, each split unit additionally tweens `color` from the accent to
   * the element's base colour, so the stagger trails the accent as a gradient
   * wave. Fade + blur families only (simple path).
   */
  colorWave?: boolean
  /** Simple path: just animate the split parts from `buildFrom` to `to`. */
  buildFrom?: (intensity: number) => State
  to?: State
  /** Complex path: wrap lines, set up custom targets/states. */
  setup?: (params: SetupParams) => SetupResult
}

const OVAL_LINE_STYLE = 'overflow: clip; display: block;'
const PERSPECTIVE_LINE_STYLE = 'transform-style: preserve-3d; display: block;'

function wrapLines(
  lines: HTMLElement[],
  className: string,
  inlineStyle: string,
  perElement?: (wrapper: HTMLElement) => void,
): HTMLElement[] {
  const wrappers: HTMLElement[] = []
  for (const line of lines) {
    const wrapper = document.createElement('div')
    wrapper.classList.add(className)
    wrapper.setAttribute('style', inlineStyle)
    if (perElement) perElement(wrapper)
    line.parentNode?.insertBefore(wrapper, line)
    wrapper.appendChild(line)
    wrappers.push(wrapper)
  }
  return wrappers
}

function unwrapLines(wrappers: HTMLElement[]): void {
  for (const w of wrappers) {
    const child = w.firstElementChild
    if (child && w.parentNode) {
      w.parentNode.insertBefore(child, w)
      w.remove()
    }
  }
}

// Direction → (axis, sign) lookup used by fade/blur/slide/tilt builders.
// `Y` maps to `yPercent`, `X` maps to `xPercent`. `sign === 1` means the
// element starts off-screen on the *opposite* axis (up → starts below).
type Direction = 'up' | 'down' | 'left' | 'right'
const DIR_AXIS: Record<Direction, { prop: 'yPercent' | 'xPercent'; sign: 1 | -1 }> = {
  up: { prop: 'yPercent', sign: 1 },
  down: { prop: 'yPercent', sign: -1 },
  left: { prop: 'xPercent', sign: 1 },
  right: { prop: 'xPercent', sign: -1 },
}

function fadeAnim(opacity: number, direction?: Direction): TextAnim {
  if (!direction) {
    return {
      defaultSplit: 'chars',
      colorWave: true,
      buildFrom: () => ({ opacity }),
      to: { opacity: 1 },
    }
  }
  const { prop, sign } = DIR_AXIS[direction]
  return {
    defaultSplit: 'chars',
    colorWave: true,
    buildFrom: (i) => ({ opacity, [prop]: 60 * sign * i }),
    to: { opacity: 1, [prop]: 0 },
  }
}

function blurAnim(direction?: Direction): TextAnim {
  if (!direction) {
    return {
      defaultSplit: 'chars',
      colorWave: true,
      buildFrom: () => ({ opacity: 0, filter: 'blur(20px)' }),
      to: { opacity: 1, filter: 'blur(0px)' },
    }
  }
  const { prop, sign } = DIR_AXIS[direction]
  const offsetProp = prop === 'yPercent' ? 'y' : 'x'
  return {
    defaultSplit: 'chars',
    colorWave: true,
    buildFrom: (i) => ({ opacity: 0, filter: 'blur(10px)', [offsetProp]: `${2 * sign * i}rem` }),
    to: { opacity: 1, filter: 'blur(0px)', [offsetProp]: 0 },
  }
}

function scaleAnim(origin: '50% 50%' | '50% 100%' | '50% 0%'): TextAnim {
  return {
    defaultSplit: 'chars',
    colorWave: true,
    buildFrom: () => ({ scaleY: 0, transformOrigin: origin }),
    to: { scaleY: 1 },
  }
}

function slideAnim(direction: 'up' | 'down'): TextAnim {
  const sign = direction === 'up' ? 1 : -1
  return {
    defaultSplit: 'lines',
    maskLines: true,
    buildFrom: () => ({ yPercent: 110 * sign }),
    to: { yPercent: 0 },
  }
}

function tiltAnim(direction: 'up' | 'down'): TextAnim {
  const sign = direction === 'up' ? 1 : -1
  return {
    defaultSplit: 'lines',
    maskLines: true,
    buildFrom: () => ({
      yPercent: 110 * sign,
      opacity: 0,
      rotation: 10 * sign,
      transformOrigin: direction === 'up' ? 'bottom left' : 'top left',
    }),
    to: { yPercent: 0, opacity: 1, rotation: 0 },
  }
}

function ovalAnim(origin: 'top' | 'bottom'): TextAnim {
  const at = origin === 'bottom' ? '50% 100%' : '50% 0%'
  return {
    defaultSplit: 'lines',
    setup: ({ split }) => {
      const wrappers = wrapLines(split.lines, 'aa-oval-line', OVAL_LINE_STYLE)
      return {
        targets: wrappers,
        fromState: { clipPath: `ellipse(20% 0% at ${at})` },
        toState: { clipPath: `ellipse(100% 120% at ${at})` },
        cleanup: () => unwrapLines(wrappers),
      }
    },
  }
}

// Per-animation entries declare only structural defaults: which split mode the
// animation expects and whether lines are masked. All timing — duration, ease,
// stagger — flows from init({...}); stagger varies per split mode via
// defaultStaggerFor().
const TEXT_ANIMS: Record<string, TextAnim> = {
  'text-fade': fadeAnim(0),
  'text-fade-30': fadeAnim(0.3),
  'text-fade-10': fadeAnim(0.1),
  'text-fade-up': fadeAnim(0, 'up'),
  'text-fade-down': fadeAnim(0, 'down'),
  'text-fade-left': fadeAnim(0, 'left'),
  'text-fade-right': fadeAnim(0, 'right'),

  'text-blur': blurAnim(),
  'text-blur-up': blurAnim('up'),
  'text-blur-down': blurAnim('down'),
  'text-blur-left': blurAnim('left'),
  'text-blur-right': blurAnim('right'),

  'text-scale': scaleAnim('50% 50%'),
  'text-scale-up': scaleAnim('50% 100%'),
  'text-scale-down': scaleAnim('50% 0%'),

  'text-slide-up': slideAnim('up'),
  'text-slide-down': slideAnim('down'),

  'text-tilt-up': tiltAnim('up'),
  'text-tilt-down': tiltAnim('down'),

  'text-oval-up': ovalAnim('bottom'),
  'text-oval-down': ovalAnim('top'),

  'text-rotate': {
    defaultSplit: 'lines',
    setup: ({ element, split }) => {
      const fontSize = parseFloat(window.getComputedStyle(element).fontSize) || 16
      const perspective = `${fontSize * 5}px`
      const wrappers = wrapLines(
        split.lines,
        'aa-perspective-line',
        PERSPECTIVE_LINE_STYLE,
        (w) => {
          w.style.perspective = perspective
        },
      )
      for (const line of split.lines) {
        line.style.transformOrigin = '50% 0%'
      }
      return {
        targets: split.lines,
        fromState: { autoAlpha: 0, rotateX: -90, yPercent: 100, scaleX: 0.75 },
        toState: { autoAlpha: 1, rotateX: 0, yPercent: 0, scaleX: 1 },
        cleanup: () => unwrapLines(wrappers),
      }
    },
  },
}

type AxisLetter = 'X' | 'Y'

interface BarDirection {
  axis: AxisLetter
  growOrigin: string
  shrinkOrigin: string
  textAxis: 'x' | 'y'
  textOffset: string
}

// Direction names match v7: the named edge is where the bar exits to, so
// "right" sweeps left → right, "up" sweeps bottom → top, etc.
const BAR_DIRECTIONS: Record<string, BarDirection> = {
  right: {
    axis: 'X',
    growOrigin: 'left center',
    shrinkOrigin: 'right center',
    textAxis: 'x',
    textOffset: '-0.6em',
  },
  left: {
    axis: 'X',
    growOrigin: 'right center',
    shrinkOrigin: 'left center',
    textAxis: 'x',
    textOffset: '0.6em',
  },
  up: {
    axis: 'Y',
    growOrigin: 'bottom center',
    shrinkOrigin: 'top center',
    textAxis: 'y',
    textOffset: '0.6em',
  },
  down: {
    axis: 'Y',
    growOrigin: 'top center',
    shrinkOrigin: 'bottom center',
    textAxis: 'y',
    textOffset: '-0.6em',
  },
}

const BAR_NAMES = new Set<string>()
for (const dirName of Object.keys(BAR_DIRECTIONS)) {
  BAR_NAMES.add(`text-block-${dirName}`)
  BAR_NAMES.add(`text-marker-${dirName}`)
}

function parseBarName(name: string): { mode: 'block' | 'marker'; dir: BarDirection } | null {
  const m = name.match(/^text-(block|marker)-(up|down|left|right)$/)
  if (!m) return null
  return { mode: m[1] as 'block' | 'marker', dir: BAR_DIRECTIONS[m[2]] }
}

function resolveBarColor(value: string | undefined, element: Element): string {
  if (!value) return 'currentColor'
  const trimmed = value.trim()
  if (trimmed.startsWith('--')) {
    const resolved = window.getComputedStyle(element).getPropertyValue(trimmed).trim()
    return resolved || trimmed
  }
  return trimmed
}

interface BarLineSetup {
  bar: HTMLElement
  text: HTMLElement | null
}

function buildBarLines(
  lines: HTMLElement[],
  color: string,
  withTextWrapper: boolean,
): BarLineSetup[] {
  const setups: BarLineSetup[] = []
  for (const line of lines) {
    // Negative margin tightens line spacing so adjacent bars touch when
    // line-height is around 1.0; the matching negative inset on the bar
    // extends it slightly above/below the text bounds.
    line.style.display = 'inline-block'
    line.style.position = 'relative'
    line.style.margin = '-0.055em 0'

    let text: HTMLElement | null = null
    if (withTextWrapper) {
      text = document.createElement('span')
      text.className = 'aa-block-text'
      text.style.display = 'inline-block'
      text.style.willChange = 'transform, opacity'
      while (line.firstChild) text.appendChild(line.firstChild)
      line.appendChild(text)
    }

    const bar = document.createElement('div')
    bar.className = 'aa-bar'
    bar.style.cssText =
      'position:absolute;inset:-0.055em 0;pointer-events:none;z-index:1;will-change:transform;'
    bar.style.backgroundColor = color
    line.appendChild(bar)

    setups.push({ bar, text })
  }
  return setups
}

const SUPPORTED = new Set([...Object.keys(TEXT_ANIMS), ...BAR_NAMES, 'text-wave'])

function elementMatches(el: Element, presetMap: Map<Element, ResolvedPreset>): boolean {
  return matchAnimateValue(el, presetMap, (v) => SUPPORTED.has(v))
}

function pickSimpleTargets(
  parts: { words: HTMLElement[]; chars: HTMLElement[]; lines: HTMLElement[] },
  mode: SplitMode,
): HTMLElement[] {
  if (mode === 'chars') return parts.chars
  if (mode === 'lines') return parts.lines
  return parts.words
}

function setupBarReveal(
  ctx: FeatureContext,
  element: Element,
  config: Config,
  parsed: { mode: 'block' | 'marker'; dir: BarDirection },
): (() => void) | undefined {
  const { mode, dir } = parsed
  const isBlock = mode === 'block'
  const opts = ctx.options
  const { duration, delay, ease, scrollStart, scrollEnd, scrub, again } =
    readAnimationConfig(config, opts)
  const { unit: stagger } = parseStaggerSpec(config['aa-stagger'], defaultStaggerFor('lines', opts))

  const scaleProp = `scale${dir.axis}`

  // Build the per-line phased timeline from the current bar/text setups.
  // Two-phase for block mode (grow-in, then shrink-out + text fade-in);
  // single-phase for marker (shrink-out reveals text underneath).
  const buildTimelineFromSetups = (
    setups: BarLineSetup[],
    vars: TriggerVars,
  ): GsapTimeline => {
    const tl = ctx.gsap.gsap.timeline(toTimelineVars(vars))
    setups.forEach(({ bar, text }, i) => {
      const lineTl = ctx.gsap.gsap.timeline()
      if (isBlock) {
        const revealDur = duration * 0.4
        const shrinkDur = duration * 0.6
        const textDur = duration * 0.4
        // Phase 1: bar grows in from the entry edge.
        lineTl.fromTo(
          bar,
          { [scaleProp]: 0, transformOrigin: dir.growOrigin },
          { [scaleProp]: 1, duration: revealDur, ease },
        )
        // Flip the origin between phases. Using `.set()` here (rather than
        // a second fromTo) is the only pattern that survives the
        // `tl.progress(0).pause()` reset used by the again-trigger:
        // transformOrigin is non-tweenable, so a fromTo's from-state isn't
        // restored on rewind, leaving the origin stuck at `growOrigin` for
        // phase 2 of every subsequent play.
        lineTl.set(bar, { transformOrigin: dir.shrinkOrigin })
        // Phase 2: shrink toward the exit edge from the current scale.
        lineTl.to(bar, { [scaleProp]: 0, duration: shrinkDur, ease })
        if (text) {
          // Anchor to the start of phase 2 (one tween + one set back from here).
          lineTl.fromTo(
            text,
            { opacity: 0, [dir.textAxis]: dir.textOffset },
            { opacity: 1, [dir.textAxis]: 0, duration: textDur, ease },
            `<`,
          )
        }
      } else {
        lineTl.fromTo(
          bar,
          { [scaleProp]: 1, transformOrigin: dir.shrinkOrigin },
          { [scaleProp]: 0, duration, ease },
        )
      }
      tl.add(lineTl, i * stagger)
    })
    return tl
  }

  // Tracks the per-split bar/text wrappers so the buildAnimation callback
  // (called once initially, then on every SplitText resplit) sees the
  // latest DOM. Each rebuild also re-applies the initial state explicitly
  // so the staggered timeline shows correct positions at time 0.
  let setups: BarLineSetup[] = []

  let split: SplitResult | undefined

  const initialSplit = applySplit(element, 'lines', ctx.gsap, {
    onResplit: (newSplit) => {
      split = newSplit
      handle?.rebuild()
    },
  })
  if (initialSplit.lines.length === 0) {
    initialSplit.revert()
    return undefined
  }
  split = initialSplit

  const handle = setupTriggeredAnimation(ctx, element, {
    triggers: resolveTriggers(element, config['aa-trigger'], ctx.options.breakpoints),
    delay,
    scrollStart,
    scrollEnd,
    scrub,
    again,
    buildAnimation: (vars) => {
      if (!split || split.lines.length === 0) return null
      const color = resolveBarColor(config['aa-color'], element)
      setups = buildBarLines(split.lines, color, isBlock)
      // Lock initial states explicitly so the element looks correct at
      // time 0 regardless of when each per-line tween starts.
      for (const { bar, text } of setups) {
        ctx.gsap.gsap.set(bar, {
          [scaleProp]: isBlock ? 0 : 1,
          transformOrigin: isBlock ? dir.growOrigin : dir.shrinkOrigin,
        })
        if (text) {
          ctx.gsap.gsap.set(text, { opacity: 0, [dir.textAxis]: dir.textOffset })
        }
      }
      const animation = buildTimelineFromSetups(setups, vars)
      return { animation }
    },
  })

  return () => {
    handle?.dispose()
    initialSplit.revert()
  }
}

// Resting opacity of an inactive `text-wave` unit: faint but readable (mirrors
// Osmo's dim "inactive colour", but bg-agnostic — it's the base colour dimmed
// by opacity rather than a hard-coded light/dark colour).
const WAVE_INACTIVE_OPACITY = 0.2

/**
 * `text-wave` — the Osmo "gradient wave" engine. Fundamentally different from
 * the timeline-based text animations: scroll position only sets *how many*
 * units are active (`activeCount = round(progress × units)`), and each unit
 * fires an independent **wall-clock** pulse the instant it crosses into the
 * active set (forward only). That decoupling is what gives the three signature
 * behaviours a scrubbed timeline can't:
 *   - the accent runs ahead and the base colour "catches up" when you stop
 *     (in-flight pulses finish; no new units activate),
 *   - the accent band widens with scroll speed (band = units activated within
 *     one pulse length ≈ velocity),
 *   - scrolling back up shows no accent (deactivation fades straight to the
 *     dim inactive state, never through the accent).
 * Reduced-motion / optimizeMobile never reach here — core swaps `text-*` for a
 * plain fade pass before this module loads.
 */
function setupColorWave(
  ctx: FeatureContext,
  element: Element,
  config: Config,
): (() => void) | undefined {
  const gsap = ctx.gsap.gsap
  const { duration, ease, scrollStart, scrollEnd, scrub } = readAnimationConfig(config, ctx.options)
  const accent = resolveBarColor(config['aa-color'], element)
  const base = window.getComputedStyle(element).color
  const triggerEl = resolveAnchor(element, config['aa-anchor'])

  const userSplit = parseSplit(config['aa-split'])
  const splitMode: SplitMode = userSplit?.mode ?? 'chars'

  const inactive: State = { opacity: WAVE_INACTIVE_OPACITY, color: base }
  const activeSet = new Set<HTMLElement>()
  const progress = { value: 0 }
  let ready = false
  let units: HTMLElement[] = []

  const primeUnits = (): void => {
    for (const u of units) u.style.willChange = 'color, opacity'
    gsap.set(units, inactive)
  }

  // Hard-snap every unit to the state its index implies for the current
  // progress — no pulse. Used on (re)split and on ScrollTrigger refresh so a
  // page loaded already scrolled past the heading doesn't flash the accent.
  const syncAll = (): void => {
    const activeCount = Math.round(progress.value * units.length)
    activeSet.clear()
    units.forEach((u, i) => {
      gsap.killTweensOf(u)
      if (i < activeCount) {
        gsap.set(u, { opacity: 1, color: base })
        activeSet.add(u)
      } else {
        gsap.set(u, inactive)
      }
    })
  }

  // Forward crossing: fill opacity in over the entry, and pulse colour
  // base → accent → hold → base over 1.2× the entry so the accent lingers.
  const activate = (u: HTMLElement): void => {
    gsap.killTweensOf(u)
    const colorSpan = duration * 1.2
    const tl = gsap.timeline()
    tl.to(u, { opacity: 1, duration, ease }, 0)
    tl.to(
      u,
      {
        keyframes: [
          { color: accent, duration: colorSpan * 0.25, ease: 'power2.out' },
          { color: accent, duration: colorSpan * 0.25 },
          { color: base, duration: colorSpan * 0.5, ease: 'power2.in' },
        ],
      },
      0,
    )
  }

  // Backward crossing: fade straight back to the dim inactive state — never
  // through the accent (this is what makes upward scroll accent-free).
  const deactivate = (u: HTMLElement): void => {
    gsap.killTweensOf(u)
    gsap.to(u, { ...inactive, duration: duration * 0.5, ease: 'none' })
  }

  const onUpdate = (): void => {
    if (!ready) return
    const activeCount = Math.round(progress.value * units.length)
    units.forEach((u, i) => {
      const isActive = i < activeCount
      if (isActive && !activeSet.has(u)) {
        activeSet.add(u)
        activate(u)
      } else if (!isActive && activeSet.has(u)) {
        activeSet.delete(u)
        deactivate(u)
      }
    })
  }

  const split = applySplit(element, splitMode, ctx.gsap, {
    onResplit: (newSplit) => {
      units = pickSimpleTargets(newSplit, splitMode)
      primeUnits()
      syncAll()
    },
  })
  units = pickSimpleTargets(split, splitMode)
  if (units.length === 0) {
    split.revert()
    return undefined
  }
  primeUnits()

  // Osmo drives a proxy `{ value }` with ScrollTrigger scrub; onUpdate maps the
  // proxy to activation crossings. Default scrub 0.1 (light smoothing) so fast
  // scroll doesn't activate a whole block in one frame; `aa-scrub` overrides.
  const driver = gsap.to(progress, {
    value: 1,
    ease: 'none',
    onUpdate,
    scrollTrigger: {
      trigger: triggerEl,
      start: scrollStart,
      end: scrollEnd,
      scrub: scrub === undefined ? 0.1 : scrub,
      onRefresh: () => {
        ready = false
        syncAll()
        requestAnimationFrame(() => {
          ready = true
        })
      },
    },
  })

  return () => {
    driver.kill()
    for (const u of units) {
      gsap.killTweensOf(u)
      u.style.willChange = ''
    }
    split.revert()
  }
}

function setupOne(
  ctx: FeatureContext,
  element: Element,
  config: Config,
): (() => void) | undefined {
  const animate = config['aa-animate']
  if (!animate || !SUPPORTED.has(animate)) return undefined
  if (animate === 'text-wave') return setupColorWave(ctx, element, config)
  const bar = parseBarName(animate)
  if (bar) return setupBarReveal(ctx, element, config, bar)
  const anim = TEXT_ANIMS[animate]

  const opts = ctx.options
  const { duration, delay, ease, intensity, scrollStart, scrollEnd, scrub, again } =
    readAnimationConfig(config, opts)

  const userSplit = parseSplit(config['aa-split'])
  const splitMode = userSplit?.mode ?? anim.defaultSplit
  const staggerSpec = parseStaggerSpec(
    config['aa-stagger'],
    defaultStaggerFor(splitMode, opts),
    defaultStaggerFor('lines', opts),
  )
  const stagger: StaggerValue = buildStagger(staggerSpec.unit, staggerSpec.flags)
  const lineStagger = staggerSpec.line
  const lineGrouped = userSplit?.groupBy === 'lines' && !anim.setup
  // Absence of the `mask` flag in aa-split means "I'm just naming the split
  // mode" — don't force-disable masks that the animation enables by default.
  // Users who want masks off entirely simply pick an animation that has none.
  const mask = userSplit?.mask || anim.maskLines || false

  // Tracks the current split — reassigned on each SplitText auto-resplit
  // (resize within a breakpoint changes line wrapping) so the buildAnimation
  // callback below always reads the live `.aa-char` / `.aa-line` DOM.
  let split: SplitResult | undefined

  const initialSplit = applySplit(element, splitMode, ctx.gsap, {
    mask,
    ...(userSplit?.index ? { index: true } : {}),
    onResplit: (newSplit) => {
      split = newSplit
      handle?.rebuild()
    },
  })
  split = initialSplit

  const handle = setupTriggeredAnimation(ctx, element, {
    triggers: resolveTriggers(element, config['aa-trigger'], ctx.options.breakpoints),
    delay,
    scrollStart,
    scrollEnd,
    scrub,
    again,
    // Hint the compositor for the split units (chars/words/lines) only while
    // the tween runs; the orchestrator clears it on settle. Covers the full
    // text-animation footprint (transform + opacity, plus filter for blur,
    // plus colour for the accent wave).
    // Replaces the old permanent will-change on the global .aa-char/.aa-word
    // CSS rule, which left a never-reclaimed layer per split unit.
    willChange:
      anim.colorWave && config['aa-color']
        ? 'transform, opacity, filter, color'
        : 'transform, opacity, filter',
    buildAnimation: (vars) => {
      if (!split) return null
      let targets: GsapTarget
      let fromState: State
      let toState: State
      let extraCleanup: (() => void) | undefined
      let lineGroups: HTMLElement[][] | undefined
      let waveColors: { accent: string; base: string } | undefined
      if (anim.setup) {
        // anim.setup paths (oval, rotate) wrap lines in extra DOM and
        // return a cleanup that unwraps them. The orchestrator runs this
        // cleanup before the next rebuild and on dispose.
        const result = anim.setup({ element, split, intensity })
        targets = result.targets
        fromState = result.fromState
        toState = result.toState
        if (result.cleanup) extraCleanup = result.cleanup
      } else {
        if (!anim.buildFrom || !anim.to) return null
        const simple = pickSimpleTargets(split, splitMode)
        if (simple.length === 0) return null
        targets = simple
        fromState = anim.buildFrom(intensity)
        toState = anim.to
        // Accent colour wave (fade/blur families + aa-color). Each unit rests
        // dim in its *base* colour (opacity-only — no accent tint yet), fills
        // in via the normal entry tween, and a separate colour tween pulses it
        // base → accent → hold → base. The colour pulse runs longer than the
        // entry and lingers on the accent (see the keyframe timings below), so
        // the accent stays visible well past the fade-in and the per-unit
        // stagger reads as a gradient wave (scrub-tied when `aa-scrub` is set).
        if (anim.colorWave && config['aa-color']) {
          waveColors = {
            accent: resolveBarColor(config['aa-color'], element),
            base: window.getComputedStyle(element).color,
          }
          fromState = { ...fromState, color: waveColors.base }
        }
        if (lineGrouped) {
          const inner = splitMode === 'words' ? split.words : split.chars
          lineGroups = split.lines.map((line) => inner.filter((u) => line.contains(u)))
        }
      }
      const tl = ctx.gsap.gsap.timeline(toTimelineVars(vars))
      // Lock the resting state explicitly so a paused-at-0 timeline shows
      // the from-state visually, not whatever GSAP computes from a stale
      // layout. Redundant for unpaused load tweens but harmless.
      ctx.gsap.gsap.set(targets, fromState)
      if (waveColors) {
        // Two tweens, both staggered from position 0 so each unit's fade-in and
        // colour pulse start together:
        //   1. The normal entry (opacity/offset/blur) over `duration` — the
        //      fade-in feel is preserved, colour untouched here.
        //   2. A colour pulse over 1.2×`duration`: base → accent (reached at
        //      25% via power2.out), held to 50%, then a lingering settle back to
        //      base (power2.in). Running longer than the entry + holding the
        //      accent is what keeps the wave colour visible past the fill.
        const colorSpan = duration * 1.2
        tl.fromTo(targets, fromState, { ...toState, duration, ease, stagger }, 0)
        tl.to(
          targets,
          {
            keyframes: [
              { color: waveColors.accent, duration: colorSpan * 0.25, ease: 'power2.out' },
              { color: waveColors.accent, duration: colorSpan * 0.25 },
              { color: waveColors.base, duration: colorSpan * 0.5, ease: 'power2.in' },
            ],
            stagger,
          },
          0,
        )
      } else if (lineGroups) {
        for (let i = 0; i < lineGroups.length; i++) {
          const group = lineGroups[i]
          if (group.length === 0) continue
          tl.fromTo(group, fromState, { ...toState, duration, ease, stagger }, i * lineStagger)
        }
      } else {
        tl.fromTo(targets, fromState, { ...toState, duration, ease, stagger })
      }
      const built: { animation: GsapTimeline; cleanup?: () => void } = { animation: tl }
      if (extraCleanup) built.cleanup = extraCleanup
      return built
    },
  })

  return () => {
    handle?.dispose()
    initialSplit.revert()
  }
}

const textFeature: FeatureModule = {
  name: 'text',
  init(ctx: FeatureContext): () => void {
    bindFeature(ctx, elementMatches, setupOne)
    return () => {}
  },
}

export default textFeature
