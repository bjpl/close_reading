/**
 * Comprehensive unit tests for Account Deletion Service
 *
 * Tests cover:
 * - Hard delete (permanent account deletion)
 * - Soft delete (30-day recovery period)
 * - Account recovery (restore soft-deleted accounts)
 * - Soft delete info retrieval
 * - User data export (GDPR compliance)
 * - User data download
 * - Deletion statistics
 * - Error handling for all operations
 * - Database RPC calls
 * - Storage cleanup
 * - Auth user deletion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  deleteAccountPermanently,
  softDeleteAccount,
  recoverAccount,
  getSoftDeleteInfo,
  exportUserData,
  downloadUserData,
  getAccountDeletionStats,
} from '@/services/accountDeletion';
import { supabase } from '@/lib/supabase';

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(),
        remove: vi.fn(),
      })),
    },
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        not: vi.fn(() => ({
          is: vi.fn(),
          gte: vi.fn(),
          lt: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Account Deletion Service', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock DOM for download tests
    global.document = {
      createElement: vi.fn(() => ({
        href: '',
        download: '',
        click: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    } as unknown as Document;

    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    } as unknown as typeof URL;

    global.Blob = vi.fn() as unknown as typeof Blob;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deleteAccountPermanently', () => {
    it('should delete account and all data successfully', async () => {
      // Mock successful database deletion
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: true,
        error: null,
      });

      // Mock successful file listing (no files)
      const storageMock = {
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      };
      (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue(storageMock);

      // Mock successful auth deletion
      (supabase.auth.admin.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      const result = await deleteAccountPermanently(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('permanently deleted');
      expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account', {
        p_user_id: mockUserId,
      });
    });

    it('should delete user files from storage', async () => {
      const mockFiles = [
        { name: 'document1.pdf' },
        { name: 'document2.pdf' },
      ];

      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: true,
        error: null,
      });

      const storageMock = {
        list: vi.fn().mockResolvedValue({ data: mockFiles, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      };
      (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue(storageMock);

      (supabase.auth.admin.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      const result = await deleteAccountPermanently(mockUserId);

      expect(result.success).toBe(true);
      expect(storageMock.list).toHaveBeenCalledWith(mockUserId);
      expect(storageMock.remove).toHaveBeenCalledWith([
        `${mockUserId}/document1.pdf`,
        `${mockUserId}/document2.pdf`,
      ]);
    });

    it('should handle database deletion failure', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await deleteAccountPermanently(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete database records');
    });

    it('should handle database deletion returning false', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await deleteAccountPermanently(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('function returned false');
    });

    it('should continue despite storage cleanup errors', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: true,
        error: null,
      });

      const storageMock = {
        list: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' },
        }),
        remove: vi.fn(),
      };
      (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue(storageMock);

      (supabase.auth.admin.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      const result = await deleteAccountPermanently(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('permanently deleted');
    });

    it('should handle auth deletion requiring admin privileges', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: true,
        error: null,
      });

      const storageMock = {
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      };
      (supabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue(storageMock);

      (supabase.auth.admin.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: { message: 'Admin privileges required' },
      });

      const result = await deleteAccountPermanently(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('requires admin privileges');
    });

    it('should handle unexpected errors', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await deleteAccountPermanently(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error');
    });
  });

  describe('softDeleteAccount', () => {
    it('should soft delete account successfully', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await softDeleteAccount(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('30 days to recover');
      expect(supabase.rpc).toHaveBeenCalledWith('soft_delete_user_account', {
        p_user_id: mockUserId,
      });
    });

    it('should handle soft deletion failure', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Soft deletion failed' },
      });

      const result = await softDeleteAccount(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Soft deletion failed');
    });

    it('should handle soft deletion returning false', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await softDeleteAccount(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('function returned false');
    });

    it('should handle unexpected errors', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await softDeleteAccount(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('recoverAccount', () => {
    it('should recover soft-deleted account successfully', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await recoverAccount(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully recovered');
      expect(supabase.rpc).toHaveBeenCalledWith('recover_user_account', {
        p_user_id: mockUserId,
      });
    });

    it('should handle recovery failure', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Recovery period expired' },
      });

      const result = await recoverAccount(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recovery failed');
    });

    it('should handle recovery returning false', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await recoverAccount(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('function returned false');
    });

    it('should handle unexpected errors', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database error')
      );

      const result = await recoverAccount(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('getSoftDeleteInfo', () => {
    it('should return soft delete info for deleted account', async () => {
      const deletedAt = new Date('2024-01-01').toISOString();
      const mockData = { deleted_at: deletedAt };

      const chainMock = {
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      const selectMock = {
        eq: vi.fn().mockReturnValue(chainMock),
      };

      const fromMock = {
        select: vi.fn().mockReturnValue(selectMock),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(fromMock);

      const result = await getSoftDeleteInfo(mockUserId);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(mockUserId);
      expect(result?.deletedAt).toBe(deletedAt);
      expect(result?.recoveryDeadline).toBeDefined();
    });

    it('should calculate recovery deadline correctly', async () => {
      const deletedAt = new Date('2024-01-01').toISOString();
      const mockData = { deleted_at: deletedAt };

      const chainMock = {
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      const selectMock = {
        eq: vi.fn().mockReturnValue(chainMock),
      };

      const fromMock = {
        select: vi.fn().mockReturnValue(selectMock),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(fromMock);

      const result = await getSoftDeleteInfo(mockUserId);

      expect(result).not.toBeNull();

      const expectedDeadline = new Date('2024-01-31');
      const actualDeadline = new Date(result!.recoveryDeadline);

      expect(actualDeadline.toDateString()).toBe(expectedDeadline.toDateString());
    });

    it('should determine if recovery is possible', async () => {
      // Recent deletion - should be recoverable
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const mockData = { deleted_at: recentDate.toISOString() };

      const chainMock = {
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      const selectMock = {
        eq: vi.fn().mockReturnValue(chainMock),
      };

      const fromMock = {
        select: vi.fn().mockReturnValue(selectMock),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(fromMock);

      const result = await getSoftDeleteInfo(mockUserId);

      expect(result).not.toBeNull();
      expect(result?.canRecover).toBe(true);
    });

    it('should return null for non-deleted account', async () => {
      const chainMock = {
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const selectMock = {
        eq: vi.fn().mockReturnValue(chainMock),
      };

      const fromMock = {
        select: vi.fn().mockReturnValue(selectMock),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(fromMock);

      const result = await getSoftDeleteInfo(mockUserId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const chainMock = {
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      const selectMock = {
        eq: vi.fn().mockReturnValue(chainMock),
      };

      const fromMock = {
        select: vi.fn().mockReturnValue(selectMock),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(fromMock);

      const result = await getSoftDeleteInfo(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      const mockData = {
        user_id: mockUserId,
        email: 'test@example.com',
        documents: [],
        annotations: [],
      };

      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await exportUserData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(supabase.rpc).toHaveBeenCalledWith('export_user_data', {
        p_user_id: mockUserId,
      });
    });

    it('should handle export failure', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Export failed' },
      });

      const result = await exportUserData(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed');
    });

    it('should handle no data returned', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await exportUserData(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no data returned');
    });

    it('should handle unexpected errors', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await exportUserData(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('downloadUserData', () => {
    it('should download user data as JSON file', async () => {
      const mockData = { user_id: mockUserId, email: 'test@example.com' };

      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const linkMock = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      (document.createElement as ReturnType<typeof vi.fn>).mockReturnValue(linkMock);

      await downloadUserData(mockUserId);

      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify(mockData, null, 2)],
        { type: 'application/json' }
      );
      expect(linkMock.click).toHaveBeenCalled();
      expect(linkMock.download).toBe(`user-data-${mockUserId}.json`);
    });

    it('should use custom filename if provided', async () => {
      const mockData = { user_id: mockUserId };

      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const linkMock = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      (document.createElement as ReturnType<typeof vi.fn>).mockReturnValue(linkMock);

      await downloadUserData(mockUserId, 'custom-filename.json');

      expect(linkMock.download).toBe('custom-filename.json');
    });

    it('should throw error if export fails', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Export failed' },
      });

      await expect(downloadUserData(mockUserId)).rejects.toThrow();
    });

    it('should cleanup blob URL after download', async () => {
      const mockData = { user_id: mockUserId };

      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const linkMock = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      (document.createElement as ReturnType<typeof vi.fn>).mockReturnValue(linkMock);

      await downloadUserData(mockUserId);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('getAccountDeletionStats', () => {
    it('should return deletion statistics', async () => {
      const notChainMock = {
        is: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
          lt: vi.fn().mockResolvedValue({ count: 2, error: null }),
        }),
      };

      const selectChainMock = {
        not: vi.fn().mockReturnValue(notChainMock),
      };

      const fromMock = {
        select: vi.fn().mockReturnValue(selectChainMock),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(fromMock);

      // First call: totalSoftDeleted
      selectChainMock.not.mockReturnValueOnce({
        is: vi.fn().mockResolvedValue({ count: 10, error: null }),
      });

      // Second call: pendingDeletion
      selectChainMock.not.mockReturnValueOnce({
        is: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      });

      // Third call: expiredRecoveryPeriod
      selectChainMock.not.mockReturnValueOnce({
        is: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      });

      const result = await getAccountDeletionStats();

      expect(result.totalSoftDeleted).toBe(10);
      expect(result.pendingDeletion).toBe(5);
      expect(result.expiredRecoveryPeriod).toBe(3);
    });

    it('should return zeros on error', async () => {
      const selectMock = {
        not: vi.fn().mockReturnValue({
          is: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      };

      const fromMock = {
        select: vi.fn().mockReturnValue(selectMock),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(fromMock);

      const result = await getAccountDeletionStats();

      expect(result.totalSoftDeleted).toBe(0);
      expect(result.pendingDeletion).toBe(0);
      expect(result.expiredRecoveryPeriod).toBe(0);
    });

    it('should handle null counts', async () => {
      const notChainMock = {
        is: vi.fn().mockResolvedValue({ count: null, error: null }),
      };

      const selectChainMock = {
        not: vi.fn().mockReturnValue(notChainMock),
      };

      const fromMock = {
        select: vi.fn().mockReturnValue(selectChainMock),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(fromMock);

      const result = await getAccountDeletionStats();

      expect(result.totalSoftDeleted).toBe(0);
      expect(result.pendingDeletion).toBe(0);
      expect(result.expiredRecoveryPeriod).toBe(0);
    });
  });
});
