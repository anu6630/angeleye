import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { OAuthButton } from '@/components/auth/OAuthButton'

describe('OAuthButton', () => {
  it('renders Google OAuth button', () => {
    const handleClick = vi.fn()
    render(<OAuthButton provider="google" onClick={handleClick} />)

    const button = screen.getByRole('button', { name: /sign in with google/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-white', 'hover:bg-gray-50', 'text-gray-900')
  })

  it('renders Facebook OAuth button', () => {
    const handleClick = vi.fn()
    render(<OAuthButton provider="facebook" onClick={handleClick} />)

    const button = screen.getByRole('button', { name: /sign in with facebook/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-[#1877F2]', 'hover:bg-[#166FE5]', 'text-white')
  })

  it('shows loading spinner when isLoading is true', () => {
    const handleClick = vi.fn()
    render(<OAuthButton provider="google" onClick={handleClick} isLoading={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    const spinner = button.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<OAuthButton provider="google" onClick={handleClick} />)

    const button = screen.getByRole('button', { name: /sign in with google/i })
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled and clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<OAuthButton provider="facebook" onClick={handleClick} isLoading={true} />)

    const button = screen.getByRole('button', { name: /sign in with facebook/i })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('displays provider icon', () => {
    const handleClick = vi.fn()
    render(<OAuthButton provider="google" onClick={handleClick} />)

    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
