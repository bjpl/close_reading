-- Account Deletion Migration
-- Migration: 004_account_deletion
-- Created: 2025-12-02
-- Description: GDPR-compliant account deletion with CASCADE cleanup

-- ============================================================================
-- ACCOUNT DELETION FUNCTION
-- ============================================================================

-- Function to delete user account and all associated data
-- This implements GDPR "Right to be forgotten" requirements
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_records INT := 0;
BEGIN
  -- Log the deletion attempt
  RAISE NOTICE 'Starting account deletion for user: %', p_user_id;

  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist: %', p_user_id;
  END IF;

  -- Delete in order respecting foreign key constraints

  -- 1. Delete sentences (depends on paragraphs)
  DELETE FROM public.sentences
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  RAISE NOTICE 'Deleted % sentences', deleted_records;

  -- 2. Delete annotations (depends on documents, paragraphs, sentences)
  DELETE FROM public.annotations
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  RAISE NOTICE 'Deleted % annotations', deleted_records;

  -- 3. Delete paragraph links (depends on paragraphs)
  DELETE FROM public.paragraph_links
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  RAISE NOTICE 'Deleted % paragraph links', deleted_records;

  -- 4. Delete share links (depends on documents)
  DELETE FROM public.share_links
  WHERE created_by = p_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  RAISE NOTICE 'Deleted % share links', deleted_records;

  -- 5. Delete paragraphs (depends on documents)
  DELETE FROM public.paragraphs
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  RAISE NOTICE 'Deleted % paragraphs', deleted_records;

  -- 6. Delete documents (depends on projects)
  DELETE FROM public.documents
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  RAISE NOTICE 'Deleted % documents', deleted_records;

  -- 7. Delete projects (root level user data)
  DELETE FROM public.projects
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  RAISE NOTICE 'Deleted % projects', deleted_records;

  -- 8. Delete user profile (extends auth.users)
  DELETE FROM public.user_profiles
  WHERE id = p_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  RAISE NOTICE 'Deleted % user profiles', deleted_records;

  -- NOTE: The auth.users record must be deleted separately via Supabase Admin API
  -- This cannot be done from SQL for security reasons
  -- The calling application must call supabase.auth.admin.deleteUser()

  RAISE NOTICE 'Account deletion completed successfully for user: %', p_user_id;
  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete account: %', SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION delete_user_account(UUID) IS
  'GDPR-compliant account deletion - removes all user data from database tables. ' ||
  'Auth user must be deleted separately via admin API.';

-- ============================================================================
-- SOFT DELETE FUNCTIONS (OPTIONAL)
-- ============================================================================

-- Add deleted_at column to user_profiles for soft delete
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.deleted_at IS
  'Timestamp when account was soft-deleted. NULL = active account.';

-- Function for soft delete with 30-day recovery period
CREATE OR REPLACE FUNCTION soft_delete_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the user exists and is not already deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_user_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User does not exist or is already deleted: %', p_user_id;
  END IF;

  -- Mark as soft-deleted
  UPDATE public.user_profiles
  SET deleted_at = NOW()
  WHERE id = p_user_id;

  -- Optionally: Mark related data as archived
  UPDATE public.projects SET archived = TRUE WHERE user_id = p_user_id;
  UPDATE public.documents SET archived = TRUE WHERE user_id = p_user_id;
  UPDATE public.annotations SET archived = TRUE WHERE user_id = p_user_id;

  RAISE NOTICE 'Account soft-deleted for user: %. Can be recovered within 30 days.', p_user_id;
  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to soft-delete account: %', SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION soft_delete_user_account(UUID) IS
  'Soft-delete user account with 30-day recovery period. Marks user as deleted and archives data.';

-- Function to recover soft-deleted account
CREATE OR REPLACE FUNCTION recover_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deletion_date TIMESTAMPTZ;
BEGIN
  -- Get deletion date
  SELECT deleted_at INTO deletion_date
  FROM public.user_profiles
  WHERE id = p_user_id;

  -- Check if account exists and is soft-deleted
  IF deletion_date IS NULL THEN
    RAISE EXCEPTION 'Account is not deleted or does not exist: %', p_user_id;
  END IF;

  -- Check if within 30-day recovery period
  IF deletion_date < (NOW() - INTERVAL '30 days') THEN
    RAISE EXCEPTION 'Recovery period expired (>30 days). Account cannot be recovered: %', p_user_id;
  END IF;

  -- Restore account
  UPDATE public.user_profiles
  SET deleted_at = NULL
  WHERE id = p_user_id;

  -- Optionally: Unarchive data
  UPDATE public.projects SET archived = FALSE WHERE user_id = p_user_id;
  UPDATE public.documents SET archived = FALSE WHERE user_id = p_user_id;
  UPDATE public.annotations SET archived = FALSE WHERE user_id = p_user_id;

  RAISE NOTICE 'Account recovered for user: %', p_user_id;
  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to recover account: %', SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION recover_user_account(UUID) IS
  'Recover soft-deleted account within 30-day period. Unmarks deletion and restores archived data.';

