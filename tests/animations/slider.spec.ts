import { expect, test, type ConsoleMessage } from '@playwright/test'

const initialized = (msg: ConsoleMessage): boolean =>
  msg.text().includes('[alrdy-animate] initialized')

test.describe('slider demo page', () => {
  test('lib initializes with slider feature and the right plugins', async ({ page }) => {
    const messages: string[] = []
    page.on('console', (m) => messages.push(m.text()))

    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog

    expect(messages.find((m) => m.includes('Missing GSAP plugins'))).toBeUndefined()

    const initLine = messages.find((m) => m.includes('[alrdy-animate] initialized'))
    expect(initLine).toMatch(/Features:.*slider/)
    expect(initLine).toMatch(/Plugins:.*ScrollTrigger/)
    expect(initLine).toMatch(/Plugins:.*Draggable/)
    expect(initLine).toMatch(/Plugins:.*InertiaPlugin/)
  })

  test('first slider initializes with slide 1 active and counter "01/05"', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog
    await page.waitForTimeout(300)

    const firstSlider = page.locator('[aa-slider]').first()
    const items = firstSlider.locator('[aa-slider-item]')
    expect(await items.first().getAttribute('class')).toMatch(/is-active/)
    expect(await firstSlider.locator('[aa-slider-current]').textContent()).toBe('01')
    expect(await firstSlider.locator('[aa-slider-total]').textContent()).toBe('05')
  })

  test('next button advances slide; counter updates and active class moves', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog
    await page.waitForTimeout(300)

    const firstSlider = page.locator('[aa-slider]').first()
    await firstSlider.locator('[aa-slider-next]').click()
    await page.waitForTimeout(900)

    expect(await firstSlider.locator('[aa-slider-current]').textContent()).toBe('02')
    const secondItem = firstSlider.locator('[aa-slider-item]').nth(1)
    expect(await secondItem.getAttribute('class')).toMatch(/is-active/)
  })

  test('arrow-right key advances the slider; arrow-left rewinds', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog
    await page.waitForTimeout(300)

    const firstSlider = page.locator('[aa-slider]').first()
    await firstSlider.focus()

    await firstSlider.press('ArrowRight')
    await page.waitForTimeout(900)
    expect(await firstSlider.locator('[aa-slider-current]').textContent()).toBe('02')

    await firstSlider.press('ArrowLeft')
    await page.waitForTimeout(900)
    expect(await firstSlider.locator('[aa-slider-current]').textContent()).toBe('01')

    await firstSlider.press('End')
    await page.waitForTimeout(900)
    expect(await firstSlider.locator('[aa-slider-current]').textContent()).toBe('05')
  })

  test('thumb click on centered slider jumps to that slide', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog
    await page.waitForTimeout(300)

    const centered = page.locator('#aa-slider-centered')
    const thumbs = centered.locator('[aa-slider-button]')
    await thumbs.nth(3).click()
    await page.waitForTimeout(1000)

    const items = centered.locator('[aa-slider-item]')
    expect(await items.nth(3).getAttribute('class')).toMatch(/is-active/)
    expect(await thumbs.nth(3).getAttribute('aria-current')).toBe('true')
  })

  test('progress bar fills from 0% during dwell on autoplay', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog

    // Centered slider is below the fold; autoplay only kicks in once it
    // crosses into the viewport (its ScrollTrigger fires onEnter).
    const centered = page.locator('#aa-slider-centered')
    await centered.scrollIntoViewIfNeeded()
    // Sample mid-dwell (delay = 3s; sample at ~1.5s after autoplay starts).
    await page.waitForTimeout(1500)

    const progress = centered.locator('[aa-slider-button]').first().locator('[aa-slider-progress]')
    const widthPct = await progress.evaluate((el) => {
      const w = parseFloat(getComputedStyle(el as HTMLElement).width)
      const parent = (el as HTMLElement).parentElement
      const parentWidth = parent ? parseFloat(getComputedStyle(parent).width) : 0
      return parentWidth ? (w / parentWidth) * 100 : 0
    })
    expect(widthPct).toBeGreaterThan(5)
    expect(widthPct).toBeLessThan(95)
  })

  test('finite slider clamps at the start: prev is disabled and does not wrap', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog
    await page.waitForTimeout(300)

    const finite = page.locator('#aa-slider-finite-basic')
    const prev = finite.locator('[aa-slider-prev]')
    const current = finite.locator('[aa-slider-current]')

    // On the first slide prev is disabled (both the class and ARIA).
    expect(await current.textContent()).toBe('01')
    expect(await prev.getAttribute('class')).toMatch(/is-disabled/)
    expect(await prev.getAttribute('aria-disabled')).toBe('true')

    // Clicking prev at the start is a no-op — no wrap to the last slide.
    // force:true bypasses Playwright's actionability check (it won't click an
    // aria-disabled element), which lets us prove the handler no-ops.
    await prev.click({ force: true })
    await page.waitForTimeout(700)
    expect(await current.textContent()).toBe('01')
  })

  test('finite slider clamps at the end: next is disabled and does not wrap', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog
    await page.waitForTimeout(300)

    const finite = page.locator('#aa-slider-finite-basic')
    const next = finite.locator('[aa-slider-next]')
    const current = finite.locator('[aa-slider-total]')

    await finite.focus()
    await finite.press('End')
    await page.waitForTimeout(700)
    expect(await finite.locator('[aa-slider-current]').textContent()).toBe('05')

    // At the last slide next is disabled and clicking it does not wrap to 01.
    expect(await next.getAttribute('class')).toMatch(/is-disabled/)
    expect(await next.getAttribute('aria-disabled')).toBe('true')
    await next.click({ force: true })
    await page.waitForTimeout(700)
    expect(await finite.locator('[aa-slider-current]').textContent()).toBe('05')
    // Total is unchanged (sanity that we're on the right slider).
    expect(await current.textContent()).toBe('05')
  })

  test('finite multi-up slider does not overscroll past the last slide', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog
    await page.waitForTimeout(300)

    const multi = page.locator('#aa-slider-finite-multi')
    await multi.scrollIntoViewIfNeeded()
    await multi.focus()
    await multi.press('End')
    await page.waitForTimeout(700)

    // At the end, the last slide's right edge must line up with the track's
    // right edge (no blank space past it). Pre-fix, left-aligning the last
    // slide would leave its right edge well inside the viewport.
    const gap = await multi.evaluate((root) => {
      const items = root.querySelectorAll('[aa-slider-item]')
      const track = items[0].parentElement as HTMLElement
      const last = items[items.length - 1] as HTMLElement
      return last.getBoundingClientRect().right - track.getBoundingClientRect().right
    })
    expect(Math.abs(gap)).toBeLessThan(2)
  })

  test('inside-slide animation plays on slide-active, reverses on slide-inactive', async ({ page }) => {
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/components/slider/')
    await initLog
    await page.waitForTimeout(800)

    // The third demo on the page is the inside-slide-trigger one (autoplay,
    // no draggable, no center). Pick the one whose first item contains the
    // 'Discover' heading.
    const triggerSlider = page
      .locator('[aa-slider]')
      .filter({ has: page.locator('text=Discover') })
      .first()
    // text-fade-up + aa-split="lines mask" tweens the .aa-line wrappers, not
    // the h3 itself. Read opacity off the first line of each heading.
    const firstLine = triggerSlider
      .locator('[aa-slider-item]')
      .nth(0)
      .locator('h3 .aa-line')
      .first()
    const secondLine = triggerSlider
      .locator('[aa-slider-item]')
      .nth(1)
      .locator('h3 .aa-line')
      .first()

    // First slide is active on init → its heading lines should be near full
    // opacity after the fade-up runs (~0.5s duration).
    await page.waitForTimeout(900)
    const initialOpacity = parseFloat(
      await firstLine.evaluate((el) => getComputedStyle(el as HTMLElement).opacity),
    )
    expect(initialOpacity).toBeGreaterThan(0.85)

    // Click next button on this slider to deactivate slide 1 and activate slide 2.
    await triggerSlider.locator('[aa-slider-next]').click()
    await page.waitForTimeout(900)

    // Slide 1's heading lines should reverse back toward 0 opacity.
    const reversedOpacity = parseFloat(
      await firstLine.evaluate((el) => getComputedStyle(el as HTMLElement).opacity),
    )
    expect(reversedOpacity).toBeLessThan(0.5)

    // Slide 2's heading lines should now be near full opacity.
    const secondOpacity = parseFloat(
      await secondLine.evaluate((el) => getComputedStyle(el as HTMLElement).opacity),
    )
    expect(secondOpacity).toBeGreaterThan(0.85)
  })
})
