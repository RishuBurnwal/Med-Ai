import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ResetPassword from '../ResetPassword'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}))

describe('ResetPassword Page (Patient Portal)', () => {
  function renderPage(initialEntries = ['/reset-password']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <ResetPassword />
      </MemoryRouter>
    )
  }

  it('renders the heading and description', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
    expect(screen.getByText(/enter your new password below/i)).toBeInTheDocument()
  })

  it('renders the reset token input field', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/paste your reset token/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reset token/i)).toBeInTheDocument()
  })

  it('renders the new password input fields', () => {
    renderPage()
    const newPasswordFields = screen.getAllByLabelText(/new password/i)
    expect(newPasswordFields.length).toBe(2)
    const confirmField = screen.getByLabelText(/confirm new password/i)
    expect(confirmField).toBeInTheDocument()
  })

  it('renders the reset password button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })

  it('renders back to login link', () => {
    renderPage()
    expect(screen.getByText(/back to login/i)).toBeInTheDocument()
  })

  it('pre-fills token from URL query param', () => {
    renderPage(['/reset-password?token=patient-token-456'])
    const tokenInput = screen.getByPlaceholderText(/paste your reset token/i)
    expect(tokenInput.value).toBe('patient-token-456')
  })

  it('renders without errors', () => {
    const { container } = renderPage()
    expect(container.querySelector('.card')).toBeInTheDocument()
  })
})
