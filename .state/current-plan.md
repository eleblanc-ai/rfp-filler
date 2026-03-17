## Slice 9: Auto-Fill Identify + Review

**Goal**: Add an "Auto-Fill" button that sends the document to Claude to identify sections needing responses, then shows a review panel where the user can check/uncheck and edit sections before proceeding to fill.

**Why now**: First half of the auto-fill flow — gives the user visibility and control before any AI generation happens. RAG infrastructure is in place.

**Scope**:
- In scope:
  - New Edge Function `auto-fill-identify` — receives document HTML, sends to Claude, returns nested JSON with sections containing items
  - Hook additions: `identifySections()`, `pendingSections` state (nested with items), `setPendingSections` for edits, `filling` state with status text
  - Section review panel in DocumentViewer — accordion-style nested checklist with expandable sections, per-item checkboxes, editable prompts, "Fill Selected" and "Cancel" buttons
  - Resizable side panel (50% default, draggable resize handle)
  - "Auto-Fill" button in toolbar that triggers identification
  - Status indicators: "Analyzing document..." while identifying
- Out of scope: Actual fill generation (Slice 10), vector search, match_chunks RPC, KB retrieval

**User-visible outcome**: User opens an RFP, clicks "Auto-Fill", Claude analyzes the document and presents nested accordion sections. User expands/collapses sections, toggles individual items or entire sections, edits prompts. "Fill Selected" button is present but will be wired up in Slice 10.

**Files**:
- `supabase/functions/auto-fill-identify/index.ts` (create) — Claude identifies fillable sections with nested items
- `src/features/document/use-active-document.ts` (modify) — Add PendingItem/PendingSection interfaces, identifySections(), pendingSections, filling state
- `src/features/document/document-viewer.tsx` (modify) — Add Auto-Fill button + resizable accordion section review panel
- `src/features/document/document-viewer.test.tsx` (modify) — Test button, accordion panel, item toggle, section toggle, expand/collapse
- `src/features/document/use-active-document.test.ts` (modify) — Test identify flow with nested structure
- `src/app/App.tsx` (modify) — Wire all new callbacks

**Verification**: npm run verify

### Iteration 1 — Broader sections, resizable panel
- Updated Claude prompt to group into 3-10 major sections instead of individual fields
- Changed panel from fixed 320px to 50% default with draggable resize handle

### Iteration 2 — Nested accordion checklist
- Changed data model from flat sections to nested sections with items
- Updated Claude prompt to return `{ id, location, items: [{ id, label, prompt }] }`
- Rebuilt review panel as accordion with expand/collapse, section-level and item-level checkboxes
- Added indeterminate checkbox state for partially-selected sections
