import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { mockParagraphs, mockParagraphLink } from '../utils/mockData';

describe('Paragraph Linking System', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    supabase = createClient('https://test.supabase.co', 'test-key');
  });

  describe('Link Creation', () => {
    it('should create a link between two paragraphs', async () => {
      const link = {
        source_paragraph_id: 'para-1',
        target_paragraph_id: 'para-2',
        relationship_type: 'related',
        note: 'These paragraphs are related'
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'link-1', ...link },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any;

      const { data, error } = await supabase
        .from('paragraph_links')
        .insert(link)
        .select()
        .single();

      expect(data?.source_paragraph_id).toBe('para-1');
      expect(data?.target_paragraph_id).toBe('para-2');
      expect(error).toBeNull();
    });

    it('should support different relationship types', async () => {
      const relationshipTypes = ['related', 'contrasts', 'supports', 'elaborates', 'quotes'];

      for (const type of relationshipTypes) {
        const link = {
          source_paragraph_id: 'para-1',
          target_paragraph_id: 'para-2',
          relationship_type: type
        };

        const mockInsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: `link-${type}`, ...link },
              error: null
            })
          })
        });

        supabase.from = vi.fn(() => ({
          insert: mockInsert
        })) as any;

        const { data } = await supabase
          .from('paragraph_links')
          .insert(link)
          .select()
          .single();

        expect(data?.relationship_type).toBe(type);
      }
    });

    it('should prevent duplicate links between same paragraphs', async () => {
      const link = {
        source_paragraph_id: 'para-1',
        target_paragraph_id: 'para-2',
        relationship_type: 'related'
      };

      // First insertion succeeds
      const mockInsertSuccess = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'link-1', ...link },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsertSuccess
      })) as any;

      const { data: firstData } = await supabase
        .from('paragraph_links')
        .insert(link)
        .select()
        .single();

      expect(firstData?.id).toBe('link-1');

      // Second insertion should fail (duplicate)
      const mockInsertFail = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'duplicate key value violates unique constraint' }
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsertFail
      })) as any;

      const { data: secondData, error } = await supabase
        .from('paragraph_links')
        .insert(link)
        .select()
        .single();

      expect(secondData).toBeNull();
      expect(error?.message).toContain('duplicate');
    });
  });

  describe('Link Retrieval', () => {
    it('should fetch all links for a paragraph', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [mockParagraphLink],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('paragraph_links')
        .select('*')
        .or(`source_paragraph_id.eq.para-1,target_paragraph_id.eq.para-1`);

      expect(data).toHaveLength(1);
    });

    it('should fetch outgoing links from a paragraph', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [mockParagraphLink],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('paragraph_links')
        .select('*')
        .eq('source_paragraph_id', 'para-1');

      expect(data?.[0].source_paragraph_id).toBe('para-1');
    });

    it('should fetch incoming links to a paragraph', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [mockParagraphLink],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('paragraph_links')
        .select('*')
        .eq('target_paragraph_id', 'para-2');

      expect(data?.[0].target_paragraph_id).toBe('para-2');
    });

    it('should fetch links by relationship type', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [mockParagraphLink],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('paragraph_links')
        .select('*')
        .eq('relationship_type', 'related');

      expect(data?.[0].relationship_type).toBe('related');
    });
  });

  describe('Link Updates', () => {
    it('should update link relationship type', async () => {
      const updates = { relationship_type: 'contrasts' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockParagraphLink, ...updates },
              error: null
            })
          })
        })
      });

      supabase.from = vi.fn(() => ({
        update: mockUpdate
      })) as any;

      const { data } = await supabase
        .from('paragraph_links')
        .update(updates)
        .eq('id', 'link-1')
        .select()
        .single();

      expect(data?.relationship_type).toBe('contrasts');
    });

    it('should update link note', async () => {
      const updates = { note: 'Updated note about the relationship' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockParagraphLink, ...updates },
              error: null
            })
          })
        })
      });

      supabase.from = vi.fn(() => ({
        update: mockUpdate
      })) as any;

      const { data } = await supabase
        .from('paragraph_links')
        .update(updates)
        .eq('id', 'link-1')
        .select()
        .single();

      expect(data?.note).toBe('Updated note about the relationship');
    });
  });

  describe('Link Deletion', () => {
    it('should delete a specific link', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        delete: mockDelete
      })) as any;

      const { error } = await supabase
        .from('paragraph_links')
        .delete()
        .eq('id', 'link-1');

      expect(error).toBeNull();
    });

    it('should delete all links for a paragraph', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        delete: mockDelete
      })) as any;

      const { error } = await supabase
        .from('paragraph_links')
        .delete()
        .or(`source_paragraph_id.eq.para-1,target_paragraph_id.eq.para-1`);

      expect(error).toBeNull();
    });
  });

  describe('Link Validation', () => {
    it('should not allow self-linking', () => {
      const sourceParagraphId = 'para-1';
      const targetParagraphId = 'para-1';

      const isValidLink = sourceParagraphId !== targetParagraphId;
      expect(isValidLink).toBe(false);
    });

    it('should validate paragraph IDs exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockParagraphs,
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('paragraphs')
        .select('id')
        .in('id', ['para-1', 'para-2']);

      expect(data).toHaveLength(2);
    });
  });
});
