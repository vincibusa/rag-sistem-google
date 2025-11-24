# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js RAG (Retrieval-Augmented Generation) application that integrates Google Gemini AI with Supabase for document-based chat interactions. Users can create notebooks, upload documents, and chat with an AI that has access to those documents through Google's File Search API.

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Environment Variables

Required environment variables (create `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GOOGLE_GEMINI_API_KEY` - Google Gemini API key

## Architecture

### Data Flow

1. **Authentication**: Users authenticate via Supabase Auth
2. **Notebooks**: Users create notebooks (containers for documents and chat sessions)
3. **File Upload**: Documents are uploaded and processed through Google File Search API
   - Files are stored as File Search stores (one per notebook)
   - Metadata is saved to Supabase `files` table
   - File Search stores handle chunking, embedding, and indexing automatically
4. **Chat**: User messages trigger RAG queries using File Search stores
   - Messages are sent via Server Actions
   - Gemini generates responses with access to File Search context
   - Messages are persisted to Supabase `messages` table

### Key Components

**State Management (Zustand stores in `/store`):**
- `chat-store.ts` - Chat messages, loading states, streaming
- `files-store.ts` - File upload state and file list
- `notebook-store.ts` - Active notebook selection

**Server Actions (`/app/actions`):**
- `chat.ts` - Message operations with ownership verification
- `files.ts` - File upload/delete with File Search integration
- `notebooks.ts` - Notebook CRUD operations
- `autofill.ts` - Experimental autofill feature

**AI Integration (`/lib`):**
- `gemini.ts` - Gemini client initialization and streaming
- `file-search.ts` - File Search store operations (create, upload, delete, query)
- `constants.ts` - Model configuration (`gemini-2.5-flash-lite`)

**Database (`/lib`):**
- `supabase.ts` - Client-side Supabase operations
- `supabase-server.ts` - Server-side client with access token
- `database.types.ts` - Generated TypeScript types from Supabase schema

### Database Schema

**Tables:**
- `notebooks` - User's document collections
- `files` - Uploaded file metadata (points to File Search stores)
- `file_search_stores` - Maps notebooks to Google File Search store names
- `messages` - Chat history (role, content, file_uris)

**Relationships:**
- Users → Notebooks (one-to-many)
- Notebooks → Files (one-to-many)
- Notebooks → File Search Stores (one-to-one)
- Notebooks → Messages (one-to-many)

### File Search Integration

The app uses Google's File Search API for RAG:
- Each notebook gets one File Search store
- Files uploaded to a notebook are added to that store
- The API handles chunking, embedding, and vector indexing
- During chat, the File Search tool provides semantic context to Gemini

**File Upload Flow:**
1. Check for existing File Search store for notebook
2. Create store if needed, save reference to `file_search_stores` table
3. Upload file buffer to File Search store via `uploadToFileSearchStore()`
4. Save file metadata to `files` table with `file_search_store_id`

**Chat Flow:**
1. Fetch File Search store names for the notebook via `getFileSearchStoreNames()`
2. Call `streamChatWithFileSearch()` with message history and store names
3. Gemini uses File Search tool to retrieve relevant document chunks
4. Response is streamed back and saved to `messages` table

## Common Patterns

### Server Actions Security
All Server Actions verify ownership:
```typescript
const { data: notebook } = await supabase
  .from('notebooks')
  .select('user_id')
  .eq('id', notebookId)
  .single()

if (!notebook || notebook.user_id !== userId) {
  throw new Error('Not authorized')
}
```

### Client-Server Supabase Usage
- Client components use `supabase` from `lib/supabase.ts`
- Server Actions use `createServerSupabaseClient(accessToken)` from `lib/supabase-server.ts`
- Helper functions in `lib/supabase.ts` accept optional client parameter for reuse

### Streaming Responses
Chat responses use async generators:
```typescript
for await (const chunk of streamChatResponse(messages, fileSearchStoreNames)) {
  // Stream to client
}
```

## File Constraints

**Supported file types** (from `lib/constants.ts`):
- `application/pdf`
- `text/plain`
- `text/csv`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)

**Max file size:** 50MB

## UI Components

Built with Radix UI primitives and Tailwind CSS in `/components/ui`. Main layout uses:
- `Dashboard.tsx` - Main container with sidebar and content area
- `Sidebar.tsx` - Notebook list and selection
- `ChatContainer.tsx` - Message list and input
- `ProtectedRoute.tsx` - Client-side auth guard

## Notes

- The app uses Next.js App Router with React Server Components
- Auth context is provided via `lib/auth-context.tsx`
- TypeScript path alias: `@/*` maps to project root
- Gemini model: `gemini-2.5-flash-lite` (configurable in `lib/constants.ts`)
