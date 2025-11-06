import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { mockDocument, mockUser, mockAnnotations } from '../utils/mockData';

describe('Annotation System', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    supabase = createClient('https://test.supabase.co', 'test-key');
  });

  describe('Annotation Creation', () => {
    it('should create a highlight annotation', async () => {
      const annotation = {
        document_id: mockDocument.id,
        paragraph_id: 'para-1',
        user_id: mockUser.id,
        type: 'highlight',
        content: 'highlighted text',
        start_offset: 0,
        end_offset: 10,
        color: '#ffeb3b'
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'anno-1', ...annotation },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any;

      const { data, error } = await supabase
        .from('annotations')
        .insert(annotation)
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalledWith(annotation);
      expect(data?.type).toBe('highlight');
      expect(data?.color).toBe('#ffeb3b');
      expect(error).toBeNull();
    });

    it('should create a note annotation with text', async () => {
      const annotation = {
        document_id: mockDocument.id,
        paragraph_id: 'para-1',
        user_id: mockUser.id,
        type: 'note',
        content: 'annotated text',
        note_text: 'This is my note',
        start_offset: 15,
        end_offset: 25
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'anno-2', ...annotation },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any;

      const { data, error } = await supabase
        .from('annotations')
        .insert(annotation)
        .select()
        .single();

      expect(data?.type).toBe('note');
      expect(data?.note_text).toBe('This is my note');
      expect(error).toBeNull();
    });

    it('should create a main idea annotation', async () => {
      const annotation = {
        document_id: mockDocument.id,
        paragraph_id: 'para-1',
        user_id: mockUser.id,
        type: 'main_idea',
        content: 'key concept',
        note_text: 'The main idea is...',
        start_offset: 0,
        end_offset: 50
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'anno-3', ...annotation },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any;

      const { data } = await supabase
        .from('annotations')
        .insert(annotation)
        .select()
        .single();

      expect(data?.type).toBe('main_idea');
    });

    it('should create a citation annotation', async () => {
      const annotation = {
        document_id: mockDocument.id,
        paragraph_id: 'para-1',
        user_id: mockUser.id,
        type: 'citation',
        content: 'cited text',
        citation_text: 'Author, 2024',
        start_offset: 10,
        end_offset: 30
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'anno-4', ...annotation },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any;

      const { data } = await supabase
        .from('annotations')
        .insert(annotation)
        .select()
        .single();

      expect(data?.type).toBe('citation');
      expect(data?.citation_text).toBe('Author, 2024');
    });
  });

  describe('Annotation Retrieval', () => {
    it('should fetch all annotations for a document', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockAnnotations,
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('document_id', mockDocument.id);

      expect(data).toHaveLength(2);
      expect(error).toBeNull();
    });

    it('should fetch annotations by type', async () => {
      const highlightAnnotations = mockAnnotations.filter(a => a.type === 'highlight');

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: highlightAnnotations,
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('annotations')
        .select('*')
        .eq('document_id', mockDocument.id)
        .eq('type', 'highlight');

      expect(data?.[0].type).toBe('highlight');
    });

    it('should fetch annotations for a specific paragraph', async () => {
      const paragraphAnnotations = mockAnnotations.filter(a => a.paragraph_id === 'para-1');

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: paragraphAnnotations,
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('annotations')
        .select('*')
        .eq('paragraph_id', 'para-1');

      expect(data).toHaveLength(2);
    });
  });

  describe('Annotation Updates', () => {
    it('should update annotation content', async () => {
      const updates = { note_text: 'Updated note text' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockAnnotations[0], ...updates },
              error: null
            })
          })
        })
      });

      supabase.from = vi.fn(() => ({
        update: mockUpdate
      })) as any;

      const { data } = await supabase
        .from('annotations')
        .update(updates)
        .eq('id', 'anno-1')
        .select()
        .single();

      expect(data?.note_text).toBe('Updated note text');
    });

    it('should update annotation color', async () => {
      const updates = { color: '#ff0000' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockAnnotations[0], ...updates },
              error: null
            })
          })
        })
      });

      supabase.from = vi.fn(() => ({
        update: mockUpdate
      })) as any;

      const { data } = await supabase
        .from('annotations')
        .update(updates)
        .eq('id', 'anno-1')
        .select()
        .single();

      expect(data?.color).toBe('#ff0000');
    });
  });

  describe('Annotation Deletion', () => {
    it('should delete an annotation', async () => {
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
        .from('annotations')
        .delete()
        .eq('id', 'anno-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(error).toBeNull();
    });

    it('should delete all annotations for a paragraph', async () => {
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
        .from('annotations')
        .delete()
        .eq('paragraph_id', 'para-1');

      expect(error).toBeNull();
    });
  });
});
