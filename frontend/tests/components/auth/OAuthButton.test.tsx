import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OAuthButton } from '@/components/auth/OAuthButton';

describe('OAuthButton', () => {
  describe('Google OAuth button', () => {
    it('renders with correct label and icon', () => {
      const handleClick = vi.fn();
      render(<OAuthButton provider="google" onClick={handleClick} />);

      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<OAuthButton provider="google" onClick={handleClick} />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading spinner when isLoading is true', () => {
      const handleClick = vi.fn();
      render(<OAuthButton provider="google" onClick={handleClick} isLoading={true} />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      expect(button).toBeDisabled();

      // Check for loading spinner (Loader2 icon with animate-spin)
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('has correct styling for Google provider', () => {
      const handleClick = vi.fn();
      const { container } = render(<OAuthButton provider="google" onClick={handleClick} />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      expect(button).toHaveClass('bg-white', 'hover:bg-gray-50', 'text-gray-900', 'border');
    });
  });

  describe('Facebook OAuth button', () => {
    it('renders with correct label and icon', () => {
      const handleClick = vi.fn();
      render(<OAuthButton provider="facebook" onClick={handleClick} />);

      expect(screen.getByRole('button', { name: /sign in with facebook/i })).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<OAuthButton provider="facebook" onClick={handleClick} />);

      const button = screen.getByRole('button', { name: /sign in with facebook/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading spinner when isLoading is true', () => {
      const handleClick = vi.fn();
      render(<OAuthButton provider="facebook" onClick={handleClick} isLoading={true} />);

      const button = screen.getByRole('button', { name: /sign in with facebook/i });
      expect(button).toBeDisabled();

      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('has correct styling for Facebook provider', () => {
      const handleClick = vi.fn();
      render(<OAuthButton provider="facebook" onClick={handleClick} />);

      const button = screen.getByRole('button', { name: /sign in with facebook/i });
      expect(button).toHaveClass('bg-[#1877F2]', 'hover:bg-[#166FE5]', 'text-white');
    });
  });

  describe('Disabled state', () => {
    it('disables button when isLoading is true', () => {
      const handleClick = vi.fn();
      render(<OAuthButton provider="google" onClick={handleClick} isLoading={true} />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      expect(button).toBeDisabled();
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<OAuthButton provider="google" onClick={handleClick} isLoading={true} />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has button role', () => {
      const handleClick = vi.fn();
      render(<OAuthButton provider="google" onClick={handleClick} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('is of type button (not submit)', () => {
      const handleClick = vi.fn();
      render(<OAuthButton provider="google" onClick={handleClick} />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});
