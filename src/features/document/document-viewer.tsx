import { useEffect, useRef } from 'react'

interface DocumentViewerProps {
  content: string | null
  title: string
  googleDocId: string
  loading: boolean
  error: string | null
  onBack: () => void
}

function execFormat(command: string) {
  document.execCommand(command)
}

export function DocumentViewer({
  content,
  title,
  googleDocId,
  loading,
  error,
  onBack,
}: DocumentViewerProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content
    }
  }, [content])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-text-secondary">Loading document...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-primary-dark hover:underline"
        >
          Back to file picker
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-text-secondary hover:text-text-primary"
          aria-label="Back to file picker"
        >
          ←
        </button>
        <span className="flex-1 truncate text-sm font-medium text-text-primary">
          {title}
        </span>
        <div className="flex items-center gap-1">
          <a
            href={`https://docs.google.com/document/d/${googleDocId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded px-2 py-1 text-sm text-primary-dark hover:bg-surface-secondary"
          >
            View in Drive
          </a>
          <button
            type="button"
            onClick={() => execFormat('bold')}
            className="rounded px-2 py-1 text-sm font-bold text-text-secondary hover:bg-surface-secondary"
            aria-label="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => execFormat('italic')}
            className="rounded px-2 py-1 text-sm italic text-text-secondary hover:bg-surface-secondary"
            aria-label="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => execFormat('undo')}
            className="rounded px-2 py-1 text-sm text-text-secondary hover:bg-surface-secondary"
            aria-label="Undo"
          >
            Undo
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="flex-1 overflow-y-auto px-8 py-6 text-text-primary outline-none"
      />
    </div>
  )
}
