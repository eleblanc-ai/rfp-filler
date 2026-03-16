# Slice 4: Document Viewer

**Timestamp:** 2026-03-16 18:25:00 -0500
**Status:** Approved

---

## Plan

**Goal:** After selecting an RFP template from Drive, fetch its content via Google Docs export API, display it in an editable rich text view, and persist the document reference in Supabase.

**Files:**
- `src/features/document/use-active-document.ts` (create) - Hook for fetching doc content + Supabase persistence
- `src/features/document/document-viewer.tsx` (create) - contentEditable viewer with toolbar
- `src/features/document/document-viewer.test.tsx` (create) - 6 tests for viewer states
- `src/app/App.tsx` (modify) - Integrated document viewer, replaced file confirmation

**Outcome:** User selects a Google Doc, sees content rendered with formatting, can edit text. Last-opened document reloads on refresh.

**Verification:** `npm run verify` + manual document loading test

---

## User Interactions

### Phase 2: Planning
```
Cosmo: Presented plan for Slice 4: Document Viewer.
User: yes
```

### Phase 3: Implementation
```
No user interactions during implementation.
```

### Phase 4: Approval
```
User: incredible. is full text editor functionality (bulleted lists, etc) in a future slice? also i assume this doesn't make the change in the actual google doc
Cosmo: Yes, rich editing can be upgraded via TipTap/Slate in a future slice. Changes are local only — Save Back to Drive is a separate feature slice.
User: yep! (approved)
```

---

## Build & Test Results

### Build
```
✓ 62 modules transformed.
dist/assets/index-CCvn7Vty.css   12.75 kB
dist/assets/index-BzIB9Ize.js   366.98 kB
✓ built in 86ms
```

**Status:** ✅ Success

### Tests
```
 Test Files  4 passed (4)
      Tests  21 passed (21)
   Duration  737ms
```

**Status:** ✅ All Passing

**Test Details:**

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `document-viewer.test.tsx` | shows loading state | ✅ Pass | Loading message while content is fetching |
| 2 | `document-viewer.test.tsx` | shows error state with back button | ✅ Pass | Error message + back link on failure |
| 3 | `document-viewer.test.tsx` | renders document title and toolbar | ✅ Pass | Title, B/I/Undo buttons all present |
| 4 | `document-viewer.test.tsx` | renders HTML content in the editor | ✅ Pass | HTML content rendered in contentEditable area |
| 5 | `document-viewer.test.tsx` | calls onBack when back button is clicked | ✅ Pass | Back button triggers callback |
| 6 | `document-viewer.test.tsx` | editor area is contentEditable | ✅ Pass | Editor div has contentEditable attribute |

---

## Summary

Added document viewer that fetches Google Doc content as HTML via the Drive export API, extracts body content, and renders it in a contentEditable container with a basic formatting toolbar (Bold, Italic, Undo). Document references are persisted in Supabase's documents table for reload on refresh. The useActiveDocument hook manages the full lifecycle: initial load from Supabase, Drive content fetching, and document selection.
