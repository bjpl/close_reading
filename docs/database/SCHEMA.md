# Close-Reading Platform Database Schema

## Overview
PostgreSQL database schema for Supabase backend with Row Level Security (RLS) policies.

## Database Architecture

### Schema Design Principles
- **Multi-tenancy**: All user data is isolated via RLS policies
- **Audit trails**: Created/updated timestamps on all tables
- **Soft deletes**: Archived flag instead of hard deletes where appropriate
- **Performance**: Strategic indexes on foreign keys and query patterns
- **Data integrity**: Foreign key constraints with cascading rules

---

## Tables

### 1. users (Supabase Auth)
Managed by Supabase Auth. Extended with profile information.

```sql
-- Extended user profile
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id`: UUID from auth.users
- `display_name`: User's display name
- `avatar_url`: Profile picture URL
- `preferences`: JSON object for user settings (theme, defaults, etc.)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update

---

### 2. projects
Group related documents together.

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id`: Unique project identifier
- `user_id`: Owner of the project
- `title`: Project name
- `description`: Optional project description
- `color`: Hex color for UI display
- `archived`: Soft delete flag
- `created_at`: Project creation timestamp
- `updated_at`: Last modification timestamp

**Indexes:**
- `idx_projects_user_id` on `user_id`
- `idx_projects_archived` on `archived`

---

### 3. documents
Uploaded files within projects.

```sql
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER,
  metadata JSONB DEFAULT '{}'::JSONB,
  processing_status TEXT DEFAULT 'pending',
  processing_error TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id`: Unique document identifier
- `project_id`: Parent project
- `user_id`: Document owner
- `title`: Document title
- `file_url`: Supabase Storage URL
- `file_type`: MIME type (application/pdf, text/plain, etc.)
- `file_size`: Size in bytes
- `page_count`: Number of pages (for PDFs)
- `metadata`: JSON object for additional document info (author, date, etc.)
- `processing_status`: 'pending' | 'processing' | 'completed' | 'failed'
- `processing_error`: Error message if processing failed
- `archived`: Soft delete flag
- `created_at`: Upload timestamp
- `updated_at`: Last modification timestamp

**Indexes:**
- `idx_documents_project_id` on `project_id`
- `idx_documents_user_id` on `user_id`
- `idx_documents_processing_status` on `processing_status`

---

### 4. paragraphs
Parsed paragraphs from documents.

```sql
CREATE TABLE public.paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  page_number INTEGER,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, position)
);
```

**Fields:**
- `id`: Unique paragraph identifier
- `document_id`: Parent document
- `user_id`: Document owner (denormalized for RLS)
- `content`: Full paragraph text
- `position`: Order within document (0-indexed)
- `page_number`: Page number in source document
- `metadata`: JSON object for paragraph-level metadata
- `created_at`: Parse timestamp
- `updated_at`: Last modification timestamp

**Indexes:**
- `idx_paragraphs_document_id` on `document_id`
- `idx_paragraphs_position` on `(document_id, position)`
- `idx_paragraphs_content_fts` GIN index for full-text search

**Constraints:**
- Unique constraint on `(document_id, position)`

---

### 5. sentences
Parsed sentences from paragraphs.

```sql
CREATE TABLE public.sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paragraph_id, position)
);
```

**Fields:**
- `id`: Unique sentence identifier
- `paragraph_id`: Parent paragraph
- `document_id`: Parent document (denormalized for queries)
- `user_id`: Document owner (denormalized for RLS)
- `content`: Full sentence text
- `position`: Order within paragraph (0-indexed)
- `start_offset`: Character offset in paragraph
- `end_offset`: Character offset in paragraph
- `metadata`: JSON object for sentence-level metadata
- `created_at`: Parse timestamp

**Indexes:**
- `idx_sentences_paragraph_id` on `paragraph_id`
- `idx_sentences_document_id` on `document_id`
- `idx_sentences_position` on `(paragraph_id, position)`

**Constraints:**
- Unique constraint on `(paragraph_id, position)`

---

### 6. annotations
User highlights, notes, main ideas, and citations.

```sql
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  sentence_id UUID REFERENCES public.sentences(id) ON DELETE CASCADE,
  annotation_type TEXT NOT NULL,
  content TEXT,
  highlight_color TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  position JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_annotation_type CHECK (annotation_type IN ('highlight', 'note', 'main_idea', 'citation', 'question'))
);
```

**Fields:**
- `id`: Unique annotation identifier
- `user_id`: Annotation creator
- `document_id`: Parent document
- `paragraph_id`: Referenced paragraph (optional)
- `sentence_id`: Referenced sentence (optional)
- `annotation_type`: 'highlight' | 'note' | 'main_idea' | 'citation' | 'question'
- `content`: Annotation text (for notes, main ideas)
- `highlight_color`: Hex color for highlights
- `start_offset`: Character offset start
- `end_offset`: Character offset end
- `position`: JSON object for precise positioning (page, coordinates)
- `metadata`: JSON object for additional annotation data (tags, importance)
- `archived`: Soft delete flag
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

**Indexes:**
- `idx_annotations_user_id` on `user_id`
- `idx_annotations_document_id` on `document_id`
- `idx_annotations_paragraph_id` on `paragraph_id`
- `idx_annotations_sentence_id` on `sentence_id`
- `idx_annotations_type` on `annotation_type`

---

### 7. paragraph_links
Manual connections between paragraphs.

```sql
CREATE TABLE public.paragraph_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_paragraph_id UUID NOT NULL REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  target_paragraph_id UUID NOT NULL REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  note TEXT,
  strength SMALLINT DEFAULT 50,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_link_type CHECK (link_type IN ('related', 'contradicts', 'supports', 'elaborates', 'custom')),
  CONSTRAINT chk_strength CHECK (strength BETWEEN 0 AND 100),
  CONSTRAINT chk_no_self_link CHECK (source_paragraph_id != target_paragraph_id),
  UNIQUE(source_paragraph_id, target_paragraph_id, link_type)
);
```

**Fields:**
- `id`: Unique link identifier
- `user_id`: Link creator
- `source_paragraph_id`: Starting paragraph
- `target_paragraph_id`: Target paragraph
- `link_type`: 'related' | 'contradicts' | 'supports' | 'elaborates' | 'custom'
- `note`: User's explanation of the link
- `strength`: Link strength (0-100)
- `metadata`: JSON object for additional link data
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

**Indexes:**
- `idx_paragraph_links_source` on `source_paragraph_id`
- `idx_paragraph_links_target` on `target_paragraph_id`
- `idx_paragraph_links_user` on `user_id`

**Constraints:**
- Check: `link_type` must be valid
- Check: `strength` between 0 and 100
- Check: Cannot link paragraph to itself
- Unique: No duplicate links with same type

---

### 8. ml_cache
Cached ML inference results.

```sql
CREATE TABLE public.ml_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  input_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(model_name, model_version, input_hash)
);
```

**Fields:**
- `id`: Unique cache entry identifier
- `model_name`: ML model identifier (e.g., 'sentence_similarity', 'topic_extraction')
- `model_version`: Model version string
- `input_type`: Type of input ('text', 'paragraph', 'document')
- `input_hash`: SHA-256 hash of input for deduplication
- `input_data`: JSON object with input parameters
- `output_data`: JSON object with inference results
- `processing_time_ms`: Time taken for inference
- `metadata`: JSON object for additional cache metadata
- `created_at`: First cache entry timestamp
- `accessed_at`: Last access timestamp
- `access_count`: Number of times accessed

**Indexes:**
- `idx_ml_cache_lookup` on `(model_name, model_version, input_hash)`
- `idx_ml_cache_accessed_at` on `accessed_at` (for cleanup)

**Constraints:**
- Unique: Cache entries by model, version, and input hash

---

## Row Level Security (RLS) Policies

### user_profiles
```sql
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### projects
```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Users can view their own projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create projects
CREATE POLICY "Users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);
```

