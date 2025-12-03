# SQL Changes Comparison: RLS Security Fix

## Original Insecure Implementation (002_share_links.sql)

### Problematic RLS Policies

```sql
-- ❌ INSECURE: Multiple conflicting SELECT policies
-- Policy 1: Allows users to see their own links (correct)
CREATE POLICY "Users can view own share links" ON share_links
  FOR SELECT USING (created_by = auth.uid());

-- Policy 2: CRITICAL VULNERABILITY - Allows ANYONE to see ALL links
CREATE POLICY "Anyone can access via token" ON share_links
  FOR SELECT USING (true);
```

### Why This Is Insecure

PostgreSQL RLS policies are **permissive** - if ANY policy returns true, access is granted. The second policy (`USING (true)`) makes the first policy meaningless because it allows access to ALL rows for ALL users.

**Attack Scenario:**
```sql
-- Any anonymous user can execute:
SELECT * FROM share_links;

-- Returns ALL tokens from ALL users:
id | document_id | token              | created_by | expires_at | access_count
---+-------------+--------------------+------------+------------+-------------
1  | abc-123     | secret-token-1     | user-1     | 2025-12-31 | 5
2  | def-456     | secret-token-2     | user-2     | 2025-12-31 | 12
3  | ghi-789     | secret-token-3     | user-3     | NULL       | 0
...
```

## Secure Implementation (003_fix_share_links_rls.sql)

### Step 1: Remove Vulnerable Policy

```sql
-- ✅ Remove the permissive policy that exposed all tokens
DROP POLICY IF EXISTS "Anyone can access via token" ON share_links;
```

After this, the only SELECT policy is the owner-only policy:
```sql
-- Only this policy remains - users can only see their own links
CREATE POLICY "Users can view own share links" ON share_links
  FOR SELECT USING (created_by = auth.uid());
```

### Step 2: Secure Token Validation Function

```sql
-- ✅ SECURE: Function validates tokens without exposing table data
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
```

**Key Security Features:**
- `SECURITY DEFINER`: Function runs with creator's privileges (bypasses RLS)
- `SET search_path = public`: Prevents search path attacks
- Only accepts ONE token at a time (no enumeration)
- Returns minimal data needed for validation
- Checks expiration internally
- No way to get all tokens or other users' data

### Step 3: Secure Access Count Function

```sql
-- ✅ SECURE: Increments count without requiring client UPDATE access
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
```

**Benefits:**
- Atomic operation (no race conditions)
- Only increments valid, non-expired tokens
- Client doesn't need UPDATE permission
- No data returned (void function)

### Step 4: Secure Share Link Info Function

```sql
-- ✅ SECURE: Returns share link info only for document owners
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
```

**Authorization Model:**
1. Check if caller owns the document
2. Raise exception if not authorized
3. Return share link ONLY if both conditions met:
   - Document owned by caller
   - Share link created by caller

### Step 5: Grant Permissions

```sql
-- ✅ Explicit permission grants
-- Validation function: Available to anonymous and authenticated
GRANT EXECUTE ON FUNCTION validate_share_token(text) TO anon, authenticated;

-- Access count increment: Available to anonymous and authenticated
GRANT EXECUTE ON FUNCTION increment_share_access_count(text) TO anon, authenticated;

-- Share link info: Only for authenticated users
GRANT EXECUTE ON FUNCTION get_share_link_info(uuid) TO authenticated;
```

**Why Grant to `anon`:**
- Public share links need validation without authentication
- The function itself enforces security (token-based access)
- No way to enumerate or access unauthorized data

## Client Code Changes

### Before: Direct Table Queries (Insecure)

```typescript
// ❌ Required permissive RLS policy
export async function validateShareToken(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('share_links')          // Direct table access
    .select('id, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) {
    return false;
  }

  // Client-side expiration check
  if (data.expires_at) {
    const expiryDate = new Date(data.expires_at);
    if (expiryDate < new Date()) {
      return false;
    }
  }

  return true;
}
```

### After: RPC Function Calls (Secure)

```typescript
// ✅ Uses secure function, no table access needed
export async function validateShareToken(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('validate_share_token', { p_token: token });

  if (error || !data || data.length === 0) {
    return false;
  }

  return data[0].is_valid;
}
```

**Advantages:**
- No direct table access
- Expiration checked in database
- Single round-trip to database
- Type-safe function signature
- No RLS policy needed for client

## Security Comparison Table

| Aspect | Old (Insecure) | New (Secure) |
|--------|----------------|--------------|
| **Table Access** | Direct client queries | Via RPC functions only |
| **RLS Policy** | `USING (true)` - all rows | Owner-only policy |
| **Token Enumeration** | ✗ Possible | ✓ Impossible |
| **Data Exposure** | ✗ All tokens visible | ✓ Minimal data only |
| **Authorization** | ✗ Client-side checks | ✓ Database enforced |
| **Expiration Check** | ✗ Client-side | ✓ Server-side |
| **Atomic Updates** | ✗ Race conditions | ✓ Atomic operations |
| **Audit Trail** | ✗ No tracking | ✓ Function call logs |
| **Type Safety** | ✗ Dynamic queries | ✓ Typed functions |

## Testing the Security

### Test 1: Anonymous User Cannot Access Table

```sql
-- Set session to anonymous role
SET LOCAL ROLE anon;

-- This should return NO rows (RLS blocks access)
SELECT * FROM share_links;
-- Expected: 0 rows

-- This should work (public function access)
SELECT * FROM validate_share_token('some-token');
-- Expected: Returns validation result for THAT token only
```

### Test 2: Authenticated User Sees Only Own Links

```sql
-- Set session to authenticated role with test user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-123"}';

-- This should return only links where created_by = 'user-123'
SELECT * FROM share_links;
-- Expected: Only user's own share links

-- This should validate any token
SELECT * FROM validate_share_token('any-valid-token');
-- Expected: Validation result
```

### Test 3: Cannot Enumerate Tokens

```sql
-- Try to get all tokens (should fail)
SELECT token FROM share_links;
-- Expected: 0 rows (or only own tokens if authenticated)

-- Try to enumerate via function (should fail)
SELECT * FROM validate_share_token('token-1');
SELECT * FROM validate_share_token('token-2');
-- Expected: Only validates one token at a time, no enumeration possible
```

## Performance Impact

### Old Implementation
```
Client Query → RLS Check → Table Scan → Return ALL matching rows
```

### New Implementation
```
Client RPC → Function Execution → Targeted Query → Return MINIMAL data
```

**Performance Benefits:**
- Faster: Index-optimized queries
- Efficient: Single database round-trip
- Scalable: No full table scans
- Cached: Function execution plan cached

## Migration Path

```bash
# 1. Apply migration
supabase db push

# 2. Verify functions exist
psql -c "\df validate_share_token"

# 3. Test function
psql -c "SELECT * FROM validate_share_token('test-token');"

# 4. Verify RLS policies
psql -c "\d+ share_links"

# 5. Deploy client code
npm run build && npm run deploy

# 6. Monitor logs
tail -f /var/log/supabase/postgres.log
```

## Conclusion

This migration transforms the security model from:
- **Insecure**: Open table access with permissive RLS
- **Secure**: Controlled function access with strict authorization

The new implementation follows the **principle of least privilege** and provides **defense in depth** through multiple security layers.

---

**Status**: ✅ Security vulnerability FIXED
**Impact**: CRITICAL → RESOLVED
**Next**: Deploy and verify
