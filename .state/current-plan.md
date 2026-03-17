## Slice 8: Upload from Computer + View in Drive

**Goal**: Add "Upload from Computer" for loading RFP templates as local files, auto-create a Google Doc in the user's Drive, and add a "View in Drive" link in the document viewer toolbar.

**Scope**:
- Upgrade OAuth scope from drive.readonly to drive.file
- Add uploadAndCreate(file) to use-active-document hook
- Add "Upload from Computer" button on main page
- Add "View in Drive" link in document viewer toolbar
- Track google_doc_id on all documents for Drive linking

**Files**:
- `src/features/auth/auth-provider.tsx` (modify) — Change scope to drive.file
- `src/features/document/use-active-document.ts` (modify) — Add uploadAndCreate function
- `src/app/App.tsx` (modify) — Add upload button on main page
- `src/features/document/document-viewer.tsx` (modify) — Add View in Drive link
- `src/features/document/document-viewer.test.tsx` (modify) — Test View in Drive
- `src/features/document/use-active-document.test.ts` (modify) — Test upload flow
