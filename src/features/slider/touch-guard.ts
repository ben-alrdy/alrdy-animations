interface TouchGuardTarget {
  enable: () => void
  disable: () => void
}

/**
 * Disable a Draggable while the user is scrolling the page vertically, so a
 * vertical swipe over the slider scrolls the page instead of dragging the
 * track. Shared by both slider engines (horizontalLoop + finiteTrack).
 *
 * When a drag is suppressed for vertical scroll, `onStaticRelease` is invoked
 * on touchend: disabling Draggable mid-press strips its own pointerup listener,
 * so its `onRelease` never fires, and the caller's static-press path (e.g.
 * restart autoplay) would otherwise never run. Returns a cleanup function.
 */
export function attachTouchScrollGuard(
  trigger: HTMLElement,
  draggable: TouchGuardTarget,
  onStaticRelease: () => void,
): () => void {
  let touchStartX = 0
  let touchStartY = 0
  let isDragInitialized = false
  let disabledForScroll = false

  const handleTouchStart = (e: TouchEvent): void => {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }
  const handleTouchMove = (e: TouchEvent): void => {
    if (isDragInitialized) return
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX)
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY)
    if (deltaY > deltaX) {
      draggable.disable()
      disabledForScroll = true
    } else {
      isDragInitialized = true
    }
  }
  const handleTouchEnd = (): void => {
    if (!isDragInitialized) draggable.enable()
    if (disabledForScroll) {
      disabledForScroll = false
      onStaticRelease()
    }
    isDragInitialized = false
  }

  trigger.addEventListener('touchstart', handleTouchStart, { passive: true })
  trigger.addEventListener('touchmove', handleTouchMove, { passive: true })
  trigger.addEventListener('touchend', handleTouchEnd)

  return () => {
    trigger.removeEventListener('touchstart', handleTouchStart)
    trigger.removeEventListener('touchmove', handleTouchMove)
    trigger.removeEventListener('touchend', handleTouchEnd)
  }
}
