import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../shared/config/supabase'
import { parseHtml, buildDocsRequests } from './html-to-docs'

const MAX_RECENT = 5
const ACTIVE_DOC_KEY = 'rfp-buddy-active-doc-id'
const DOC_PREFIX = 'rfp-buddy-doc-'

interface DocState {
  doc: SelectedDoc
  content: string
  pendingSections: PendingSection[]
  fillResults: FillResult[]
  lastFillItems: FillItem[]
}

interface FillItem {
  id: string
  label: string
  prompt: string
  originalText: string
}

function docKey(googleDocId: string) {
  return DOC_PREFIX + googleDocId
}

function saveDocState(
  doc: SelectedDoc | null,
  content: string | null,
  sections: PendingSection[],
  results: FillResult[],
  lastFillItems: FillItem[],
) {
  try {
    if (doc && content) {
      localStorage.setItem(ACTIVE_DOC_KEY, doc.googleDocId)
      localStorage.setItem(
        docKey(doc.googleDocId),
        JSON.stringify({ doc, content, pendingSections: sections, fillResults: results, lastFillItems }),
      )
    } else {
      localStorage.removeItem(ACTIVE_DOC_KEY)
    }
  } catch {
    // best-effort
  }
}

function loadDocState(googleDocId?: string): DocState | null {
  try {
    const id = googleDocId ?? localStorage.getItem(ACTIVE_DOC_KEY)
    if (!id) return null
    const raw = localStorage.getItem(docKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.doc?.googleDocId && parsed?.content) {
      return {
        doc: parsed.doc,
        content: parsed.content,
        pendingSections: parsed.pendingSections ?? [],
        fillResults: parsed.fillResults ?? [],
        lastFillItems: parsed.lastFillItems ?? [],
      }
    }
  } catch {
    // best-effort
  }
  return null
}

export function stripAiFillMarkup(html: string): string {
  const container = document.createElement('div')
  container.innerHTML = html
  for (const span of container.querySelectorAll('[data-ai-fill]')) {
    span.removeAttribute('data-ai-fill')
    ;(span as HTMLElement).style.removeProperty('background-color')
  }
  return container.innerHTML
}

interface SelectedDoc {
  googleDocId: string
  title: string
}

export interface RecentDocument {
  google_doc_id: string
  title: string
  updated_at: string
}

export interface PendingItem {
  id: string
  label: string
  prompt: string
  originalText: string
  selected: boolean
}

export interface FillResult {
  id: string
  response: string
  originalText: string
}

export interface PendingSection {
  id: string
  location: string
  items: PendingItem[]
  expanded: boolean
}

