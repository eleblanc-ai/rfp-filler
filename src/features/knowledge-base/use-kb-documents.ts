import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../shared/config/supabase'

export interface KbDocument {
  id: string
  filename: string
  source: 'upload' | 'drive'
  created_at: string
}

interface UseKbDocumentsResult {
  documents: KbDocument[]
  loading: boolean
  error: string | null
  addDocument: (params: {
    filename: string
    source: 'upload' | 'drive'
    rawText: string
    contentType: string
    googleDocId?: string
  }) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
}

export function useKbDocuments(userId: string | null): UseKbDocumentsResult {
  const [documents, setDocuments] = useState<KbDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('kb_documents')
          .select('id, filename, source, created_at')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setDocuments(data ?? [])
      } catch {
        setError('Failed to load knowledge base documents')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId])

  const addDocument = useCallback(
    async (params: {
      filename: string
      source: 'upload' | 'drive'
      rawText: string
      contentType: string
      googleDocId?: string
    }) => {
      if (!userId) return

      setError(null)

      const { data, error: insertError } = await supabase
        .from('kb_documents')
        .insert({
          user_id: userId,
          filename: params.filename,
          source: params.source,
          raw_text: params.rawText,
          content_type: params.contentType,
          google_doc_id: params.googleDocId ?? null,
          chunk_count: 0,
        })
        .select('id, filename, source, created_at')
        .single()

      if (insertError) {
        setError('Failed to upload document')
        throw insertError
      }

      setDocuments((prev) => [data, ...prev])
    },
    [userId],
  )

  const deleteDocument = useCallback(async (id: string) => {
    setError(null)

    const { error: deleteError } = await supabase
      .from('kb_documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('Failed to delete document')
      throw deleteError
    }

    setDocuments((prev) => prev.filter((doc) => doc.id !== id))
  }, [])

  return { documents, loading, error, addDocument, deleteDocument }
}
