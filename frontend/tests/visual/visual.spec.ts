import { test } from '@playwright/test'

test('login visual snapshot', async ({ page }) => {
  await page.goto('/login')
  await page.screenshot({ path: 'test-results/screenshots/login__desktop.png', fullPage: true })
})