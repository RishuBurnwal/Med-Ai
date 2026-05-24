import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email Address').fill('admin@hospital.com')
  await page.getByLabel('Password').fill('Admin@123')
  const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Sign In' }).click()
  expect((await loginResponse).ok()).toBe(true)
  await expect(page).toHaveURL(/\/dashboard$/)
}

for (const route of ['/login', '/dashboard', '/patients', '/appointments', '/analytics']) {
  test(`axe scan for ${route}`, async ({ page }) => {
    if (route === '/login') {
      await page.goto(route)
    } else {
      await login(page)
      await page.goto(route)
    }

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact || '')).length).toBe(0)
  })
}
