import type { GsapHandle } from '../../core/gsap-detect'
import {
  createProgressEntry,
  createProgressGroup,
  type ProgressEntry,
} from '../../core/progress-bar'
import { attachHoverPauseListener, createViewportGate } from '../../core/viewport-gate'
import type { SliderLoop } from './horizontal-loop'

export interface AutoplayOptions {
  /** Seconds between slide advances. */
  interval: number
  /** Slide-transition duration (used by the slider tween, not autoplay timing). */
  duration: number
  ease: string
  hoverPause: boolean
  /**
   * How to advance one slide. Defaults to `slider.next(...)` (infinite wrap).
   * The finite slider overrides this to rewind to the first slide instead of
   * no-op'ing at the last.
   */
  advance?: () => void
}

export interface AutoplayController {
  start: () => void
  stop: () => void
  /** Update progress bars to reflect the given active slide index. */
  syncProgress: (index: number) => void
  /** Pause autoplay (without resetting progress). For external nav restarts. */
  reset: () => void
  /**
   * Mark whether a drag/throw is in progress. When true, the hover
   * mouseleave handler won't auto-start autoplay (the caller will restart
   * once the throw completes on the correct landing slide).
   */
  setDragInProgress: (active: boolean) => void
  destroy: () => void
}

export function setupAutoplay(
  gsapHandle: GsapHandle,
  root: HTMLElement,
  slider: SliderLoop,
  options: AutoplayOptions,
): AutoplayController {
  const gsap = gsapHandle.gsap as unknown as Record<string, any>
  const { interval, duration, ease, hoverPause } = options
  const advance = options.advance ?? ((): void => void slider.next({ duration, ease }))

  let autoplayCall:
    | { kill: () => void; pause: () => void; resume: () => void; paused: () => boolean }
    | null = null
  let isPausedByHover = false
  let dragInProgress = false

  const progressEntries: ProgressEntry[] = []
  for (const el of root.querySelectorAll<Element>('[aa-slider-progress]')) {
    const entry = createProgressEntry(el, 'aa-slider-progress', ease, gsap.set)
    if (entry) progressEntries.push(entry)
  }
  const progress = createProgressGroup(gsap, progressEntries)
  // Every slide shares the same dwell (`interval`).
  const syncProgress = (activeIndex: number): void => progress.play(activeIndex, () => interval)

  const start = (): void => {
    if (autoplayCall) return
    const tick = (): void => {
      advance()
      gsap.delayedCall(duration / 2, () => {
        syncProgress(slider.current())
      })
      autoplayCall = gsap.delayedCall(duration + interval, tick)
    }
    syncProgress(slider.current())
    autoplayCall = gsap.delayedCall(interval, tick)
  }

  const stop = (): void => {
    if (autoplayCall) {
      autoplayCall.kill()
      autoplayCall = null
    }
    progress.reset()
    isPausedByHover = false
  }

  const reset = (): void => {
    stop()
  }

  const pauseByHover = (): void => {
    if (autoplayCall) {
      autoplayCall.pause()
      progress.pause()
      isPausedByHover = true
    }
  }

  const resumeFromHover = (): void => {
    if (autoplayCall && isPausedByHover) {
      autoplayCall.resume()
      progress.resume()
      isPausedByHover = false
    }
  }

  const cleanups: Array<() => void> = []

  // Hover pause is opt-in (autoplay-hover token) and only on non-touch devices.
  if (hoverPause) {
    cleanups.push(
      attachHoverPauseListener({
        root,
        onEnter: () => {
          if (autoplayCall && !autoplayCall.paused()) pauseByHover()
        },
        onLeave: () => {
          if (isPausedByHover) resumeFromHover()
          else if (!autoplayCall && !dragInProgress) start()
        },
      }),
    )
  }

  // Pause autoplay when slider scrolls out of viewport.
  const gateDispose = createViewportGate(gsapHandle, {
    trigger: root,
    onActive: start,
    onIdle: stop,
  })
  if (gateDispose) cleanups.push(gateDispose)
  else start() // No ScrollTrigger plugin → just start immediately.

  const destroy = (): void => {
    stop()
    for (const fn of cleanups) fn()
  }

  const setDragInProgress = (active: boolean): void => {
    dragInProgress = active
  }

  return { start, stop, syncProgress, reset, setDragInProgress, destroy }
}
