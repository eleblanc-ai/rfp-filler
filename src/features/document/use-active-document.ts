import { useEffect, useState } from 'react'
import { supabase } from '../../shared/config/supabase'

const MAX_RECENT = 5

interface SelectedDoc {
  googleDocId: string
  title: string
}

export interface RecentDocument {
  google_doc_id: string
  title: string
  updated_at: string
}

export function useActiveDocument(
  providerToken: string | null,
  userId: string | null,
) {
  const [doc, setDoc] = useState<SelectedDoc | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])

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
    setDoc(null)
    setContent(null)
    setError(null)
  }

  return {
    doc,
    content,
    loading,
    error,
    initialLoading,
    recentDocuments,
    selectDocument,
    uploadFromComputer,
    removeRecentDocument,
    clearDocument,
  }
}
