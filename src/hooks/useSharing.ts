/**
 * useSharing Hook
 *
 * React hook for document sharing operations
 */

import { useState, useCallback } from 'react';
import {
  generateShareLink as generateShareLinkService,
  validateShareToken as validateShareTokenService,
  getSharedDocument as getSharedDocumentService,
  revokeShareLink as revokeShareLinkService,
  getShareLinkInfo as getShareLinkInfoService,
  SharedDocument,
  ShareLink,
} from '../services/sharing';

interface UseSharingReturn {
  // State
  loading: boolean;
  error: string | null;
  shareLink: string | null;
  sharedDocument: SharedDocument | null;
  shareLinkInfo: ShareLink | null;

  // Actions
  generateShareLink: (documentId: string, expiresInDays?: number) => Promise<string | null>;
  validateToken: (token: string) => Promise<boolean>;
  getSharedDocument: (token: string) => Promise<SharedDocument | null>;
  revokeShareLink: (documentId: string) => Promise<void>;
  getShareLinkInfo: (documentId: string) => Promise<ShareLink | null>;
  clearError: () => void;
}

export function useSharing(): UseSharingReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sharedDocument, setSharedDocument] = useState<SharedDocument | null>(null);
  const [shareLinkInfo, setShareLinkInfo] = useState<ShareLink | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generateShareLink = useCallback(
    async (documentId: string, expiresInDays?: number): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        const { link } = await generateShareLinkService(documentId, expiresInDays);
        setShareLink(link);
        return link;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate share link';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const isValid = await validateShareTokenService(token);
      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate token';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSharedDocument = useCallback(async (token: string): Promise<SharedDocument | null> => {
    setLoading(true);
    setError(null);

    try {
      const document = await getSharedDocumentService(token);
      setSharedDocument(document);
      return document;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shared document';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeShareLink = useCallback(async (documentId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await revokeShareLinkService(documentId);
      setShareLink(null);
      setShareLinkInfo(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke share link';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getShareLinkInfo = useCallback(async (documentId: string): Promise<ShareLink | null> => {
    setLoading(true);
    setError(null);

    try {
      const info = await getShareLinkInfoService(documentId);
      setShareLinkInfo(info);
      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get share link info';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    shareLink,
    sharedDocument,
    shareLinkInfo,
    generateShareLink,
    validateToken,
    getSharedDocument,
    revokeShareLink,
    getShareLinkInfo,
    clearError,
  };
}
