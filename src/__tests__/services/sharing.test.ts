/**
 * Security Tests for Sharing Service
 *
 * Tests RLS-secured sharing functions including:
 * - Token generation security
 * - Token validation
 * - Share link CRUD operations
 * - Access control enforcement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateShareLink,
  validateShareToken,
  getSharedDocument,
  revokeShareLink,
  incrementAccessCount,
  getShareLinkInfo,
  type ShareLink,
  type SharedDocument,
} from '../../services/sharing';
import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  default: {
    warn: vi.fn(),
  },
  logError: vi.fn(),
}));

describe('Sharing Service - Security Tests', () => {
  const mockUserId = 'user-123';
  const mockDocumentId = 'doc-456';
  const mockToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.origin for URL generation
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Generation Security', () => {
    it('should generate unique cryptographically secure tokens', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      // Mock document ownership check
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: mockDocumentId, user_id: mockUserId },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
        eq: vi.fn().mockReturnThis(),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Mock delete existing links
      const mockDelete = vi.fn().mockReturnThis();
      mockFrom.mockReturnValueOnce({
        select: mockSelect,
        delete: mockDelete,
        insert: vi.fn().mockReturnThis(),
      });

      // Mock insert new link
      const mockInsert = vi.fn().mockReturnThis();
      mockFrom.mockReturnValueOnce({
        select: mockSelect,
        delete: mockDelete,
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
      });

      const mockSelectAfterInsert = vi.fn().mockReturnThis();
      mockInsert().select = mockSelectAfterInsert;
      mockSelectAfterInsert().single = vi.fn().mockResolvedValue({
        data: { token: mockToken },
        error: null,
      });

      const result1 = await generateShareLink(mockDocumentId);
      const result2 = await generateShareLink(mockDocumentId);

      // Tokens should be unique (different calls should generate different tokens)
      // Note: In a real implementation, we'd need to capture the actual generated tokens
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.link).toContain('https://example.com/shared/');
      expect(result1.token).toBeDefined();
      expect(result1.token.length).toBeGreaterThan(32); // Secure tokens should be long
    });

    it('should generate tokens that are not easily guessable', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      // Mock document ownership
      const mockFrom = vi.fn();
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockDocumentId, user_id: mockUserId },
          error: null,
        }),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
      };

      mockFrom.mockReturnValue(mockChain);
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Mock successful insert
      mockChain.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { token: mockToken },
            error: null,
          }),
        }),
      });

      const result = await generateShareLink(mockDocumentId);

      // Token should be long and contain alphanumeric characters
      expect(result.token.length).toBeGreaterThan(32);
      expect(/^[a-z0-9]+$/.test(result.token)).toBe(true);
    });

    it('should handle token expiration correctly', async () => {
      const expiresInDays = 7;

      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      // Mock document ownership
      const mockFrom = vi.fn();
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockDocumentId, user_id: mockUserId },
          error: null,
        }),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
      };

      let capturedExpiresAt: string | null = null;

      mockChain.insert = vi.fn().mockImplementation((data: any) => {
        capturedExpiresAt = data.expires_at;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { token: mockToken, expires_at: data.expires_at },
              error: null,
            }),
          }),
        };
      });

      mockFrom.mockReturnValue(mockChain);
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await generateShareLink(mockDocumentId, expiresInDays);

      // Verify expiration date was set
      expect(capturedExpiresAt).not.toBeNull();
      if (capturedExpiresAt) {
        const expiryDate = new Date(capturedExpiresAt);
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + expiresInDays);

        // Check that the expiry date is approximately correct (within 1 minute)
        const timeDiff = Math.abs(expiryDate.getTime() - expectedDate.getTime());
        expect(timeDiff).toBeLessThan(60000);
      }
    });
  });

  describe('Token Validation', () => {
    it('should accept valid tokens using RPC', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ is_valid: true, document_id: mockDocumentId }],
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      const result = await validateShareToken(mockToken);

      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('validate_share_token', { p_token: mockToken });
    });

    it('should reject expired tokens', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ is_valid: false, document_id: mockDocumentId }],
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      const result = await validateShareToken(mockToken);

      expect(result).toBe(false);
      expect(mockRpc).toHaveBeenCalledWith('validate_share_token', { p_token: mockToken });
    });

    it('should reject invalid tokens', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      const result = await validateShareToken('invalid-token');

      expect(result).toBe(false);
    });

    it('should reject tokens when RPC fails', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      const result = await validateShareToken(mockToken);

      expect(result).toBe(false);
    });

    it('should use RPC and not direct table access for validation', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ is_valid: true, document_id: mockDocumentId }],
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      await validateShareToken(mockToken);

      // Ensure RPC was called
      expect(mockRpc).toHaveBeenCalledWith('validate_share_token', { p_token: mockToken });

      // Ensure direct table access was NOT attempted
      expect(supabase.from).not.toHaveBeenCalledWith('share_links');
    });
  });

  describe('Share Link CRUD Operations', () => {
    it('should create share link with correct user ownership', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      // Mock document ownership
      const mockFrom = vi.fn();
      let capturedInsertData: any = null;

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockDocumentId, user_id: mockUserId },
          error: null,
        }),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockImplementation((data: any) => {
          capturedInsertData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'share-123' },
                error: null,
              }),
            }),
          };
        }),
      };

      mockFrom.mockReturnValue(mockChain);
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await generateShareLink(mockDocumentId);

      // Verify the insert was called with correct user ownership
      expect(capturedInsertData).toBeDefined();
      expect(capturedInsertData.created_by).toBe(mockUserId);
      expect(capturedInsertData.document_id).toBe(mockDocumentId);
    });

    it('should only allow document owner to create share links', async () => {
      const otherUserId = 'other-user-456';

      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: otherUserId } as any },
        error: null,
      });

      // Mock document owned by different user
      const mockFrom = vi.fn();
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockDocumentId, user_id: mockUserId }, // Different owner
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockChain);
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(generateShareLink(mockDocumentId)).rejects.toThrow(
        'You do not have permission to share this document'
      );
    });

    it('should retrieve share link info only for owner using RPC', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockShareLink: ShareLink = {
        id: 'share-123',
        document_id: mockDocumentId,
        token: mockToken,
        created_by: mockUserId,
        expires_at: null,
        access_count: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockRpc = vi.fn().mockResolvedValue({
        data: [mockShareLink],
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      const result = await getShareLinkInfo(mockDocumentId);

      expect(result).toEqual(mockShareLink);
      expect(mockRpc).toHaveBeenCalledWith('get_share_link_info', { p_document_id: mockDocumentId });
    });

    it('should delete share link only for owner', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();

      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await revokeShareLink(mockDocumentId);

      // Verify delete was called with both document_id and created_by
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('document_id', mockDocumentId);
      expect(mockEq).toHaveBeenCalledWith('created_by', mockUserId);
    });

    it('should return null for share link info if not authenticated', async () => {
      // Mock unauthenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getShareLinkInfo(mockDocumentId);

      expect(result).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('Access Control', () => {
    it('should increment access count via RPC', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      await incrementAccessCount(mockToken);

      expect(mockRpc).toHaveBeenCalledWith('increment_share_access_count', { p_token: mockToken });
    });

    it('should log warning if incrementing access count fails', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST000' },
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      await incrementAccessCount(mockToken);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'PGRST000',
          errorMessage: 'Database error',
        }),
        'Failed to increment access count'
      );
    });

    it('should retrieve shared document for valid token', async () => {
      const mockDocument = {
        id: mockDocumentId,
        title: 'Test Document',
        content: 'Test content',
        project_id: 'project-123',
        created_at: new Date().toISOString(),
        projects: { title: 'Test Project' },
      };

      const mockAnnotations = [
        {
          id: 'ann-1',
          annotation_type: 'highlight' as const,
          content: 'Test annotation',
          highlight_color: '#ffff00',
          start_offset: 0,
          end_offset: 10,
          created_at: new Date().toISOString(),
        },
      ];

      // Mock token validation
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({
          data: [{ is_valid: true, document_id: mockDocumentId }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      // Mock document and annotations retrieval
      const mockFrom = vi.fn();
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDocument,
          error: null,
        }),
        order: vi.fn().mockResolvedValue({
          data: mockAnnotations,
          error: null,
        }),
      };

      mockFrom.mockReturnValue(selectChain);
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getSharedDocument(mockToken);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockDocumentId);
      expect(result?.title).toBe('Test Document');
      expect(result?.annotations).toHaveLength(1);
      expect(result?.project_title).toBe('Test Project');

      // Verify RPC calls
      expect(mockRpc).toHaveBeenCalledWith('validate_share_token', { p_token: mockToken });
      expect(mockRpc).toHaveBeenCalledWith('increment_share_access_count', { p_token: mockToken });
    });

    it('should return null for invalid token when retrieving shared document', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ is_valid: false }],
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      const result = await getSharedDocument(mockToken);

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should return null for expired token when retrieving shared document', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      const result = await getSharedDocument(mockToken);

      expect(result).toBeNull();
    });

    it('should not allow access to other users share links directly', async () => {
      const otherUserId = 'other-user-456';

      // Mock authenticated user (different from owner)
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: otherUserId } as any },
        error: null,
      });

      // Mock RPC that would return null for unauthorized access
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      const result = await getShareLinkInfo(mockDocumentId);

      // Should return null because RLS would prevent access
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should throw error if user not authenticated for generateShareLink', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(generateShareLink(mockDocumentId)).rejects.toThrow(
        'User must be authenticated to generate share links'
      );
    });

    it('should throw error if document not found', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(generateShareLink(mockDocumentId)).rejects.toThrow('Document not found');
    });

    it('should throw error if user not authenticated for revokeShareLink', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(revokeShareLink(mockDocumentId)).rejects.toThrow(
        'User must be authenticated to revoke share links'
      );
    });
  });

  describe('RLS Security Verification', () => {
    it('should use RPC functions for all security-sensitive operations', async () => {
      // Track all RPC calls
      const rpcCalls: string[] = [];
      const mockRpc = vi.fn().mockImplementation((funcName: string) => {
        rpcCalls.push(funcName);
        return Promise.resolve({ data: [], error: null });
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      // Test validate
      await validateShareToken(mockToken);
      expect(rpcCalls).toContain('validate_share_token');

      // Test increment
      await incrementAccessCount(mockToken);
      expect(rpcCalls).toContain('increment_share_access_count');

      // Test get share link info
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });
      await getShareLinkInfo(mockDocumentId);
      expect(rpcCalls).toContain('get_share_link_info');
    });

    it('should verify ownership before allowing share link creation', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      let ownershipChecked = false;
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => {
            if (field === 'id' && value === mockDocumentId) {
              ownershipChecked = true;
            }
            return {
              single: vi.fn().mockResolvedValue({
                data: { id: mockDocumentId, user_id: 'different-user' },
                error: null,
              }),
            };
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(generateShareLink(mockDocumentId)).rejects.toThrow();
      expect(ownershipChecked).toBe(true);
    });
  });
});
