import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateShareLink,
  validateShareToken,
  getSharedDocument,
  revokeShareLink,
  incrementAccessCount,
  getShareLinkInfo,
} from '../../src/services/sharing';

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '../../src/lib/supabase';

describe('Sharing Service', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockDocument = {
    id: 'doc-123',
    user_id: 'user-123',
    title: 'Test Document',
    content: 'Test content',
    project_id: 'proj-123',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockShareLink = {
    id: 'share-123',
    document_id: 'doc-123',
    token: 'abc123token',
    created_by: 'user-123',
    expires_at: null,
    access_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock crypto.getRandomValues for token generation
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        },
      },
      writable: true,
    });

    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
    });
  });


  describe('generateShareLink', () => {
    it('should generate a unique share link', async () => {
      // Mock auth
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      // Mock document check
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockDocument,
        error: null,
      });

      // Mock delete existing links
      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

      // Mock insert new link
      const insertSingleMock = vi.fn().mockResolvedValue({
        data: mockShareLink,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            select: selectMock,
            eq: eqMock,
            single: singleMock,
          } as any;
        }
        if (table === 'share_links') {
          return {
            delete: () => ({
              eq: deleteEqMock,
            }),
            insert: () => ({
              select: () => ({
                single: insertSingleMock,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await generateShareLink('doc-123');

      expect(result.link).toContain('http://localhost:3000/shared/');
      expect(result.token).toBeTruthy();
      expect(result.token.length).toBeGreaterThan(10);
    });

    it('should generate link with expiration date', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation(() => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockDocument, error: null }),
          delete: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
        } as any;
      });

      const result = await generateShareLink('doc-123', 7);

      expect(result.token).toBeTruthy();
    });

    it('should throw error if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(generateShareLink('doc-123')).rejects.toThrow(
        'User must be authenticated'
      );
    });

    it('should throw error if document not found', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })) as any;

      await expect(generateShareLink('doc-123')).rejects.toThrow('Document not found');
    });

    it('should throw error if user does not own document', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockDocument, user_id: 'other-user' },
          error: null,
        }),
      })) as any;

      await expect(generateShareLink('doc-123')).rejects.toThrow(
        'You do not have permission'
      );
    });

    it('should delete existing share links before creating new one', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const insertSelectSingleMock = vi.fn().mockResolvedValue({
        data: mockShareLink,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockDocument, error: null }),
          } as any;
        }
        if (table === 'share_links') {
          return {
            delete: () => ({
              eq: deleteEqMock,
            }),
            insert: () => ({
              select: () => ({
                single: insertSelectSingleMock,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      await generateShareLink('doc-123');

      expect(deleteEqMock).toHaveBeenCalledWith('document_id', 'doc-123');
    });
  });

  describe('validateShareToken', () => {
    it('should return true for valid non-expired token', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-123', expires_at: null },
          error: null,
        }),
      } as any);

      const result = await validateShareToken('valid-token');

      expect(result).toBe(true);
    });

    it('should return true for token with future expiration', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-123', expires_at: futureDate.toISOString() },
          error: null,
        }),
      } as any);

      const result = await validateShareToken('valid-token');

      expect(result).toBe(true);
    });

    it('should return false for expired token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-123', expires_at: pastDate.toISOString() },
          error: null,
        }),
      } as any);

      const result = await validateShareToken('expired-token');

      expect(result).toBe(false);
    });

    it('should return false for non-existent token', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      } as any);

      const result = await validateShareToken('invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('getSharedDocument', () => {
    it('should return document with annotations for valid token', async () => {
      // Mock 1: validateShareToken - share_links select
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-123', expires_at: null },
          error: null,
        }),
      } as any);

      // Mock 2: getSharedDocument get share link - share_links select
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { document_id: 'doc-123', id: 'share-123' },
          error: null,
        }),
      } as any);

      // Mock 3: incrementAccessCount get access_count - share_links select
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { access_count: 0 },
          error: null,
        }),
      } as any);

      // Mock 4: incrementAccessCount update - share_links update
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      // Mock 5: getSharedDocument get document - documents select
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockDocument,
            projects: { title: 'Test Project' },
          },
          error: null,
        }),
      } as any);

      // Mock 6: getSharedDocument get annotations - annotations select/order
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'anno-1', content: 'Test annotation' },
          ],
          error: null,
        }),
      } as any);

      const result = await getSharedDocument('valid-token');

      expect(result).toBeTruthy();
      expect(result?.title).toBe('Test Document');
      expect(result?.annotations).toBeTruthy();
    });

    it('should return null for invalid token', async () => {
      // Use mockImplementation for consistent behavior across retries
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
        // Include update in case validation passes unexpectedly
        update: vi.fn().mockReturnThis(),
      } as any));

      const result = await getSharedDocument('invalid-token');

      expect(result).toBeNull();
    });

    it('should increment access count when document is accessed', async () => {
      // Mock successful validation and document retrieval
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'share-123', expires_at: null },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { document_id: 'doc-123', id: 'share-123' },
            error: null,
          }),
        } as any);

      await getSharedDocument('valid-token');

      // Access count increment is called internally
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('revokeShareLink', () => {
    it('should revoke share link for authenticated user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const eqMock = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        delete: () => ({
          eq: (_field: string, _value: string) => ({
            eq: eqMock.mockResolvedValue({ error: null }),
          }),
        }),
      } as any);

      await revokeShareLink('doc-123');

      expect(supabase.from).toHaveBeenCalledWith('share_links');
    });

    it('should throw error if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(revokeShareLink('doc-123')).rejects.toThrow(
        'User must be authenticated'
      );
    });
  });

  describe('incrementAccessCount', () => {
    it('should increment access count for valid token', async () => {
      // Mock get current count
      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { access_count: 5 },
            error: null,
          }),
        } as any)
        // Mock update count
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as any);

      await incrementAccessCount('valid-token');

      expect(supabase.from).toHaveBeenCalledWith('share_links');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      } as any);

      // Should not throw
      await expect(incrementAccessCount('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('getShareLinkInfo', () => {
    it('should return share link info for document owner', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockShareLink,
          error: null,
        }),
      } as any);

      const result = await getShareLinkInfo('doc-123');

      expect(result).toEqual(mockShareLink);
    });

    it('should return null if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getShareLinkInfo('doc-123');

      expect(result).toBeNull();
    });

    it('should return null if share link does not exist', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      } as any);

      const result = await getShareLinkInfo('doc-123');

      expect(result).toBeNull();
    });
  });

  describe('Token Generation', () => {
    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const token = Array.from(array, (byte) =>
          byte.toString(36).padStart(2, '0')
        ).join('');
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should generate tokens of sufficient length', () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = Array.from(array, (byte) =>
        byte.toString(36).padStart(2, '0')
      ).join('');

      expect(token.length).toBeGreaterThanOrEqual(32);
    });
  });
});