-- Function to permanently delete soft-deleted accounts older than 30 days
-- This should be run periodically via cron job or scheduled function
CREATE OR REPLACE FUNCTION cleanup_soft_deleted_accounts()
RETURNS TABLE (deleted_user_id UUID, deleted_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  total_deleted INT := 0;
BEGIN
  -- Find accounts soft-deleted more than 30 days ago
  FOR user_record IN
    SELECT id
    FROM public.user_profiles
    WHERE deleted_at IS NOT NULL
      AND deleted_at < (NOW() - INTERVAL '30 days')
  LOOP
    -- Permanently delete the account
    PERFORM delete_user_account(user_record.id);

    -- NOTE: Also need to delete auth.users via admin API
    -- This function only handles database cleanup

    deleted_user_id := user_record.id;
    deleted_count := 1;
    total_deleted := total_deleted + 1;

    RETURN NEXT;
  END LOOP;

  RAISE NOTICE 'Cleaned up % soft-deleted accounts', total_deleted;
  RETURN;
END;
$$;

COMMENT ON FUNCTION cleanup_soft_deleted_accounts() IS
  'Permanently delete soft-deleted accounts older than 30 days. Should be run periodically via cron.';

-- ============================================================================
-- DATA EXPORT FUNCTION (GDPR Right to Data Portability)
-- ============================================================================

-- Function to export all user data as JSON
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data JSONB;
BEGIN
  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist: %', p_user_id;
  END IF;

  -- Aggregate all user data into JSON
  SELECT jsonb_build_object(
    'user_profile', (
      SELECT row_to_json(up.*)
      FROM public.user_profiles up
      WHERE up.id = p_user_id
    ),
    'projects', (
      SELECT COALESCE(json_agg(p.*), '[]'::json)
      FROM public.projects p
      WHERE p.user_id = p_user_id
    ),
    'documents', (
      SELECT COALESCE(json_agg(d.*), '[]'::json)
      FROM public.documents d
      WHERE d.user_id = p_user_id
    ),
    'paragraphs', (
      SELECT COALESCE(json_agg(par.*), '[]'::json)
      FROM public.paragraphs par
      WHERE par.user_id = p_user_id
    ),
    'sentences', (
      SELECT COALESCE(json_agg(s.*), '[]'::json)
      FROM public.sentences s
      WHERE s.user_id = p_user_id
    ),
    'annotations', (
      SELECT COALESCE(json_agg(a.*), '[]'::json)
      FROM public.annotations a
      WHERE a.user_id = p_user_id
    ),
    'paragraph_links', (
      SELECT COALESCE(json_agg(pl.*), '[]'::json)
      FROM public.paragraph_links pl
      WHERE pl.user_id = p_user_id
    ),
    'share_links', (
      SELECT COALESCE(json_agg(sl.*), '[]'::json)
      FROM public.share_links sl
      WHERE sl.created_by = p_user_id
    ),
    'exported_at', NOW()
  ) INTO user_data;

  RETURN user_data;
END;
$$;

COMMENT ON FUNCTION export_user_data(UUID) IS
  'GDPR-compliant data export - returns all user data as JSON for data portability.';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recover_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION export_user_data(UUID) TO authenticated;

-- Cleanup function should only be executable by service role
REVOKE EXECUTE ON FUNCTION cleanup_soft_deleted_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_soft_deleted_accounts() TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 004_account_deletion completed successfully';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - delete_user_account (hard delete)';
  RAISE NOTICE '  - soft_delete_user_account (30-day recovery)';
  RAISE NOTICE '  - recover_user_account (restore within 30 days)';
  RAISE NOTICE '  - cleanup_soft_deleted_accounts (periodic cleanup)';
  RAISE NOTICE '  - export_user_data (GDPR data portability)';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Auth users must be deleted via supabase.auth.admin.deleteUser()';
END $$;
