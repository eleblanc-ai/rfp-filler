# Slice 10: Auto-Fill Generate

**Timestamp:** 2026-03-17 15:00:00 CDT
**Status:** Approved

---

## Plan

**Goal:** Wire up the "Fill Selected" button to generate AI responses for each selected item using RAG (vector search against KB chunks + Claude), then insert the responses directly into the document editor. AI-inserted content is wrapped in marked `<span>` elements with `data-ai-fill` attributes. Add Regenerate button to re-run the last fill. Persist filled content across page refresh via sessionStorage.

**Files:**
- `supabase/functions/auto-fill-generate/index.ts` (create) — RAG retrieval + Claude generation per item
- `src/features/document/use-active-document.ts` (modify) — Add fillSections(), runGenerate(), regenerate(), updateContent(), contentVersion, lastFillItems
- `src/features/document/document-viewer.tsx` (modify) — Enable Fill Selected, show progress, highlight AI spans, Regenerate button, content persistence via onContentChange
- `src/features/document/document-viewer.test.tsx` (modify) — Test fill results insertion, Regenerate button states
- `src/features/document/use-active-document.test.ts` (modify) — Test fill flow, regenerate
- `src/app/App.tsx` (modify) — Wire onFillSelected, contentVersion, canRegenerate, onRegenerate, onContentChange
- `src/index.css` (modify) — Add generating animation keyframes

**Outcome:** User can select identified sections and click "Fill Selected" to generate AI responses via RAG. Responses appear in the editor with blue highlight. Regenerate button allows re-running the last fill. Filled content persists across page refresh.

**Verification:** npm run verify

---

## User Interactions

### Phase 2: Planning
```
User: ok now implement it (after Slice 9 approval)
Cosmo: Planned Slice 10 with batch generation, RAG, and DOM insertion
User: approved plan
```

### Phase 3: Implementation
```
Cosmo: Implemented all features — batch generation, cross-node DOM insertion, generating animation, Regenerate button
```

### Phase 4: Approval
```
User: "i don't see a regenerate button"
Cosmo: Explained it only appears after a fill completes (canRegenerate = lastFillItems.length > 0 && !filling)
User: "no it's all good this is approved"
User: "ok so finish the slice"
Cosmo: Presented full slice for approval
User: "needs to save generations, so if i refresh it's still there and editable"
Cosmo: Added content persistence — fills baked into content state via onContentChange callback after DOM insertion
User: "ok now i need you to let me upload pdfs" (implicit approval, moved on)
```

---

## Iterations

### Iteration 1: Content Persistence
**User Feedback:** "needs to save generations, so if i refresh it's still there and editable"

**Changes to scope:**
- Added `updateContent(html: string)` to hook — sets content and clears fillResults
- Added `onContentChange` prop to DocumentViewer
- After fill results inserted into DOM, calls `onContentChange(editorRef.current.innerHTML)` to bake fills into content state
- sessionStorage now stores complete filled HTML, surviving page refresh

---

## Build & Test Results

### Build
```
> rfp-filler@0.0.0 verify
> tsc -b && eslint . && vitest run

 Test Files  6 passed (6)
      Tests  68 passed (68)
   Duration  1.51s
```

**Status:** Pass
**Duration:** 1510ms

### Tests

**Status:** All Passing

**Test Details:**

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `src/features/document/document-viewer.test.tsx` | renders Auto-Fill button in toolbar | Pass | Auto-Fill button present |
| 2 | `src/features/document/document-viewer.test.tsx` | Auto-Fill button calls onAutoFill | Pass | Click callback fires |
| 3 | `src/features/document/document-viewer.test.tsx` | Auto-Fill button shows status text when filling | Pass | Shows "Analyzing document..." during fill |
| 4 | `src/features/document/document-viewer.test.tsx` | shows section review panel when pendingSections exist | Pass | Accordion panel renders |
| 5 | `src/features/document/document-viewer.test.tsx` | toggling an item checkbox calls onToggleItem | Pass | Item checkbox fires callback |
| 6 | `src/features/document/document-viewer.test.tsx` | toggling section checkbox calls onToggleSection | Pass | Parent checkbox fires callback |
| 7 | `src/features/document/document-viewer.test.tsx` | clicking expand arrow calls onToggleExpand | Pass | Expand/collapse toggle fires callback |
| 8 | `src/features/document/document-viewer.test.tsx` | collapsed section hides items | Pass | Items hidden when collapsed |
| 9 | `src/features/document/document-viewer.test.tsx` | Cancel button clears sections | Pass | Cancel fires onCancelSections |
| 10 | `src/features/document/document-viewer.test.tsx` | shows inline error banner when error with content | Pass | Inline error banner |
| 11 | `src/features/document/document-viewer.test.tsx` | inserts fill results into editor and calls onContentChange to persist | Pass | AI spans inserted, content baked to state |
| 12 | `src/features/document/document-viewer.test.tsx` | shows Regenerate button when canRegenerate is true | Pass | Button visible after fill |
| 13 | `src/features/document/document-viewer.test.tsx` | hides Regenerate button when canRegenerate is false | Pass | Button hidden before fill |
| 14 | `src/features/document/document-viewer.test.tsx` | Regenerate button disabled while filling | Pass | Button disabled during generation |
| 15 | `src/features/document/use-active-document.test.ts` | identifySections calls edge function and populates pendingSections | Pass | Edge function invoked, sections mapped |
| 16 | `src/features/document/use-active-document.test.ts` | identifySections shows error when no document is open | Pass | Error when no doc |
| 17 | `src/features/document/use-active-document.test.ts` | cancelSections clears pendingSections | Pass | Sections cleared |
| 18 | `src/features/document/use-active-document.test.ts` | restores doc, content, and pendingSections from sessionStorage | Pass | State restored on mount |
| 19 | `src/features/document/use-active-document.test.ts` | clearDocument removes sessionStorage | Pass | Storage cleared on doc close |
| 20 | `src/features/document/use-active-document.test.ts` | fillSections calls generate edge function and returns results | Pass | Fill flow end-to-end |
| 21 | `src/features/document/use-active-document.test.ts` | regenerate bumps contentVersion and re-runs generation | Pass | Regenerate resets and re-fills |

---

## Manual Verification Tasks

- [ ] Open an RFP document, click Auto-Fill, review sections, click Fill Selected
- [ ] Verify AI-generated text appears in the editor with blue highlight
- [ ] Verify the "Regenerate" button appears after fill completes
- [ ] Click Regenerate — verify new responses replace previous ones
- [ ] After a successful fill, refresh the page — verify filled content persists
- [ ] Edit the filled text manually, refresh — verify edits persist

**Expected Results:**
- Fill Selected generates responses and inserts them as highlighted spans
- Regenerate re-runs the fill with fresh responses
- Content survives page refresh via sessionStorage

---

## Summary

Completed the core auto-fill generation loop. Users select sections from the review panel, click Fill Selected, and Claude generates responses using RAG-retrieved KB context. Responses are inserted into the editor as highlighted spans. A Regenerate button allows re-running the last fill. All filled content persists across page refresh via sessionStorage content baking.
