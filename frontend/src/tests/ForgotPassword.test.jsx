import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ForgotPassword from '../pages/ForgotPassword'

// Mock the api module
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}))

describe('ForgotPassword Page (Admin)', () => {
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPassword />
      </MemoryRouter>
    )
  }

  it('renders the heading and description', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument()
    expect(screen.getByText(/enter your email to receive a reset link/i)).toBeInTheDocument()
  })

  it('renders the email input field', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/admin@hospital/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('renders the send reset link button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('renders the back to login link', () => {
    renderPage()
    expect(screen.getByText(/back to login/i)).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const { container } = renderPage()
    expect(container.querySelector('.card')).toBeInTheDocument()
  })
})
