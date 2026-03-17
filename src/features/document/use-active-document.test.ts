import { renderHook, act, waitFor } from '@testing-library/react'
import { useActiveDocument } from './use-active-document'

const mockFrom = vi.hoisted(() => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null }),
  }
  return vi.fn(() => chain)
})

vi.mock('../../shared/config/supabase', () => ({
  supabase: { from: mockFrom },
}))

// Mock global fetch for Google Drive API
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function chain() {
  return mockFrom()
}

describe('useActiveDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const c = chain()
    c.select.mockReturnThis()
    c.eq.mockReturnThis()
    c.order.mockReturnThis()
    c.limit.mockReturnValue({ ...c, data: [] })
    c.upsert.mockResolvedValue({ error: null })
    c.delete.mockReturnThis()
    c.in.mockResolvedValue({ error: null })

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<body><p>content</p></body>'),
    })
  })

  test('returns empty recentDocuments initially when no userId', async () => {
    const { result } = renderHook(() => useActiveDocument('token', null))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    expect(result.current.recentDocuments).toEqual([])
    expect(result.current.doc).toBeNull()
  })

  test('does not auto-open a document on init', async () => {
    const recentDocs = [
      { google_doc_id: 'doc-1', title: 'RFP Template A', updated_at: '2026-03-17T10:00:00Z' },
    ]

    chain().limit.mockReturnValue({ ...chain(), data: recentDocs })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await waitFor(() => {
      expect(result.current.recentDocuments.length).toBe(1)
    })

    // Should NOT auto-open the document
    expect(result.current.doc).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('loads recent documents on init when userId is provided', async () => {
    const recentDocs = [
      { google_doc_id: 'doc-1', title: 'RFP Template A', updated_at: '2026-03-17T10:00:00Z' },
      { google_doc_id: 'doc-2', title: 'RFP Template B', updated_at: '2026-03-16T10:00:00Z' },
    ]

    chain().limit.mockReturnValue({ ...chain(), data: recentDocs })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await waitFor(() => {
      expect(result.current.recentDocuments.length).toBe(2)
    })

    expect(result.current.recentDocuments[0].title).toBe('RFP Template A')
  })

  test('selectDocument fetches content and upserts to database', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.selectDocument('gdoc-123', 'My RFP')
    })

    expect(result.current.doc).toEqual({ googleDocId: 'gdoc-123', title: 'My RFP' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/files/gdoc-123/export?mimeType=text/html',
      { headers: { Authorization: 'Bearer token' } },
    )
    expect(chain().upsert).toHaveBeenCalled()
  })

  test('selectDocument prunes old documents beyond limit of 5', async () => {
    const sixDocs = Array.from({ length: 6 }, (_, i) => ({
      id: `id-${i}`,
      updated_at: `2026-03-${String(17 - i).padStart(2, '0')}T10:00:00Z`,
    }))

    // Setup: initial load returns empty
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    // Now setup: pruneOldDocuments will find 6 docs
    chain().select.mockImplementation(() => chain())
    chain().order.mockImplementation(() => ({
      ...chain(),
      data: sixDocs,
      limit: () => ({ ...chain(), data: [] }),
    }))

    await act(async () => {
      await result.current.selectDocument('gdoc-new', 'New Doc')
    })

    // pruneOldDocuments should have called delete().in() with the 6th doc id
    expect(chain().delete).toHaveBeenCalled()
    expect(chain().in).toHaveBeenCalledWith('id', ['id-5'])
  })

  test('clearDocument resets doc, content, and error', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.selectDocument('gdoc-1', 'Test Doc')
    })

    expect(result.current.doc).not.toBeNull()

    act(() => {
      result.current.clearDocument()
    })

    expect(result.current.doc).toBeNull()
    expect(result.current.content).toBeNull()
    expect(result.current.error).toBeNull()
  })

  test('shows error when providerToken is missing', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument(null, 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.selectDocument('gdoc-1', 'Test Doc')
    })

    expect(result.current.error).toBe(
      'Google Drive access expired. Sign in again to reload.',
    )
    expect(result.current.doc).toEqual({ googleDocId: 'gdoc-1', title: 'Test Doc' })
  })
})
