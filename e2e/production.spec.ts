import { test, expect } from '@playwright/test'

/**
 * Production smoke test - tests against the actual Vercel deployment
 * with real API calls (no mocking).
 */
test.describe('Production Smoke Test', () => {
  test('loads demo data from real API', async ({ page }) => {
    // Capture all console messages
    page.on('console', (msg) => {
      console.log(`[${msg.type()}] ${msg.text()}`)
    })

    // Go to production
    await page.goto('/')

    // Verify landing page
    await expect(page.getByText('nfchat')).toBeVisible({ timeout: 10000 })
    console.log('✓ Landing page loaded')

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/before-load.png', fullPage: true })

    // Click Load Demo Dataset
    await page.getByRole('button', { name: /load demo/i }).click()
    console.log('✓ Clicked Load Demo Dataset')

    // Wait a bit and take screenshot
    await page.waitForTimeout(5000)
    await page.screenshot({ path: 'test-results/after-5s.png', fullPage: true })

    // Check for error message
    const errorVisible = await page.locator('[class*="destructive"]').isVisible().catch(() => false)
    if (errorVisible) {
      const errorText = await page.locator('[class*="destructive"]').textContent()
      console.log('Error on page:', errorText)
      throw new Error(`Page shows error: ${errorText}`)
    }

    // Wait for dashboard (real MotherDuck - may take a while)
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 120000 })
    console.log('✓ Dashboard loaded!')

    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true })
  })
})
