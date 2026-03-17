# Slice 6: Document Indexing

**Timestamp:** 2026-03-17 09:05:00 -0500
**Status:** Approved

---

## Plan

**Goal:** Rename app to "RFP Buddy", create an `index-document` Supabase Edge Function that chunks KB documents and generates OpenAI embeddings, add indexing status/triggers to the KB page.

**Files:**
- `index.html` (modify) — Title changed to "RFP Buddy"
- `src/app/App.tsx` (modify) — Header text changed to "RFP Buddy"
- `src/features/auth/login-page.tsx` (modify) — Heading changed to "RFP Buddy"
- `supabase/functions/index-document/index.ts` (create) — Edge Function: chunks text (~500 words, 50-word overlap), calls OpenAI text-embedding-3-small, stores vectors in kb_chunks
- `src/features/knowledge-base/use-kb-documents.ts` (modify) — Added status, chunk_count fields to KbDocument, indexDocument function with optimistic UI, addDocument returns created doc
- `src/features/knowledge-base/kb-page.tsx` (modify) — Added StatusBadge component (Pending/Indexing/Indexed/Error), auto-triggers indexing after upload, manual Index/Retry buttons
- `src/features/knowledge-base/kb-page.test.tsx` (modify) — Updated existing tests for new fields, added 3 new tests

**Outcome:** User uploads a KB document and sees it get indexed with status updates. App shows "RFP Buddy" everywhere.

**Verification:** npm run verify — all 32 tests pass, build clean

---

## User Interactions

### Phase 2: Planning
```
User: "looks good yes, also quickly rename it RFP buddy as step 1 of the next slice"
Cosmo: Added rename to "RFP Buddy" as first step of slice 6 plan.
User: "yes" (approved plan)
```

### Phase 3: Implementation
```
User: Reported Edge Function returning non-2xx status code
Cosmo: Diagnosed jsr: import boot failure, rewrote with https://esm.sh/ imports
User: Reported 401 Unauthorized on Edge Function invocation
Cosmo: Diagnosed Supabase gateway JWT issue, fixed with --no-verify-jwt deploy flag
User: "seemed to work -- thanks!"
```

### Phase 4: Approval
```
User: "yes"
```

---

## Build & Test Results

### Build
```
> rfp-filler@0.0.0 verify
> tsc -b && eslint . && vitest run

 Test Files  5 passed (5)
      Tests  32 passed (32)
   Duration  620ms
```

**Status:** ✅ Success

### Tests

**Status:** ✅ All Passing

**Test Details:**

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `src/features/knowledge-base/kb-page.test.tsx` | uploaded file calls addDocument and triggers indexing | ✅ Pass | Upload triggers addDocument then indexDocument on returned doc |
| 2 | `src/features/knowledge-base/kb-page.test.tsx` | shows Pending status badge for unindexed documents | ✅ Pass | Pending status renders badge + Index button |
| 3 | `src/features/knowledge-base/kb-page.test.tsx` | shows Indexed status badge with chunk count | ✅ Pass | Indexed status shows chunk count |
| 4 | `src/features/knowledge-base/kb-page.test.tsx` | shows Retry button for errored documents | ✅ Pass | Error status renders badge + Retry button triggers indexDocument |

---

## Manual Verification Tasks

- [ ] Open the app and confirm it says "RFP Buddy" in the header and login page
- [ ] Go to Knowledge Base, upload a .txt file
- [ ] Confirm the document shows "Indexing..." then "Indexed (N chunks)"
- [ ] Import a Google Doc to KB, confirm it also indexes successfully
- [ ] Check Supabase kb_chunks table to verify embeddings were stored
- [ ] Try a document that fails — confirm "Error" badge and "Retry" button appear

---

## Summary

Renamed the app to "RFP Buddy" across all user-facing touchpoints. Created a Supabase Edge Function that chunks KB documents into ~500-word segments with 50-word overlap, generates embeddings via OpenAI text-embedding-3-small, and stores them in the kb_chunks table with pgvector. The KB page now shows real-time indexing status with auto-trigger on upload and manual Index/Retry buttons. Debugging required switching from jsr: to esm.sh imports and deploying with --no-verify-jwt to resolve gateway-level JWT verification issues.
