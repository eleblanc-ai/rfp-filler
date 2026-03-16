# Product Spec
**Created:** 2026-03-16 | **Status:** Draft (Phase 1 Interview)

## Overview
RFP Filler is a web app that helps ThinkCERCA employees quickly fill out RFP (Request for Proposal) templates by pulling from a knowledge base of company documents stored in Google Drive. Users load an RFP template from Google Drive, Claude auto-fills the bracketed placeholder fields using knowledge base content, users review/edit the result in-app, and can refine sections via chat with Claude. The completed document syncs back to Google Drive.

## Goals
- Dramatically reduce time spent manually filling out repetitive RFP templates
- Ensure consistency and quality across RFP responses by leveraging a centralized knowledge base
- Provide a seamless Google Drive integration (load templates, save results)

## Target Users
A small team of employees at ThinkCERCA (education technology company) who regularly respond to RFPs for digital instructional resources. Non-technical users who need a simple, intuitive workflow.

## Core Features
**Google OAuth Login** — Sign in with Google, restricted to @thinkcerca.com domains. Grants Drive access permissions.

**Google Drive File Picker** — Browse and select RFP template documents (Google Docs) from Google Drive to load into the app.

**Document Viewer/Editor** — Display the loaded RFP document in-app with an editable rich text view. Users can manually edit any part of the document.

**Knowledge Base (Google Drive Folder)** — A designated Google Drive folder contains company reference documents (past proposals, product specs, company info). The app reads from this folder to provide context for Claude.

**AI Auto-Fill** — Claude reads the RFP template, identifies bracketed placeholder fields (e.g., `[Insert resource]`, `[Organization Name]`), and auto-fills them using content retrieved from the knowledge base documents.

**Chat-Based Refinement** — After auto-fill, users can chat with Claude to refine specific sections (e.g., "make the cover letter more formal", "add more detail to Tier 3 support"). Changes are applied directly to the document in the editor.

**Save Back to Google Drive** — Save the completed/edited document back to Google Drive (update the original or save as a new copy).

## Constraints
- Authentication restricted to @thinkcerca.com Google Workspace accounts
- Google Drive API required for reading/writing documents
- Google Docs format (not PDF or Word) for initial version
- Claude API (Anthropic) for AI features — requires API key management
- Knowledge base documents must be in a single designated Drive folder
- Must handle Google API rate limits and token refresh gracefully

## Architecture
**Language:** TypeScript
**Framework:** React + Vite
**Styling:** Tailwind CSS v4
**Database/Storage:** Supabase (Auth for session management, Postgres for user settings and document metadata)
**Supabase mode:** hosted
**AI / External APIs:** Claude API (Anthropic, claude-sonnet-4-20250514 or latest), Google Drive API, Google Docs API
**API layer:** Supabase Edge Functions (handles Claude API calls and Google Drive operations server-side to protect API keys)
**Verification command:** npm run verify
**Local dev:** npm run dev

## Data Model
profiles:
- id uuid (references auth.users)
- email text (user's Google email)
- display_name text
- kb_folder_id text (Google Drive folder ID for knowledge base)
- created_at timestamptz
- updated_at timestamptz

documents:
- id uuid (primary key)
- user_id uuid (references profiles.id)
- google_doc_id text (Google Drive document ID)
- title text
- status text (draft | filling | review | complete)
- last_synced_at timestamptz
- created_at timestamptz
- updated_at timestamptz

chat_messages:
- id uuid (primary key)
- document_id uuid (references documents.id)
- role text (user | assistant)
- content text
- created_at timestamptz

## UI Style
**Aesthetic:** Clean, minimal, professional — simple and sleek with a helpful feel
**Color palette:** White/light gray backgrounds, subtle blue accents (similar to Google's palette), dark text
**Typography:** Clean sans-serif (Inter or system font stack)
**UI density:** Spacious — ample whitespace, clear hierarchy
**Tone:** Professional yet approachable, helpful

## Stack
**Stack file:** cosmo-instructions/stacks/react-vite-supabase.md
**GitHub integration:** enabled