### documents
```sql
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create documents
CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);
```

### paragraphs
```sql
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;

-- Users can view paragraphs from their documents
CREATE POLICY "Users can view own paragraphs" ON public.paragraphs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create paragraphs in their documents
CREATE POLICY "Users can create paragraphs" ON public.paragraphs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own paragraphs
CREATE POLICY "Users can update own paragraphs" ON public.paragraphs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own paragraphs
CREATE POLICY "Users can delete own paragraphs" ON public.paragraphs
  FOR DELETE USING (auth.uid() = user_id);
```

### sentences
```sql
ALTER TABLE public.sentences ENABLE ROW LEVEL SECURITY;

-- Users can view sentences from their documents
CREATE POLICY "Users can view own sentences" ON public.sentences
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create sentences in their documents
CREATE POLICY "Users can create sentences" ON public.sentences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sentences
CREATE POLICY "Users can delete own sentences" ON public.sentences
  FOR DELETE USING (auth.uid() = user_id);
```

### annotations
```sql
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Users can view their own annotations
CREATE POLICY "Users can view own annotations" ON public.annotations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create annotations
CREATE POLICY "Users can create annotations" ON public.annotations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own annotations
CREATE POLICY "Users can update own annotations" ON public.annotations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own annotations
CREATE POLICY "Users can delete own annotations" ON public.annotations
  FOR DELETE USING (auth.uid() = user_id);
```

