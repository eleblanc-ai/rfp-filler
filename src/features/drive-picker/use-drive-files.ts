import { useState } from 'react'

export interface DriveFile {
  id: string
  name: string
  modifiedTime: string
}

interface UseDriveFilesResult {
  files: DriveFile[]
  loading: boolean
  error: string | null
  fetchFiles: () => Promise<void>
}

export function useDriveFiles(providerToken: string | null): UseDriveFilesResult {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchFiles() {
    if (!providerToken) {
      setError('Not connected to Google Drive')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.document'",
        fields: 'files(id,name,modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: '50',
      })

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        { headers: { Authorization: `Bearer ${providerToken}` } },
      )

      if (!response.ok) {
        throw new Error('Failed to fetch files from Google Drive')
      }

      const data = await response.json()
      setFiles(data.files ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }

  return { files, loading, error, fetchFiles }
}
