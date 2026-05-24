import { test, expect } from '@playwright/test'

test('backend endpoints stay healthy for the seeded demo flow', async ({ request }) => {
  const health = await request.get('http://127.0.0.1:8000/api/health')
  expect(health.status()).toBe(200)
  expect((await health.json()).database).toBe('sqlite')

  const login = await request.post('http://127.0.0.1:8000/api/auth/login', {
    form: { username: 'admin@hospital.com', password: 'Admin@123' },
  })
  expect(login.status()).toBe(200)
  const token = (await login.json()).access_token
  const headers = { Authorization: `Bearer ${token}` }

  const endpoints = [
    ['/api/auth/me', 'get'],
    ['/api/patients', 'get'],
    ['/api/patients/stats', 'get'],
    ['/api/appointments', 'get'],
    ['/api/appointments/today', 'get'],
    ['/api/analytics/overview', 'get'],
    ['/api/analytics/appointments-chart?days=7', 'get'],
    ['/api/analytics/patients-by-blood-group', 'get'],
    ['/api/analytics/patients-by-gender', 'get'],
    ['/api/analytics/departments', 'get'],
    ['/api/ai/chat', 'post'],
    ['/api/ai/quick-assessment', 'post'],
    ['/api/ai/drug-interaction', 'post'],
    ['/api/ai/drug-info', 'post'],
    ['/api/ai/clinical-decision', 'post'],
    ['/api/ai/summarize-notes', 'post'],
  ]

  for (const [endpoint, method] of endpoints) {
    let response
    if (method === 'get') {
      response = await request.get(`http://127.0.0.1:8000${endpoint}`, { headers })
    } else if (endpoint === '/api/ai/chat') {
      response = await request.post(`http://127.0.0.1:8000${endpoint}`, {
        headers,
        data: { message: 'I have chest pain', conversation_history: [], provider: 'groq' },
      })
    } else if (endpoint === '/api/ai/quick-assessment') {
      response = await request.post(`http://127.0.0.1:8000${endpoint}`, {
        headers,
        data: { symptoms: ['fever', 'headache'], patient_age: 35, provider: 'groq' },
      })
    } else if (endpoint === '/api/ai/drug-interaction') {
      response = await request.post(`http://127.0.0.1:8000${endpoint}`, {
        headers,
        data: { drugs: ['Aspirin', 'Warfarin'], patient_age: 65, provider: 'groq' },
      })
    } else if (endpoint === '/api/ai/drug-info') {
      response = await request.post(`http://127.0.0.1:8000${endpoint}`, {
        headers,
        data: { drug_name: 'metformin', provider: 'groq' },
      })
    } else if (endpoint === '/api/ai/clinical-decision') {
      response = await request.post(`http://127.0.0.1:8000${endpoint}`, {
        headers,
        data: {
          patient_symptoms: ['fever', 'headache', 'neck stiffness'],
          patient_age: 35,
          patient_gender: 'female',
          vitals: { temp: 39.0 },
          medical_history: ['hypertension'],
          current_medications: ['amlodipine'],
          provider: 'groq',
        },
      })
    } else if (endpoint === '/api/ai/summarize-notes') {
      response = await request.post(`http://127.0.0.1:8000${endpoint}`, {
        headers,
        data: { clinical_notes: 'Patient stable, follow up in two weeks.', provider: 'groq' },
      })
    }

    expect(response?.status(), endpoint).toBe(200)
  }

  const patient = await request.post('http://127.0.0.1:8000/api/patients', {
    headers,
    data: {
      name: 'API Smoke Patient',
      age: 33,
      gender: 'male',
      blood_group: 'O+',
      phone: '9000000001',
      email: 'api.smoke@example.com',
      address: 'API Address',
      emergency_contact: 'API Contact',
      medical_history: ['Asthma'],
      allergies: ['Dust'],
      current_medications: ['Inhaler'],
    },
  })
  expect(patient.status()).toBe(200)
  const patientId = (await patient.json()).patient_id

  const appointment = await request.post('http://127.0.0.1:8000/api/appointments', {
    headers,
    data: {
      patient_id: patientId,
      doctor_name: 'Dr. API Smoke',
      department: 'General',
      appointment_date: '2026-05-23T11:00:00+00:00',
      reason: 'API smoke appointment',
      appointment_type: 'teleconsult',
    },
  })
  expect(appointment.status()).toBe(200)
  const appointmentId = (await appointment.json()).id

  const statusUpdate = await request.put(`http://127.0.0.1:8000/api/appointments/${appointmentId}/status`, {
    headers,
    data: { status: 'completed' },
  })
  expect(statusUpdate.status()).toBe(200)

  const report = await request.post('http://127.0.0.1:8000/api/ai/analyze-report', {
    headers,
    multipart: {
      file: { name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake pdf content') },
      analysis_type: 'general',
      patient_id: patientId,
    },
  })
  expect(report.status()).toBe(200)
})