import { renderHook, act, waitFor } from '@testing-library/react'
import { useActiveDocument } from './use-active-document'

const mockInvoke = vi.hoisted(() => vi.fn())

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
  supabase: { from: mockFrom, functions: { invoke: mockInvoke } },
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
    localStorage.clear()

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

  test('uploadFromComputer creates Drive doc and opens it', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'new-gdoc-id', name: 'My Upload' }),
    })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    const file = new File(['hello world'], 'my-upload.txt', { type: 'text/plain' })

    await act(async () => {
      await result.current.uploadFromComputer(file)
    })

    expect(result.current.doc).toEqual({ googleDocId: 'new-gdoc-id', title: 'My Upload' })
    expect(result.current.content).toContain('hello world')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(chain().upsert).toHaveBeenCalled()
  })

  test('uploadFromComputer shows error when no token', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument(null, 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })

    await act(async () => {
      await result.current.uploadFromComputer(file)
    })

    expect(result.current.error).toBe(
      'Google Drive access expired. Sign in again to upload.',
    )
  })

  test('removeRecentDocument deletes from Supabase and refreshes list', async () => {
    const recentDocs = [
      { google_doc_id: 'doc-1', title: 'Doc A', updated_at: '2026-03-17T10:00:00Z' },
      { google_doc_id: 'doc-2', title: 'Doc B', updated_at: '2026-03-16T10:00:00Z' },
    ]

    chain().limit.mockReturnValue({ ...chain(), data: recentDocs })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await waitFor(() => {
      expect(result.current.recentDocuments.length).toBe(2)
    })

    // After remove, return only one doc
    chain().limit.mockReturnValue({
      ...chain(),
      data: [recentDocs[1]],
    })

    await act(async () => {
      await result.current.removeRecentDocument('doc-1')
    })

    expect(chain().delete).toHaveBeenCalled()
    expect(chain().eq).toHaveBeenCalledWith('google_doc_id', 'doc-1')
    expect(result.current.recentDocuments.length).toBe(1)
    expect(result.current.recentDocuments[0].google_doc_id).toBe('doc-2')
  })

  test('identifySections calls edge function and populates pendingSections', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    mockInvoke.mockResolvedValueOnce({
      data: {
        sections: [
          {
            id: 's1',
            location: 'Section 1',
            items: [
              { id: 's1-1', label: 'Company Name', prompt: 'Describe your company' },
              { id: 's1-2', label: 'Date', prompt: 'Provide date' },
            ],
          },
          {
            id: 's2',
            location: 'Section 2',
            items: [
              { id: 's2-1', label: 'Technical approach', prompt: 'Technical approach' },
            ],
          },
        ],
      },
      error: null,
    })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    // First open a document so content is set
    await act(async () => {
      await result.current.selectDocument('gdoc-1', 'Test RFP')
    })

    await act(async () => {
      await result.current.identifySections()
    })

    expect(mockInvoke).toHaveBeenCalledWith('auto-fill-identify', {
      body: { html: result.current.content },
    })
    expect(result.current.pendingSections).toHaveLength(2)
    expect(result.current.pendingSections[0].items).toHaveLength(2)
    expect(result.current.pendingSections[0].items[0].selected).toBe(true)
    expect(result.current.pendingSections[0].expanded).toBe(false)
    expect(result.current.pendingSections[0].location).toBe('Section 1')
    expect(result.current.filling).toBe(false)
  })

  test('identifySections shows error when no document is open', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.identifySections()
    })

    expect(result.current.error).toBe('No document open to analyze.')
    expect(result.current.pendingSections).toHaveLength(0)
  })

  test('cancelSections clears pendingSections', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    mockInvoke.mockResolvedValueOnce({
      data: {
        sections: [
          {
            id: 's1',
            location: 'Section 1',
            items: [
              { id: 's1-1', label: 'Company Name', prompt: 'Describe your company' },
            ],
          },
        ],
      },
      error: null,
    })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.selectDocument('gdoc-1', 'Test RFP')
    })

    await act(async () => {
      await result.current.identifySections()
    })

    expect(result.current.pendingSections).toHaveLength(1)

    act(() => {
      result.current.cancelSections()
    })

    expect(result.current.pendingSections).toHaveLength(0)
  })

  test('restores doc, content, pendingSections, and fillResults from localStorage', async () => {
    const saved = {
      doc: { googleDocId: 'gdoc-saved', title: 'Saved Doc' },
      content: '<p>saved content</p>',
      pendingSections: [
        {
          id: 's1',
          location: 'Section 1',
          expanded: false,
          items: [{ id: 's1-1', label: 'Item', prompt: 'Do it', originalText: '[Item]', selected: true }],
        },
      ],
      fillResults: [
        { id: 's1-1', response: 'ThinkCERCA', originalText: 'Company Name' },
      ],
      lastFillItems: [],
    }
    localStorage.setItem('rfp-buddy-active-doc-id', 'gdoc-saved')
    localStorage.setItem('rfp-buddy-doc-gdoc-saved', JSON.stringify(saved))

    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    expect(result.current.doc).toEqual({ googleDocId: 'gdoc-saved', title: 'Saved Doc' })
    expect(result.current.content).toBe('<p>saved content</p>')
    expect(result.current.pendingSections).toHaveLength(1)
    expect(result.current.pendingSections[0].location).toBe('Section 1')
    expect(result.current.fillResults).toHaveLength(1)
    expect(result.current.fillResults[0]).toEqual({ id: 's1-1', response: 'ThinkCERCA', originalText: 'Company Name' })
  })

  test('clearDocument removes active doc pointer but preserves per-document state', async () => {
    const saved = {
      doc: { googleDocId: 'gdoc-saved', title: 'Saved Doc' },
      content: '<p>saved content</p>',
      pendingSections: [],
      fillResults: [],
      lastFillItems: [],
    }
    localStorage.setItem('rfp-buddy-active-doc-id', 'gdoc-saved')
    localStorage.setItem('rfp-buddy-doc-gdoc-saved', JSON.stringify(saved))

    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    expect(result.current.doc).not.toBeNull()

    act(() => {
      result.current.clearDocument()
    })

    expect(result.current.doc).toBeNull()
    // Active doc pointer should be removed
    expect(localStorage.getItem('rfp-buddy-active-doc-id')).toBeNull()
    // Per-document state should be preserved for later re-opening
    expect(localStorage.getItem('rfp-buddy-doc-gdoc-saved')).not.toBeNull()
  })

  test('selectDocument restores from localStorage instead of fetching from Drive', async () => {
    const saved = {
      doc: { googleDocId: 'gdoc-cached', title: 'Cached Doc' },
      content: '<p>cached content</p>',
      pendingSections: [
        {
          id: 's1',
          location: 'Section 1',
          expanded: false,
          items: [{ id: 's1-1', label: 'Item', prompt: 'Do it', originalText: '[Item]', selected: true }],
        },
      ],
      fillResults: [],
      lastFillItems: [{ id: 's1-1', label: 'Item', prompt: 'Do it', originalText: '[Item]' }],
    }
    localStorage.setItem('rfp-buddy-doc-gdoc-cached', JSON.stringify(saved))

    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.selectDocument('gdoc-cached', 'Cached Doc')
    })

    // Should restore from localStorage, NOT fetch from Drive
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.doc).toEqual({ googleDocId: 'gdoc-cached', title: 'Cached Doc' })
    expect(result.current.content).toBe('<p>cached content</p>')
    expect(result.current.pendingSections).toHaveLength(1)
    expect(result.current.canRegenerate).toBe(true)
  })

  test('selectDocument fetches from Drive when no localStorage entry exists', async () => {
    // NO localStorage entries for this doc
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.selectDocument('gdoc-new', 'New Doc')
    })

    // Should fetch from Drive since no localStorage
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/files/gdoc-new/export?mimeType=text/html',
      { headers: { Authorization: 'Bearer token' } },
    )
    expect(result.current.doc).toEqual({ googleDocId: 'gdoc-new', title: 'New Doc' })
  })

  test('fillSections calls auto-fill-generate with all items and returns results', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    // First: identifySections to populate pendingSections
    mockInvoke.mockResolvedValueOnce({
      data: {
        sections: [
          {
            id: 's1',
            location: 'Cover Page',
            items: [
              { id: 's1-1', label: 'Company Name', prompt: 'Provide company name' },
              { id: 's1-2', label: 'Date', prompt: 'Provide date' },
            ],
          },
        ],
      },
      error: null,
    })

    // Batch generate call returns all results at once
    mockInvoke.mockResolvedValueOnce({
      data: {
        results: [
          { id: 's1-1', response: 'ThinkCERCA' },
          { id: 's1-2', response: 'March 2026' },
        ],
      },
      error: null,
    })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    // Open a document
    await act(async () => {
      await result.current.selectDocument('gdoc-1', 'Test RFP')
    })

    // Identify sections
    await act(async () => {
      await result.current.identifySections()
    })

    expect(result.current.pendingSections).toHaveLength(1)

    // Fill sections
    await act(async () => {
      await result.current.fillSections()
    })

    // Panel should be closed (pendingSections cleared)
    expect(result.current.pendingSections).toHaveLength(0)
    // Results should be populated
    expect(result.current.fillResults).toHaveLength(2)
    expect(result.current.fillResults[0]).toEqual({ id: 's1-1', response: 'ThinkCERCA', originalText: 'Company Name' })
    expect(result.current.fillResults[1]).toEqual({ id: 's1-2', response: 'March 2026', originalText: 'Date' })
    expect(result.current.filling).toBe(false)
    // Should have called auto-fill-generate once with all items
    expect(mockInvoke).toHaveBeenCalledWith('auto-fill-generate', {
      body: {
        items: [
          { id: 's1-1', label: 'Company Name', prompt: 'Provide company name' },
          { id: 's1-2', label: 'Date', prompt: 'Provide date' },
        ],
      },
    })
  })

  test('fillSections shows error when no items selected', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    // identifySections returns sections
    mockInvoke.mockResolvedValueOnce({
      data: {
        sections: [
          {
            id: 's1',
            location: 'Cover Page',
            items: [
              { id: 's1-1', label: 'Company Name', prompt: 'Provide company name' },
            ],
          },
        ],
      },
      error: null,
    })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.selectDocument('gdoc-1', 'Test RFP')
    })

    await act(async () => {
      await result.current.identifySections()
    })

    // Deselect all items via setPendingSections
    act(() => {
      result.current.setPendingSections((prev) =>
        prev.map((s) => ({
          ...s,
          items: s.items.map((i) => ({ ...i, selected: false })),
        })),
      )
    })

    await act(async () => {
      await result.current.fillSections()
    })

    expect(result.current.error).toBe('No items selected to fill.')
    // Panel should still be open since we didn't proceed
    expect(result.current.pendingSections).toHaveLength(1)
  })

  test('regenerate re-runs generation with last fill items', async () => {
    chain().limit.mockReturnValue({ ...chain(), data: [] })

    // identifySections
    mockInvoke.mockResolvedValueOnce({
      data: {
        sections: [
          {
            id: 's1',
            location: 'Cover Page',
            items: [
              { id: 's1-1', label: 'Company Name', prompt: 'Provide company name' },
            ],
          },
        ],
      },
      error: null,
    })

    // First generate call
    mockInvoke.mockResolvedValueOnce({
      data: { results: [{ id: 's1-1', response: 'ThinkCERCA' }] },
      error: null,
    })

    // Regenerate call
    mockInvoke.mockResolvedValueOnce({
      data: { results: [{ id: 's1-1', response: 'ThinkCERCA Inc.' }] },
      error: null,
    })

    const { result } = renderHook(() => useActiveDocument('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.initialLoading).toBe(false)
    })

    await act(async () => {
      await result.current.selectDocument('gdoc-1', 'Test RFP')
    })

    await act(async () => {
      await result.current.identifySections()
    })

    await act(async () => {
      await result.current.fillSections()
    })

    expect(result.current.canRegenerate).toBe(true)
    expect(result.current.fillResults[0].response).toBe('ThinkCERCA')

    const versionBefore = result.current.contentVersion

    await act(async () => {
      await result.current.regenerate()
    })

    expect(result.current.contentVersion).toBe(versionBefore + 1)
    expect(result.current.fillResults[0].response).toBe('ThinkCERCA Inc.')
    expect(result.current.canRegenerate).toBe(true)
  })
})
