/**
 * PrivacyManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrivacyManager } from '@/services/PrivacyManager';
import { AIProviderType } from '@/services/ai/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
          range: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

describe('PrivacyManager', () => {
  let manager: PrivacyManager;

  beforeEach(() => {
    manager = new PrivacyManager();
    vi.clearAllMocks();
  });

  describe('PII Detection', () => {
    it('should detect email addresses', () => {
      const text = 'Contact me at john.doe@example.com for more info';
      const result = manager.detectPII(text);

      expect(result.found).toBe(true);
      expect(result.types).toContain('email');
      expect(result.locations).toHaveLength(1);
      expect(result.locations[0].value).toBe('john.doe@example.com');
    });

    it('should detect phone numbers', () => {
      const text = 'Call me at (555) 123-4567 or 555-987-6543';
      const result = manager.detectPII(text);

      expect(result.found).toBe(true);
      expect(result.types).toContain('phone');
      expect(result.locations.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect SSN', () => {
      const text = 'SSN: 123-45-6789';
      const result = manager.detectPII(text);

      expect(result.found).toBe(true);
      expect(result.types).toContain('ssn');
      expect(result.locations[0].value).toBe('123-45-6789');
    });

    it('should detect credit card numbers', () => {
      const text = 'Card: 1234-5678-9012-3456';
      const result = manager.detectPII(text);

      expect(result.found).toBe(true);
      expect(result.types).toContain('credit-card');
    });

    it('should detect dates of birth', () => {
      const text = 'Born on 01/15/1990';
      const result = manager.detectPII(text);

      expect(result.found).toBe(true);
      expect(result.types).toContain('date-of-birth');
    });

    it('should detect street addresses', () => {
      const text = 'I live at 123 Main Street, Anytown';
      const result = manager.detectPII(text);

      expect(result.found).toBe(true);
      expect(result.types).toContain('address');
    });

    it('should detect medical information', () => {
      const text = 'Patient diagnosed with diabetes, prescription required';
      const result = manager.detectPII(text);

      expect(result.found).toBe(true);
      expect(result.types).toContain('medical');
    });

    it('should detect multiple PII types', () => {
      const text =
        'Contact Dr. Smith at doctor@hospital.com or (555) 123-4567. Patient SSN: 123-45-6789';
      const result = manager.detectPII(text);

      expect(result.found).toBe(true);
      expect(result.types.length).toBeGreaterThan(1);
      expect(result.types).toContain('email');
      expect(result.types).toContain('phone');
      expect(result.types).toContain('ssn');
      expect(result.types).toContain('medical');
    });

    it('should return no PII when none present', () => {
      const text = 'This is a clean text with no personal information';
      const result = manager.detectPII(text);

      expect(result.found).toBe(false);
      expect(result.types).toHaveLength(0);
      expect(result.locations).toHaveLength(0);
      expect(result.confidence).toBe(1.0);
    });

    it('should provide confidence scores', () => {
      const textWithPII = 'Email: test@example.com';
      const textWithoutPII = 'Clean text';

      const resultWith = manager.detectPII(textWithPII);
      const resultWithout = manager.detectPII(textWithoutPII);

      expect(resultWith.confidence).toBeLessThan(1.0);
      expect(resultWithout.confidence).toBe(1.0);
    });
  });

  describe('PII Sanitization', () => {
    it('should sanitize email addresses', () => {
      const text = 'Contact me at john@example.com';
      const sanitized = manager.sanitizePII(text);

      expect(sanitized).not.toContain('john@example.com');
      expect(sanitized).toContain('[REDACTED_EMAIL]');
    });

    it('should sanitize phone numbers', () => {
      const text = 'Call (555) 123-4567';
      const sanitized = manager.sanitizePII(text);

      expect(sanitized).toContain('[REDACTED_PHONE]');
    });

    it('should sanitize SSN', () => {
      const text = 'SSN: 123-45-6789';
      const sanitized = manager.sanitizePII(text);

      expect(sanitized).not.toContain('123-45-6789');
      expect(sanitized).toContain('[REDACTED_SSN]');
    });

    it('should sanitize credit cards', () => {
      const text = 'Card: 1234-5678-9012-3456';
      const sanitized = manager.sanitizePII(text);

      expect(sanitized).toContain('[REDACTED_CREDIT_CARD]');
    });

    it('should sanitize specific PII types only', () => {
      const text = 'Email: test@example.com, Phone: 555-1234';
      const sanitized = manager.sanitizePII(text, ['email']);

      expect(sanitized).toContain('[REDACTED_EMAIL]');
      expect(sanitized).toContain('555-1234'); // Phone not sanitized
    });

    it('should preserve text structure', () => {
      const text = 'Hello, my email is test@example.com and my phone is 555-1234.';
      const sanitized = manager.sanitizePII(text);

      expect(sanitized).toContain('Hello, my email is');
      expect(sanitized).toContain('and my phone is');
    });

    it('should handle multiple occurrences', () => {
      const text = 'Emails: test1@example.com, test2@example.com';
      const sanitized = manager.sanitizePII(text);

      expect(sanitized).not.toContain('test1@example.com');
      expect(sanitized).not.toContain('test2@example.com');
      expect((sanitized.match(/\[REDACTED_EMAIL\]/g) || []).length).toBe(2);
    });
  });

  describe('Privacy Settings', () => {
    it('should create default settings for new user', async () => {
      const { supabase } = await import('@/lib/supabase');
      const mockSettings = {
        user_id: 'user123',
        privacy_mode_enabled: false,
        preferred_provider: 'ollama' as AIProviderType,
        allow_cloud_processing: true,
        require_confirmation_for_cloud: true,
        pii_detection_enabled: true,
        data_retention_days: 90,
      };

      (supabase.from as any)().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      (supabase.from as any)().insert().select().single.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const settings = await manager.loadSettings('user123');

      expect(settings.user_id).toBe('user123');
      expect(settings.privacy_mode_enabled).toBe(false);
      expect(settings.preferred_provider).toBe('ollama');
      expect(settings.pii_detection_enabled).toBe(true);
    });

    it('should load existing settings', async () => {
      const { supabase } = await import('@/lib/supabase');
      const mockSettings = {
        id: '1',
        user_id: 'user123',
        privacy_mode_enabled: true,
        preferred_provider: 'claude' as AIProviderType,
        allow_cloud_processing: false,
        require_confirmation_for_cloud: true,
        pii_detection_enabled: true,
        data_retention_days: 30,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const settings = await manager.loadSettings('user123');

      expect(settings.privacy_mode_enabled).toBe(true);
      expect(settings.preferred_provider).toBe('claude');
      expect(settings.data_retention_days).toBe(30);
    });

    it('should update settings', async () => {
      const { supabase } = await import('@/lib/supabase');
      const updatedSettings = {
        id: '1',
        user_id: 'user123',
        privacy_mode_enabled: true,
        preferred_provider: 'ollama' as AIProviderType,
        allow_cloud_processing: false,
        require_confirmation_for_cloud: true,
        pii_detection_enabled: true,
        data_retention_days: 90,
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedSettings,
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const settings = await manager.updateSettings('user123', {
        privacy_mode_enabled: true,
      });

      expect(settings.privacy_mode_enabled).toBe(true);
    });
  });

  describe('Validation for Processing', () => {
    it('should allow local provider in privacy mode', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: 'user123',
                privacy_mode_enabled: true,
                pii_detection_enabled: false,
              },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await manager.validateForProcessing(
        'Clean text',
        'ollama',
        'user123'
      );

      expect(result.allowed).toBe(true);
    });

    it('should block cloud provider in privacy mode', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: 'user123',
                privacy_mode_enabled: true,
                pii_detection_enabled: false,
              },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await manager.validateForProcessing(
        'Clean text',
        'claude',
        'user123'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Privacy mode');
    });

    it('should sanitize PII when detected', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: 'user123',
                privacy_mode_enabled: false,
                pii_detection_enabled: true,
              },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await manager.validateForProcessing(
        'Email: test@example.com',
        'claude',
        'user123'
      );

      expect(result.allowed).toBe(true);
      expect(result.sanitizedText).toContain('[REDACTED_EMAIL]');
      expect(result.piiDetected?.found).toBe(true);
    });
  });

  describe('Compliance', () => {
    it('should report GDPR compliance', () => {
      manager['settings'] = {
        user_id: 'user123',
        privacy_mode_enabled: true,
        preferred_provider: 'ollama',
        allow_cloud_processing: false,
        require_confirmation_for_cloud: true,
        pii_detection_enabled: true,
        data_retention_days: 90,
      };

      const status = manager.getComplianceStatus();

      expect(status.gdprCompliant).toBe(true);
      expect(status.recommendations).toHaveLength(0);
    });

    it('should report non-compliance when PII detection disabled', () => {
      manager['settings'] = {
        user_id: 'user123',
        privacy_mode_enabled: false,
        preferred_provider: 'ollama',
        allow_cloud_processing: true,
        require_confirmation_for_cloud: true,
        pii_detection_enabled: false,
        data_retention_days: 90,
      };

      const status = manager.getComplianceStatus();

      expect(status.gdprCompliant).toBe(false);
      expect(status.recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend privacy mode for IRB compliance', () => {
      manager['settings'] = {
        user_id: 'user123',
        privacy_mode_enabled: false,
        preferred_provider: 'claude',
        allow_cloud_processing: true,
        require_confirmation_for_cloud: false,
        pii_detection_enabled: true,
        data_retention_days: 90,
      };

      const status = manager.getComplianceStatus();

      expect(status.irbCompliant).toBe(false);
      expect(status.recommendations.some((r) => r.includes('privacy mode'))).toBe(
        true
      );
    });

    it('should be IRB compliant with privacy mode', () => {
      manager['settings'] = {
        user_id: 'user123',
        privacy_mode_enabled: true,
        preferred_provider: 'ollama',
        allow_cloud_processing: false,
        require_confirmation_for_cloud: true,
        pii_detection_enabled: true,
        data_retention_days: 90,
      };

      const status = manager.getComplianceStatus();

      expect(status.irbCompliant).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should log cloud processing events', async () => {
      const { supabase } = await import('@/lib/supabase');

      (supabase.from as any)().insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await manager.logAuditEntry({
        user_id: 'user123',
        action: 'cloud-processing',
        provider: 'claude',
        pii_detected: false,
        user_approved: true,
      });

      expect(supabase.from).toHaveBeenCalledWith('privacy_audit_log');
    });

    it('should log PII detection events', async () => {
      const { supabase } = await import('@/lib/supabase');

      (supabase.from as any)().insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await manager.logAuditEntry({
        user_id: 'user123',
        action: 'pii-detected',
        provider: 'ollama',
        pii_detected: true,
        pii_types: ['email', 'phone'],
      });

      expect(supabase.from).toHaveBeenCalledWith('privacy_audit_log');
    });
  });

  describe('Data Export and Deletion', () => {
    it('should export privacy data', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockSettings = {
        user_id: 'user123',
        privacy_mode_enabled: true,
      };

      const mockAuditLog = [
        {
          id: '1',
          user_id: 'user123',
          action: 'cloud-processing' as const,
          provider: 'claude' as AIProviderType,
          timestamp: '2025-01-01T00:00:00Z',
        },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === 'privacy_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSettings,
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'privacy_audit_log') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockAuditLog,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      (supabase.from as any) = mockFrom;

      const exported = await manager.exportPrivacyData('user123');

      expect(exported.settings).toBeDefined();
      expect(exported.auditLog).toHaveLength(1);
    });

    it('should delete privacy data', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await manager.deletePrivacyData('user123');

      expect(supabase.from).toHaveBeenCalledWith('privacy_audit_log');
      expect(supabase.from).toHaveBeenCalledWith('privacy_settings');
    });
  });
});