export function useActiveDocument(
  providerToken: string | null,
  userId: string | null,
) {
  const [doc, setDoc] = useState<SelectedDoc | null>(() => loadDocState()?.doc ?? null)
  const [content, setContent] = useState<string | null>(() => loadDocState()?.content ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])
  const [pendingSections, setPendingSections] = useState<PendingSection[]>(() => loadDocState()?.pendingSections ?? [])
  const [filling, setFilling] = useState(false)
  const [fillStatus, setFillStatus] = useState<string | null>(null)
  const [fillResults, setFillResults] = useState<FillResult[]>(() => loadDocState()?.fillResults ?? [])
  const [lastFillItems, setLastFillItems] = useState<FillItem[]>(() => loadDocState()?.lastFillItems ?? [])
  const [contentVersion, setContentVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const fillingRef = useRef(false)

  // Persist state to localStorage per-document
  useEffect(() => {
    saveDocState(doc, content, pendingSections, fillResults, lastFillItems)
  }, [doc, content, pendingSections, fillResults, lastFillItems])
  async function loadRecent() {
    if (!userId) return
    try {
      const { data } = await supabase
        .from('documents')
        .select('google_doc_id, title, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(MAX_RECENT)

      if (data) {
        setRecentDocuments(data)
      }
    } catch {
      // best-effort
    }
  }

  useEffect(() => {
    if (!userId) {
      setInitialLoading(false)
      return
    }

    loadRecent().finally(() => setInitialLoading(false))
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchContent(googleDocId: string, title: string) {
    if (!providerToken) {
      setDoc({ googleDocId, title })
      setError('Google Drive access expired. Sign in again to reload.')
      return
    }

    setDoc({ googleDocId, title })
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${googleDocId}/export?mimeType=text/html`,
        { headers: { Authorization: `Bearer ${providerToken}` } },
      )

      if (response.status === 401 || response.status === 403) {
        throw new Error('Google Drive access expired. Sign in again to reload.')
      }

      if (!response.ok) {
        throw new Error('Failed to load document from Google Drive')
      }

      const html = await response.text()
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      setContent(bodyMatch ? bodyMatch[1] : html)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  async function pruneOldDocuments() {
    if (!userId) return
    try {
      const { data: all } = await supabase
        .from('documents')
        .select('id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (all && all.length > MAX_RECENT) {
        const idsToDelete = all.slice(MAX_RECENT).map((d) => d.id)
        await supabase.from('documents').delete().in('id', idsToDelete)
      }
    } catch {
      // best-effort
    }
  }

  async function persistDocument(googleDocId: string, title: string) {
    if (!userId) return
    try {
      await supabase.from('documents').upsert(
        {
          user_id: userId,
          google_doc_id: googleDocId,
          title,
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,google_doc_id' },
      )
      await pruneOldDocuments()
      await loadRecent()
    } catch {
      // Supabase persistence is best-effort
    }
  }

  async function selectDocument(googleDocId: string, title: string) {
    // Restore saved state if available for this document
    const saved = loadDocState(googleDocId)
    if (saved) {
      setDoc(saved.doc)
      setContent(saved.content)
      setPendingSections(saved.pendingSections)
      setFillResults(saved.fillResults)
      setLastFillItems(saved.lastFillItems)
      setContentVersion((v) => v + 1)
      setError(null)
      await persistDocument(googleDocId, title)
      return
    }

    await fetchContent(googleDocId, title)
    await persistDocument(googleDocId, title)
  }

  async function uploadFromComputer(file: File) {
    if (!providerToken) {
      setError('Google Drive access expired. Sign in again to upload.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const text = await file.text()
      const title = file.name.replace(/\.[^.]+$/, '')

      // Create a new Google Doc with the file content using multipart/related
      const metadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
      }

      const boundary = '-----boundary' + Date.now()
      const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
        `${text}\r\n` +
        `--${boundary}--`

      const createResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${providerToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      )

      if (createResponse.status === 401 || createResponse.status === 403) {
        throw new Error('Google Drive access expired. Sign in again to upload.')
      }

      if (!createResponse.ok) {
        throw new Error('Failed to create document in Google Drive')
      }

      const created = await createResponse.json() as { id: string; name: string }

      // Use the original text directly — no need to round-trip through export
      setDoc({ googleDocId: created.id, title: created.name })
      const htmlContent = text
        .split('\n')
        .map((line) => `<p>${line || '<br>'}</p>`)
        .join('')
      setContent(htmlContent)

      // Fire-and-forget — don't await so setLoading(false) batches with setContent
      persistDocument(created.id, created.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setLoading(false)
    }
  }

  async function removeRecentDocument(googleDocId: string) {
    if (!userId) return
    try {
      await supabase
        .from('documents')
        .delete()
        .eq('user_id', userId)
        .eq('google_doc_id', googleDocId)
      await loadRecent()
    } catch {
      // best-effort
    }
  }

  function clearDocument() {
    // Clear the active doc pointer but keep per-document state in localStorage
    localStorage.removeItem(ACTIVE_DOC_KEY)
    setDoc(null)
    setContent(null)
    setError(null)
    setPendingSections([])
    setFilling(false)
    setFillStatus(null)
    setFillResults([])
    setLastFillItems([])
    setSaving(false)
    setLastSavedAt(null)
  }

  async function identifySections() {
    if (!content) {
      setError('No document open to analyze.')
      return
    }

    setFilling(true)
    setFillStatus('Analyzing document...')
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'auto-fill-identify',
        { body: { html: content } },
      )

      if (fnError) {
        throw new Error(fnError.message || 'Failed to analyze document')
      }

      const sections: PendingSection[] = (data.sections ?? []).map(
        (s: { id: string; location: string; items: { id: string; label: string; prompt: string; originalText?: string }[] }) => ({
          id: s.id,
          location: s.location,
          expanded: false,
          items: (s.items ?? []).map((item) => ({
            ...item,
            originalText: item.originalText ?? item.label,
            selected: true,
          })),
        }),
      )

      const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)
      if (totalItems === 0) {
        setError('No fillable sections found in this document.')
        return
      }

      setPendingSections(sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze document')
    } finally {
      setFilling(false)
      setFillStatus(null)
    }
  }

  function cancelSections() {
    setPendingSections([])
  }

  async function runGenerate(items: FillItem[]) {
    fillingRef.current = true
    setFilling(true)
    setFillResults([])
    setFillStatus(`Generating ${items.length} responses...`)
    setError(null)

    const originalTextMap = new Map<string, string>()
    for (const item of items) {
      originalTextMap.set(item.id, item.originalText)
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'auto-fill-generate',
        {
          body: {
            items: items.map((i) => ({
              id: i.id,
              label: i.label,
              prompt: i.prompt,
            })),
          },
        },
      )

      if (fnError) {
        setError(`Fill failed: ${fnError.message}`)
      } else {
        const results: FillResult[] = (data.results ?? []).map(
          (r: { id: string; response: string }) => ({
            id: r.id,
            response: r.response,
            originalText: originalTextMap.get(r.id) ?? r.id,
          }),
        )
        setFillResults(results)
      }
    } catch (err) {
      setError(`Fill failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    setFilling(false)
    setFillStatus(null)
    fillingRef.current = false
  }

  async function fillSections() {
    if (fillingRef.current) return // prevent concurrent fills
    const selectedItems = pendingSections
      .flatMap((s) => s.items)
      .filter((i) => i.selected)

    if (selectedItems.length === 0) {
      setError('No items selected to fill.')
      return
    }

    const items: FillItem[] = selectedItems.map((i) => ({
      id: i.id,
      label: i.label,
      prompt: i.prompt,
      originalText: i.originalText,
    }))

    setPendingSections([])
    setLastFillItems(items)
    await runGenerate(items)
  }

  async function regenerate() {
    if (fillingRef.current || lastFillItems.length === 0) return
    // Bump contentVersion so the viewer resets innerHTML to original content,
    // restoring placeholders that were replaced by previous fill results.
    setContentVersion((v) => v + 1)
    setFillResults([])
    await runGenerate(lastFillItems)
  }

  function updateContent(html: string) {
    setContent(html)
    setFillResults([])
  }

  async function saveToDrive(editorHtml: string) {
    if (!providerToken) {
      setError('Google Drive access expired. Sign in again to save.')
      return
    }
    if (!doc) {
      setError('No document open to save.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const cleanedHtml = stripAiFillMarkup(editorHtml)
      const paragraphs = parseHtml(cleanedHtml)

      // Get current document structure to find the end index
      const getResponse = await fetch(
        `https://docs.googleapis.com/v1/documents/${doc.googleDocId}`,
        { headers: { Authorization: `Bearer ${providerToken}` } },
      )

      if (getResponse.status === 401 || getResponse.status === 403) {
        throw new Error('Google Drive access expired. Sign in again to save.')
      }

      if (!getResponse.ok) {
        throw new Error('Failed to read document from Google Drive')
      }

      const docData = (await getResponse.json()) as {
        body?: { content?: { endIndex: number }[] }
      }
      const bodyContent = docData.body?.content ?? []
      const endIndex =
        bodyContent.length > 0
          ? bodyContent[bodyContent.length - 1].endIndex
          : 1

      const requests = buildDocsRequests(paragraphs, endIndex)

      if (requests.length > 0) {
        const updateResponse = await fetch(
          `https://docs.googleapis.com/v1/documents/${doc.googleDocId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${providerToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
          },
        )

        if (updateResponse.status === 401 || updateResponse.status === 403) {
          throw new Error('Google Drive access expired. Sign in again to save.')
        }

        if (!updateResponse.ok) {
          throw new Error('Failed to save document to Google Drive')
        }
      }

      const now = new Date().toISOString()
      setLastSavedAt(now)

      if (userId) {
        // Fire-and-forget metadata update
        Promise.resolve(
          supabase
            .from('documents')
            .update({ last_synced_at: now, updated_at: now })
            .eq('user_id', userId)
            .eq('google_doc_id', doc.googleDocId),
        ).catch(() => {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  return {
    doc,
    content,
    contentVersion,
    loading,
    error,
    initialLoading,
    recentDocuments,
    pendingSections,
    filling,
    fillStatus,
    fillResults,
    selectDocument,
    uploadFromComputer,
    removeRecentDocument,
    clearDocument,
    identifySections,
    setPendingSections,
    cancelSections,
    fillSections,
    regenerate,
    updateContent,
    saveToDrive,
    saving,
    lastSavedAt,
    canRegenerate: lastFillItems.length > 0 && !filling,
  }
}
