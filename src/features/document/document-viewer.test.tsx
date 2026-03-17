import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentViewer } from './document-viewer'

const defaultProps = {
  googleDocId: 'gdoc-123',
  loading: false,
  error: null,
  onBack: vi.fn(),
}

describe('DocumentViewer', () => {
  test('shows loading state', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content={null}
        title="Test Doc"
        loading={true}
      />,
    )
    expect(screen.getByText('Loading document...')).toBeInTheDocument()
  })

  test('shows error state with back button', async () => {
    const onBack = vi.fn()
    render(
      <DocumentViewer
        {...defaultProps}
        content={null}
        title="Test Doc"
        error="Failed to load"
        onBack={onBack}
      />,
    )
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Back to file picker'))
    expect(onBack).toHaveBeenCalled()
  })

  test('renders document title and toolbar', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Hello world</p>"
        title="My RFP Template"
      />,
    )
    expect(screen.getByText('My RFP Template')).toBeInTheDocument()
    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
    expect(screen.getByLabelText('Italic')).toBeInTheDocument()
    expect(screen.getByLabelText('Undo')).toBeInTheDocument()
  })

  test('renders HTML content in the editor', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>RFP content here</p>"
        title="Test Doc"
      />,
    )
    expect(screen.getByText('RFP content here')).toBeInTheDocument()
  })

  test('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn()
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        onBack={onBack}
      />,
    )
    await userEvent.click(screen.getByLabelText('Back to file picker'))
    expect(onBack).toHaveBeenCalled()
  })

  test('editor area is contentEditable', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Editable</p>"
        title="Test Doc"
      />,
    )
    const editor = screen.getByText('Editable').closest('[contenteditable]')
    expect(editor).toHaveAttribute('contenteditable', 'true')
  })

  test('renders View in Drive link with correct URL', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        googleDocId="abc-123"
      />,
    )
    const link = screen.getByText('View in Drive')
    expect(link).toHaveAttribute(
      'href',
      'https://docs.google.com/document/d/abc-123/edit',
    )
    expect(link).toHaveAttribute('target', '_blank')
  })
})
