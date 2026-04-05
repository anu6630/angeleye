import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EngagementMetrics } from '@/components/social/EngagementMetrics'

describe('EngagementMetrics', () => {
  it('renders all metrics in compact variant', () => {
    render(
      <EngagementMetrics
        views={1000}
        likes={42}
        comments={5}
      />
    )

    expect(screen.getByText('1000')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders all metrics in full variant', () => {
    render(
      <EngagementMetrics
        variant="full"
        views={1000}
        likes={42}
        comments={5}
      />
    )

    expect(screen.getByText('1000')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(/likes/i)).toBeInTheDocument()
    expect(screen.getByText(/comments/i)).toBeInTheDocument()
    expect(screen.getByText(/views/i)).toBeInTheDocument()
  })

  it('renders nothing when all metrics are zero and showZeroState is false', () => {
    const { container } = render(
      <EngagementMetrics
        views={0}
        likes={0}
        comments={0}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders zero state message when showZeroState is true', () => {
    render(
      <EngagementMetrics
        views={0}
        likes={0}
        comments={0}
        showZeroState={true}
      />
    )

    expect(screen.getByText(/be the first to like/i)).toBeInTheDocument()
  })

  it('only renders non-zero metrics', () => {
    render(
      <EngagementMetrics
        views={1000}
        likes={0}
        comments={5}
      />
    )

    expect(screen.getByText('1000')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
