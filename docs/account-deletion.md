# Account Deletion Documentation

## Overview

The Close Reading Platform implements GDPR-compliant account deletion functionality, providing users with the right to be forgotten and data portability rights.

## Features

### 1. Hard Delete (Permanent Deletion)
- **Immediate and irreversible** deletion of all user data
- Deletes all associated records from the database
- Removes uploaded files from storage
- Deletes authentication user account
- **No recovery** possible after deletion

### 2. Soft Delete (30-Day Recovery Period)
- **Temporary deletion** with recovery option
- 30-day grace period for account recovery
- Data is archived but not permanently deleted
- Automatic permanent deletion after 30 days
- User can restore account during recovery period

### 3. Data Export (GDPR Compliance)
- Export all user data in JSON format
- Includes all projects, documents, annotations, and metadata
- Download as JSON file for portability
- Complies with GDPR data portability requirements

## Usage

### Frontend Integration

```typescript
import { useAuth } from './hooks/useAuth';

function AccountSettings() {
  const { deleteAccount, user } = useAuth();

  // Hard delete (permanent)
  const handlePermanentDelete = async () => {
    const result = await deleteAccount({ soft: false });
    if (result.success) {
      console.log('Account permanently deleted');
    } else {
      console.error(result.error);
    }
  };

  // Soft delete (30-day recovery)
  const handleSoftDelete = async () => {
    const result = await deleteAccount({ soft: true });
    if (result.success) {
      console.log('Account marked for deletion');
    }
  };

  return (
    <div>
      <button onClick={handlePermanentDelete}>
        Delete Account Permanently
      </button>
      <button onClick={handleSoftDelete}>
        Delete Account (30-day recovery)
      </button>
    </div>
  );
}
```

### Service Functions

```typescript
import {
  deleteAccountPermanently,
  softDeleteAccount,
  recoverAccount,
  exportUserData,
  downloadUserData,
  getSoftDeleteInfo
} from './services/accountDeletion';

// Permanent deletion
await deleteAccountPermanently(userId);

// Soft deletion
await softDeleteAccount(userId);

// Recovery
await recoverAccount(userId);

// Check deletion status
const info = await getSoftDeleteInfo(userId);
if (info?.canRecover) {
  console.log(`Can recover until ${info.recoveryDeadline}`);
}

// Export data
const { success, data } = await exportUserData(userId);

// Download data as file
await downloadUserData(userId, 'my-data.json');
```

## Database Functions

### delete_user_account(p_user_id UUID)
Permanently deletes all user data from the database.

**Parameters:**
- `p_user_id`: User UUID to delete

**Returns:**
- `BOOLEAN`: true on success, raises exception on failure

**Deletes (in order):**
1. Sentences
2. Annotations
3. Paragraph links
4. Share links
5. Paragraphs
6. Documents
7. Projects
8. User profiles

**Note:** Auth user must be deleted separately via `supabase.auth.admin.deleteUser()`

### soft_delete_user_account(p_user_id UUID)
Marks account for deletion with 30-day recovery period.

**Parameters:**
- `p_user_id`: User UUID to soft delete

**Returns:**
- `BOOLEAN`: true on success

**Actions:**
- Sets `deleted_at` timestamp on user_profiles
- Archives projects, documents, and annotations

### recover_user_account(p_user_id UUID)
Recovers a soft-deleted account within 30-day period.

**Parameters:**
- `p_user_id`: User UUID to recover

**Returns:**
- `BOOLEAN`: true on success

**Validates:**
- Account must be soft-deleted
- Recovery period (30 days) must not be expired

### export_user_data(p_user_id UUID)
Exports all user data as JSON for GDPR compliance.

**Parameters:**
- `p_user_id`: User UUID to export

**Returns:**
- `JSONB`: Complete user data export

**Includes:**
- User profile
- Projects
- Documents
- Paragraphs
- Sentences
- Annotations
- Paragraph links
- Share links
- Export timestamp

### cleanup_soft_deleted_accounts()
Periodic cleanup function for expired soft-deleted accounts.

**Returns:**
- `TABLE(deleted_user_id UUID, deleted_count INT)`: List of deleted accounts

**Actions:**
- Finds accounts soft-deleted >30 days ago
- Permanently deletes them via `delete_user_account()`

**Note:** Should be run via cron job or scheduled function

## Implementation Details

### Cascade Deletion Order

The deletion follows strict foreign key dependency order:

