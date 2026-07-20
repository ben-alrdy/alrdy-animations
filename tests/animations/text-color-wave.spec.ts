import { expect, test, type ConsoleMessage } from '@playwright/test'

const initialized = (msg: ConsoleMessage): boolean =>
  msg.text().includes('[alrdy-animate] initialized')

const ACCENT = 'rgb(248, 65, 49)' // #F84131

test.describe('text accent colour wave (aa-color on text-fade*)', () => {
  test('rests dim in the base colour, pulses through the accent, then settles to base', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/text/text-fade/')
    await initLog

    const wave = page.locator('h1[aa-animate="text-fade"][aa-color="#F84131"]').first()

    // At rest (paused at the from-state) each char sits in the *base* colour —
    // no accent tint yet; the accent arrives as the char fills in.
    const base = await wave.evaluate((el) => getComputedStyle(el as HTMLElement).color)
    await expect
      .poll(() =>
        wave.evaluate((el) => {
          const c = el.querySelector('.aa-char') as HTMLElement | null
          return c ? getComputedStyle(c).color : null
        }),
      )
      .toBe(base)

    // Play it and sample every frame: some char must pass through the accent.
    const sawAccent = await wave.evaluate(
      (el, accent) =>
        new Promise<boolean>((resolve) => {
          el.scrollIntoView({ block: 'center' })
          const chars = [...el.querySelectorAll('.aa-char')] as HTMLElement[]
          const start = performance.now()
          const tick = () => {
            const hit = chars.some((c) => getComputedStyle(c).color === accent)
            if (hit) return resolve(true)
            if (performance.now() - start > 2500) return resolve(false)
            requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }),
      ACCENT,
    )
    expect(sawAccent).toBe(true)

    // After the pulse settles, chars are back at the base colour and opaque.
    await page.waitForTimeout(1500)
    const done = await wave.evaluate((el) => {
      const c = el.querySelector('.aa-char') as HTMLElement | null
      return {
        color: c ? getComputedStyle(c).color : null,
        opacity: c ? parseFloat(getComputedStyle(c).opacity) : 0,
      }
    })
    expect(done.color).toBe(base)
    expect(done.color).not.toBe(ACCENT)
    expect(done.opacity).toBeGreaterThan(0.9) // opacity fade runs alongside the pulse
  })

  test('plain text-fade (no aa-color) does not inject a colour', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const initLog = page.waitForEvent('console', { predicate: initialized, timeout: 8000 })
    await page.goto('/animations/text/text-fade/')
    await initLog

    const plain = page.locator('h1[aa-animate="text-fade"]:not([aa-color])').first()
    await plain.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)

    const inlineColor = await plain.evaluate((el) => {
      const c = el.querySelector('.aa-char') as HTMLElement | null
      return c ? c.style.color : null
    })
    expect(inlineColor).toBe('') // no wave: GSAP never touched `color`
  })
})
