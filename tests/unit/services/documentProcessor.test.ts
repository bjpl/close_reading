import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processDocument,
  processDocumentWithRetry,
  processDocumentBatch,
  getProcessingStats,
  type ProcessingProgress,
  type ProcessingResult
} from '@/services/documentProcessor';
import * as documentUpload from '@/services/documentUpload';
import * as textExtraction from '@/services/textExtraction';
import * as textParsing from '@/services/textParsing';

// Mock dependencies
vi.mock('@/services/documentUpload');
vi.mock('@/services/textExtraction');
vi.mock('@/services/textParsing');
vi.mock('@/lib/logger');

describe('Document Processor Service', () => {
  const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
  const mockProjectId = 'project-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processDocument', () => {
    it('should successfully process a document through all stages', async () => {
      // Mock successful responses for each stage
      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: true,
        fileUrl: 'https://storage.example.com/file.txt',
      });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: true,
        text: 'Extracted text content',
        method: 'text/plain',
      });

      vi.mocked(textParsing.parseDocument).mockReturnValue({
        success: true,
        parsed: {
          paragraphs: [
            {
              id: 1,
              content: 'Paragraph 1',
              sentences: [{ id: 1, content: 'Sentence 1.' }],
            },
          ],
          sentences: [{ id: 1, paragraphId: 1, content: 'Sentence 1.' }],
          totalParagraphs: 1,
          totalSentences: 1,
        },
      });

      vi.mocked(documentUpload.createDocumentRecord).mockResolvedValue({
        success: true,
        document: {
          id: 'doc-123',
          title: 'test.txt',
          projectId: mockProjectId,
          fileType: 'txt',
          fileSize: 12,
          created_at: new Date().toISOString(),
        },
      });

      vi.mocked(textParsing.storeParseDocument).mockResolvedValue({
        success: true,
        paragraphs: [
          {
            id: 'para-1',
            documentId: 'doc-123',
            content: 'Paragraph 1',
            orderIndex: 0,
          },
        ],
        sentences: [
          {
            id: 'sent-1',
            paragraphId: 'para-1',
            content: 'Sentence 1.',
            orderIndex: 0,
          },
        ],
      });

      const progressUpdates: ProcessingProgress[] = [];
      const result = await processDocument(mockFile, mockProjectId, (progress) => {
        progressUpdates.push(progress);
      });

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.id).toBe('doc-123');
      expect(result.paragraphs).toHaveLength(1);
      expect(result.sentences).toHaveLength(1);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete');
    });

    it('should handle upload failure', async () => {
      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      const result = await processDocument(mockFile, mockProjectId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload failed');
    });

    it('should handle text extraction failure', async () => {
      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: true,
        fileUrl: 'https://storage.example.com/file.txt',
      });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: false,
        error: 'Extraction failed',
      });

      const result = await processDocument(mockFile, mockProjectId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('extraction failed');
    });

    it('should handle parsing failure', async () => {
      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: true,
        fileUrl: 'https://storage.example.com/file.txt',
      });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: true,
        text: 'Extracted text',
        method: 'text/plain',
      });

      vi.mocked(textParsing.parseDocument).mockReturnValue({
        success: false,
        error: 'Parsing failed',
      });

      const result = await processDocument(mockFile, mockProjectId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Parsing failed');
    });

    it('should report progress at each stage', async () => {
      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: true,
        fileUrl: 'https://storage.example.com/file.txt',
      });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: true,
        text: 'Text',
        method: 'text/plain',
      });

      vi.mocked(textParsing.parseDocument).mockReturnValue({
        success: true,
        parsed: {
          paragraphs: [],
          sentences: [],
          totalParagraphs: 0,
          totalSentences: 0,
        },
      });

      vi.mocked(documentUpload.createDocumentRecord).mockResolvedValue({
        success: true,
        document: {
          id: 'doc-123',
          title: 'test.txt',
          projectId: mockProjectId,
          fileType: 'txt',
          fileSize: 4,
          created_at: new Date().toISOString(),
        },
      });

      vi.mocked(textParsing.storeParseDocument).mockResolvedValue({
        success: true,
        paragraphs: [],
        sentences: [],
      });

      const stages: string[] = [];
      await processDocument(mockFile, mockProjectId, (progress) => {
        stages.push(progress.stage);
      });

      expect(stages).toContain('uploading');
      expect(stages).toContain('extracting');
      expect(stages).toContain('parsing');
      expect(stages).toContain('storing');
      expect(stages).toContain('complete');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(documentUpload.uploadDocument).mockRejectedValue(
        new Error('Network error')
      );

      const progressUpdates: ProcessingProgress[] = [];
      const result = await processDocument(mockFile, mockProjectId, (progress) => {
        progressUpdates.push(progress);
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      const errorStage = progressUpdates.find((p) => p.stage === 'error');
      expect(errorStage).toBeDefined();
    });
  });

  describe('processDocumentWithRetry', () => {
    it('should succeed on first attempt', async () => {
      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: true,
        fileUrl: 'https://storage.example.com/file.txt',
      });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: true,
        text: 'Text',
        method: 'text/plain',
      });

      vi.mocked(textParsing.parseDocument).mockReturnValue({
        success: true,
        parsed: {
          paragraphs: [],
          sentences: [],
          totalParagraphs: 0,
          totalSentences: 0,
        },
      });

      vi.mocked(documentUpload.createDocumentRecord).mockResolvedValue({
        success: true,
        document: {
          id: 'doc-123',
          title: 'test.txt',
          projectId: mockProjectId,
          fileType: 'txt',
          fileSize: 4,
          created_at: new Date().toISOString(),
        },
      });

      vi.mocked(textParsing.storeParseDocument).mockResolvedValue({
        success: true,
        paragraphs: [],
        sentences: [],
      });

      const result = await processDocumentWithRetry(mockFile, mockProjectId);

      expect(result.success).toBe(true);
      expect(documentUpload.uploadDocument).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      vi.mocked(documentUpload.uploadDocument)
        .mockResolvedValueOnce({ success: false, error: 'Temporary failure' })
        .mockResolvedValueOnce({
          success: true,
          fileUrl: 'https://storage.example.com/file.txt',
        });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: true,
        text: 'Text',
        method: 'text/plain',
      });

      vi.mocked(textParsing.parseDocument).mockReturnValue({
        success: true,
        parsed: {
          paragraphs: [],
          sentences: [],
          totalParagraphs: 0,
          totalSentences: 0,
        },
      });

      vi.mocked(documentUpload.createDocumentRecord).mockResolvedValue({
        success: true,
        document: {
          id: 'doc-123',
          title: 'test.txt',
          projectId: mockProjectId,
          fileType: 'txt',
          fileSize: 4,
          created_at: new Date().toISOString(),
        },
      });

      vi.mocked(textParsing.storeParseDocument).mockResolvedValue({
        success: true,
        paragraphs: [],
        sentences: [],
      });

      const result = await processDocumentWithRetry(mockFile, mockProjectId, undefined, 3);

      expect(result.success).toBe(true);
    });

    it('should fail after max retries', async () => {
      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: false,
        error: 'Persistent failure',
      });

      const result = await processDocumentWithRetry(mockFile, mockProjectId, undefined, 2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed after 2 attempts');
    });
  });

  describe('processDocumentBatch', () => {
    it('should process multiple documents sequentially', async () => {
      const files = [
        new File(['content 1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content 2'], 'file2.txt', { type: 'text/plain' }),
        new File(['content 3'], 'file3.txt', { type: 'text/plain' }),
      ];

      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: true,
        fileUrl: 'https://storage.example.com/file.txt',
      });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: true,
        text: 'Text',
        method: 'text/plain',
      });

      vi.mocked(textParsing.parseDocument).mockReturnValue({
        success: true,
        parsed: {
          paragraphs: [],
          sentences: [],
          totalParagraphs: 0,
          totalSentences: 0,
        },
      });

      vi.mocked(documentUpload.createDocumentRecord).mockResolvedValue({
        success: true,
        document: {
          id: 'doc-123',
          title: 'test.txt',
          projectId: mockProjectId,
          fileType: 'txt',
          fileSize: 4,
          created_at: new Date().toISOString(),
        },
      });

      vi.mocked(textParsing.storeParseDocument).mockResolvedValue({
        success: true,
        paragraphs: [],
        sentences: [],
      });

      const results = await processDocumentBatch(files, mockProjectId);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle mixed success and failures', async () => {
      const files = [
        new File(['content 1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content 2'], 'file2.txt', { type: 'text/plain' }),
      ];

      vi.mocked(documentUpload.uploadDocument)
        .mockResolvedValueOnce({
          success: true,
          fileUrl: 'https://storage.example.com/file.txt',
        })
        .mockResolvedValueOnce({ success: false, error: 'Upload failed' });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: true,
        text: 'Text',
        method: 'text/plain',
      });

      vi.mocked(textParsing.parseDocument).mockReturnValue({
        success: true,
        parsed: {
          paragraphs: [],
          sentences: [],
          totalParagraphs: 0,
          totalSentences: 0,
        },
      });

      vi.mocked(documentUpload.createDocumentRecord).mockResolvedValue({
        success: true,
        document: {
          id: 'doc-123',
          title: 'test.txt',
          projectId: mockProjectId,
          fileType: 'txt',
          fileSize: 4,
          created_at: new Date().toISOString(),
        },
      });

      vi.mocked(textParsing.storeParseDocument).mockResolvedValue({
        success: true,
        paragraphs: [],
        sentences: [],
      });

      const results = await processDocumentBatch(files, mockProjectId);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should track progress for each file', async () => {
      const files = [
        new File(['content 1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content 2'], 'file2.txt', { type: 'text/plain' }),
      ];

      vi.mocked(documentUpload.uploadDocument).mockResolvedValue({
        success: true,
        fileUrl: 'https://storage.example.com/file.txt',
      });

      vi.mocked(textExtraction.extractText).mockResolvedValue({
        success: true,
        text: 'Text',
        method: 'text/plain',
      });

      vi.mocked(textParsing.parseDocument).mockReturnValue({
        success: true,
        parsed: {
          paragraphs: [],
          sentences: [],
          totalParagraphs: 0,
          totalSentences: 0,
        },
      });

      vi.mocked(documentUpload.createDocumentRecord).mockResolvedValue({
        success: true,
        document: {
          id: 'doc-123',
          title: 'test.txt',
          projectId: mockProjectId,
          fileType: 'txt',
          fileSize: 4,
          created_at: new Date().toISOString(),
        },
      });

      vi.mocked(textParsing.storeParseDocument).mockResolvedValue({
        success: true,
        paragraphs: [],
        sentences: [],
      });

      const progressMap = new Map<number, ProcessingProgress[]>();
      await processDocumentBatch(files, mockProjectId, (fileIndex, progress) => {
        if (!progressMap.has(fileIndex)) {
          progressMap.set(fileIndex, []);
        }
        progressMap.get(fileIndex)!.push(progress);
      });

      expect(progressMap.size).toBe(2);
      expect(progressMap.get(0)!.length).toBeGreaterThan(0);
      expect(progressMap.get(1)!.length).toBeGreaterThan(0);
    });
  });

  describe('getProcessingStats', () => {
    it('should calculate statistics correctly', () => {
      const results: ProcessingResult[] = [
        {
          success: true,
          paragraphs: [{} as any, {} as any],
          sentences: [{} as any, {} as any, {} as any],
        },
        {
          success: true,
          paragraphs: [{} as any],
          sentences: [{} as any, {} as any],
        },
        {
          success: false,
          error: 'Failed',
        },
      ];

      const stats = getProcessingStats(results);

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
      expect(stats.totalParagraphs).toBe(3);
      expect(stats.totalSentences).toBe(5);
    });

    it('should handle empty results', () => {
      const stats = getProcessingStats([]);

      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(isNaN(stats.successRate)).toBe(true);
    });

    it('should handle all failures', () => {
      const results: ProcessingResult[] = [
        { success: false, error: 'Error 1' },
        { success: false, error: 'Error 2' },
      ];

      const stats = getProcessingStats(results);

      expect(stats.total).toBe(2);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(2);
      expect(stats.successRate).toBe(0);
    });
  });
});
