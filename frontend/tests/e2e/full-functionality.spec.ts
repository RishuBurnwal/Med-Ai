import { expect, test } from '@playwright/test'

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

test('complete hospital workflow from login through AI modules', async ({ page }) => {
  test.setTimeout(120000)

  const consoleErrors: string[] = []
  const failedResponses: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`)
  })

  await login(page)

  const patientName = `Full Flow Patient ${Date.now()}`
  const [patientsResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/patients') && response.request().method() === 'GET'),
    page.waitForURL(/\/patients$/),
    page.getByRole('link', { name: 'Patients', exact: true }).click(),
  ])
  expect(patientsResponse.ok()).toBe(true)
  await page.getByRole('button', { name: 'Add Patient' }).click()
  await page.getByLabel('name*').fill(patientName)
  await page.getByLabel('age*').fill('29')
  await page.getByLabel('phone*').fill('9001112233')
  await page.getByLabel('email').fill('full.flow.patient@example.com')
  await page.getByLabel('address*').fill('Full Flow Address')
  await page.getByLabel('emergency contact*').fill('Family - 9001112234')
  const patientCreateResponse = page.waitForResponse((response) => response.url().includes('/api/patients') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Register Patient' }).click()
  expect((await patientCreateResponse).ok()).toBe(true)
  await expect(page.getByText('Patient registered')).toBeVisible()

  await Promise.all([
    page.waitForURL(/\/appointments$/),
    page.getByRole('link', { name: 'Appointments', exact: true }).click(),
  ])
  await page.getByRole('button', { name: 'Book Appointment' }).first().click()
  await page.getByLabel('Patient').selectOption({ index: 1 })
  await page.getByLabel('Doctor Name').fill('Dr. Full Flow')
  await page.getByLabel('Date & Time').fill('2026-05-24T10:30')
  await page.getByLabel('Reason').fill('Full workflow appointment')
  const appointmentResponse = page.waitForResponse((response) => response.url().includes('/api/appointments') && response.request().method() === 'POST')
  await page.locator('form').getByRole('button', { name: 'Book Appointment' }).click()
  expect((await appointmentResponse).ok()).toBe(true)

  await Promise.all([
    page.waitForURL(/\/chatbot$/),
    page.getByRole('link', { name: 'AI Chatbot' }).click(),
  ])
  await page.getByLabel('Chat input').fill('I have severe chest pain and cannot breathe')
  const chatResponse = page.waitForResponse((response) => response.url().includes('/api/ai/chat') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Send message' }).click()
  expect((await chatResponse).ok()).toBe(true)
  await expect(page.getByText(/EMERGENCY/i).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Call Emergency: 108/i })).toBeVisible()

  await Promise.all([
    page.waitForURL(/\/report-analyzer$/),
    page.getByRole('link', { name: /Report Analyzer/ }).click(),
  ])
  await page.locator('input[type="file"]').setInputFiles({
    name: 'full-flow-report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('Full flow report: HB 14.5, WBC 7200, Platelets 250000'),
  })
  const reportResponse = page.waitForResponse((response) => response.url().includes('/api/ai/analyze-report') && response.request().method() === 'POST')
  await page.getByRole('button', { name: /Analyze Report/i }).click()
  expect((await reportResponse).ok()).toBe(true)
  await expect(page.getByRole('heading', { name: 'Analysis Complete' })).toBeVisible()

  await Promise.all([
    page.waitForURL(/\/drug-checker$/),
    page.getByRole('link', { name: /Drug Checker/ }).click(),
  ])
  await page.getByPlaceholder('Type medication name...').fill('Aspirin')
  await page.getByRole('button', { name: 'Add medication' }).click()
  await page.getByPlaceholder('Type medication name...').fill('Warfarin')
  await page.getByRole('button', { name: 'Add medication' }).click()
  const drugResponse = page.waitForResponse((response) => response.url().includes('/api/ai/drug-interaction') && response.request().method() === 'POST')
  await page.getByRole('button', { name: /Check Interactions/i }).click()
  expect((await drugResponse).ok()).toBe(true)
  await expect(page.getByText(/High Risk|interaction/i).first()).toBeVisible()
  await page.getByPlaceholder('Metformin').fill('Metformin')
  const drugInfoResponse = page.waitForResponse((response) => response.url().includes('/api/ai/drug-info') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Get Info' }).click()
  expect((await drugInfoResponse).ok()).toBe(true)
  await expect(page.getByRole('heading', { name: /Metformin/i })).toBeVisible()

  await Promise.all([
    page.waitForURL(/\/clinical-support$/),
    page.getByRole('link', { name: /Clinical Support/ }).click(),
  ])
  await page.getByLabel('Patient Age').fill('25')
  for (const symptom of ['Fever', 'Headache']) {
    await page.getByRole('button', { name: symptom, exact: true }).click()
  }
  await page.getByPlaceholder(/Fever 103/).fill('neck stiffness')
  await page.keyboard.press('Enter')
  await page.getByLabel('Blood Pressure').fill('120/80')
  await page.getByLabel('Pulse').fill('110')
  await page.getByLabel('SpO2 %').fill('97')
  await page.getByLabel(/Temperature/).fill('103')
  const clinicalResponse = page.waitForResponse((response) => response.url().includes('/api/ai/clinical-decision') && response.request().method() === 'POST')
  await page.getByRole('button', { name: /Get Clinical Assessment/i }).click()
  expect((await clinicalResponse).ok()).toBe(true)
  await expect(page.getByText(/Bacterial meningitis/i)).toBeVisible()

  await page.getByRole('button', { name: 'Summarize Notes' }).click()
  await page.getByPlaceholder(/Paste clinical notes/).fill('Patient has fever, headache, neck stiffness, and photophobia. Vitals show fever and tachycardia.')
  const soapResponse = page.waitForResponse((response) => response.url().includes('/api/ai/summarize-notes') && response.request().method() === 'POST')
  await page.getByRole('button', { name: /Summarize to SOAP Format/i }).click()
  expect((await soapResponse).ok()).toBe(true)
  await expect(page.getByText(/Subjective:/i).first()).toBeVisible()

  await Promise.all([
    page.waitForURL(/\/analytics$/),
    page.getByRole('link', { name: 'Analytics', exact: true }).click(),
  ])
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  await expect(page.getByLabel(/Appointments per day/i).first()).toBeVisible()

  expect(consoleErrors).toEqual([])
  expect(failedResponses).toEqual([])
})
