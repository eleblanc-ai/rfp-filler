# Slice 9: Auto-Fill Identify + Review

**Timestamp:** 2026-03-17
**Status:** Approved

---

## Plan

**Goal:** Add an "Auto-Fill" button that sends the document to Claude to identify major sections needing responses, then shows a resizable accordion-style review panel where the user can expand/collapse sections, toggle individual items, and edit prompts before proceeding to fill.

**Files:**
- `supabase/functions/auto-fill-identify/index.ts` (create) — Edge Function: receives HTML, calls Claude to identify 3-10 major sections with nested items
- `src/features/document/use-active-document.ts` (modify) — `PendingItem`/`PendingSection` interfaces, nested state, `identifySections()`, `cancelSections()`, sessionStorage persistence
- `src/features/document/document-viewer.tsx` (modify) — Auto-Fill button, inline error banner, resizable 50%-width accordion panel with sticky header/buttons, independent scrolling
- `src/features/document/document-viewer.test.tsx` (modify) — 11 new tests for Auto-Fill UI + accordion behavior
- `src/features/document/use-active-document.test.ts` (modify) — 5 new tests for identify flow, persistence, and clear
- `src/app/App.tsx` (modify) — Wire all new callbacks, fix viewport height chain
- `src/index.css` (modify) — Set html/body/#root to height:100% + overflow:hidden for proper scroll containment

**Outcome:** User opens an RFP, clicks "Auto-Fill", Claude analyzes the document and presents 3-10 major sections as collapsed accordions. Each section expands to show items as a nested checklist. Fill Selected/Cancel buttons stay pinned at top while scrolling. Both the document and the section panel scroll independently. State persists across page refresh via sessionStorage.

**Verification:** npm run verify

### Iteration 1 — Broader sections, resizable panel
- Updated Claude prompt to group into 3-10 major sections instead of individual fields
- Changed panel from fixed 320px to 50% default with draggable resize handle

### Iteration 2 — Nested accordion checklist
- Changed data model from flat sections to nested sections with items
- Updated Claude prompt to return `{ id, location, items: [{ id, label, prompt }] }`
- Rebuilt review panel as accordion with expand/collapse, section-level and item-level checkboxes
- Added indeterminate checkbox state for partially-selected sections

### Iteration 3 — Sticky buttons, collapsed default
- Moved Fill Selected/Cancel buttons to sticky header above scrollable list
- Changed accordions to collapsed by default

### Iteration 4 — Session persistence
- Added sessionStorage persistence for doc, content, and pendingSections
- Lazy initializers so storage only read on mount

### Iteration 5 — Scroll containment
- Set html/body/#root to `height: 100%; overflow: hidden` in CSS
- Added `overflow-hidden` and `min-h-0` throughout the flex chain
- Both document and panel now scroll independently with buttons pinned

---

## Build & Test Results

### Build
```
> rfp-filler@0.0.0 verify
> tsc -b && eslint . && vitest run

 Test Files  6 passed (6)
      Tests  58 passed (58)
   Duration  1.29s
```

**Status:** Pass

### Tests

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `document-viewer.test.tsx` | renders Auto-Fill button in toolbar | Pass | Auto-Fill button present in toolbar |
| 2 | `document-viewer.test.tsx` | Auto-Fill button calls onAutoFill | Pass | Clicking Auto-Fill triggers callback |
| 3 | `document-viewer.test.tsx` | Auto-Fill button shows status text when filling | Pass | Shows "Analyzing document..." during fill |
| 4 | `document-viewer.test.tsx` | shows section review panel when pendingSections exist | Pass | Accordion panel renders with section count, locations, items, Fill/Cancel buttons |
| 5 | `document-viewer.test.tsx` | toggling an item checkbox calls onToggleItem | Pass | Item checkbox fires callback with sectionId + itemId |
| 6 | `document-viewer.test.tsx` | toggling section checkbox calls onToggleSection | Pass | Parent checkbox fires callback with sectionId |
| 7 | `document-viewer.test.tsx` | clicking expand arrow calls onToggleExpand | Pass | Expand/collapse toggle fires callback |
| 8 | `document-viewer.test.tsx` | collapsed section hides items | Pass | Items not rendered when section.expanded is false |
| 9 | `document-viewer.test.tsx` | Cancel button clears sections | Pass | Cancel button fires onCancelSections |
| 10 | `document-viewer.test.tsx` | shows inline error banner when error with content | Pass | Error shows as inline banner, not full-page error |
| 11 | `use-active-document.test.ts` | identifySections calls edge function and populates pendingSections | Pass | Invokes auto-fill-identify, maps nested sections with selected:true, expanded:false |
| 12 | `use-active-document.test.ts` | identifySections shows error when no document is open | Pass | Sets error "No document open to analyze." |
| 13 | `use-active-document.test.ts` | cancelSections clears pendingSections | Pass | Resets pendingSections to empty array |
| 14 | `use-active-document.test.ts` | restores doc, content, and pendingSections from sessionStorage | Pass | State restored from sessionStorage on mount |
| 15 | `use-active-document.test.ts` | clearDocument removes sessionStorage | Pass | Clearing doc also clears sessionStorage |

---

## Summary

Added the first half of the AI auto-fill flow. A new Edge Function (`auto-fill-identify`) sends document HTML to Claude, which semantically analyzes the RFP and groups fillable areas into 3-10 major sections, each containing specific items. Results appear in a resizable accordion-style side panel with sticky action buttons at the top, independent scrolling on both sides, and sections collapsed by default. Users can expand sections, toggle items individually or in bulk, and edit prompts. State persists across page refresh via sessionStorage. "Fill Selected" is present but disabled — it will be wired up in Slice 10.
