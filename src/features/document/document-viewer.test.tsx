import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentViewer } from './document-viewer'

describe('DocumentViewer', () => {
  test('shows loading state', () => {
    render(
      <DocumentViewer
        content={null}
        title="Test Doc"
        loading={true}
        error={null}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByText('Loading document...')).toBeInTheDocument()
  })

  test('shows error state with back button', async () => {
    const onBack = vi.fn()
    render(
      <DocumentViewer
        content={null}
        title="Test Doc"
        loading={false}
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
        content="<p>Hello world</p>"
        title="My RFP Template"
        loading={false}
        error={null}
        onBack={vi.fn()}
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
        content="<p>RFP content here</p>"
        title="Test Doc"
        loading={false}
        error={null}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByText('RFP content here')).toBeInTheDocument()
  })

  test('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn()
    render(
      <DocumentViewer
        content="<p>Content</p>"
        title="Test Doc"
        loading={false}
        error={null}
        onBack={onBack}
      />,
    )
    await userEvent.click(screen.getByLabelText('Back to file picker'))
    expect(onBack).toHaveBeenCalled()
  })

  test('editor area is contentEditable', () => {
    render(
      <DocumentViewer
        content="<p>Editable</p>"
        title="Test Doc"
        loading={false}
        error={null}
        onBack={vi.fn()}
      />,
    )
    const editor = screen.getByText('Editable').closest('[contenteditable]')
    expect(editor).toHaveAttribute('contenteditable', 'true')
  })
})
