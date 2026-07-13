import type { GsapHandle, GsapTimeline } from '../../core/gsap-detect'
import { attachTouchScrollGuard } from './touch-guard'

/**
 * Augmented timeline returned by horizontalLoop. Adds index navigation methods,
 * a Draggable handle, and an optional touchCleanup function.
 */
export interface SliderLoop extends GsapTimeline {
  next: (vars?: Record<string, unknown>) => unknown
  previous: (vars?: Record<string, unknown>) => unknown
  toIndex: (index: number, vars?: Record<string, unknown>) => unknown
  current: () => number
  closestIndex: (setCurrent?: boolean) => number
  refresh: (deep?: boolean) => void
  times: number[]
  draggable?: DraggableInstance
  touchCleanup?: () => void
}

export interface DraggableInstance {
  kill: () => void
  enable: () => void
  disable: () => void
  startX: number
  startY: number
  x: number
  y: number
  pointerX: number
  pointerY: number
  isThrowing: boolean
  vars: Record<string, unknown>
}

interface DraggableConstructor {
  create: (target: unknown, vars: Record<string, unknown>) => DraggableInstance[]
}

export interface HorizontalLoopConfig {
  speed?: number
  paused?: boolean
  repeat?: number
  draggable?: boolean
  center?: boolean | string
  reversed?: boolean
  paddingRight?: number
  snap?: number | false
  onChange?: (item: Element, index: number) => void
  /** Fires once on drag press-init, before the timeline pause. */
  onDragStart?: () => void
  /**
   * Fires on every drag release. `isThrowing` is true when the release
   * triggered an inertia throw — `onThrowComplete` will fire after that
   * lands. False on a static press / click with no movement, in which case
   * `onThrowComplete` will NOT fire and the caller is responsible for any
   * post-press cleanup.
   */
  onRelease?: (isThrowing: boolean) => void
  /** Fires after the inertia throw lands on a new slide boundary. */
  onThrowComplete?: (index: number) => void
}

/**
 * Seamless horizontal looping timeline ported from v7's horizontalLoop helper
 * (originally https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop).
 * The math is delicate; this is a near-verbatim port — do not "improve" it.
 */
