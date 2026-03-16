# Slice 3: Google Drive File Picker

**Timestamp:** 2026-03-16 18:10:00 -0500
**Status:** Approved

---

## Plan

**Goal:** Add a file picker that lets users browse their Google Drive and select an RFP template (Google Doc) to load into the app.

**Files:**
- `src/features/auth/auth-context.ts` (modify) - Added providerToken to context interface
- `src/features/auth/auth-provider.tsx` (modify) - Added Drive scope, provider token capture/storage
- `src/features/auth/auth-provider.test.tsx` (modify) - Added sessionStorage.clear() to beforeEach
- `src/features/drive-picker/use-drive-files.ts` (create) - Hook for Google Drive API file listing
- `src/features/drive-picker/drive-picker.tsx` (create) - File picker UI component
- `src/features/drive-picker/drive-picker.test.tsx` (create) - 8 tests for picker component
- `src/app/App.tsx` (modify) - Integrated picker into dashboard

**Outcome:** After signing in, user sees a picker button, can browse Google Docs from Drive, and select a template.

**Verification:** `npm run verify` + manual Drive file browsing

---

## User Interactions

### Phase 2: Planning
```
Cosmo: Presented plan for Slice 3: Google Drive File Picker.
User: yes
```

### Phase 3: Implementation
```
No user interactions during implementation.
```

### Phase 4: Approval
```
User: ok looks good but when i refresh the picker restarts, will we address that behavior in a future slice once its connected?
Cosmo: Yes — selected document will persist in Supabase documents table in the document viewer slice.
User: yes (approved)
```

---

## Build & Test Results

### Build
```
> tsc -b && vite build
✓ 60 modules transformed.
dist/index.html                   0.46 kB
dist/assets/index-CTRS3Tdb.css   12.30 kB
dist/assets/index-DYND6Nmk.js   364.07 kB
✓ built in 85ms
```

**Status:** ✅ Success

### Tests
```
 Test Files  3 passed (3)
      Tests  15 passed (15)
   Duration  711ms
```

**Status:** ✅ All Passing

**Test Details:**

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `drive-picker.test.tsx` | shows reconnect message when no provider token | ✅ Pass | Expired token shows reconnect UI |
| 2 | `drive-picker.test.tsx` | calls onReconnect when reconnect button is clicked | ✅ Pass | Reconnect button triggers re-auth |
| 3 | `drive-picker.test.tsx` | shows select button when closed | ✅ Pass | Initial state shows the open button |
| 4 | `drive-picker.test.tsx` | fetches and shows files when opened | ✅ Pass | Opening picker calls fetchFiles, renders file list |
| 5 | `drive-picker.test.tsx` | shows empty state when no files | ✅ Pass | No files shows appropriate message |
| 6 | `drive-picker.test.tsx` | shows loading state | ✅ Pass | Loading indicator while fetching |
| 7 | `drive-picker.test.tsx` | shows error state | ✅ Pass | Error message displayed on failure |
| 8 | `drive-picker.test.tsx` | calls onSelect when a file is clicked | ✅ Pass | Clicking a file calls callback with file data |

---

## Summary

Added Google Drive file picker that calls the Drive API v3 directly using the user's Google OAuth provider token. Auth updated to request drive.readonly scope and persist the provider token in sessionStorage. Picker shows a toggle-open panel with file listing, loading/empty/error states, and reconnect flow for expired tokens. Selected file shown in dashboard (in-memory only; DB persistence deferred to document viewer slice).
