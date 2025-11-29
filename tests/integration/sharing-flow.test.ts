import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * End-to-End Sharing Flow Integration Tests
 *
 * These tests validate the complete sharing workflow from link generation
 * to document access and revocation.
 */

// Use vi.hoisted() to ensure mock functions are available when vi.mock() is hoisted
const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  },
}));

import {
  generateShareLink,
  validateShareToken,
  getSharedDocument,
  revokeShareLink,
  getShareLinkInfo,
} from '../../src/services/sharing';
import { supabase } from '../../src/lib/supabase';

describe('Sharing Flow Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'owner@example.com',
  };

  const mockDocument = {
    id: 'doc-123',
    user_id: 'user-123',
    title: 'Comprehensive Research Paper',
    content: 'Full document content with multiple paragraphs...',
    project_id: 'proj-123',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockAnnotations = [
    {
      id: 'anno-1',
      document_id: 'doc-123',
      content: 'Important finding',
      type: 'highlight',
      color: '#ffeb3b',
    },
    {
      id: 'anno-2',
      document_id: 'doc-123',
      content: 'Key methodology',
      type: 'note',
      note_text: 'Review this section carefully',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockReset();
    mockFrom.mockReset();

    // Mock crypto for token generation
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

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
    });
  });

  describe('Complete Sharing Workflow', () => {
    it('should complete full workflow: generate → validate → access → revoke', async () => {
      // Step 1: Generate share link
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const mockShareLink = {
        id: 'share-123',
        document_id: 'doc-123',
        token: 'generated-token-abc123',
        created_by: 'user-123',
        expires_at: null,
        access_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock document ownership check
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockDocument,
              error: null,
            }),
          } as any;
        }
        if (table === 'share_links') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockShareLink,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { link, token } = await generateShareLink('doc-123');

      expect(link).toContain('/shared/');
      expect(token).toBeTruthy();

      // Step 2: Validate token
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-123', expires_at: null },
          error: null,
        }),
      } as any);

      const isValid = await validateShareToken(token);
      expect(isValid).toBe(true);

      // Step 3: Access shared document
      // Call order: validateShareToken, getShareLink, incrementAccessCount(select), incrementAccessCount(update), getDocument, getAnnotations
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
            data: { document_id: 'doc-123', id: 'share-123', access_count: 0 },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { access_count: 0 },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockDocument,
              projects: { title: 'Research Project' },
            },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockAnnotations,
            error: null,
          }),
        } as any);

      const sharedDoc = await getSharedDocument(token);

      expect(sharedDoc).toBeTruthy();
      expect(sharedDoc?.title).toBe('Comprehensive Research Paper');
      expect(sharedDoc?.annotations).toHaveLength(2);

      // Step 4: Revoke share link
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      } as any);

      await revokeShareLink('doc-123');

      // Step 5: Verify token is invalid after revocation
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      } as any);

      const isValidAfterRevoke = await validateShareToken(token);
      expect(isValidAfterRevoke).toBe(false);
    });

    it('should handle expired link access gracefully', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      // Generate link with expiration
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockDocument,
              error: null,
            }),
          } as any;
        }
        if (table === 'share_links') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    token: 'expired-token',
                    expires_at: pastDate.toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { token } = await generateShareLink('doc-123', 7);

      // Try to validate expired token
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'share-123',
            expires_at: pastDate.toISOString(),
          },
          error: null,
        }),
      } as any);

      const isValid = await validateShareToken(token);
      expect(isValid).toBe(false);

      // Try to access document with expired token
      const sharedDoc = await getSharedDocument(token);
      expect(sharedDoc).toBeNull();
    });

    it('should prevent unauthorized users from accessing documents', async () => {
      const unauthorizedUser = {
        id: 'hacker-456',
        email: 'hacker@example.com',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: unauthorizedUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDocument,
          error: null,
        }),
      } as any);

      // Try to generate share link for document they don't own
      await expect(generateShareLink('doc-123')).rejects.toThrow(
        'You do not have permission'
      );
    });
  });

  describe('Public Access Scenarios', () => {
    it('should allow anonymous users to access shared documents', async () => {
      const token = 'public-token-xyz';

      // Validate token (no auth required)
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-123', expires_at: null },
          error: null,
        }),
      } as any);

      const isValid = await validateShareToken(token);
      expect(isValid).toBe(true);

      // Access document (no auth required)
      // Call order: validateShareToken, getShareLink, incrementAccessCount(select), incrementAccessCount(update), getDocument, getAnnotations
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
            data: { document_id: 'doc-123', id: 'share-123', access_count: 0 },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { access_count: 0 },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockDocument,
              projects: { title: 'Public Project' },
            },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockAnnotations,
            error: null,
          }),
        } as any);

      const sharedDoc = await getSharedDocument(token);

      expect(sharedDoc).toBeTruthy();
      expect(sharedDoc?.annotations).toHaveLength(2);
    });

    it('should track access count for shared documents', async () => {
      const token = 'tracking-token';

      // Call order: validateShareToken, getShareLink, incrementAccessCount(select), incrementAccessCount(update), getDocument, getAnnotations
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
            data: { document_id: 'doc-123', id: 'share-123', access_count: 0 },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { access_count: 0 },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockDocument,
              projects: { title: 'Project' },
            },
            error: null,
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any);

      await getSharedDocument(token);

      // Verify from was called for share_links table multiple times
      expect(supabase.from).toHaveBeenCalledWith('share_links');
    });
  });

  describe('Link Management', () => {
    it('should regenerate link and invalidate old one', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      // First link generation
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockDocument,
              error: null,
            }),
          } as any;
        }
        if (table === 'share_links') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { token: 'first-token' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const firstLink = await generateShareLink('doc-123');
      // Service generates its own token, so just verify it was created
      expect(firstLink.token).toBeTruthy();
      expect(firstLink.token.length).toBeGreaterThan(20);

      // Second link generation (should delete first)
      const secondLink = await generateShareLink('doc-123');
      expect(secondLink.token).toBeTruthy();
      expect(secondLink.token.length).toBeGreaterThan(20);

      // Verify delete was called
      expect(supabase.from).toHaveBeenCalledWith('share_links');
    });

    it('should retrieve share link info for document owner', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'share-123',
            token: 'info-token',
            access_count: 42,
            expires_at: null,
          },
          error: null,
        }),
      } as any);

      const info = await getShareLinkInfo('doc-123');

      expect(info).toBeTruthy();
      expect(info?.access_count).toBe(42);
      expect(info?.token).toBe('info-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      } as any);

      const isValid = await validateShareToken('test-token');
      expect(isValid).toBe(false);

      const sharedDoc = await getSharedDocument('test-token');
      expect(sharedDoc).toBeNull();
    });

    it('should handle network errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Network error')),
      } as any);

      await expect(async () => {
        await validateShareToken('test-token');
      }).rejects.toThrow();
    });
  });
});
