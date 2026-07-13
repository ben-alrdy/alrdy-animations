import { emitTrigger } from '../../core/trigger'

let sliderInstanceCounter = 0

export interface NavSetupResult {
  /** onChange callback for the horizontalLoop config — wires up class/ARIA toggles + emits events. */
  onChange: (item: Element, rawIndex: number) => void
  /** Items the slider is operating on (already queried). */
  items: HTMLElement[]
  /** Total slide count. */
  total: number
  /** Wire up click handlers; needs the slider timeline + nav-restart callback. */
  attachClickListeners: (handlers: NavClickHandlers) => () => void
}

export interface NavClickHandlers {
  next: () => void
  previous: () => void
  toIndex: (target: number) => void
  current: () => number
}

export interface NavOptions {
  /** Finite (non-looping) slider: disable prev/next at the first/last slide. */
  finite?: boolean
}

export function setupNav(root: HTMLElement, opts: NavOptions = {}): NavSetupResult {
  const items = Array.from(root.querySelectorAll<HTMLElement>('[aa-slider-item]'))
  if (items.length === 0) {
    return {
      onChange: () => {},
      items: [],
      total: 0,
      attachClickListeners: () => () => {},
    }
  }

  const total = items.length
  const sliderIdPrefix = root.id || `aa-slider-${sliderInstanceCounter++}`

  const nextButton = root.querySelector<HTMLElement>('[aa-slider-next]')
  const prevButton = root.querySelector<HTMLElement>('[aa-slider-prev]')
  const currentEl = root.querySelector<HTMLElement>('[aa-slider-current]')
  const totalEl = root.querySelector<HTMLElement>('[aa-slider-total]')

  // Slide-specific buttons: include those nested inside the slider plus any
  // external ones that target this slider's id via aa-slider-target.
  const internalThumbs = Array.from(root.querySelectorAll<HTMLElement>('[aa-slider-button]'))
  const externalThumbs = root.id
    ? Array.from(
        document.querySelectorAll<HTMLElement>(
          `[aa-slider-button][aa-slider-target="${root.id}"]`,
        ),
      )
    : []
  const thumbs = [...internalThumbs, ...externalThumbs]

  // Root ARIA. Don't override an existing role attribute (Webflow CMS lists
  // for instance). aa-slider-region role enables tablist semantics for thumbs.
  if (!root.hasAttribute('role')) root.setAttribute('role', 'region')
  root.setAttribute('aria-roledescription', 'carousel')
  // A carousel region needs an accessible name. Supply a generic fallback when
  // the author hasn't labelled it — otherwise screen readers announce an unnamed
  // "carousel", and a bare role="region" with no name is itself flagged.
  if (!root.hasAttribute('aria-label') && !root.hasAttribute('aria-labelledby')) {
    root.setAttribute('aria-label', 'Carousel')
  }

  // Per-slide ARIA + unique id.
  items.forEach((slide, i) => {
    const isCmsItem = slide.classList.contains('w-dyn-item')
    if (!isCmsItem && !slide.hasAttribute('role')) slide.setAttribute('role', 'group')
    slide.setAttribute('aria-roledescription', 'slide')
    slide.setAttribute('aria-label', `Slide ${i + 1} of ${total}`)
    if (!slide.id) slide.id = `${sliderIdPrefix}-slide-${i}`
  })

  if (nextButton) {
    if (!nextButton.hasAttribute('aria-label')) nextButton.setAttribute('aria-label', 'Next slide')
    if (!nextButton.hasAttribute('role')) nextButton.setAttribute('role', 'button')
  }
  if (prevButton) {
    if (!prevButton.hasAttribute('aria-label'))
      prevButton.setAttribute('aria-label', 'Previous slide')
    if (!prevButton.hasAttribute('role')) prevButton.setAttribute('role', 'button')
  }

  if (thumbs.length > 0) {
    thumbs.forEach((btn, i) => {
      if (!btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', `Go to slide ${i + 1}`)
      // Plain labelled buttons rather than role="tab": a tab requires a strict
      // role="tablist" parent, which can't be guaranteed when thumbs come from a
      // Webflow CMS Collection List (each thumb is wrapped in a role="listitem"
      // .w-dyn-item inside a role="list" .w-dyn-items). aria-current marks the
      // active dot — see onChange below.
      if (btn.tagName !== 'BUTTON' && !btn.hasAttribute('role')) btn.setAttribute('role', 'button')
      btn.setAttribute('aria-controls', `${sliderIdPrefix}-slide-${i}`)
    })
  }

  if (totalEl) {
    totalEl.textContent = total < 10 ? `0${total}` : String(total)
  }

  const formatIndex = (n: number): string => (n < 10 ? `0${n}` : String(n))

  const onChange = (_item: Element, rawIndex: number): void => {
    const index = ((rawIndex % total) + total) % total

    items.forEach((slide, i) => {
      const wasActive = slide.classList.contains('is-active')
      const isActive = i === index
      slide.classList.toggle('is-active', isActive)
      // Deliberately no aria-hidden toggle: slide width is CSS-driven, so the
      // library can't know how many slides are actually on screen (multi-up,
      // center mode, partial neighbours). Hiding all-but-active would hide
      // visible content and risk aria-hidden-focus. The active slide is conveyed
      // by the is-active class and the active dot's aria-current.
      if (isActive && !wasActive) emitTrigger(slide, 'slide-active')
      else if (!isActive && wasActive) emitTrigger(slide, 'slide-inactive')
    })

    if (thumbs.length > 0) {
      thumbs.forEach((btn, i) => {
        const isActive = i === index
        btn.classList.toggle('is-active', isActive)
        if (isActive) btn.setAttribute('aria-current', 'true')
        else btn.removeAttribute('aria-current')
      })
    }

    if (currentEl) {
      currentEl.textContent = formatIndex(index + 1)
    }

    // Finite slider: reflect the hard bounds on the arrow buttons so authors
    // can style the disabled state. The handlers still fire but the engine
    // clamps, so this is purely an affordance.
    if (opts.finite) {
      if (prevButton) {
        const disabled = index === 0
        prevButton.classList.toggle('is-disabled', disabled)
        prevButton.setAttribute('aria-disabled', String(disabled))
      }
      if (nextButton) {
        const disabled = index === total - 1
        nextButton.classList.toggle('is-disabled', disabled)
        nextButton.setAttribute('aria-disabled', String(disabled))
      }
    }
  }

  const attachClickListeners = (handlers: NavClickHandlers): (() => void) => {
    const cleanups: Array<() => void> = []
    const add = (el: HTMLElement, evt: string, fn: EventListener): void => {
      el.addEventListener(evt, fn)
      cleanups.push(() => el.removeEventListener(evt, fn))
    }

    if (nextButton) add(nextButton, 'click', () => handlers.next())
    if (prevButton) add(prevButton, 'click', () => handlers.previous())
    thumbs.forEach((btn, i) => {
      add(btn, 'click', () => {
        if (i === handlers.current()) return
        handlers.toIndex(i)
      })
    })

    return () => {
      for (const fn of cleanups) fn()
    }
  }

  return { onChange, items, total, attachClickListeners }
}
