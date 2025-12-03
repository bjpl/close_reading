/**
 * Account Deletion Service Tests
 *
 * Tests for GDPR-compliant account deletion functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deleteAccountPermanently,
  softDeleteAccount,
  recoverAccount,
  exportUserData,
  getSoftDeleteInfo
} from '../../src/services/accountDeletion';

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(),
        remove: vi.fn()
      }))
    },
    auth: {
      admin: {
        deleteUser: vi.fn()
      }
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock logger
vi.mock('../../src/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Account Deletion Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteAccountPermanently', () => {
    it('should successfully delete account permanently', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      // Mock successful database deletion
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null
      });

      // Mock successful storage cleanup
      vi.mocked(supabase.storage.from).mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ error: null })
      } as any);

      // Mock successful auth deletion
      vi.mocked(supabase.auth.admin.deleteUser).mockResolvedValueOnce({
        data: {},
        error: null
      } as any);

      const result = await deleteAccountPermanently('test-user-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('permanently deleted');
      expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account', {
        p_user_id: 'test-user-id'
      });
    });

    it('should handle database deletion failure', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      } as any);

      const result = await deleteAccountPermanently('test-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should handle auth deletion requiring admin privileges', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      // Database deletion succeeds
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null
      });

      // Storage cleanup succeeds
      vi.mocked(supabase.storage.from).mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ error: null })
      } as any);

      // Auth deletion fails (requires admin)
      vi.mocked(supabase.auth.admin.deleteUser).mockResolvedValueOnce({
        data: null,
        error: { message: 'Requires admin privileges' }
      } as any);

      const result = await deleteAccountPermanently('test-user-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('admin privileges');
    });
  });

  describe('softDeleteAccount', () => {
    it('should successfully soft delete account', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null
      });

      const result = await softDeleteAccount('test-user-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('30 days');
      expect(supabase.rpc).toHaveBeenCalledWith('soft_delete_user_account', {
        p_user_id: 'test-user-id'
      });
    });

    it('should handle soft deletion failure', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'User already deleted' }
      } as any);

      const result = await softDeleteAccount('test-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User already deleted');
    });
  });

  describe('recoverAccount', () => {
    it('should successfully recover soft-deleted account', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null
      });

      const result = await recoverAccount('test-user-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('recovered');
      expect(supabase.rpc).toHaveBeenCalledWith('recover_user_account', {
        p_user_id: 'test-user-id'
      });
    });

    it('should handle recovery period expiration', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Recovery period expired' }
      } as any);

      const result = await recoverAccount('test-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recovery period expired');
    });
  });

  describe('getSoftDeleteInfo', () => {
    it('should return soft delete info for deleted account', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      const deletedAt = new Date('2025-12-01T00:00:00Z').toISOString();

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { deleted_at: deletedAt },
              error: null
            })
          })
        })
      } as any);

      const result = await getSoftDeleteInfo('test-user-id');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('test-user-id');
      expect(result?.deletedAt).toBe(deletedAt);
      expect(result?.canRecover).toBeDefined();
    });

    it('should return null for active account', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { deleted_at: null },
              error: null
            })
          })
        })
      } as any);

      const result = await getSoftDeleteInfo('test-user-id');

      expect(result).toBeNull();
    });
  });

  describe('exportUserData', () => {
    it('should successfully export user data', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      const mockData = {
        user_profile: { id: 'test-user-id', display_name: 'Test User' },
        projects: [{ id: 'project-1', title: 'Project 1' }],
        documents: [],
        exported_at: new Date().toISOString()
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockData,
        error: null
      });

      const result = await exportUserData('test-user-id');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(supabase.rpc).toHaveBeenCalledWith('export_user_data', {
        p_user_id: 'test-user-id'
      });
    });

    it('should handle export failure', async () => {
      const { supabase } = await import('../../src/lib/supabase');

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Export failed' }
      } as any);

      const result = await exportUserData('test-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed');
    });
  });
});
