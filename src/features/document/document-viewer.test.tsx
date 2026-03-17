import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentViewer } from './document-viewer'

import type { PendingSection } from './use-active-document'

const defaultProps = {
  googleDocId: 'gdoc-123',
  loading: false,
  error: null,
  filling: false,
  fillStatus: null,
  pendingSections: [] as PendingSection[],
  onBack: vi.fn(),
  onAutoFill: vi.fn(),
  onCancelSections: vi.fn(),
  onToggleItem: vi.fn(),
  onToggleSection: vi.fn(),
  onToggleExpand: vi.fn(),
  onEditItemPrompt: vi.fn(),
}

describe('DocumentViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  test('renders Auto-Fill button in toolbar', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
      />,
    )
    expect(screen.getByText('Auto-Fill')).toBeInTheDocument()
  })

  test('Auto-Fill button calls onAutoFill', async () => {
    const onAutoFill = vi.fn()
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        onAutoFill={onAutoFill}
      />,
    )
    await userEvent.click(screen.getByText('Auto-Fill'))
    expect(onAutoFill).toHaveBeenCalled()
  })

  test('Auto-Fill button shows status text when filling', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        filling={true}
        fillStatus="Analyzing document..."
      />,
    )
    expect(screen.getByText('Analyzing document...')).toBeInTheDocument()
  })

  test('shows section review panel when pendingSections exist', () => {
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1: Overview',
        expanded: true,
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Provide company name', selected: true },
          { id: 's1-2', label: 'Date', prompt: 'Provide date', selected: true },
        ],
      },
      {
        id: 's2',
        location: 'Section 2: Approach',
        expanded: true,
        items: [
          { id: 's2-1', label: 'Methodology', prompt: 'Describe approach', selected: true },
        ],
      },
    ]
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        pendingSections={sections}
      />,
    )
    expect(screen.getByText('Sections to Fill (3/3)')).toBeInTheDocument()
    expect(screen.getByText('Section 1: Overview')).toBeInTheDocument()
    expect(screen.getByText('Section 2: Approach')).toBeInTheDocument()
    expect(screen.getByText('Company Name')).toBeInTheDocument()
    expect(screen.getByText('Methodology')).toBeInTheDocument()
    expect(screen.getByText('Fill Selected')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  test('toggling an item checkbox calls onToggleItem', async () => {
    const onToggleItem = vi.fn()
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1',
        expanded: true,
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Describe company', selected: true },
        ],
      },
    ]
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        pendingSections={sections}
        onToggleItem={onToggleItem}
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is the section-level, second is the item-level
    await userEvent.click(checkboxes[1])
    expect(onToggleItem).toHaveBeenCalledWith('s1', 's1-1')
  })

  test('toggling section checkbox calls onToggleSection', async () => {
    const onToggleSection = vi.fn()
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1',
        expanded: true,
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Describe company', selected: true },
        ],
      },
    ]
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        pendingSections={sections}
        onToggleSection={onToggleSection}
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0])
    expect(onToggleSection).toHaveBeenCalledWith('s1')
  })

  test('clicking expand arrow calls onToggleExpand', async () => {
    const onToggleExpand = vi.fn()
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1',
        expanded: true,
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Describe company', selected: true },
        ],
      },
    ]
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        pendingSections={sections}
        onToggleExpand={onToggleExpand}
      />,
    )
    await userEvent.click(screen.getByText('Section 1'))
    expect(onToggleExpand).toHaveBeenCalledWith('s1')
  })

  test('collapsed section hides items', () => {
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1',
        expanded: false,
        items: [
          { id: 's1-1', label: 'Hidden Item', prompt: 'Describe company', selected: true },
        ],
      },
    ]
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        pendingSections={sections}
      />,
    )
    expect(screen.getByText('Section 1')).toBeInTheDocument()
    expect(screen.queryByText('Hidden Item')).not.toBeInTheDocument()
  })

  test('Cancel button clears sections', async () => {
    const onCancelSections = vi.fn()
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1',
        expanded: true,
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Describe', selected: true },
        ],
      },
    ]
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        pendingSections={sections}
        onCancelSections={onCancelSections}
      />,
    )
    await userEvent.click(screen.getByText('Cancel'))
    expect(onCancelSections).toHaveBeenCalled()
  })

  test('shows inline error banner when error occurs with content loaded', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        error="No fillable sections found in this document."
      />,
    )
    expect(screen.getByText('No fillable sections found in this document.')).toBeInTheDocument()
    // Should NOT show the full-page error since content exists
    expect(screen.queryByText('Back to file picker')).not.toBeInTheDocument()
  })
})
