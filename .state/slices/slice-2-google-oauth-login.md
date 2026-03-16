# Slice 2: Google OAuth Login

**Timestamp:** 2026-03-16 17:55:00 -0500
**Status:** Approved

---

## Plan

**Goal:** Add Google OAuth sign-in via Supabase Auth, restricted to @thinkcerca.com, with conditional rendering based on auth state.

**Files:**
- `src/features/auth/auth-context.ts` (create) - Auth context definition + `useAuth` hook
- `src/features/auth/auth-provider.tsx` (create) - AuthProvider with Supabase session management + domain check
- `src/features/auth/login-page.tsx` (create) - Login UI with Google sign-in button
- `src/features/auth/auth-provider.test.tsx` (create) - 5 tests for auth state management
- `src/app/App.tsx` (modify) - Wrapped in AuthProvider, conditional rendering

**Outcome:** User signs in with @thinkcerca.com Google account, sees dashboard; non-allowed domains rejected.

**Verification:** `npm run verify` + manual sign-in test

---

## User Interactions

### Phase 2: Planning
```
Cosmo: Presented plan for Slice 2: Google OAuth Login.
User: yes
```

### Phase 3: Implementation
```
User needed help setting up Supabase project (new project, Google OAuth credentials, SQL schema).
Original handle_new_user trigger caused "Database error saving new user" — dropped trigger, signed in successfully, then re-created trigger with COALESCE for null safety.
```

### Phase 4: Approval
```
User: looks good
```

---

## Build & Test Results

### Build
```
> tsc -b && vite build
vite v8.0.0 building client environment for production...
✓ 58 modules transformed.
dist/index.html                   0.46 kB │ gzip:   0.29 kB
dist/assets/index-Bsawa5wn.css   11.39 kB │ gzip:   3.04 kB
dist/assets/index-CSTWfweQ.js   359.77 kB │ gzip: 103.99 kB
✓ built in 84ms
```

**Status:** ✅ Success

### Tests
```
 Test Files  2 passed (2)
      Tests  7 passed (7)
   Duration  555ms
```

**Status:** ✅ All Passing

**Test Details:**

| # | File | Test name | Status | What it verifies |
|---|------|-----------|--------|-----------------|
| 1 | `src/features/auth/auth-provider.test.tsx` | shows loading state initially | ✅ Pass | AuthProvider starts in loading state |
| 2 | `src/features/auth/auth-provider.test.tsx` | shows signed-out when no session | ✅ Pass | Null session results in signed-out state |
| 3 | `src/features/auth/auth-provider.test.tsx` | shows signed-in for allowed domain | ✅ Pass | @thinkcerca.com session accepted |
| 4 | `src/features/auth/auth-provider.test.tsx` | rejects non-thinkcerca.com emails and signs out | ✅ Pass | Non-allowed domain triggers signOut |
| 5 | `src/features/auth/auth-provider.test.tsx` | useAuth throws when used outside provider | ✅ Pass | Hook throws error outside AuthProvider |

---

## Schema (SQL)

```sql
-- Profiles table (run first time)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  kb_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup (robust version)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Summary

Added Google OAuth authentication via Supabase with @thinkcerca.com domain restriction. Auth context separated from provider for clean ESLint compliance. App conditionally renders login page or dashboard based on auth state. Manual testing confirmed end-to-end OAuth flow with a real ThinkCERCA account.
