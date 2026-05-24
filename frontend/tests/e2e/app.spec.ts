import { test, expect } from '@playwright/test'

const publicRoutes = ['/login', '/']
const protectedRoutes = ['/dashboard', '/patients', '/appointments', '/chatbot', '/report-analyzer', '/drug-checker', '/clinical-support', '/analytics']
const screenshots = new Map([
  ['mobile', { width: 375, height: 667 }],
  ['tablet', { width: 768, height: 1024 }],
  ['desktop', { width: 1440, height: 900 }],
])

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email Address').fill('admin@hospital.com')
  await page.getByLabel('Password').fill('Admin@123')
  const loginResponse = page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Sign In' }).click()
  expect((await loginResponse).ok()).toBe(true)
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

test.describe('public routes', () => {
  for (const route of publicRoutes) {
    test(`${route} loads without console errors`, async ({ page }) => {
      const consoleErrors = []
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text())
        }
      })

      const failedResponses = []
      page.on('response', (response) => {
        if (response.status() >= 400) {
          failedResponses.push(`${response.status()} ${response.url()}`)
        }
      })

      const response = await page.goto(route)
      expect(response?.status()).toBe(200)
      await page.waitForLoadState('networkidle')
      expect(consoleErrors).toEqual([])
      expect(failedResponses).toEqual([])
    })
  }
})

test.describe('authenticated journey', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates key screens and performs CRUD flows', async ({ page }) => {
    const consoleErrors = []
    const failedResponses = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`)
    })

    const [patientsResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/patients') && response.request().method() === 'GET'),
      page.waitForURL(/\/patients$/),
      page.getByRole('link', { name: 'Patients', exact: true }).click(),
    ])
    expect(patientsResponse.ok()).toBe(true)
    await expect(page.getByRole('heading', { name: 'Patients', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Add Patient' }).click()
    await page.getByLabel('name*').fill(`E2E Patient ${Date.now()}`)
    await page.getByLabel('age*').fill('41')
    await page.getByLabel('phone*').fill('9998887771')
    await page.getByLabel('email').fill('e2e.patient@example.com')
    await page.getByLabel('address*').fill('E2E Address')
    await page.getByLabel('emergency contact*').fill('E2E Contact')
    const patientCreateResponse = page.waitForResponse((response) => response.url().includes('/api/patients') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Register Patient' }).click()
    expect((await patientCreateResponse).ok()).toBe(true)
    await expect(page.getByText('Patient registered')).toBeVisible()

    await Promise.all([
      page.waitForURL(/\/appointments$/),
      page.getByRole('link', { name: 'Appointments', exact: true }).click(),
    ])
    await expect(page.getByRole('heading', { name: 'Appointments', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Book Appointment' }).first().click()
    await page.getByLabel('Patient').selectOption({ index: 1 })
    await page.getByLabel('Doctor Name').fill('Dr. E2E')
    await page.getByLabel('Date & Time').fill('2026-05-23T09:30')
    await page.getByLabel('Reason').fill('E2E appointment')
    const appointmentRequest = page.waitForResponse((response) => response.url().includes('/appointments') && response.request().method() === 'POST' && response.status() === 200)
    await page.locator('form').getByRole('button', { name: 'Book Appointment' }).click()
    await appointmentRequest

    await Promise.all([
      page.waitForURL(/\/chatbot$/),
      page.getByRole('link', { name: 'AI Chatbot' }).click(),
    ])
    await expect(page.getByRole('main').getByRole('heading', { name: 'MedAssist AI' })).toBeVisible()
    await page.getByLabel(/Chat input|textarea/i).fill('I have chest pain')

    await Promise.all([
      page.waitForURL(/\/analytics$/),
      page.getByRole('link', { name: 'Analytics', exact: true }).click(),
    ])
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    expect(consoleErrors).toEqual([])
    expect(failedResponses).toEqual([])
  })
})

test.describe('responsive screenshots', () => {
  for (const [viewportName, viewport] of screenshots) {
    test(`dashboard screenshots for ${viewportName}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await login(page)
      const screenshotPath = `test-results/screenshots/dashboard__${viewportName}.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    })
  }
})
