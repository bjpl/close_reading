/**
 * PrivacyManager - Privacy Controls and PII Detection
 * Manages privacy settings, PII detection, and compliance tracking
 */

import { supabase } from '@/lib/supabase';
import {
  PrivacySettings,
  PIIDetectionResult,
  PIIType,
  PrivacyAuditLog,
  AIProviderType,
} from './ai/types';
import logger from '@/lib/logger';

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  description: string;
}

export class PrivacyManager {
  private piiPatterns: PIIPattern[];
  private settings?: PrivacySettings;

  constructor() {
    this.piiPatterns = this.initializePIIPatterns();
  }

  /**
   * Initialize PII detection patterns
   */
  private initializePIIPatterns(): PIIPattern[] {
    return [
      {
        type: 'email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        description: 'Email addresses',
      },
      {
        type: 'phone',
        pattern: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        description: 'Phone numbers',
      },
      {
        type: 'ssn',
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        description: 'Social Security Numbers',
      },
      {
        type: 'credit-card',
        pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        description: 'Credit card numbers',
      },
      {
        type: 'date-of-birth',
        pattern: /\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/g,
        description: 'Dates of birth',
      },
      {
        type: 'address',
        pattern: /\b\d+\s+[\w\s]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b/gi,
        description: 'Street addresses',
      },
      {
        type: 'medical',
        pattern: /\b(diagnosis|patient|prescription|medication|treatment|hospital|doctor|physician|nurse|clinic)\b/gi,
        description: 'Medical information',
      },
    ];
  }

  /**
   * Load privacy settings for a user
   */
  async loadSettings(userId: string): Promise<PrivacySettings> {
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Create default settings if none exist
        if (error.code === 'PGRST116') {
          return this.createDefaultSettings(userId);
        }
        throw error;
      }

