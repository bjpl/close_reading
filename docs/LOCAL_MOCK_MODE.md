# Local Mock Mode - Setup Complete

## Overview

Your close reading application now runs completely offline without requiring any external accounts (Supabase, etc.). All data is stored locally in your browser using IndexedDB.

## How to Run

```bash
npm run dev
```

Then open `http://localhost:5173`

## What's Working

### ✅ Core Features (100% Local)

1. **Authentication**
   - Sign up with any email/password
   - Login persists across sessions
   - All stored in IndexedDB

2. **Project Management**
   - Create, edit, delete projects
   - Navigate between projects
   - All data persists locally

3. **Document Upload & Processing**
   - Upload TXT, PDF, DOCX files
   - Automatic text extraction
   - Paragraph and sentence parsing
   - All content stored in IndexedDB

4. **Annotation System (5 Types)**
   - **Highlight** - Colored background (5 colors)
   - **Note** - Highlight + attached note text
   - **Main Idea** - Bold with orange underline
   - **Citation** - Italic with blue left border
   - **Question** - Purple background with dotted underline

5. **Annotation Workflow**
   - Toggle mode: Click color/tool → Select text → Auto-applies
   - Click again to turn off mode
   - All annotations persist to database
   - Refresh page - annotations stay

6. **Paragraph Linking**
   - Shift+Click to select paragraphs
   - Link related paragraphs
   - Bidirectional links

7. **Citation Export**
   - BibTeX, RIS, JSON formats
   - MLA, APA, Chicago styles
   - Author field support

## Visual Guide

### Annotation Styles

| Type | Visual | Usage |
|------|--------|-------|
| Highlight | Colored background | Click color → Select text |
| Main Idea | **Bold + Orange underline** | Click star → Select text |
| Citation | *Italic + Blue border* | Click bookmark → Select text |
| Question | Purple bg + Dotted line | Click ? icon → Select text |
| Note | Highlight + Top border | Click note → Add text → Save |

### Toggle Mode Workflow

1. **Click a color** (yellow/green/blue/pink/purple) → Highlight mode ON
2. **Select text** → Automatically highlighted
3. **Select more text** → Another highlight
4. **Click color again** → Mode OFF

## Features Added for Local Development

### 1. Mock Supabase Client
- Drop-in replacement for real Supabase
- File: `src/lib/mockSupabase.ts`
- Handles all Auth, Database, Storage, Real-time APIs

### 2. IndexedDB Storage
- Stores: users, documents, projects, annotations, paragraphs, sentences, paragraph_links
- Automatic schema versioning
- Persistent across browser sessions

### 3. Configuration
- `.env.local` file with `VITE_ENABLE_MOCK_MODE=true`
- Toggle between mock and production easily

## What's Not Working in Mock Mode

- File uploads don't store actual files (just metadata)
- Real-time subscriptions are mocked (no cross-tab updates)
- ML features use fallback methods

## Switching to Production

Edit `.env.local`:

```env
VITE_ENABLE_MOCK_MODE=false
VITE_SUPABASE_URL=your_real_url
VITE_SUPABASE_ANON_KEY=your_real_key
```

## Data Persistence

All data is stored in browser IndexedDB under `close-reading-mock` database. To reset:

```javascript
// In browser console
indexedDB.deleteDatabase('close-reading-mock');
localStorage.clear();
```

Then refresh the page.

## Testing Workflow

1. Create account (any email/password)
2. Create project
3. Upload a text file
4. Click a color to activate highlight mode
5. Select text - watch it highlight automatically
6. Click Main Idea (star) - select text for underline
7. Click Question (?) - mark questions with dotted line
8. Refresh page - all annotations persist

## Troubleshooting

**Blank screen**: Hard refresh (Ctrl+Shift+R)
**Auth not working**: Check console for "🎭 Running in MOCK MODE"
**No paragraphs**: Upload a new document after schema upgrade
**Highlights wrong location**: Fixed with offset calculation update

## Next Steps

All Priority 1 features are now complete:
- ✅ Annotation persistence to database
- ✅ Document author field with metadata editor
- ✅ Annotation filtering UI (component created)
- ✅ Question annotation type
- ✅ Double-click bug fixed

Ready for full local testing and development!
