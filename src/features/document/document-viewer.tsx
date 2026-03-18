import { useCallback, useEffect, useRef, useState } from 'react'
import type { FillResult, PendingSection } from './use-active-document'

interface DocumentViewerProps {
  content: string | null
  contentVersion: number
  title: string
  googleDocId: string
  loading: boolean
  error: string | null
  filling: boolean
  fillStatus: string | null
  pendingSections: PendingSection[]
  fillResults: FillResult[]
  canRegenerate: boolean
  saving: boolean
  lastSavedAt: string | null
  onBack: () => void
  onAutoFill: () => void
  onFillSelected: () => void
  onRegenerate: () => void
  onContentChange: (html: string) => void
  onSaveToDrive: (html: string) => void
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
  contentVersion,
  title,
  googleDocId,
  loading,
  error,
  filling,
  fillStatus,
  pendingSections,
  fillResults,
  canRegenerate,
  saving,
  lastSavedAt,
  onBack,
  onAutoFill,
  onFillSelected,
  onRegenerate,
  onContentChange,
  onSaveToDrive,
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
  const insertedResultIds = useRef(new Set<string>())

  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content
      insertedResultIds.current.clear()
    }
  }, [content, contentVersion])

  // Set initial panel width to 50% when sections first appear
  useEffect(() => {
    if (pendingSections.length > 0 && panelWidth === null && containerRef.current) {
      setPanelWidth(Math.round(containerRef.current.offsetWidth * 0.5))
    }
    if (pendingSections.length === 0) {
      setPanelWidth(null)
    }
  }, [pendingSections.length, panelWidth])

  // Insert fill results into editor as highlighted AI-generated spans.
  // Google Docs HTML splits text across many <span> elements, so we must
  // search the combined textContent and map the match back to DOM nodes.
  useEffect(() => {
    if (!editorRef.current || fillResults.length === 0) return

    for (const result of fillResults) {
      if (insertedResultIds.current.has(result.id)) continue

      const span = document.createElement('span')
      span.setAttribute('data-ai-fill', result.id)
      span.style.backgroundColor = '#dbeafe'
      span.textContent = result.response

      const editor = editorRef.current

      // Collect all text nodes and build a combined string with offset mapping
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
      const nodes: { node: Text; start: number }[] = []
      let combined = ''
      while (walker.nextNode()) {
        const node = walker.currentNode as Text
        nodes.push({ node, start: combined.length })
        combined += node.textContent ?? ''
      }

      const searchText = result.originalText
      const matchIdx = combined.indexOf(searchText)
      let inserted = false

      if (matchIdx !== -1) {
        const matchEnd = matchIdx + searchText.length

        // Find starting text node / offset
        let startNode: Text | null = null
        let startOffset = 0
        let endNode: Text | null = null
        let endOffset = 0

        for (let i = 0; i < nodes.length; i++) {
          const { node, start } = nodes[i]
          const nodeEnd = start + (node.textContent?.length ?? 0)

          if (!startNode && nodeEnd > matchIdx) {
            startNode = node
            startOffset = matchIdx - start
          }
          if (nodeEnd >= matchEnd) {
            endNode = node
            endOffset = matchEnd - start
            break
          }
        }

        if (startNode && endNode) {
          const range = document.createRange()
          range.setStart(startNode, startOffset)
          range.setEnd(endNode, endOffset)
          range.deleteContents()
          range.insertNode(span)
          inserted = true
        }
      }

      if (!inserted) {
        const p = document.createElement('p')
        p.appendChild(span)
        editor.appendChild(p)
      }

      insertedResultIds.current.add(result.id)
    }

    // Bake filled content into state so it persists across refresh
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML)
    }
  }, [fillResults]) // eslint-disable-line react-hooks/exhaustive-deps

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
            {filling ? (pendingSections.length === 0 ? 'Working...' : (fillStatus ?? 'Working...')) : 'Auto-Fill'}
          </button>
          {canRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={filling}
              className="rounded bg-white px-3 py-1 text-sm font-medium text-primary-dark ring-1 ring-border hover:bg-surface-secondary disabled:opacity-50"
            >
              Regenerate
            </button>
          )}
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
            onClick={() => {
              if (editorRef.current) {
                onSaveToDrive(editorRef.current.innerHTML)
              }
            }}
            disabled={saving}
            className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save to Drive'}
          </button>
          {lastSavedAt && !saving && (
            <span className="text-xs text-green-600" title={new Date(lastSavedAt).toLocaleString()}>
              Saved
            </span>
          )}
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

      <div ref={containerRef} className="relative flex min-h-0 flex-1 overflow-hidden">
        {filling && pendingSections.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div
              className="mb-4 text-4xl"
              style={{ animation: 'generating-pencil 0.6s ease-in-out infinite' }}
            >
              &#9998;
            </div>
            <p className="mb-3 text-sm font-medium text-text-primary">
              {fillStatus ?? 'Working...'}
            </p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary-dark"
                  style={{
                    animation: 'generating-bounce 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-text-secondary">
              Drafting your responses — hang tight!
            </p>
          </div>
        )}
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
                  onClick={onFillSelected}
                  disabled={pendingSections.every((s) => s.items.every((i) => !i.selected))}
                  className="flex-1 rounded bg-primary-dark px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
