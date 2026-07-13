import type { GsapHandle } from '../../core/gsap-detect'
import type {
  DraggableInstance,
  HorizontalLoopConfig,
  SliderLoop,
} from './horizontal-loop'
import { attachTouchScrollGuard } from './touch-guard'

interface DraggableConstructor {
  create: (target: unknown, vars: Record<string, unknown>) => DraggableInstance[]
}

/**
 * Finite (non-looping) counterpart to horizontalLoop. Implements the same
 * SliderLoop interface but the track has hard start/end bounds: navigation
 * clamps at the first/last slide and Draggable is bounded (no wrap). Items are
 * translated collectively via a single `x` transform rather than the loop's
 * per-item xPercent wrap, so nav siblings are never moved and no track-wrapper
 * is assumed. The infinite engine's delicate math is intentionally not reused.
 */
export function finiteTrack(
  gsapHandle: GsapHandle,
  rawItems: ArrayLike<Element>,
  config: HorizontalLoopConfig = {},
): SliderLoop {
  const gsap = gsapHandle.gsap as unknown as Record<string, any>
  const Draggable = gsapHandle.plugins.Draggable as DraggableConstructor | undefined

  const items: HTMLElement[] = (gsap.utils.toArray as (v: unknown) => HTMLElement[])(rawItems)
  const length = items.length
  const onChange = config.onChange
  const center = config.center
  // index.ts passes the per-slide transition duration as `speed` (horizontalLoop
  // reads that field as pixels-per-second; finite uses it only as the fallback
  // duration for a toIndex/next call that omits an explicit one — every real
  // caller passes a duration, so this is just a defensive default).
  const fallbackDuration = config.speed && config.speed > 0 ? config.speed : 0.5

  // Items' parent is the overflow-clipping viewport (the convention the loop's
  // center mode also relies on).
  const container = items[0].parentNode as HTMLElement

  const targets: number[] = []
  let minX = 0
  let maxX = 0
  let curIndex = 0
  let lastIndex = 0
  let currentX = 0
  let indexIsDirty = false
  // True when the last populate() ran while the track was laid out at 0 width
  // (slider hidden inside a closed modal / form-success). refresh() uses it to
  // spot the reveal and re-seat onto the first slide.
  let measuredHidden = false

  const clamp = (min: number, max: number, v: number): number =>
    v < min ? min : v > max ? max : v

  const getPropX = (el: HTMLElement): number =>
    parseFloat(String(gsap.getProperty(el, 'x', 'px'))) || 0

  const getClosestIndex = (value: number): number => {
    let closest = 1e10
    let index = 0
    for (let i = 0; i < length; i++) {
      const d = Math.abs(targets[i] - value)
      if (d < closest) {
        closest = d
        index = i
      }
    }
    return index
  }

  // The x that seats slide `i`, clamped to the reachable range. Index detection
  // uses the raw `targets`; positioning goes through this so a multi-up
  // left-aligned track never scrolls past its last slide (matching drag bounds).
  const xForIndex = (i: number): number =>
    clamp(minX, maxX, targets[clamp(0, length - 1, i)])

  const populate = (): void => {
    const containerWidth = container.offsetWidth
    measuredHidden = containerWidth === 0
    const startLeft = items[0].offsetLeft
    let contentWidth = 0
    items.forEach((el, i) => {
      const slideLeft = el.offsetLeft - startLeft
      const width = el.offsetWidth
      targets[i] = center ? containerWidth / 2 - (slideLeft + width / 2) : -slideLeft
      // Inter-item gaps are already baked into offsetLeft, so the content's
      // right edge is simply the last slide's left offset plus its width.
      contentWidth = slideLeft + width
    })
    if (center) {
      maxX = targets[0]
      minX = targets[length - 1]
    } else {
      maxX = 0
      minX = Math.min(0, containerWidth - contentWidth)
    }
  }

  const applyX = (x: number): void => {
    gsap.set(items, { x })
    currentX = x
  }

  const fireChange = (index: number): void => {
    if (index === lastIndex) return
    lastIndex = index
    if (onChange) onChange(items[index], index)
  }

  const tl = gsap.timeline({ paused: true }) as any

  const closestIndex = (setCurrent?: boolean): number => {
    const index = getClosestIndex(currentX)
    if (setCurrent) {
      curIndex = index
      indexIsDirty = false
    }
    return index
  }

  const current = (): number => (indexIsDirty ? closestIndex(true) : curIndex)

  let moveTween: { kill: () => void } | null = null

  function toIndex(index: number, vars?: Record<string, unknown>): unknown {
    const target = clamp(0, length - 1, Math.round(index))
    const targetX = xForIndex(target)
    curIndex = target
    fireChange(target)
    const duration = vars?.['duration'] as number | undefined
    if (duration === 0) {
      moveTween?.kill()
      applyX(targetX)
      return undefined
    }
    moveTween = gsap.to(items, {
      x: targetX,
      duration: duration ?? fallbackDuration,
      ease: (vars?.['ease'] as string | undefined) ?? 'power2.out',
      overwrite: true,
      onUpdate: () => {
        currentX = getPropX(items[0])
      },
      onComplete: () => {
        currentX = targetX
      },
    })
    return moveTween
  }

  let proxy: HTMLDivElement | undefined

  gsap.set(items, { x: 0 })
  populate()

  tl.toIndex = toIndex
  tl.closestIndex = closestIndex
  tl.current = current
  tl.next = (vars?: Record<string, unknown>) => toIndex(current() + 1, vars)
  tl.previous = (vars?: Record<string, unknown>) => toIndex(current() - 1, vars)
  tl.times = targets

  const refresh = (): void => {
    const wasHidden = measuredHidden
    populate()
    const drag = tl.draggable as DraggableInstance | undefined
    if (drag) {
      ;(drag as unknown as { applyBounds: (b: unknown) => void }).applyBounds({ minX, maxX })
    }
    if (wasHidden && !measuredHidden) {
      // Reveal from hidden: the seated index was built on zero-width metrics.
      // Reset to the first slide and fire onChange so counter/active-class move.
      curIndex = 0
      lastIndex = -1
      applyX(xForIndex(0))
      fireChange(0)
    } else {
      applyX(xForIndex(curIndex))
    }
  }
  tl.refresh = refresh

  if (config.draggable && Draggable && typeof Draggable.create === 'function') {
    proxy = document.createElement('div')
    let draggable: DraggableInstance

    draggable = Draggable.create(proxy, {
      trigger: items[0].parentNode,
      type: 'x',
      bounds: { minX, maxX },
      edgeResistance: 0.85,
      inertia: true,
      maxDuration: 1.5,
      minDuration: 0.3,
      onPressInit(this: DraggableInstance) {
        // Stop any nav tween in flight; its onUpdate has kept currentX current.
        moveTween?.kill()
        // Re-measure geometry (layout may have shifted) but do NOT re-seat: a
        // press mid-throw must hold the current position, not snap back to the
        // slide the throw started from. refresh() re-seats, so we measure by hand.
        populate()
        ;(draggable as unknown as { applyBounds: (b: unknown) => void }).applyBounds({
          minX,
          maxX,
        })
        gsap.set(proxy, { x: currentX })
        config.onDragStart?.()
      },
      onDrag(this: DraggableInstance) {
        applyX(this.x)
        fireChange(getClosestIndex(this.x))
      },
      onThrowUpdate(this: DraggableInstance) {
        applyX(this.x)
        fireChange(getClosestIndex(this.x))
      },
      snap(value: number): number {
        return clamp(minX, maxX, targets[getClosestIndex(value)])
      },
      onRelease(this: DraggableInstance) {
        const wasThrowing = !!this.isThrowing
        closestIndex(true)
        if (wasThrowing) indexIsDirty = true
        config.onRelease?.(wasThrowing)
      },
      onThrowComplete() {
        closestIndex(true)
        fireChange(curIndex)
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

  // The movement tween lives on `items`, not as a child of the empty timeline,
  // so the native kill() wouldn't stop it. Wrap kill to clean both up.
  const nativeKill = tl.kill.bind(tl)
  tl.kill = (): unknown => {
    moveTween?.kill()
    gsap.killTweensOf(items)
    if (proxy) gsap.killTweensOf(proxy)
    return nativeKill()
  }

  applyX(xForIndex(0))
  curIndex = 0
  lastIndex = 0
  if (onChange) onChange(items[0], 0)

  return tl as SliderLoop
}
