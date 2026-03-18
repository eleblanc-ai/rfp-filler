# Product Spec
**Created:** 2026-03-16 | **Updated:** 2026-03-17 | **Status:** Approved

## Overview
RFP Buddy is a web app that helps ThinkCERCA employees quickly fill out RFP (Request for Proposal) templates by pulling from an in-app knowledge base of company documents. Users upload reference documents to a knowledge base, load an RFP template from Google Drive or upload from their computer (which auto-creates a Google Doc), Claude auto-fills the bracketed placeholder fields using relevant knowledge base content (retrieved via RAG), users review/edit the result in-app, and can refine sections via chat with Claude. The completed document syncs back to Google Drive.

## Goals
- Dramatically reduce time spent manually filling out repetitive RFP templates
- Ensure consistency and quality across RFP responses by leveraging a centralized knowledge base
- Provide a seamless Google Drive integration (load templates, save results)

## Target Users
A small team of employees at ThinkCERCA (education technology company) who regularly respond to RFPs for digital instructional resources. Non-technical users who need a simple, intuitive workflow.

## Core Features
**Google OAuth Login** — Sign in with Google, restricted to @thinkcerca.com domains. Grants Drive read + file creation permissions (drive.readonly + drive.file scopes).

**Google Drive File Picker** — Browse and select RFP template documents (Google Docs) from Google Drive to load into the app.

**Upload from Computer** — Upload local files (.txt, .html, .md, .docx) which auto-creates a Google Doc in the user's Drive and opens the content in the editor.

**Document Viewer/Editor** — Display the loaded RFP document in-app with an editable rich text view. Users can manually edit any part of the document. Includes "View in Drive" link to open the source Google Doc.

**Recent Documents** — Main page shows up to 5 recently opened documents with click-to-reopen. Users can remove individual entries. Old entries auto-pruned beyond the limit.

**Knowledge Base (RAG)** — In-app knowledge base management page accessible from the header. Users upload reference documents (past proposals, product specs, company info) from their computer or pick files from Google Drive. Supports text files (.txt, .md, .csv) and PDFs (.pdf) — PDF text is extracted client-side via pdfjs-dist. Documents are chunked (~500 words, 50-word overlap), embedded via OpenAI embeddings in batches of 100, and stored in Supabase pgvector for retrieval. Database inserts are also batched (100 rows per request) to support large documents. Users can view, search, and delete KB documents at any time.

**AI Auto-Fill** — Claude reads the RFP template, identifies sections needing responses (grouped into major categories), and presents them in an accordion review panel. User approves the selected items, clicks Fill Selected, and Claude generates responses using relevant KB chunks retrieved via vector similarity search. Responses stream directly into the document editor in real time. AI-generated content is wrapped in marked spans (data attributes) to support future track changes functionality.

**Track Changes** — AI-generated content inserted during auto-fill is visually distinguished from original document content (e.g., highlighted background). Users can accept or reject individual changes inline. Provides an "Accept All" / "Reject All" option. Track changes state persists with the document so users can review changes across sessions.

**Chat-Based Refinement** — After auto-fill, users can chat with Claude to refine specific sections (e.g., "make the cover letter more formal", "add more detail to Tier 3 support"). Changes are applied directly to the document in the editor.

**Save Back to Google Drive** — Save the completed/edited document back to Google Drive (update the original or save as a new copy).

**Rich Text Editor Enhancements** — Expand the editor toolbar with formatting options: bulleted/numbered lists, headings, text alignment, and other common rich text features.

**Drive Picker State Persistence** — Preserve the Drive picker's open/closed state and last-fetched file list across page refreshes so users don't have to re-open the picker each time.

## Constraints
- Authentication restricted to @thinkcerca.com Google Workspace accounts
- Google Drive API required for reading/writing documents
- Google Docs format (not PDF or Word) for RFP templates
- Claude API (Anthropic) for AI generation — regular API key, no project-scoping needed
- OpenAI API for text embeddings (text-embedding-3-small)
- Supabase pgvector extension for vector storage and similarity search
- Knowledge base managed in-app (upload + Google Drive import)
- Must handle Google API rate limits and token refresh gracefully

## Architecture
**Language:** TypeScript
**Framework:** React + Vite
**Styling:** Tailwind CSS v4
**Database/Storage:** Supabase (Auth for session management, Postgres for user settings and document metadata)
**Supabase mode:** hosted
**AI / External APIs:** Claude API (Anthropic, claude-sonnet-4-20250514 or latest) for generation, OpenAI API (text-embedding-3-small) for embeddings, Google Drive API, Google Docs API
**Vector storage:** Supabase pgvector extension
**API layer:** Supabase Edge Functions (handles Claude API calls and Google Drive operations server-side to protect API keys)
**Verification command:** npm run verify
**Local dev:** npm run dev

## Data Model
profiles:
- id uuid (references auth.users)
- email text (user's Google email)
- display_name text
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

kb_documents:
- id uuid (primary key)
- user_id uuid (references profiles.id)
- filename text (original file name)
- source text (upload | drive)
- google_doc_id text (nullable, set if imported from Drive)
- content_type text (text/plain, application/pdf, etc.)
- raw_text text (extracted plain text)
- chunk_count integer
- created_at timestamptz

kb_chunks:
- id uuid (primary key)
- document_id uuid (references kb_documents.id, cascade delete)
- chunk_index integer (position within document)
- content text (chunk text)
- embedding vector(1536) (OpenAI text-embedding-3-small output)
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
