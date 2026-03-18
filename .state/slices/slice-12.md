# Slice 12: Save to Drive (Google Docs API)

**Timestamp:** 2026-03-18 13:00:00 -0500
**Status:** Approved

---

## Plan

**Goal:** Save the edited RFP document back to the original Google Doc in-place using the Google Docs API batchUpdate endpoint. Replaces the broken Drive upload API approach (403 — native Google Docs can't be updated via media upload, and drive.file scope doesn't cover files not created by the app).

**Files:**
- `src/features/document/html-to-docs.ts` (create) - Convert editor HTML to Docs API batchUpdate requests
- `src/features/document/html-to-docs.test.ts` (create) - Tests for HTML-to-Docs conversion
- `src/features/document/use-active-document.ts` (modify) - Replace saveToDrive with Google Docs API calls
- `src/features/document/use-active-document.test.ts` (modify) - Update save tests for Docs API mocks
- `src/features/auth/auth-provider.tsx` (modify) - Add Google documents OAuth scope
- `src/shared/config/supabase.ts` (unchanged) - Provider token capture already in place
- `src/features/document/document-viewer.tsx` (unchanged) - Save button UI already in place
- `src/app/App.tsx` (unchanged) - Save props already wired

**Outcome:** User can click "Save to Drive" to update the original Google Doc with their edited content, preserving basic formatting (paragraphs, bold, italic, underline, headings).

**Verification:** npm run verify + manual test saving a document back to Drive

---

## User Interactions

### Phase 2: Planning
```
User: ok yeah here we left off was that we're getting a 403 error from google apis upload
Cosmo: Diagnosed two root causes: (1) drive.file scope doesn't grant write access to files not created by the app, (2) native Google Docs can't be updated via Drive upload API media endpoint. Proposed Save as Copy approach.
User: there's no way to just write to the doc we loaded from?
Cosmo: Explained Google Docs API batchUpdate approach as the path for in-place editing.
User: in place editing is what we want
Cosmo: Planned slice using Google Docs API with HTML-to-Docs conversion utility.
User: yes (approved plan)
```

### Phase 3: Implementation
```
User: seems like we're close but all of the text is size 26 when i click save to drive?
Cosmo: Fixed by clearing inherited fontSize on all inserted text and applying NORMAL_TEXT/HEADING_X named paragraph styles to every paragraph.
```

### Phase 4: Approval
```
User: it doesn't look quite the same but its an impressive start approve slice
```

---

## Build & Test Results

### Build
```
> tsc -b && eslint . && vitest run
```

**Status:** ✅ Success

### Tests
```
Test Files  8 passed (8)
     Tests  116 passed (116)
  Duration  2.13s
```

**Status:** ✅ All Passing

