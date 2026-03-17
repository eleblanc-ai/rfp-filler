## Slice 7: Recent Documents

**Goal**: Keep the last 5 document entries per user in the `documents` table, prune older ones automatically, and show a recent documents list on the main page for quick reopening.

**Why now**: User noticed stale entries accumulating in the `documents` table. This cleans them up and adds a quick way to reopen recently viewed RFPs.

**Scope**:
- In scope: Prune old documents rows (keep last 5 per user) on each new selection, expose recent docs from useActiveDocument, render a clickable recent documents list on the main page alongside the Drive picker
- Out of scope: AI Auto-Fill, document favoriting, search

**User-visible outcome**: User can see and click on their 5 most recently opened RFP templates to quickly reload them, and old entries are automatically cleaned up.

**Files**:
- `src/features/document/use-active-document.ts` (modify) — Add recentDocuments state, fetch on load, prune to 5 entries after each selectDocument
- `src/app/App.tsx` (modify) — Render recent documents list on main page when no doc is open
- `src/features/document/use-active-document.test.ts` (create) — Tests for recent doc loading, pruning, and selection
