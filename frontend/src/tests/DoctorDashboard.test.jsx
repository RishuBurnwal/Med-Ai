import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import DoctorDashboard from '../pages/DoctorDashboard'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        total_appointments: 25,
        today_appointments: 4,
        completed: 18,
        total_patients: 12,
        recent_patients: [
          { name: 'John Doe', blood_group: 'A+', gender: 'male', age: 45, patient_id: 'P001' },
        ],
        upcoming_appointments: [
          { patient_id: 'P002', department: 'Cardiology', appointment_date: '2026-06-15T10:00:00', status: 'scheduled' },
        ],
      }
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}))

describe('DoctorDashboard Page', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <DoctorDashboard />
      </MemoryRouter>
    )
  }

  it('renders the heading and description', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /doctor dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/your patient overview at a glance/i)).toBeInTheDocument()
  })

  it('renders stat sections after loading', async () => {
    renderPage()
    expect(await screen.findByText(/total appointments/i)).toBeInTheDocument()
    expect(await screen.findByText(/today's appointments/i)).toBeInTheDocument()
    expect(await screen.findByText(/completed/i)).toBeInTheDocument()
    expect(await screen.findByText(/total patients/i)).toBeInTheDocument()
  })

  it('renders the recent patients section heading', () => {
    renderPage()
    const headings = screen.getAllByText(/recent patients/i)
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the upcoming appointments section heading', () => {
    renderPage()
    const headings = screen.getAllByText(/upcoming appointments/i)
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the all appointments section', () => {
    renderPage()
    expect(screen.getByText(/all appointments/i)).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const { container } = renderPage()
    expect(container.querySelector('.card')).toBeInTheDocument()
  })
})
