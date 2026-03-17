import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KbPage } from './kb-page'

const mockAddDocument = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockDeleteDocument = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockIndexDocument = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockDocuments = vi.hoisted(() => ({
  value: [] as Array<{
    id: string
    filename: string
    source: string
    status: string
    chunk_count: number
    created_at: string
  }>,
}))

vi.mock('./use-kb-documents', () => ({
  useKbDocuments: () => ({
    documents: mockDocuments.value,
    loading: false,
    error: null,
    addDocument: mockAddDocument,
    deleteDocument: mockDeleteDocument,
    indexDocument: mockIndexDocument,
  }),
}))

describe('KbPage', () => {
  beforeEach(() => {
    mockDocuments.value = []
    mockAddDocument.mockClear().mockResolvedValue(undefined)
    mockDeleteDocument.mockClear()
    mockIndexDocument.mockClear()
  })

  test('shows empty state when no KB documents', () => {
    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    expect(
      screen.getByText('No documents in your knowledge base yet.'),
    ).toBeInTheDocument()
  })

  test('upload button triggers file picker', async () => {
    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement
    expect(fileInput.type).toBe('file')
    expect(screen.getByText('Upload File')).toBeInTheDocument()
  })

  test('uploaded file calls addDocument and triggers indexing', async () => {
    mockAddDocument.mockResolvedValue({ id: 'new-doc-1', filename: 'readme.txt', source: 'upload', status: 'pending', chunk_count: 0, created_at: '2026-03-17T00:00:00Z' })

    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    const fileInput = screen.getByTestId('file-input')

    const file = new File(['test content'], 'readme.txt', {
      type: 'text/plain',
    })

    await userEvent.upload(fileInput, file)

    expect(mockAddDocument).toHaveBeenCalledWith({
      filename: 'readme.txt',
      source: 'upload',
      rawText: 'test content',
      contentType: 'text/plain',
    })
    expect(mockIndexDocument).toHaveBeenCalledWith('new-doc-1')
  })

  test('shows document list with delete button', async () => {
    mockDocuments.value = [
      {
        id: 'doc-1',
        filename: 'proposal.txt',
        source: 'upload',
        status: 'indexed',
        chunk_count: 5,
        created_at: '2026-03-17T00:00:00Z',
      },
    ]

    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)

    expect(screen.getByText('proposal.txt')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete proposal.txt')).toBeInTheDocument()
  })

  test('delete button removes document', async () => {
    mockDocuments.value = [
      {
        id: 'doc-1',
        filename: 'proposal.txt',
        source: 'upload',
        status: 'indexed',
        chunk_count: 3,
        created_at: '2026-03-17T00:00:00Z',
      },
    ]

    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Delete proposal.txt'))
    expect(mockDeleteDocument).toHaveBeenCalledWith('doc-1')
  })

  test('import from Google Drive button is present', () => {
    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    expect(
      screen.getByText('Import from Google Drive'),
    ).toBeInTheDocument()
  })

  test('back button calls onBack', async () => {
    const onBack = vi.fn()
    render(<KbPage userId="user-1" providerToken="token" onBack={onBack} />)
    await userEvent.click(screen.getByLabelText('Back to documents'))
    expect(onBack).toHaveBeenCalled()
  })

  test('shows source label for Drive-imported documents', () => {
    mockDocuments.value = [
      {
        id: 'doc-2',
        filename: 'company-info.txt',
        source: 'drive',
        status: 'pending',
        chunk_count: 0,
        created_at: '2026-03-17T00:00:00Z',
      },
    ]

    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    expect(screen.getByText('company-info.txt')).toBeInTheDocument()
    const allMatches = screen.getAllByText(/Google Drive/)
    expect(allMatches.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Google Drive ·/)).toBeInTheDocument()
  })

  test('shows Pending status badge for unindexed documents', () => {
    mockDocuments.value = [
      {
        id: 'doc-3',
        filename: 'pending-doc.txt',
        source: 'upload',
        status: 'pending',
        chunk_count: 0,
        created_at: '2026-03-17T00:00:00Z',
      },
    ]

    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Index')).toBeInTheDocument()
  })

  test('shows Indexed status badge with chunk count', () => {
    mockDocuments.value = [
      {
        id: 'doc-4',
        filename: 'indexed-doc.txt',
        source: 'upload',
        status: 'indexed',
        chunk_count: 7,
        created_at: '2026-03-17T00:00:00Z',
      },
    ]

    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    expect(screen.getByText('Indexed (7 chunks)')).toBeInTheDocument()
  })

  test('shows Retry button for errored documents', async () => {
    mockDocuments.value = [
      {
        id: 'doc-5',
        filename: 'errored-doc.txt',
        source: 'upload',
        status: 'error',
        chunk_count: 0,
        created_at: '2026-03-17T00:00:00Z',
      },
    ]

    render(<KbPage userId="user-1" providerToken="token" onBack={vi.fn()} />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Retry'))
    expect(mockIndexDocument).toHaveBeenCalledWith('doc-5')
  })
})
