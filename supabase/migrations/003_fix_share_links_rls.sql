-- Migration: Fix Share Links RLS Vulnerability
-- This migration removes the overly permissive RLS policy and replaces it
-- with secure database functions that validate tokens without exposing all data.

-- Step 1: Drop the insecure policy that allowed anyone to read all share links
DROP POLICY IF EXISTS "Anyone can access via token" ON share_links;

-- Step 2: Create a secure function to validate tokens
-- This function runs with SECURITY DEFINER privileges, meaning it bypasses RLS
-- but only returns the specific data needed for token validation
CREATE OR REPLACE FUNCTION validate_share_token(p_token text)
RETURNS TABLE (
  is_valid boolean,
  document_id uuid,
  expires_at timestamptz,
  share_link_id uuid
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_share_link record;
BEGIN
  -- Attempt to find the share link by token
  SELECT
    id,
    document_id,
    expires_at
  INTO v_share_link
  FROM share_links
  WHERE token = p_token;

  -- If not found, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  -- Check if expired
  IF v_share_link.expires_at IS NOT NULL AND v_share_link.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  -- Valid token - return validation data
  RETURN QUERY SELECT
    true,
    v_share_link.document_id,
    v_share_link.expires_at,
    v_share_link.id;
END;
$$;

-- Step 3: Create a secure function to increment access count
-- This prevents the client from needing UPDATE access to share_links
CREATE OR REPLACE FUNCTION increment_share_access_count(p_token text)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE share_links
  SET access_count = access_count + 1
  WHERE token = p_token
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

-- Step 4: Create a secure function to get share link info for document owners
-- This allows users to check their own share links without needing broad SELECT access
CREATE OR REPLACE FUNCTION get_share_link_info(p_document_id uuid)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  token text,
  created_by uuid,
  expires_at timestamptz,
  access_count int,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify the user owns the document
  IF NOT EXISTS (
    SELECT 1 FROM documents
    WHERE id = p_document_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have permission to view this share link';
  END IF;

  -- Return the share link info
  RETURN QUERY
  SELECT
    sl.id,
    sl.document_id,
    sl.token,
    sl.created_by,
    sl.expires_at,
    sl.access_count,
    sl.created_at,
    sl.updated_at
  FROM share_links sl
  WHERE sl.document_id = p_document_id
  AND sl.created_by = auth.uid();
END;
$$;

-- Step 5: Grant execute permissions to authenticated users for validation function
GRANT EXECUTE ON FUNCTION validate_share_token(text) TO anon, authenticated;

-- Step 6: Grant execute permissions for access count increment (called by public viewers)
GRANT EXECUTE ON FUNCTION increment_share_access_count(text) TO anon, authenticated;

-- Step 7: Grant execute permissions for share link info (only for authenticated users)
GRANT EXECUTE ON FUNCTION get_share_link_info(uuid) TO authenticated;

-- Step 8: Add comments for documentation
COMMENT ON FUNCTION validate_share_token(text) IS
  'Securely validates a share token without exposing all share links. Returns validation status and associated document_id.';

COMMENT ON FUNCTION increment_share_access_count(text) IS
  'Increments the access count for a valid, non-expired share link.';

COMMENT ON FUNCTION get_share_link_info(uuid) IS
  'Returns share link information for a document, but only if the caller owns the document.';
