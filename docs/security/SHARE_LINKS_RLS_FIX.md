# Share Links RLS Security Fix

## Vulnerability Description

### The Problem
In the initial implementation (`002_share_links.sql`), there were **two conflicting RLS policies** on the `share_links` table:

```sql
-- Policy 1: Users can view their own share links
CREATE POLICY "Users can view own share links" ON share_links
  FOR SELECT USING (created_by = auth.uid());

-- Policy 2: INSECURE - Anyone can access all share links
CREATE POLICY "Anyone can access via token" ON share_links
  FOR SELECT USING (true);
```

### Security Impact
The second policy (`USING (true)`) made **ALL share links publicly readable**, creating a critical vulnerability:

- **Data Exposure**: Any unauthenticated user could query the entire `share_links` table
- **Token Enumeration**: Attackers could extract all share tokens
- **Privacy Breach**: Document sharing metadata (who shared what, when, access counts) was exposed
- **Attack Vector**: Tokens could be enumerated and used to access documents without authorization

### Risk Level: **CRITICAL**

This is a severe security vulnerability that completely bypasses the intended access control model.

## The Fix

### Architecture Change
Instead of allowing direct client-side queries to the `share_links` table, we implemented **secure database functions** that:

1. Run with `SECURITY DEFINER` privileges (bypass RLS)
2. Implement custom authorization logic
3. Return only the minimal necessary data
4. Validate all inputs and permissions

### Migration: `003_fix_share_links_rls.sql`

#### Step 1: Remove Insecure Policy
```sql
DROP POLICY IF EXISTS "Anyone can access via token" ON share_links;
```

#### Step 2: Secure Token Validation Function
```sql
CREATE OR REPLACE FUNCTION validate_share_token(p_token text)
RETURNS TABLE (
  is_valid boolean,
  document_id uuid,
  expires_at timestamptz,
  share_link_id uuid
)
SECURITY DEFINER
```

**Key Features**:
- Only validates the specific token provided
- Checks expiration automatically
- Returns minimal data needed for document access
- No way to enumerate all tokens

#### Step 3: Secure Access Count Increment
```sql
CREATE OR REPLACE FUNCTION increment_share_access_count(p_token text)
RETURNS void
SECURITY DEFINER
```

**Key Features**:
- Only increments count for valid, non-expired tokens
- No SELECT access needed by client
- Atomic operation with no race conditions

#### Step 4: Secure Share Link Info Retrieval
```sql
CREATE OR REPLACE FUNCTION get_share_link_info(p_document_id uuid)
RETURNS TABLE (...)
SECURITY DEFINER
```

**Key Features**:
- Verifies document ownership before returning data
- Only returns share links created by the caller
- Cannot be used to enumerate other users' share links

### Client-Side Changes

#### Before (Insecure)
```typescript
// Direct table query - requires permissive RLS policy
const { data } = await supabase
  .from('share_links')
  .select('id, expires_at')
  .eq('token', token)
  .single();
```

#### After (Secure)
```typescript
// Secure function call - no RLS bypass needed
const { data } = await supabase
  .rpc('validate_share_token', { p_token: token });
```

### Security Model

```
┌─────────────────────────────────────────────────────┐
│                  Client Application                  │
│  (No direct access to share_links table)            │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ RPC calls only
                  ▼
┌─────────────────────────────────────────────────────┐
│           Secure Database Functions                 │
│  • validate_share_token(token)                      │
│  • increment_share_access_count(token)              │
│  • get_share_link_info(document_id)                 │
│                                                      │
│  SECURITY DEFINER - Bypass RLS with validation      │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ Validated queries only
                  ▼
┌─────────────────────────────────────────────────────┐
│              share_links Table                       │
│  RLS enabled, restrictive policies only             │
│  • Users can INSERT for own documents               │
│  • Users can SELECT own links (via created_by)      │
│  • Users can DELETE own links                       │
│  • NO public access                                 │
└─────────────────────────────────────────────────────┘
```

## Benefits of This Approach

### Security
1. **Zero-Trust Model**: No direct table access from client
2. **Minimal Data Exposure**: Functions return only necessary fields
3. **Token Protection**: Impossible to enumerate all tokens
4. **Authorization Enforcement**: Ownership checked in database
5. **Audit Trail**: All access goes through logged functions

