import { useEffect, useState } from 'react'
import { supabase } from '../../shared/config/supabase'

interface SelectedDoc {
  googleDocId: string
  title: string
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

  useEffect(() => {
    if (!userId) {
      setInitialLoading(false)
      return
    }

    async function loadLast() {
      try {
        const { data } = await supabase
          .from('documents')
          .select('google_doc_id, title')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (data && providerToken) {
          await fetchContent(data.google_doc_id, data.title)
        }
      } catch {
        // documents table may not exist yet — silently skip
      } finally {
        setInitialLoading(false)
      }
    }

    loadLast()
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

  async function selectDocument(googleDocId: string, title: string) {
    await fetchContent(googleDocId, title)

    if (userId) {
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
      } catch {
        // Supabase persistence is best-effort
      }
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
    selectDocument,
    clearDocument,
  }
}
