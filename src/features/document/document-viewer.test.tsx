import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentViewer } from './document-viewer'

import type { FillResult, PendingSection } from './use-active-document'

const defaultProps = {
  googleDocId: 'gdoc-123',
  contentVersion: 0,
  loading: false,
  error: null,
  filling: false,
  fillStatus: null,
  pendingSections: [] as PendingSection[],
  fillResults: [] as FillResult[],
  canRegenerate: false,
  saving: false,
  lastSavedAt: null,
  onBack: vi.fn(),
  onAutoFill: vi.fn(),
  onFillSelected: vi.fn(),
  onRegenerate: vi.fn(),
  onContentChange: vi.fn(),
  onSaveToDrive: vi.fn(),
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

  test('Auto-Fill button shows Working... when filling', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        filling={true}
        fillStatus="Analyzing document..."
      />,
    )
    expect(screen.getByText('Working...')).toBeInTheDocument()
  })

  test('shows generating overlay when filling with no pending sections', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        filling={true}
        fillStatus="Generating 5 responses..."
        pendingSections={[]}
      />,
    )
    expect(screen.getByText('Generating 5 responses...')).toBeInTheDocument()
    expect(screen.getByText('Drafting your responses — hang tight!')).toBeInTheDocument()
  })

  test('shows section review panel when pendingSections exist', () => {
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1: Overview',
        expanded: true,
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Provide company name', originalText: '[Company Name]', selected: true },
          { id: 's1-2', label: 'Date', prompt: 'Provide date', originalText: '[Date]', selected: true },
        ],
      },
      {
        id: 's2',
        location: 'Section 2: Approach',
        expanded: true,
        items: [
          { id: 's2-1', label: 'Methodology', prompt: 'Describe approach', originalText: '[Methodology]', selected: true },
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
          { id: 's1-1', label: 'Company Name', prompt: 'Describe company', originalText: '[Company Name]', selected: true },
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
          { id: 's1-1', label: 'Company Name', prompt: 'Describe company', originalText: '[Company Name]', selected: true },
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
          { id: 's1-1', label: 'Company Name', prompt: 'Describe company', originalText: '[Company Name]', selected: true },
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
          { id: 's1-1', label: 'Hidden Item', prompt: 'Describe company', originalText: '[Hidden Item]', selected: true },
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
          { id: 's1-1', label: 'Company Name', prompt: 'Describe', originalText: '[Company Name]', selected: true },
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

  test('Fill Selected button calls onFillSelected', async () => {
    const onFillSelected = vi.fn()
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1',
        expanded: true,
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Describe company', originalText: '[Company Name]', selected: true },
        ],
      },
    ]
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        pendingSections={sections}
        onFillSelected={onFillSelected}
      />,
    )
    await userEvent.click(screen.getByText('Fill Selected'))
    expect(onFillSelected).toHaveBeenCalled()
  })

  test('Fill Selected button is disabled when no items selected', () => {
    const sections: PendingSection[] = [
      {
        id: 's1',
        location: 'Section 1',
        expanded: true,
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Describe company', originalText: '[Company Name]', selected: false },
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
    expect(screen.getByText('Fill Selected')).toBeDisabled()
  })

  test('inserts fill results into editor and calls onContentChange to persist', () => {
    const onContentChange = vi.fn()
    const fillResults: FillResult[] = [
      { id: 'item-1', response: 'ThinkCERCA Inc.', originalText: '[Company Name]' },
    ]
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Company: [Company Name]</p>"
        title="Test Doc"
        fillResults={fillResults}
        onContentChange={onContentChange}
      />,
    )
    const span = document.querySelector('[data-ai-fill="item-1"]')
    expect(span).not.toBeNull()
    expect(span?.textContent).toBe('ThinkCERCA Inc.')
    expect(onContentChange).toHaveBeenCalledTimes(1)
    expect(onContentChange.mock.calls[0][0]).toContain('ThinkCERCA Inc.')
  })

  test('shows Regenerate button when canRegenerate is true', async () => {
    const onRegenerate = vi.fn()
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        canRegenerate={true}
        onRegenerate={onRegenerate}
      />,
    )
    const btn = screen.getByText('Regenerate')
    expect(btn).toBeInTheDocument()
    await userEvent.click(btn)
    expect(onRegenerate).toHaveBeenCalled()
  })

  test('hides Regenerate button when canRegenerate is false', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        canRegenerate={false}
      />,
    )
    expect(screen.queryByText('Regenerate')).not.toBeInTheDocument()
  })

  test('Regenerate button is disabled while filling', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        canRegenerate={true}
        filling={true}
        fillStatus="Generating 5 responses..."
      />,
    )
    expect(screen.getByText('Regenerate')).toBeDisabled()
  })

  test('renders Save to Drive button in toolbar', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
      />,
    )
    expect(screen.getByText('Save to Drive')).toBeInTheDocument()
  })

  test('Save to Drive button calls onSaveToDrive with editor HTML', async () => {
    const onSaveToDrive = vi.fn()
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Test content</p>"
        title="Test Doc"
        onSaveToDrive={onSaveToDrive}
      />,
    )
    await userEvent.click(screen.getByText('Save to Drive'))
    expect(onSaveToDrive).toHaveBeenCalledTimes(1)
    expect(onSaveToDrive.mock.calls[0][0]).toContain('Test content')
  })

  test('Save to Drive button shows Saving... while saving', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        saving={true}
      />,
    )
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByText('Saving...').closest('button')).toBeDisabled()
  })

  test('shows Saved indicator after successful save', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        lastSavedAt="2026-03-18T10:00:00Z"
      />,
    )
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  test('hides Saved indicator while saving', () => {
    render(
      <DocumentViewer
        {...defaultProps}
        content="<p>Content</p>"
        title="Test Doc"
        saving={true}
        lastSavedAt="2026-03-18T10:00:00Z"
      />,
    )
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })
})
