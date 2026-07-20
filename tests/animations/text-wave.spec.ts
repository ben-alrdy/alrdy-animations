import { expect, test, type ConsoleMessage } from '@playwright/test'

const initialized = (msg: ConsoleMessage): boolean =>
  msg.text().includes('[alrdy-animate] initialized')

test.describe('text-wave (Osmo scroll-driven accent wave)', () => {
  test('initializes with the text feature + SplitText', async ({ page }) => {
    const messages: string[] = []
    page.on('console', (m) => messages.push(m.text()))
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/text/text-wave/')
    await initLog

    expect(messages.find((m) => m.includes('Missing GSAP plugins'))).toBeUndefined()
    const initLine = messages.find((m) => m.includes('[alrdy-animate] initialized'))
    expect(initLine).toMatch(/Features:.*text/)
    expect(initLine).toMatch(/Plugins:.*SplitText/)
  })

  test('rests dim, passes through the accent going forward, and the base catches up on stop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/text/text-wave/')
    await initLog

    const wave = page.locator('h1[aa-animate="text-wave"]').first()

    // At rest: units are faint (opacity < 0.4) in the base colour, no accent.
    const rest = await wave.evaluate((el) => {
      const chars = [...el.querySelectorAll('.aa-char')] as HTMLElement[]
      return {
        count: chars.length,
        dim: chars.filter((c) => parseFloat(getComputedStyle(c).opacity) < 0.4).length,
      }
    })
    expect(rest.count).toBeGreaterThan(0)
    expect(rest.dim).toBe(rest.count)

    // Scroll in and sample every frame: some char must pass through the accent.
    const sawAccent = await wave.evaluate(
      (el) =>
        new Promise<boolean>((resolve) => {
          const near = (color: string) => {
            const m = color.match(/\d+/g)?.map(Number)
            return !!m && m[0] > 150 && m[1] < 130 && m[2] < 120
          }
          el.scrollIntoView({ block: 'center' })
          const chars = [...el.querySelectorAll('.aa-char')] as HTMLElement[]
          const start = performance.now()
          const tick = () => {
            if (chars.some((c) => near(getComputedStyle(c).color))) return resolve(true)
            if (performance.now() - start > 2500) return resolve(false)
            requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }),
    )
    expect(sawAccent).toBe(true)

    // Stop scrolling: in-flight pulses finish → every activated char settles to
    // the base colour at full opacity (the base "catches up").
    await page.waitForTimeout(1500)
    const settled = await wave.evaluate((el) => {
      const base = getComputedStyle(el as HTMLElement).color
      const chars = [...el.querySelectorAll('.aa-char')] as HTMLElement[]
      return {
        base,
        opaque: chars.filter((c) => parseFloat(getComputedStyle(c).opacity) > 0.9).length,
        onBase: chars.filter((c) => getComputedStyle(c).color === base).length,
        count: chars.length,
      }
    })
    expect(settled.opaque).toBe(settled.count)
    expect(settled.onBase).toBe(settled.count)
  })

  test('scrolling back up shows no accent', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/text/text-wave/')
    await initLog

    const wave = page.locator('h1[aa-animate="text-wave"]').first()
    await wave.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200) // fully revealed on base

    // Scroll back to the top and watch every frame — the deactivation must fade
    // straight to the dim state without ever hitting the accent.
    const accentSeenOnReverse = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const near = (color: string) => {
            const m = color.match(/\d+/g)?.map(Number)
            return !!m && m[0] > 150 && m[1] < 130 && m[2] < 120
          }
          const el = document.querySelector('h1[aa-animate="text-wave"]')!
          const chars = [...el.querySelectorAll('.aa-char')] as HTMLElement[]
          window.scrollTo(0, 0)
          const start = performance.now()
          const tick = () => {
            if (chars.some((c) => near(getComputedStyle(c).color))) return resolve(true)
            if (performance.now() - start > 1200) return resolve(false)
            requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }),
    )
    expect(accentSeenOnReverse).toBe(false)
  })
})