export function horizontalLoop(
  gsapHandle: GsapHandle,
  rawItems: ArrayLike<Element>,
  config: HorizontalLoopConfig = {},
): SliderLoop {
  const gsap = gsapHandle.gsap as unknown as Record<string, any>
  const Draggable = gsapHandle.plugins.Draggable as DraggableConstructor | undefined

  const items: HTMLElement[] = (gsap.utils.toArray as (v: unknown) => HTMLElement[])(rawItems)
  const onChange = config.onChange
  let lastIndex = 0
  const tl = gsap.timeline({
    repeat: config.repeat,
    onUpdate:
      onChange &&
      function (this: { closestIndex: () => number }) {
        const i = (tl as unknown as { closestIndex: () => number }).closestIndex()
        if (lastIndex !== i) {
          lastIndex = i
          onChange(items[i], i)
        }
      },
    paused: config.paused,
    defaults: { ease: 'none' },
    onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100),
  }) as any

  const length = items.length
  let startX = items[0].offsetLeft
  const times: number[] = []
  const widths: number[] = []
  const spaceBefore: number[] = []
  const xPercents: number[] = []
  let curIndex = 0
  let indexIsDirty = false
  const center = config.center
  const pixelsPerSecond = (config.speed || 1) * 100
  const snap =
    config.snap === false
      ? (v: number) => v
      : (gsap.utils.snap as (v: number) => (n: number) => number)(
          (config.snap as number | undefined) ?? 1,
        )
  let timeOffset = 0
  const container: HTMLElement =
    center === true
      ? (items[0].parentNode as HTMLElement)
      : ((gsap.utils.toArray as (v: unknown) => HTMLElement[])(center)[0] ||
        (items[0].parentNode as HTMLElement))
  let totalWidth = 0
  // True when the last populateWidths() ran while the track was laid out at 0
  // width (the slider was hidden — display:none inside a closed modal /
  // form-success). refresh() uses it to spot the reveal and reset the index.
  let measuredHidden = false

  const getTotalWidth = (): number =>
    items[length - 1].offsetLeft +
    (xPercents[length - 1] / 100) * widths[length - 1] -
    startX +
    items[length - 1].offsetWidth * gsap.getProperty(items[length - 1], 'scaleX') +
    (parseFloat(String(config.paddingRight ?? 0)) || 0)

  const populateWidths = (): void => {
    let b1 = container.getBoundingClientRect()
    measuredHidden = b1.width === 0
    let b2: DOMRect
    items.forEach((el, i) => {
      widths[i] = parseFloat(gsap.getProperty(el, 'width', 'px'))
      xPercents[i] = snap(
        (parseFloat(gsap.getProperty(el, 'x', 'px')) / widths[i]) * 100 +
          (gsap.getProperty(el, 'xPercent') as number),
      )
      b2 = el.getBoundingClientRect()
      spaceBefore[i] = b2.left - (i ? b1.right : b1.left)
      b1 = b2
    })
    gsap.set(items, {
      xPercent: (i: number) => xPercents[i],
    })
    totalWidth = getTotalWidth()
  }

  let timeWrap: (n: number) => number = (n) => n

  const populateOffsets = (): void => {
    timeOffset = center ? (tl.duration() * (container.offsetWidth / 2)) / totalWidth : 0
    if (center) {
      times.forEach((_t, i) => {
        times[i] = timeWrap(
          tl.labels['label' + i] + (tl.duration() * widths[i]) / 2 / totalWidth - timeOffset,
        )
      })
    }
  }

  const getClosest = (values: number[], value: number, wrap: number): number => {
    let i = values.length
    let closest = 1e10
    let index = 0
    let d: number
    while (i--) {
      d = Math.abs(values[i] - value)
      if (d > wrap / 2) d = wrap - d
      if (d < closest) {
        closest = d
        index = i
      }
    }
    return index
  }

  const populateTimeline = (): void => {
    let item: HTMLElement
    let curX: number
    let distanceToStart: number
    let distanceToLoop: number
    tl.clear()
    for (let i = 0; i < length; i++) {
      item = items[i]
      curX = (xPercents[i] / 100) * widths[i]
      distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0]
      distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, 'scaleX')

      tl.to(
        item,
        {
          xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
          duration: distanceToLoop / pixelsPerSecond,
        },
        0,
      )
        .fromTo(
          item,
          { xPercent: snap(((curX - distanceToLoop + totalWidth) / widths[i]) * 100) },
          {
            xPercent: xPercents[i],
            duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
            immediateRender: false,
          },
          distanceToLoop / pixelsPerSecond,
        )
        .add('label' + i, distanceToStart / pixelsPerSecond)

      times[i] = distanceToStart / pixelsPerSecond
    }
    timeWrap = (gsap.utils.wrap as (a: number, b: number) => (n: number) => number)(
      0,
      tl.duration(),
    )
  }

  const refresh = (deep?: boolean): void => {
    const progress = tl.progress()
    // Was the slider built/last-measured while hidden? If so, curIndex and
    // progress were seated from zero-width metrics (closestIndex lands on the
    // last slide). populateWidths() below refreshes measuredHidden.
    const wasHidden = measuredHidden
    tl.progress(0, true)
    startX = items[0].offsetLeft
    populateWidths()
    if (deep) populateTimeline()
    populateOffsets()
    if (deep && wasHidden && !measuredHidden) {
      // Reveal (hidden → laid-out): the seated index is meaningless. Now that we
      // own real geometry, reset to the first slide and fire onChange explicitly
      // so the counter/active-class move to 0 (tl.time alone is a no-op when the
      // playhead already sits at times[0], so onUpdate wouldn't fire).
      curIndex = 0
      tl.time(times[0], true)
      lastIndex = 0
      if (onChange) onChange(items[0], 0)
    } else if (deep && tl.draggable) {
      // A drag leaves the playhead between slides; re-seat onto the active slide.
      tl.time(times[curIndex], true)
    } else {
      // Non-draggable: preserve the running progress fraction so a resize that
      // lands mid-transition doesn't snap the slide.
      tl.progress(progress, true)
    }
  }

  let proxy: HTMLDivElement | undefined

  gsap.set(items, { x: 0 })
  populateWidths()
  populateTimeline()
  populateOffsets()

  function toIndex(index: number, vars?: Record<string, unknown>): unknown {
    const v: Record<string, unknown> = vars ? { ...vars } : {}
    if (Math.abs(index - curIndex) > length / 2) {
      index += index > curIndex ? -length : length
    }
    const newIndex = (gsap.utils.wrap as (a: number, b: number, c: number) => number)(
      0,
      length,
      index,
    )
    let time = times[newIndex]
    if (time > tl.time() !== index > curIndex && index !== curIndex) {
      time += tl.duration() * (index > curIndex ? 1 : -1)
    }
    if (time < 0 || time > tl.duration()) {
      v.modifiers = { time: timeWrap }
    }
    curIndex = newIndex
    v.overwrite = true
    if (proxy) gsap.killTweensOf(proxy)
    return v.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, v)
  }

  tl.toIndex = toIndex
  tl.closestIndex = (setCurrent?: boolean) => {
    const index = getClosest(times, tl.time(), tl.duration())
    if (setCurrent) {
      curIndex = index
      indexIsDirty = false
    }
    return index
  }
  tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex)
  tl.next = (vars?: Record<string, unknown>) => toIndex(tl.current() + 1, vars)
  tl.previous = (vars?: Record<string, unknown>) => toIndex(tl.current() - 1, vars)
  tl.times = times
  tl.progress(1, true).progress(0, true) // pre-render for performance

  if (config.reversed) {
    tl.vars.onReverseComplete()
    tl.reverse()
  }

  if (config.draggable && Draggable && typeof Draggable.create === 'function') {
    proxy = document.createElement('div')
    const wrap = (gsap.utils.wrap as (a: number, b: number) => (n: number) => number)(0, 1)
    let ratio = 0
    let startProgress = 0
    let lastSnap = 0
    let initChangeX = 0
    let wasPlaying = false
    let draggable: DraggableInstance

    const align = (): void => {
      tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio))
    }
    const syncIndex = (): number => tl.closestIndex(true)

    draggable = Draggable.create(proxy, {
      trigger: items[0].parentNode,
      type: 'x',
      onPressInit(this: DraggableInstance) {
        const x = this.x
        gsap.killTweensOf(tl)
        wasPlaying = !tl.paused()
        tl.pause()
        startProgress = tl.progress()
        refresh()
        ratio = 1 / totalWidth
        initChangeX = startProgress / -ratio - x
        gsap.set(proxy, { x: startProgress / -ratio })
        config.onDragStart?.()
      },
      onDrag: align,
      onThrowUpdate: align,
      overshootTolerance: 0,
      inertia: true,
      maxDuration: 1.5,
      minDuration: 0.3,
      snap(this: DraggableInstance, value: number): number {
        if (Math.abs(startProgress / -ratio - this.x) < 10) {
          return lastSnap + initChangeX
        }
        let time = -(value * ratio) * tl.duration()
        const wrappedTime = timeWrap(time)
        const snapTime = times[getClosest(times, wrappedTime, tl.duration())]
        let dif = snapTime - wrappedTime
        if (Math.abs(dif) > tl.duration() / 2) dif += dif < 0 ? tl.duration() : -tl.duration()
        lastSnap = (time + dif) / tl.duration() / -ratio
        return lastSnap
      },
      onRelease(this: DraggableInstance) {
        syncIndex()
        if (this.isThrowing) indexIsDirty = true
        config.onRelease?.(!!this.isThrowing)
      },
      onThrowComplete: () => {
        syncIndex()
        if (wasPlaying) tl.play()
        config.onThrowComplete?.(curIndex)
      },
    })[0]

    tl.touchCleanup = attachTouchScrollGuard(
      items[0].parentNode as HTMLElement,
      draggable,
      () => config.onRelease?.(false),
    )

    tl.draggable = draggable
  }

  tl.closestIndex(true)

  // Move to center on load if configured (also runs a deep refresh so the
  // first slide is positioned at the centered offset).
  if (config.center) {
    toIndex(0, { duration: 0 })
    refresh(true)
  }

  lastIndex = curIndex
  if (onChange) onChange(items[curIndex], curIndex)

  // Expose refresh on the timeline so the resize bus can call it without
  // capturing a closure here.
  tl.refresh = refresh

  return tl as SliderLoop
}
