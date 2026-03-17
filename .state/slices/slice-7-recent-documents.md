# Slice 7: Recent Documents

**Timestamp:** 2026-03-17 09:30:00 -0500
**Status:** Approved

---

## Plan

**Goal:** Keep the last 5 document entries per user in the `documents` table, prune older ones automatically, and show a recent documents list on the main page for quick reopening. Remove auto-open on login.

**Files:**
- `src/features/document/use-active-document.ts` (modify) — Added recentDocuments state, loadRecent(), pruneOldDocuments(), removed loadLast auto-open, added 401/403 detection for expired tokens
- `src/app/App.tsx` (modify) — Renders recent documents list below Drive picker with title and date
- `src/features/document/use-active-document.test.ts` (create) — 7 tests for hook behavior
- `CLAUDE.md` (modify) — Added "read before write" tool usage note

**Outcome:** User sees recent documents on main page, can click to reopen. No auto-open on login. Old entries pruned to 5.

**Verification:** npm run verify — all 39 tests pass, build clean

---

## User Interactions

### Phase 2: Planning
```
Cosmo: Presented plan for recent documents with pruning
User: "yes" (approved plan)
```

### Phase 3: Implementation
```
User: "getting this error: Failed to load document from Google Drive"
Cosmo: Added 401/403 detection for expired Google tokens with helpful error message
User: "almost perfect, the only issue is that when i first log in it shouldn't automatically open a document"
Cosmo: Removed loadLast auto-open, init now only loads recent list
```

### Phase 4: Approval
```
User: "ok slice approved"
```

---

## Build & Test Results

### Build
```
> rfp-filler@0.0.0 verify
> tsc -b && eslint . && vitest run

 Test Files  6 passed (6)
      Tests  39 passed (39)
   Duration  813ms
```

**Status:** All passing

### Tests

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `use-active-document.test.ts` | returns empty recentDocuments initially when no userId | Pass | No userId = empty recent list |
| 2 | `use-active-document.test.ts` | does not auto-open a document on init | Pass | Recent docs load but no doc auto-opened |
| 3 | `use-active-document.test.ts` | loads recent documents on init when userId is provided | Pass | Hook fetches and populates recent docs on mount |
| 4 | `use-active-document.test.ts` | selectDocument fetches content and upserts to database | Pass | Drive content fetched, DB upserted |
| 5 | `use-active-document.test.ts` | selectDocument prunes old documents beyond limit of 5 | Pass | 6th document gets deleted after select |
| 6 | `use-active-document.test.ts` | clearDocument resets doc, content, and error | Pass | Local state cleared on close |
| 7 | `use-active-document.test.ts` | shows error when providerToken is missing | Pass | Expired token shows error message |

---

## Summary

Added recent documents list to the main page showing up to 5 recently opened RFP templates with click-to-reopen. Old entries are automatically pruned beyond the limit. Removed auto-open on login so users always land on the picker. Added expired Google token detection (401/403) with a helpful error message instead of a generic failure.
