import { useCallback, useEffect, useRef, useState } from 'react'
import type { PendingSection } from './use-active-document'

interface DocumentViewerProps {
  content: string | null
  title: string
  googleDocId: string
  loading: boolean
  error: string | null
  filling: boolean
  fillStatus: string | null
  pendingSections: PendingSection[]
  onBack: () => void
  onAutoFill: () => void
  onCancelSections: () => void
  onToggleItem: (sectionId: string, itemId: string) => void
  onToggleSection: (sectionId: string) => void
  onToggleExpand: (sectionId: string) => void
  onEditItemPrompt: (sectionId: string, itemId: string, prompt: string) => void
}

function execFormat(command: string) {
  document.execCommand(command)
}

const MIN_PANEL_WIDTH = 280
const MAX_PANEL_RATIO = 0.7

export function DocumentViewer({
  content,
  title,
  googleDocId,
  loading,
  error,
  filling,
  fillStatus,
  pendingSections,
  onBack,
  onAutoFill,
  onCancelSections,
  onToggleItem,
  onToggleSection,
  onToggleExpand,
  onEditItemPrompt,
}: DocumentViewerProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState<number | null>(null)
  const dragging = useRef(false)

  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content
    }
  }, [content])

  // Set initial panel width to 50% when sections first appear
  useEffect(() => {
    if (pendingSections.length > 0 && panelWidth === null && containerRef.current) {
      setPanelWidth(Math.round(containerRef.current.offsetWidth * 0.5))
    }
    if (pendingSections.length === 0) {
      setPanelWidth(null)
    }
  }, [pendingSections.length, panelWidth])

  const onMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = rect.right - e.clientX
      const maxWidth = rect.width * MAX_PANEL_RATIO
      setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(newWidth, maxWidth)))
    }

    function onMouseUp() {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-text-secondary">Loading document...</p>
      </div>
    )
  }

  if (error && !content) {
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
          <button
            type="button"
            onClick={onAutoFill}
            disabled={filling}
            className="rounded bg-primary-dark px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {filling ? (fillStatus ?? 'Working...') : 'Auto-Fill'}
          </button>
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

      {error && (
        <div className="border-b border-border bg-red-50 px-4 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-0 flex-1 overflow-y-auto px-8 py-6 text-text-primary outline-none"
        />

        {pendingSections.length > 0 && (
          <>
            <div
              onMouseDown={onMouseDown}
              className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary-dark"
              data-testid="resize-handle"
            />
            <div
              className="flex min-h-0 shrink-0 flex-col border-l border-border bg-white"
              style={{ width: panelWidth ?? '50%' }}
            >
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  Sections to Fill ({pendingSections.reduce((n, s) => n + s.items.filter((i) => i.selected).length, 0)}/{pendingSections.reduce((n, s) => n + s.items.length, 0)})
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Review and edit the sections below, then click Fill Selected.
                </p>
              </div>
              <div className="flex gap-2 border-b border-border px-4 py-3">
                <button
                  type="button"
                  disabled
                  className="flex-1 rounded bg-primary-dark px-3 py-2 text-sm font-medium text-white opacity-50"
                  title="Coming in next update"
                >
                  Fill Selected
                </button>
                <button
                  type="button"
                  onClick={onCancelSections}
                  className="rounded px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                >
                  Cancel
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" data-testid="sections-list">
                {pendingSections.map((section) => {
                  const allSelected = section.items.every((i) => i.selected)
                  const someSelected = section.items.some((i) => i.selected) && !allSelected
                  return (
                    <div key={section.id} className="border-b border-border">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected
                          }}
                          onChange={() => onToggleSection(section.id)}
                          className="shrink-0"
                          aria-label={`Select all in ${section.location}`}
                        />
                        <button
                          type="button"
                          onClick={() => onToggleExpand(section.id)}
                          className="flex min-w-0 flex-1 items-center gap-1 text-left"
                        >
                          <span className="shrink-0 text-xs text-text-secondary">
                            {section.expanded ? '▼' : '▶'}
                          </span>
                          <span className="truncate text-sm font-medium text-text-primary">
                            {section.location}
                          </span>
                          <span className="ml-auto shrink-0 text-xs text-text-secondary">
                            {section.items.filter((i) => i.selected).length}/{section.items.length}
                          </span>
                        </button>
                      </div>
                      {section.expanded && (
                        <ul className="pb-2 pl-10 pr-4">
                          {section.items.map((item) => (
                            <li key={item.id} className="py-1.5">
                              <label className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => onToggleItem(section.id, item.id)}
                                  className="mt-0.5 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-medium text-text-primary">
                                    {item.label}
                                  </span>
                                  <textarea
                                    value={item.prompt}
                                    onChange={(e) =>
                                      onEditItemPrompt(section.id, item.id, e.target.value)
                                    }
                                    rows={2}
                                    className="mt-1 w-full rounded border border-border px-2 py-1 text-xs text-text-primary outline-none focus:border-primary-dark"
                                  />
                                </div>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
