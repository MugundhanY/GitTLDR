// This service has been replaced with Python worker communication
// for better security and direct B2 API integration

interface B2Config {
  applicationKeyId: string
  applicationKey: string
  bucketName: string
  bucketId: string
}

interface AttachmentUploadResult {
  fileId: string
  fileName: string
  contentLength: number
  contentSha1: string
  fileInfo: Record<string, string>
  downloadUrl: string
}

interface PreSignedUploadResult {
  uploadUrl: string
  fileId: string
  downloadUrl: string
  headers?: Record<string, string>
}

class B2AttachmentStorage {
  private config: B2Config

  constructor() {
    this.config = {
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID || '',
      applicationKey: process.env.B2_APPLICATION_KEY || '',
      bucketName: process.env.B2_BUCKET_NAME || 'gittldr-attachments',
      bucketId: process.env.B2_BUCKET_ID || ''
    }
  }

  /**
   * Upload a file via the Python worker (for legacy support)
   */
  async uploadFile(
    fileName: string, 
    buffer: Buffer, 
    contentType: string,
    userId: string
  ): Promise<AttachmentUploadResult> {
    try {
      const response = await fetch(`${process.env.PYTHON_WORKER_URL}/upload-attachment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: fileName,
          content: buffer.toString('base64'),
          contentType,
          userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const result = await response.json();
      
      return {
        fileId: result.fileId,
        fileName: result.fileName,
        contentLength: buffer.length,
        contentSha1: '', // Not provided by worker
        fileInfo: {},
        downloadUrl: result.downloadUrl
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  /**
   * Get a pre-signed upload URL for direct B2 upload
   */
  async getPreSignedUploadUrl(
    fileName: string,
    fileSize: number,
    fileType: string,
    userId: string
  ): Promise<PreSignedUploadResult> {
    try {
      const response = await fetch(`${process.env.PYTHON_WORKER_URL}/get-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          fileSize,
          fileType,
          userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get upload URL');
      }

      const result = await response.json();
      
      return {
        uploadUrl: result.uploadUrl,
        fileId: result.fileId,
        downloadUrl: result.downloadUrl,
        headers: result.headers || {}
      };
    } catch (error) {
      console.error('Failed to get pre-signed URL:', error);
      throw error;
    }
  }

  /**
   * Download a file by its key (via Python worker)
   */
  async downloadFile(fileKey: string): Promise<Buffer> {
    try {
      const response = await fetch(`${process.env.PYTHON_WORKER_URL}/download-attachment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Download failed');
      }

      const result = await response.json();
      return Buffer.from(result.content, 'base64');
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * Get the download URL for a file
   */
  getDownloadUrl(fileKey: string): string {
    // Use the Python worker's public download endpoint
    return `${process.env.PYTHON_WORKER_URL}/public-download/${encodeURIComponent(fileKey)}`;
  }

  /**
   * Delete a file from B2 (via Python worker)
   */
  async deleteFile(fileKey: string, fileId: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.PYTHON_WORKER_URL}/delete-attachment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileKey,
          fileId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  }
}

export default B2AttachmentStorage;
export type { AttachmentUploadResult, PreSignedUploadResult };
