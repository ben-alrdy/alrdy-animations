import { parseAutoplay } from '../../core/autoplay'
import { parseNum } from '../../core/parse'
import { observeSize } from '../../core/visibility'
import { bindRootFeature, type FeatureContext, type FeatureModule } from '../../core/registry'
import type { Config } from '../../core/settings'
import { setupAutoplay, type AutoplayController } from './autoplay'
import { finiteTrack } from './finite-track'
import { horizontalLoop, type SliderLoop } from './horizontal-loop'
import { attachKeyboard } from './keyboard'
import { setupNav } from './nav'

interface ParsedTokens {
  isDraggable: boolean
  isCenter: boolean
  isFinite: boolean
  isNone: boolean
}

function parseSliderValue(raw: string | undefined): ParsedTokens {
  const tokens = (raw ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return {
    isDraggable: tokens.includes('draggable'),
    isCenter: tokens.includes('center'),
    isFinite: tokens.includes('finite'),
    isNone: tokens.includes('none'),
  }
}

function setupOne(ctx: FeatureContext, root: HTMLElement, config: Config): (() => void) | undefined {
  const tokens = parseSliderValue(config['aa-slider'])
  if (tokens.isNone) return undefined

  const items = root.querySelectorAll<HTMLElement>('[aa-slider-item]')
  if (items.length === 0) return undefined

  const opts = ctx.options
  const duration = parseNum(config['aa-duration'], opts.duration)
  const ease = config['aa-ease'] ?? opts.ease
  const autoplay = parseAutoplay(
    config['aa-autoplay'],
    opts.autoplay,
    'aa-autoplay' in config,
  )

  // Use the slider-item's parent (the track) for gap detection.
  const firstItemParent = items[0].parentElement
  const gap = firstItemParent
    ? parseFloat(window.getComputedStyle(firstItemParent).columnGap || '0') || 0
    : 0

  const nav = setupNav(root, { finite: tokens.isFinite })

  const gsap = ctx.gsap.gsap as unknown as Record<string, any>

  // Wrap nav.onChange so its first invocation — the synchronous one fired by
  // horizontalLoop during construction — is deferred by one tick. This lets
  // appearance features inside slides (e.g. text-fade-up listening for
  // event:slide-active) register their listeners before the initial event
  // fires, regardless of feature init order. Subsequent calls (drag, autoplay,
  // manual nav) run immediately so interaction stays snappy. Mirrors the
  // pattern in tabs/index.ts where `openEntrySnap(initialEntry)` is wrapped
  // in `gsap.delayedCall(0, ...)` for the same reason.
  let initialOnChange = true
  const handleChange = (item: Element, index: number): void => {
    if (initialOnChange) {
      initialOnChange = false
      gsap.delayedCall(0, () => nav.onChange(item, index))
      return
    }
    nav.onChange(item, index)
  }

  // Forward declare so the drag callbacks (which run via horizontalLoop) can
  // reach the autoplay controller defined below.
  let autoplayCtl: AutoplayController | null = null

  // Restart after a manual nav (button click, keyboard, drag throw). With
  // hover-pause we must NOT restart while the cursor is still over the slider
  // — restarting here would skip the mouseenter pause hook (mouseenter only
  // fires on entry, not when already inside) and the autoplay would cycle
  // through hover, defeating hover-pause. The autoplay's own mouseleave
  // handler picks up the restart when the cursor leaves. Without hover-pause
  // there is no mouseleave handler at all, so restart unconditionally —
  // otherwise clicking next while the cursor sits on the button leaves
  // autoplay stopped forever.
  const restartAutoplayAfterManualNav = (): void => {
    if (!autoplayCtl) return
    if (autoplay.hoverPause) {
      const hovered = root.matches(':hover') && !window.matchMedia('(hover: none)').matches
      if (!hovered) autoplayCtl.start()
    } else {
      autoplayCtl.start()
    }
  }

  const buildSlider = tokens.isFinite ? finiteTrack : horizontalLoop
  const slider: SliderLoop = buildSlider(ctx.gsap, items, {
    speed: duration,
    repeat: -1,
    paused: true,
    paddingRight: gap,
    center: tokens.isCenter,
    draggable: tokens.isDraggable,
    onChange: handleChange,
    onDragStart: () => {
      autoplayCtl?.setDragInProgress(true)
      autoplayCtl?.stop()
    },
    onRelease: (isThrowing) => {
      // No throw means a static press / click with no drag movement —
      // onThrowComplete will never fire, so we must clear the drag flag and
      // attempt a restart here. With a real throw, defer to onThrowComplete
      // which runs after the inertia tween lands on its snap target.
      if (!isThrowing) {
        autoplayCtl?.setDragInProgress(false)
        restartAutoplayAfterManualNav()
      }
    },
    onThrowComplete: () => {
      // Throw landed on a snap target → safe to restart autoplay so the
      // progress bar starts fresh on the correct active slide.
      autoplayCtl?.setDragInProgress(false)
      restartAutoplayAfterManualNav()
    },
  })

  const cleanups: Array<() => void> = []

  // Autoplay (optional). Hooks into ScrollTrigger viewport gating itself.
  if (autoplay.enabled) {
    // Finite sliders don't wrap, so next() no-ops at the last slide. Rewind to
    // the first slide there so autoplay keeps cycling.
    const advance = tokens.isFinite
      ? (): void => {
          if (slider.current() >= nav.total - 1) slider.toIndex(0, { duration, ease })
          else slider.next({ duration, ease })
        }
      : undefined
    autoplayCtl = setupAutoplay(ctx.gsap, root, slider, {
      interval: autoplay.interval,
      duration,
      ease,
      hoverPause: autoplay.hoverPause,
      ...(advance ? { advance } : {}),
    })
    cleanups.push(() => autoplayCtl?.destroy())
  }

  const afterManualNav = (): void => {
    if (autoplayCtl) gsap.delayedCall(0.1, restartAutoplayAfterManualNav)
  }

  const navHandlers = {
    next: () => {
      autoplayCtl?.stop()
      slider.next({ duration, ease })
      afterManualNav()
    },
    previous: () => {
      autoplayCtl?.stop()
      slider.previous({ duration, ease })
      afterManualNav()
    },
    toIndex: (target: number) => {
      autoplayCtl?.stop()
      slider.toIndex(target, { duration, ease })
      afterManualNav()
    },
    current: () => slider.current(),
  }

  cleanups.push(nav.attachClickListeners(navHandlers))

  cleanups.push(
    attachKeyboard(root, nav.total, {
      next: navHandlers.next,
      previous: navHandlers.previous,
      toIndex: navHandlers.toIndex,
    }),
  )

  // Re-measure the carousel. Two complementary signals — neither alone is a
  // superset of the other:
  //
  //  - ctx.onResize (window resize): catches viewport changes that don't alter
  //    the root's own width — a fixed-width root with vw-sized slides, or a
  //    media query that re-lays-out the slides without resizing root.
  //  - observeSize (ResizeObserver on root): catches the box going 0 → laid-out
  //    when the slider is revealed (a display:none modal / form-success opens)
  //    and content growth (late images) — neither fires a window resize, and
  //    horizontalLoop measured every width as 0 while hidden, so the carousel
  //    math stays dead until this fires.
  //
  // Both run a deep refresh; refresh() itself detects a reveal-from-hidden
  // (degenerate zero-width build) and re-seats onto the first slide, so the
  // callbacks are identical and a redundant double-refresh on a plain responsive
  // resize is harmless (idempotent re-measure).
  const remeasure = (): void => slider.refresh(true)
  cleanups.push(ctx.onResize(remeasure, 150))
  cleanups.push(observeSize(root, remeasure))

  // Initial onChange (fired by horizontalLoop on construction) has already
  // toggled is-active classes and emitted slide-active on the starting slide
  // so descendant aa-trigger="event:slide-active" animations play on first
  // paint. No additional bootstrap call needed here.

  return () => {
    for (const fn of cleanups) fn()
    slider.touchCleanup?.()
    slider.draggable?.kill()
    slider.kill()
  }
}

const sliderFeature: FeatureModule = {
  name: 'slider',
  init(ctx: FeatureContext): () => void {
    bindRootFeature(ctx, 'aa-slider', setupOne)
    return () => {}
  },
}

export default sliderFeature
