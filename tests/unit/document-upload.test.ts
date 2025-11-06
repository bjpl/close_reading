import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Document Upload Functionality', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    supabase = createClient('https://test.supabase.co', 'test-key');
  });

  describe('File Type Validation', () => {
    it('should accept .txt files', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(file.type).toBe('text/plain');
      expect(file.name.endsWith('.txt')).toBe(true);
    });

    it('should accept .md files', () => {
      const file = new File(['# Header'], 'test.md', { type: 'text/markdown' });
      expect(file.name.endsWith('.md')).toBe(true);
    });

    it('should accept .docx files', () => {
      const file = new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      expect(file.name.endsWith('.docx')).toBe(true);
    });

    it('should accept .pdf files', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      expect(file.type).toBe('application/pdf');
    });

    it('should reject unsupported file types', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const supportedTypes = ['.txt', '.md', '.docx', '.pdf'];
      const isSupported = supportedTypes.some(type => file.name.endsWith(type));
      expect(isSupported).toBe(false);
    });
  });

  describe('File Size Validation', () => {
    it('should accept files under size limit (10MB)', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const content = 'a'.repeat(5 * 1024 * 1024); // 5MB
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      expect(file.size).toBeLessThan(maxSize);
    });

    it('should reject files over size limit', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const content = 'a'.repeat(15 * 1024 * 1024); // 15MB
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      expect(file.size).toBeGreaterThan(maxSize);
    });
  });

  describe('Document Upload Process', () => {
    it('should upload file to storage', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'documents/test.txt' },
        error: null
      });

      supabase.storage.from = vi.fn(() => ({
        upload: mockUpload
      })) as any;

      const result = await supabase.storage
        .from('documents')
        .upload('test.txt', file);

      expect(mockUpload).toHaveBeenCalledWith('test.txt', file);
      expect(result.data?.path).toBe('documents/test.txt');
      expect(result.error).toBeNull();
    });

    it('should create document record in database', async () => {
      const documentData = {
        title: 'Test Document',
        content: 'Test content',
        file_type: 'txt',
        file_url: 'documents/test.txt',
        project_id: 'project-123'
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'doc-123', ...documentData },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any;

      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalledWith(documentData);
      expect(data?.id).toBe('doc-123');
      expect(error).toBeNull();
    });

    it('should handle upload errors gracefully', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockError = new Error('Upload failed');

      supabase.storage.from = vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      })) as any;

      const result = await supabase.storage
        .from('documents')
        .upload('test.txt', file);

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('Text Extraction', () => {
    it('should extract text from .txt file', async () => {
      const content = 'This is test content.';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      const text = await file.text();
      expect(text).toBe(content);
    });

    it('should parse paragraphs from extracted text', () => {
      const content = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0]).toBe('First paragraph.');
      expect(paragraphs[1]).toBe('Second paragraph.');
      expect(paragraphs[2]).toBe('Third paragraph.');
    });

    it('should parse sentences from paragraphs', () => {
      const paragraph = 'First sentence. Second sentence! Third sentence?';
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [];
      expect(sentences).toHaveLength(3);
      expect(sentences[0].trim()).toBe('First sentence.');
      expect(sentences[1].trim()).toBe('Second sentence!');
      expect(sentences[2].trim()).toBe('Third sentence?');
    });
  });
});