      this.settings = data;
      return data;
    } catch (error) {
      logger.error({ error }, 'Failed to load privacy settings');
      // Return default settings on error
      return this.createDefaultSettings(userId);
    }
  }

  /**
   * Create default privacy settings
   */
  private async createDefaultSettings(userId: string): Promise<PrivacySettings> {
    const defaultSettings: PrivacySettings = {
      user_id: userId,
      privacy_mode_enabled: false,
      preferred_provider: 'ollama',
      allow_cloud_processing: true,
      require_confirmation_for_cloud: true,
      pii_detection_enabled: true,
      data_retention_days: 90,
    };

    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (error) throw error;

      this.settings = data;
      return data;
    } catch (error) {
      logger.error({ error }, 'Failed to create default privacy settings');
      // Return the default settings even if DB insert fails
      return defaultSettings;
    }
  }

  /**
   * Update privacy settings
   */
  async updateSettings(
    userId: string,
    updates: Partial<PrivacySettings>
  ): Promise<PrivacySettings> {
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      this.settings = data;
      return data;
    } catch (error) {
      logger.error({ error }, 'Failed to update privacy settings');
      throw error;
    }
  }

  /**
   * Detect PII in text
   */
  detectPII(text: string): PIIDetectionResult {
    const locations: PIIDetectionResult['locations'] = [];
    const typesFound = new Set<PIIType>();

    for (const pattern of this.piiPatterns) {
      const matches = text.matchAll(pattern.pattern);

      for (const match of matches) {
        if (match.index !== undefined) {
          locations.push({
            type: pattern.type,
            start: match.index,
            end: match.index + match[0].length,
            value: match[0],
          });
          typesFound.add(pattern.type);
        }
      }
    }

    return {
      found: locations.length > 0,
      types: Array.from(typesFound),
      locations,
      confidence: locations.length > 0 ? 0.85 : 1.0,
    };
  }

  /**
   * Sanitize PII from text
   */
  sanitizePII(text: string, piiTypes?: PIIType[]): string {
    let sanitized = text;
    const patterns = piiTypes
      ? this.piiPatterns.filter(p => piiTypes.includes(p.type))
      : this.piiPatterns;

    for (const pattern of patterns) {
      sanitized = sanitized.replace(pattern.pattern, () => {
        // Replace with [REDACTED_TYPE]
        return `[REDACTED_${pattern.type.toUpperCase().replace('-', '_')}]`;
      });
    }

    return sanitized;
  }

  /**
   * Check if cloud processing is allowed
   */
  async canUseCloudProvider(userId: string): Promise<boolean> {
    if (!this.settings) {
      await this.loadSettings(userId);
    }

    return (
      this.settings?.allow_cloud_processing === true &&
      this.settings?.privacy_mode_enabled !== true
    );
  }

  /**
   * Check if confirmation is required for cloud processing
   */
  requiresConfirmation(): boolean {
    return this.settings?.require_confirmation_for_cloud === true;
  }

  /**
   * Log privacy audit entry
   */
  async logAuditEntry(entry: Omit<PrivacyAuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const { error } = await supabase.from('privacy_audit_log').insert([
        {
          ...entry,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (error) {
        logger.error({ error }, 'Failed to log privacy audit entry');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to log privacy audit entry');
    }
  }

  /**
   * Get audit log for user
   */
  async getAuditLog(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: PrivacyAuditLog['action'];
    }
  ): Promise<PrivacyAuditLog[]> {
    try {
      let query = supabase
        .from('privacy_audit_log')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (options?.action) {
        query = query.eq('action', options.action);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error({ error }, 'Failed to get audit log');
      return [];
    }
  }

  /**
   * Validate text before sending to AI provider
   */
  async validateForProcessing(
    text: string,
    provider: AIProviderType,
    userId: string
  ): Promise<{
    allowed: boolean;
    sanitizedText?: string;
    piiDetected?: PIIDetectionResult;
    reason?: string;
  }> {
    // Load settings if not loaded
    if (!this.settings) {
      await this.loadSettings(userId);
    }

    // Check PII detection
    const piiDetected = this.settings?.pii_detection_enabled
      ? this.detectPII(text)
      : { found: false, types: [], locations: [], confidence: 1.0 };

    // If privacy mode is enabled, only allow local providers
    if (this.settings?.privacy_mode_enabled) {
      if (provider !== 'ollama' && provider !== 'browser-ml') {
        await this.logAuditEntry({
          userId,
          action: 'cloud-processing',
          provider,
          pii_detected: piiDetected.found,
          pii_types: piiDetected.types,
          user_approved: false,
        });

        return {
          allowed: false,
          reason: 'Privacy mode enabled - cloud providers not allowed',
        };
      }
    }

    // Log PII detection
    if (piiDetected.found) {
      await this.logAuditEntry({
        userId,
        action: 'pii-detected',
        provider,
        pii_detected: true,
        pii_types: piiDetected.types,
      });

      // Sanitize if PII detected
      const sanitizedText = this.sanitizePII(text, piiDetected.types);

      await this.logAuditEntry({
        userId,
        action: 'data-sanitized',
        provider,
        pii_detected: true,
        pii_types: piiDetected.types,
      });

      return {
        allowed: true,
        sanitizedText,
        piiDetected,
        reason: 'PII detected and sanitized',
      };
    }

    return {
      allowed: true,
      piiDetected,
    };
  }

  /**
   * Get privacy compliance status
   */
  getComplianceStatus(): {
    gdprCompliant: boolean;
    irbCompliant: boolean;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    const gdprCompliant = Boolean(
      this.settings?.pii_detection_enabled &&
      this.settings?.data_retention_days &&
      this.settings?.data_retention_days <= 90
    );

    if (!this.settings?.pii_detection_enabled) {
      recommendations.push('Enable PII detection for GDPR compliance');
    }

    if (!this.settings?.data_retention_days || this.settings.data_retention_days > 90) {
      recommendations.push('Set data retention to 90 days or less');
    }

    if (!this.settings?.privacy_mode_enabled) {
      recommendations.push(
        'Consider enabling privacy mode for sensitive research data'
      );
    }

    const irbCompliant = Boolean(
      this.settings?.privacy_mode_enabled ||
      (this.settings?.pii_detection_enabled &&
        this.settings?.require_confirmation_for_cloud)
    );

    if (!irbCompliant) {
      recommendations.push(
        'Enable privacy mode or require confirmation for cloud processing for IRB compliance'
      );
    }

    return {
      gdprCompliant,
      irbCompliant,
      recommendations,
    };
  }

  /**
   * Export privacy data (for GDPR data portability)
   */
  async exportPrivacyData(userId: string): Promise<{
    settings: PrivacySettings;
    auditLog: PrivacyAuditLog[];
  }> {
    const settings = await this.loadSettings(userId);
    const auditLog = await this.getAuditLog(userId);

    return {
      settings,
      auditLog,
    };
  }

  /**
   * Delete privacy data (for GDPR right to be forgotten)
   */
  async deletePrivacyData(userId: string): Promise<void> {
    try {
      // Delete audit log
      await supabase.from('privacy_audit_log').delete().eq('user_id', userId);

      // Reset settings to default
      await supabase
        .from('privacy_settings')
        .delete()
        .eq('user_id', userId);

      this.settings = undefined;
    } catch (error) {
      logger.error({ error }, 'Failed to delete privacy data');
      throw error;
    }
  }
}

// Singleton instance
let privacyManagerInstance: PrivacyManager | null = null;

export function getPrivacyManager(): PrivacyManager {
  if (!privacyManagerInstance) {
    privacyManagerInstance = new PrivacyManager();
  }
  return privacyManagerInstance;
}
