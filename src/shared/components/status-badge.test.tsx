import { render, screen } from '@testing-library/react'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  test('renders the status text', () => {
    render(<StatusBadge status="Draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  test('renders different status values', () => {
    const { rerender } = render(<StatusBadge status="Review" />)
    expect(screen.getByText('Review')).toBeInTheDocument()

    rerender(<StatusBadge status="Complete" />)
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })
})
