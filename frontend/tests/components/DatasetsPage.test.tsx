/**
 * Tests for Datasets page.
 *
 * TEST-02: Frontend has component tests for UI components
 * NOTE-03: User can upload datasets
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DatasetsPage from '@/app/datasets/page';

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    user: { id: 1, username: 'testuser' },
  })),
}));

vi.mock('@/stores/compilation-store', () => ({
  useCompilationStore: vi.fn(() => ({
    datasets: [],
    isLoadingDatasets: false,
    loadDatasets: vi.fn(),
    deleteDataset: vi.fn(),
    uploadDataset: vi.fn(),
  })),
}));

describe('DatasetsPage', () => {
  it('shows upload button when authenticated', () => {
    render(<DatasetsPage />);

    expect(screen.getByRole('button', { name: /upload dataset/i })).toBeInTheDocument();
  });

  it('shows empty state when no datasets', () => {
    render(<DatasetsPage />);

    expect(screen.getByText(/no datasets yet/i)).toBeInTheDocument();
  });

  it('shows authentication required when not authenticated', async () => {
    const { useAuthStore } = await import('@/stores/auth-store');
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as any);

    render(<DatasetsPage />);

    expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
  });
});