### paragraph_links
```sql
ALTER TABLE public.paragraph_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own paragraph links
CREATE POLICY "Users can view own links" ON public.paragraph_links
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create paragraph links
CREATE POLICY "Users can create links" ON public.paragraph_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own paragraph links
CREATE POLICY "Users can update own links" ON public.paragraph_links
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own paragraph links
CREATE POLICY "Users can delete own links" ON public.paragraph_links
  FOR DELETE USING (auth.uid() = user_id);
```

### ml_cache
```sql
-- No RLS on ml_cache - shared across all users for performance
-- Cache entries do not contain user-specific data
```

---

## Database Functions

### Updated Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

Apply to all tables with `updated_at`:
```sql
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON public.paragraphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON public.annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraph_links_updated_at BEFORE UPDATE ON public.paragraph_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Full-Text Search Setup
```sql
-- Add tsvector column for full-text search on paragraphs
ALTER TABLE public.paragraphs ADD COLUMN content_search TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_paragraphs_content_search ON public.paragraphs USING GIN (content_search);

-- Full-text search function
CREATE OR REPLACE FUNCTION search_paragraphs(
  search_query TEXT,
  user_uuid UUID
)
RETURNS TABLE (
  paragraph_id UUID,
  document_id UUID,
  content TEXT,
  position INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.document_id,
    p.content,
    p.position,
    ts_rank(p.content_search, websearch_to_tsquery('english', search_query)) as rank
  FROM public.paragraphs p
  WHERE p.user_id = user_uuid
    AND p.content_search @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC, p.document_id, p.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Relationships Diagram

```
auth.users (Supabase Auth)
  ↓
user_profiles (1:1)
  ↓
projects (1:many)
  ↓
documents (1:many)
  ↓
paragraphs (1:many)
  ↓ ↘
sentences   annotations (many:1)
            ↓
paragraph_links (many:many via paragraphs)

ml_cache (independent, shared)
```

---

## Storage Buckets

### documents
```sql
-- Supabase Storage bucket for uploaded files
-- Bucket name: 'documents'
-- Public: false (private)
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, text/plain, text/html, application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

Storage policies:
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Performance Considerations

### Indexes Summary
- **Foreign keys**: Indexed for JOIN performance
- **User queries**: Indexed on `user_id` for RLS performance
- **Full-text search**: GIN index on paragraph content
- **ML cache lookups**: Composite index on model + hash
- **Time-based queries**: Indexes on timestamp columns

### Query Optimization
- Denormalized `user_id` on child tables for RLS performance
- Denormalized `document_id` on sentences for direct document queries
- Generated tsvector column for full-text search
- Composite unique indexes prevent duplicate data

### Maintenance
- Regular VACUUM ANALYZE for statistics
- Monitor ml_cache size and clean old entries
- Archive old projects/documents instead of deleting

---

## Migration Strategy

### Phase 1: Core Tables
1. user_profiles
2. projects
3. documents

### Phase 2: Content Tables
4. paragraphs
5. sentences

### Phase 3: Annotations
6. annotations
7. paragraph_links

### Phase 4: Performance
8. ml_cache
9. Full-text search setup
10. Storage buckets

---

## Security Notes

1. **RLS Enabled**: All user tables have Row Level Security
2. **Cascade Deletes**: Proper foreign key cascades prevent orphaned records
3. **Auth Integration**: Uses Supabase auth.users for authentication
4. **Storage Policies**: Files isolated by user UUID folders
5. **SQL Injection**: Use parameterized queries in application code
6. **Rate Limiting**: Implement at application/API level

---

## Future Enhancements

1. **Collaboration**: Add sharing tables for multi-user projects
2. **Versioning**: Add document version history
3. **Export**: Add export job tracking table
4. **Analytics**: Add usage analytics tables
5. **Embeddings**: Add vector embeddings for semantic search
6. **Notifications**: Add user notification preferences table