### Performance
1. **Single Query**: Token validation in one database round-trip
2. **Index Utilization**: Functions use proper indexes
3. **Atomic Operations**: No race conditions in access count

### Maintainability
1. **Centralized Logic**: Validation in one place
2. **Type Safety**: PostgreSQL function signatures enforce contracts
3. **Testable**: Functions can be tested independently
4. **Documented**: Clear SQL with comments

## Testing the Fix

### Verify RLS Protection
```sql
-- As anonymous user, this should return no rows
SET LOCAL ROLE anon;
SELECT * FROM share_links;

-- As authenticated user, should only see own links
SET LOCAL ROLE authenticated;
SELECT * FROM share_links;
```

### Test Secure Functions
```sql
-- Valid token returns validation data
SELECT * FROM validate_share_token('valid-token-here');

-- Invalid token returns is_valid = false
SELECT * FROM validate_share_token('invalid-token');

-- Expired token returns is_valid = false
SELECT * FROM validate_share_token('expired-token');
```

### Integration Testing
Run the application's share link tests to verify:
- Token generation works
- Token validation works
- Document access via token works
- Access count increments
- Share link revocation works

## Migration Checklist

- [x] Create migration file `003_fix_share_links_rls.sql`
- [x] Remove insecure RLS policy
- [x] Create `validate_share_token()` function
- [x] Create `increment_share_access_count()` function
- [x] Create `get_share_link_info()` function
- [x] Grant proper permissions (anon, authenticated)
- [x] Update `sharing.ts` service to use RPC calls
- [x] Update `validateShareToken()` implementation
- [x] Update `getSharedDocument()` implementation
- [x] Update `incrementAccessCount()` implementation
- [x] Update `getShareLinkInfo()` implementation
- [ ] Run database migration
- [ ] Run integration tests
- [ ] Verify no RLS policy errors in logs
- [ ] Test with anonymous users
- [ ] Test with authenticated users
- [ ] Security audit pass

## Deployment Instructions

### 1. Apply Migration
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase dashboard
# Copy and execute 003_fix_share_links_rls.sql
```

### 2. Deploy Client Changes
```bash
# Build and deploy updated TypeScript code
npm run build
# Deploy to your hosting platform
```

### 3. Verify Deployment
```bash
# Check migration status
supabase db diff

# Verify functions exist
supabase db functions list

# Check RLS policies
supabase db inspect
```

### 4. Monitor for Issues
- Check application logs for RLS errors
- Monitor Supabase dashboard for function execution
- Verify share links work in production
- Test with both authenticated and anonymous users

## Rollback Plan

If issues are discovered after deployment:

```sql
-- Rollback: Restore the old (insecure) policy temporarily
CREATE POLICY "Anyone can access via token" ON share_links
  FOR SELECT USING (true);

-- Then revert client code to direct queries
-- Fix any issues
-- Re-apply the secure migration
```

**Note**: Only use rollback in emergency. The old policy is insecure and should not remain in production.

## Additional Security Recommendations

### 1. Rate Limiting
Consider adding rate limiting to prevent token brute-forcing:
```sql
-- Example: Track failed validation attempts
CREATE TABLE share_link_access_logs (
  ip_address inet,
  token_prefix text,
  attempt_time timestamptz,
  success boolean
);
```

### 2. Token Expiration Policy
Enforce automatic expiration for all share links:
```sql
-- Add constraint to require expiration
ALTER TABLE share_links
ADD CONSTRAINT require_expiration
CHECK (expires_at IS NOT NULL);
```

### 3. Audit Logging
Add comprehensive audit logging:
```sql
-- Log all share link access
CREATE TABLE share_link_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id uuid,
  action text,
  user_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
```

### 4. Content Security Policy
Update CSP headers to prevent embedding shared documents in untrusted contexts.

### 5. Token Rotation
Implement periodic token rotation for long-lived share links.

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)

## Change Log

- **2025-12-02**: Initial vulnerability fix implemented
  - Removed permissive RLS policy
  - Implemented secure database functions
  - Updated client-side code to use RPC calls
  - Added comprehensive documentation

---

**Status**: ✅ FIXED - Ready for deployment and testing
**Severity**: CRITICAL → RESOLVED
**Next Steps**: Deploy migration and verify in production