**Test Details:**

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `src/features/document/html-to-docs.test.ts` | parses a simple paragraph | ✅ Pass | Single `<p>` produces one paragraph with correct text and no formatting |
| 2 | `src/features/document/html-to-docs.test.ts` | parses multiple paragraphs | ✅ Pass | Two `<p>` elements produce two separate paragraphs |
| 3 | `src/features/document/html-to-docs.test.ts` | detects bold via `<b>` tag | ✅ Pass | `<b>` tag sets bold flag on run |
| 4 | `src/features/document/html-to-docs.test.ts` | detects bold via `<strong>` tag | ✅ Pass | `<strong>` tag sets bold flag |
| 5 | `src/features/document/html-to-docs.test.ts` | detects bold via inline style font-weight:700 | ✅ Pass | Inline style font-weight detection |
| 6 | `src/features/document/html-to-docs.test.ts` | detects italic via `<i>` tag | ✅ Pass | `<i>` tag sets italic flag |
| 7 | `src/features/document/html-to-docs.test.ts` | detects italic via `<em>` tag | ✅ Pass | `<em>` tag sets italic flag |
| 8 | `src/features/document/html-to-docs.test.ts` | detects italic via inline style | ✅ Pass | Inline style font-style:italic detection |
| 9 | `src/features/document/html-to-docs.test.ts` | detects underline via `<u>` tag | ✅ Pass | `<u>` tag sets underline flag |
| 10 | `src/features/document/html-to-docs.test.ts` | detects underline via inline style | ✅ Pass | Inline style text-decoration:underline detection |
| 11 | `src/features/document/html-to-docs.test.ts` | parses heading levels | ✅ Pass | h1-h6 tags produce correct headingLevel values |
| 12 | `src/features/document/html-to-docs.test.ts` | handles nested formatting (bold inside italic) | ✅ Pass | Nested tags accumulate formatting flags |
| 13 | `src/features/document/html-to-docs.test.ts` | handles mixed formatted and plain text | ✅ Pass | Adjacent formatted/unformatted runs parsed correctly |
| 14 | `src/features/document/html-to-docs.test.ts` | treats `<br>` as paragraph break | ✅ Pass | BR splits content into separate paragraphs |
| 15 | `src/features/document/html-to-docs.test.ts` | handles empty HTML | ✅ Pass | Empty string produces empty array |
| 16 | `src/features/document/html-to-docs.test.ts` | handles empty paragraph | ✅ Pass | Empty `<p>` produces paragraph with no runs |
| 17 | `src/features/document/html-to-docs.test.ts` | handles plain text without wrapper elements | ✅ Pass | Raw text without tags parsed as single paragraph |
| 18 | `src/features/document/html-to-docs.test.ts` | handles div elements as block containers | ✅ Pass | `<div>` treated as block element |
| 19 | `src/features/document/html-to-docs.test.ts` | inherits bold from block element | ✅ Pass | Block-level inline style inherited by child text |
| 20 | `src/features/document/html-to-docs.test.ts` | generates delete, insert, clear fontSize, and NORMAL_TEXT | ✅ Pass | Full request chain: delete + insert + clear fontSize + NORMAL_TEXT paragraph style |
| 21 | `src/features/document/html-to-docs.test.ts` | generates text style request for bold text | ✅ Pass | Bold run produces UpdateTextStyle with correct range |
| 22 | `src/features/document/html-to-docs.test.ts` | generates combined fields for bold+italic | ✅ Pass | Multiple formatting flags combined in single request |
| 23 | `src/features/document/html-to-docs.test.ts` | generates paragraph style request for headings | ✅ Pass | Heading paragraph gets HEADING_1 named style |
| 24 | `src/features/document/html-to-docs.test.ts` | tracks correct offsets across multiple paragraphs | ✅ Pass | Newline between paragraphs correctly offsets second paragraph indices |
| 25 | `src/features/document/html-to-docs.test.ts` | handles multiple runs in one paragraph | ✅ Pass | Bold run within mixed content gets correct index range |
| 26 | `src/features/document/html-to-docs.test.ts` | no formatting style requests for unformatted text | ✅ Pass | Only fontSize-clearing request, no bold/italic/underline |
| 27 | `src/features/document/use-active-document.test.ts` | saveToDrive calls Google Docs API and sets lastSavedAt | ✅ Pass | documents.get + batchUpdate called with correct URLs, structured request body |
| 28 | `src/features/document/use-active-document.test.ts` | saveToDrive handles 401 auth expiry on documents.get | ✅ Pass | 401 from Docs API produces auth-expired error |
| 29 | `src/features/document/document-viewer.test.tsx` | renders Save to Drive button in toolbar | ✅ Pass | Save button present |
| 30 | `src/features/document/document-viewer.test.tsx` | Save to Drive button calls onSaveToDrive with editor HTML | ✅ Pass | Click sends editor innerHTML to callback |
| 31 | `src/features/document/document-viewer.test.tsx` | Save to Drive button shows Saving... while saving | ✅ Pass | Loading state + disabled during save |
| 32 | `src/features/document/document-viewer.test.tsx` | shows Saved indicator after successful save | ✅ Pass | Green "Saved" text with timestamp |
| 33 | `src/features/document/document-viewer.test.tsx` | hides Saved indicator while saving | ✅ Pass | Saved hidden during active save |

---

## Manual Verification Tasks

- [x] Enable the Google Docs API in Google Cloud Console project
- [x] Sign out and sign back in (to grant the new documents scope)
- [x] Open a document, make edits, click "Save to Drive"
- [x] Verify the original Google Doc is updated in Drive

**Expected Results:**
- Document content saved to original Google Doc with text and basic formatting preserved
- Font sizes controlled by named styles (NORMAL_TEXT / HEADING_X)

---

## Summary

Replaced the broken Drive upload API approach (403 error) with Google Docs API batchUpdate for in-place document editing. Created an HTML-to-Docs conversion utility that parses editor HTML into structured paragraphs with formatting metadata, then generates delete + insert + style requests. Added the `documents` OAuth scope for write access to Google Docs. Fixed inherited font size issue by clearing explicit fontSize on inserted text and applying named paragraph styles to every paragraph. Known limitations: lists, tables, links, and images don't round-trip; formatting applied only via CSS classes (not inline styles) may not be detected.
