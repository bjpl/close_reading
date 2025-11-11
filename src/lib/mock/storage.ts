/**
 * Mock Storage Service
 *
 * Provides a mock implementation of Supabase storage API.
 * Currently a minimal implementation that returns mock responses
 * without actually storing file data.
 */

/**
 * Mock storage bucket interface
 */
interface MockBucket {
  upload(path: string, file: File, options?: any): Promise<{ data: { path: string }; error: null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

/**
 * Mock storage service class
 *
 * Implements the Supabase storage API including:
 * - File upload (returns success without storing)
 * - Public URL generation (returns mock URLs)
 */
export class MockStorageService {
  /**
   * Gets a storage bucket by name
   *
   * @param _bucket - Bucket name
   * @returns Mock bucket object with upload and getPublicUrl methods
   */
  from(_bucket: string): MockBucket {
    return {
      /**
       * Mock file upload
       *
       * @param path - File path in bucket
       * @param _file - File to upload
       * @param _options - Upload options
       * @returns Success response with path
       */
      upload: async (path: string, _file: File, _options?: any) => {
        // TODO: Could store file in IndexedDB as base64 if needed
        return { data: { path }, error: null };
      },

      /**
       * Gets public URL for a file
       *
       * @param path - File path in bucket
       * @returns Mock public URL
       */
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `mock://storage/${path}` },
      }),
    };
  }
}
