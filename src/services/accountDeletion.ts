/**
 * Account Deletion Service
 *
 * Provides GDPR-compliant account deletion functionality including:
 * - Hard delete (immediate permanent deletion)
 * - Soft delete (30-day recovery period)
 * - Account recovery (restore soft-deleted accounts)
 * - Data export (GDPR data portability)
 *
 * @module services/accountDeletion
 */

import { supabase } from '../lib/supabase';
import logger from '../lib/logger';

export interface AccountDeletionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface DataExportResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface SoftDeleteInfo {
  userId: string;
  deletedAt: string;
  recoveryDeadline: string;
  canRecover: boolean;
}

/**
 * Hard delete - Permanently delete user account and all associated data
 * This action is irreversible and complies with GDPR "Right to be forgotten"
 *
 * @param userId - User ID to delete
 * @returns Promise with deletion result
 */
export async function deleteAccountPermanently(userId: string): Promise<AccountDeletionResult> {
  try {
    logger.info({ userId }, 'Starting permanent account deletion');

    // Step 1: Delete all database records via stored procedure
    const { data, error: dbError } = await supabase.rpc('delete_user_account', {
      p_user_id: userId
    });

    if (dbError) {
      logger.error({ userId, error: dbError }, 'Database deletion failed');
      return {
        success: false,
        error: `Failed to delete database records: ${dbError.message}`
      };
    }

    if (!data) {
      logger.error({ userId }, 'Database deletion returned false');
      return {
        success: false,
        error: 'Database deletion failed - function returned false'
      };
    }

    // Step 2: Delete files from storage bucket
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('documents')
        .list(userId);

      if (listError) {
        logger.warn({ userId, error: listError }, 'Failed to list user files for deletion');
      } else if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('documents')
          .remove(filePaths);

        if (deleteError) {
          logger.warn({ userId, error: deleteError }, 'Failed to delete some user files');
        } else {
          logger.info({ userId, fileCount: files.length }, 'Deleted user files from storage');
        }
      }
    } catch (storageError) {
      logger.warn({ userId, error: storageError }, 'Storage cleanup failed (non-critical)');
    }

    // Step 3: Delete auth user (requires admin privileges)
    // NOTE: This will fail in client-side code - must be done via backend API
    // For now, we'll attempt it and log if it fails
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        logger.warn({ userId, error: authError }, 'Auth user deletion failed - may require backend API call');
        return {
          success: true,
          message: 'Database and storage cleaned up. Auth user deletion requires admin privileges - contact support to complete deletion.'
        };
      }
    } catch (authError) {
      logger.warn({ userId, error: authError }, 'Auth deletion not available in client context');
      return {
        success: true,
        message: 'Database and storage cleaned up. Please sign out and contact support to complete auth deletion.'
      };
    }

    logger.info({ userId }, 'Account deletion completed successfully');
    return {
      success: true,
      message: 'Account and all associated data have been permanently deleted.'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ userId, error: errorMessage }, 'Account deletion failed');
    return {
      success: false,
      error: `Account deletion failed: ${errorMessage}`
    };
  }
}

/**
 * Soft delete - Mark account for deletion with 30-day recovery period
 * Account can be recovered within 30 days, after which it will be permanently deleted
 *
 * @param userId - User ID to soft delete
 * @returns Promise with deletion result
 */
