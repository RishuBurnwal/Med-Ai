import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Settings from '../pages/Settings'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { name: 'Admin User', email: 'admin@hospital.com', role: 'admin', created_at: '2025-01-01T00:00:00Z', last_password_change: '2025-06-01T12:00:00Z' } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Admin User', email: 'admin@hospital.com', role: 'admin' },
    changePassword: vi.fn().mockResolvedValue({}),
  }),
}))

describe('Settings Page (Admin)', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    )
  }

  it('renders the heading and description', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByText(/manage your account settings and password/i)).toBeInTheDocument()
  })

  it('renders the profile section heading after loading', async () => {
    renderPage()
    expect(await screen.findByText(/profile/i)).toBeInTheDocument()
  })

  it('renders the change password section heading', () => {
    renderPage()
    expect(screen.getByText(/change password/i)).toBeInTheDocument()
  })

  it('renders password input fields', () => {
    renderPage()
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    const newPasswordFields = screen.getAllByLabelText(/new password/i)
    expect(newPasswordFields.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
  })

  it('renders the update password button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const { container } = renderPage()
    expect(container.querySelector('.card')).toBeInTheDocument()
  })
})
