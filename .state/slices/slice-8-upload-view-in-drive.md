# Slice 8: Upload from Computer + View in Drive

**Timestamp:** 2026-03-17 10:30:00 CDT
**Status:** Approved

---

## Plan

**Goal:** Add "Upload from Computer" for loading RFP templates as local files, auto-create a Google Doc in the user's Drive, add a "View in Drive" link in the document viewer toolbar, and allow removing documents from the recent list.

**Files:**
- `src/features/auth/auth-provider.tsx` (modify) — Add drive.file scope alongside drive.readonly, force consent prompt
- `src/features/document/use-active-document.ts` (modify) — Add uploadFromComputer and removeRecentDocument functions
- `src/app/App.tsx` (modify) — Add upload button, remove button on recent docs
- `src/features/document/document-viewer.tsx` (modify) — Add View in Drive link
- `src/features/document/document-viewer.test.tsx` (modify) — Test View in Drive
- `src/features/document/use-active-document.test.ts` (modify) — Test upload and remove flows

**Outcome:** User can upload a local file (.txt, .html, .md, .docx) which creates a Google Doc in their Drive and opens it in the editor. User can click "View in Drive" to open any document in Google Docs. User can remove documents from their recent list.

**Verification:** npm run verify — all 43 tests pass

---

## User Interactions

### Phase 2: Planning
```
User: ok and i uploaded an md file from the computer and the drive connection worked but the content didn't show in rfp buddy
(+ requests for upload from computer, view in drive, and auto-create Drive doc)
Cosmo: Planned slice with OAuth scope upgrade, upload function, View in Drive link
User: yes (approved plan)
```

### Phase 3: Implementation
```
User: when i try to open a new drive doc, nothing is there (scope issue — drive.file can't read existing files)
Cosmo: Fixed by using both drive.readonly + drive.file scopes
User: keeps saying Google Drive access expired (stale cached consent)
Cosmo: Added prompt: 'consent' to force fresh consent screen
User: uploaded an md file, content didn't show (multipart/form-data vs multipart/related)
Cosmo: Rewrote upload to use manual multipart/related body construction
User: content STILL not showing (React state batching issue with await)
Cosmo: Made persistDocument fire-and-forget to batch state updates in one render
User: add ability to delete recent documents from the app
Cosmo: Added removeRecentDocument function + x button on recent list items
User: title breaking out of recent files box
Cosmo: Widened container to max-w-xl, added min-w-0 for proper truncation
```

### Phase 4: Approval
```
User: ok approve
```

---

## Build & Test Results

### Tests
```
 Test Files  6 passed (6)
      Tests  43 passed (43)
   Start at  10:25:05
   Duration  1000ms
```

**Status:** All Passing

**Test Details:**

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `src/features/document/use-active-document.test.ts` | uploadFromComputer creates Drive doc and opens it | Pass | Upload reads file, creates Google Doc via multipart/related, sets doc + content state |
| 2 | `src/features/document/use-active-document.test.ts` | uploadFromComputer shows error when no token | Pass | Missing providerToken shows expired-token error |
| 3 | `src/features/document/use-active-document.test.ts` | removeRecentDocument deletes from Supabase and refreshes list | Pass | Calls Supabase delete with correct google_doc_id, refreshes recent list |
| 4 | `src/features/document/document-viewer.test.tsx` | renders View in Drive link | Pass | "View in Drive" link present with correct href |

---

## Manual Verification Tasks

- [ ] Sign out and sign back in (should see updated consent screen with Drive file creation permission)
- [ ] Click "Upload from Computer" and select a .md or .txt file — content should appear in the editor
- [ ] Check Google Drive — a new Google Doc should exist with the uploaded file's content
- [ ] Click "View in Drive" in the toolbar — should open the Google Doc in a new tab
- [ ] Verify the "x" button on recent documents removes the entry from the list
- [ ] Verify long document titles in recent list are truncated with ellipsis

**Expected Results:**
- Uploaded files create Google Docs and display content immediately in the editor
- "View in Drive" link opens the correct Google Doc
- Recent documents can be removed individually
- Long titles truncate cleanly within the recent documents list

---

## Summary

Added local file upload that creates a Google Doc in the user's Drive and displays content in the editor. Added "View in Drive" link in the document viewer toolbar. Added ability to remove individual documents from the recent list. OAuth scopes upgraded to support both reading existing files and creating new ones. Multiple debugging iterations resolved scope, token caching, multipart upload format, and React state batching issues.