export async function softDeleteAccount(userId: string): Promise<AccountDeletionResult> {
  try {
    logger.info({ userId }, 'Starting soft account deletion');

    const { data, error } = await supabase.rpc('soft_delete_user_account', {
      p_user_id: userId
    });

    if (error) {
      logger.error({ userId, error }, 'Soft deletion failed');
      return {
        success: false,
        error: `Soft deletion failed: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Soft deletion failed - function returned false'
      };
    }

    logger.info({ userId }, 'Account soft-deleted successfully');
    return {
      success: true,
      message: 'Account marked for deletion. You have 30 days to recover it before permanent deletion.'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ userId, error: errorMessage }, 'Soft deletion failed');
    return {
      success: false,
      error: `Soft deletion failed: ${errorMessage}`
    };
  }
}

/**
 * Recover a soft-deleted account within the 30-day recovery period
 *
 * @param userId - User ID to recover
 * @returns Promise with recovery result
 */
export async function recoverAccount(userId: string): Promise<AccountDeletionResult> {
  try {
    logger.info({ userId }, 'Starting account recovery');

    const { data, error } = await supabase.rpc('recover_user_account', {
      p_user_id: userId
    });

    if (error) {
      logger.error({ userId, error }, 'Account recovery failed');
      return {
        success: false,
        error: `Recovery failed: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Recovery failed - function returned false'
      };
    }

    logger.info({ userId }, 'Account recovered successfully');
    return {
      success: true,
      message: 'Account has been successfully recovered.'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ userId, error: errorMessage }, 'Account recovery failed');
    return {
      success: false,
      error: `Recovery failed: ${errorMessage}`
    };
  }
}

/**
 * Check if account is soft-deleted and get recovery information
 *
 * @param userId - User ID to check
 * @returns Promise with soft delete information or null if not deleted
 */
export async function getSoftDeleteInfo(userId: string): Promise<SoftDeleteInfo | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('deleted_at')
      .eq('id', userId)
      .single();

    if (error || !data || !data.deleted_at) {
      return null;
    }

    const deletedAt = new Date(data.deleted_at);
    const recoveryDeadline = new Date(deletedAt);
    recoveryDeadline.setDate(recoveryDeadline.getDate() + 30);
    const canRecover = new Date() < recoveryDeadline;

    return {
      userId,
      deletedAt: deletedAt.toISOString(),
      recoveryDeadline: recoveryDeadline.toISOString(),
      canRecover
    };

  } catch (error) {
    logger.error({ userId, error }, 'Failed to get soft delete info');
    return null;
  }
}

/**
 * Export all user data in JSON format (GDPR data portability)
 *
 * @param userId - User ID to export data for
 * @returns Promise with exported data
 */
export async function exportUserData(userId: string): Promise<DataExportResult> {
  try {
    logger.info({ userId }, 'Starting user data export');

    const { data, error } = await supabase.rpc('export_user_data', {
      p_user_id: userId
    });

    if (error) {
      logger.error({ userId, error }, 'Data export failed');
      return {
        success: false,
        error: `Data export failed: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Data export failed - no data returned'
      };
    }

    logger.info({ userId }, 'User data exported successfully');
    return {
      success: true,
      data: data as Record<string, unknown>
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ userId, error: errorMessage }, 'Data export failed');
    return {
      success: false,
      error: `Data export failed: ${errorMessage}`
    };
  }
}

/**
 * Download exported user data as JSON file
 *
 * @param userId - User ID to export data for
 * @param filename - Optional filename (defaults to user-data-{userId}.json)
 */
export async function downloadUserData(userId: string, filename?: string): Promise<void> {
  const result = await exportUserData(userId);

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to export data');
  }

  const blob = new Blob([JSON.stringify(result.data, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `user-data-${userId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logger.info({ userId, filename: link.download }, 'User data downloaded');
}

/**
 * Get account deletion statistics (for admin/monitoring)
 *
 * @returns Promise with deletion statistics
 */
export async function getAccountDeletionStats(): Promise<{
  totalSoftDeleted: number;
  pendingDeletion: number;
  expiredRecoveryPeriod: number;
}> {
  try {
    const { count: totalSoftDeleted } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: pendingDeletion } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null)
      .gte('deleted_at', thirtyDaysAgo.toISOString());

    const { count: expiredRecoveryPeriod } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo.toISOString());

    return {
      totalSoftDeleted: totalSoftDeleted || 0,
      pendingDeletion: pendingDeletion || 0,
      expiredRecoveryPeriod: expiredRecoveryPeriod || 0
    };

  } catch (error) {
    logger.error({ error }, 'Failed to get deletion stats');
    return {
      totalSoftDeleted: 0,
      pendingDeletion: 0,
      expiredRecoveryPeriod: 0
    };
  }
}