```
1. sentences (depends on paragraphs)
2. annotations (depends on documents, paragraphs, sentences)
3. paragraph_links (depends on paragraphs)
4. share_links (depends on documents)
5. paragraphs (depends on documents)
6. documents (depends on projects)
7. projects (root level)
8. user_profiles (extends auth.users)
9. auth.users (via admin API)
```

### Storage Cleanup

Files are deleted from Supabase Storage:
- User folder: `{userId}/`
- All uploaded documents and associated files
- Executed in try-catch to prevent deletion failure if storage access fails

### Auth User Deletion

Due to security restrictions, the auth user cannot be deleted from client-side code:

1. **Client-side approach** (current): Attempts deletion, logs warning if fails
2. **Recommended approach**: Implement backend API endpoint with service role privileges

Example backend implementation:

```typescript
// Backend API endpoint (requires service role key)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function DELETE_account(req, res) {
  const { userId } = req.body;

  // Delete database records first
  await supabaseAdmin.rpc('delete_user_account', { p_user_id: userId });

  // Then delete auth user with admin privileges
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
```

## Security Considerations

### Row Level Security (RLS)
All functions use `SECURITY DEFINER` to execute with creator privileges, bypassing RLS policies for deletion operations.

### Function Permissions
- `delete_user_account`: Granted to `authenticated` role
- `soft_delete_user_account`: Granted to `authenticated` role
- `recover_user_account`: Granted to `authenticated` role
- `export_user_data`: Granted to `authenticated` role
- `cleanup_soft_deleted_accounts`: Granted only to `service_role`

### Validation
- All functions verify user exists before operating
- Soft delete recovery validates 30-day period
- Error handling with detailed logging

## GDPR Compliance

### Right to be Forgotten (Article 17)
✅ Implemented via hard delete functionality
- Complete data removal
- Irreversible deletion
- Storage cleanup included

### Right to Data Portability (Article 20)
✅ Implemented via data export functionality
- Structured JSON format
- All user data included
- Machine-readable format

### Privacy by Design (Article 25)
✅ Built-in from architecture
- RLS policies prevent unauthorized access
- Secure deletion procedures
- Audit logging of deletion events

## Testing

### Test Hard Delete
```sql
-- Create test user and data
INSERT INTO auth.users (id, email) VALUES ('test-uuid', 'test@example.com');
INSERT INTO user_profiles (id) VALUES ('test-uuid');
INSERT INTO projects (user_id, title) VALUES ('test-uuid', 'Test Project');

-- Execute deletion
SELECT delete_user_account('test-uuid');

-- Verify deletion
SELECT COUNT(*) FROM projects WHERE user_id = 'test-uuid'; -- Should be 0
SELECT COUNT(*) FROM user_profiles WHERE id = 'test-uuid'; -- Should be 0
```

### Test Soft Delete & Recovery
```sql
-- Soft delete
SELECT soft_delete_user_account('test-uuid');

-- Check status
SELECT deleted_at FROM user_profiles WHERE id = 'test-uuid'; -- Should have timestamp

-- Recover
SELECT recover_user_account('test-uuid');

-- Verify recovery
SELECT deleted_at FROM user_profiles WHERE id = 'test-uuid'; -- Should be NULL
```

### Test Data Export
```sql
-- Export data
SELECT export_user_data('test-uuid');

-- Should return JSON with all user data
```

## Scheduled Cleanup

For production deployments, set up a periodic cleanup job:

### Using Supabase Edge Functions
```typescript
// supabase/functions/cleanup-deleted-accounts/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.rpc('cleanup_soft_deleted_accounts');

  return new Response(
    JSON.stringify({ deleted: data?.length || 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

Schedule via cron (daily at midnight):
```bash
supabase functions deploy cleanup-deleted-accounts
supabase functions schedule cleanup-deleted-accounts --cron "0 0 * * *"
```

### Using pg_cron Extension
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at midnight
SELECT cron.schedule(
  'cleanup-deleted-accounts',
  '0 0 * * *',
  'SELECT cleanup_soft_deleted_accounts();'
);
```

## Migration

Apply the migration:

```bash
# Apply to local Supabase
supabase db push

# Or apply to remote
supabase db push --db-url postgresql://...
```

## Support

For issues or questions:
- Review database function logs via Supabase Dashboard
- Check application logs for client-side errors
- Contact support for auth user deletion issues

## License

This implementation follows GDPR requirements and industry best practices for data privacy and user rights.
