import crypto from 'crypto';

export class B2StorageService {
  private authToken: string | null = null;
  private downloadUrl: string | null = null;
  private apiUrl: string | null = null;
  private bucketId: string | null = null;
  private bucketName: string;
  private applicationKeyId: string;
  private applicationKey: string;

  constructor() {
    this.bucketName = process.env.B2_BUCKET_NAME || '';
    this.applicationKeyId = process.env.B2_APPLICATION_KEY_ID || '';
    this.applicationKey = process.env.B2_APPLICATION_KEY || '';
  }

  // Make authorize method public for testing
  async authorize(): Promise<void> {
    if (!this.applicationKeyId || !this.applicationKey) {
      throw new Error('B2 credentials not configured. Please check B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY environment variables.');
    }

    const credentials = btoa(`${this.applicationKeyId}:${this.applicationKey}`);
    
    console.log('Attempting B2 authorization with keyId:', this.applicationKeyId.substring(0, 8) + '...');
    
    const response = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('B2 authorization failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        keyId: this.applicationKeyId.substring(0, 8) + '...'
      });
      throw new Error(`B2 authorization failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('B2 Auth Response:', data); // Debug log
    this.authToken = data.authorizationToken;
    this.apiUrl = data.apiInfo.storageApi.apiUrl;
    
    // B2 API v3 has downloadUrl nested in apiInfo.storageApi
    if (data.apiInfo && data.apiInfo.storageApi && data.apiInfo.storageApi.downloadUrl) {
      this.downloadUrl = data.apiInfo.storageApi.downloadUrl;
      console.log('Using downloadUrl from apiInfo.storageApi:', this.downloadUrl);
    } else if (data.downloadUrl) {
      // Fallback for older API versions
      this.downloadUrl = data.downloadUrl;
      console.log('Using downloadUrl from top level:', this.downloadUrl);
    } else {
      throw new Error('No download URL found in B2 authorization response');
    }

    // Get bucket ID from the auth response if available, otherwise fetch it
    if (data.apiInfo?.storageApi?.bucketId && data.apiInfo?.storageApi?.bucketName === this.bucketName) {
      this.bucketId = data.apiInfo.storageApi.bucketId;
      console.log('Using bucketId from auth response:', this.bucketId);
    } else {
      await this.getBucketId();
    }
    
    console.log('B2 Service initialized:', {
      authToken: this.authToken ? 'Set' : 'Missing',
      downloadUrl: this.downloadUrl,
      apiUrl: this.apiUrl,
      bucketId: this.bucketId
    });
  }
  private async getBucketId(): Promise<void> {
    if (!this.authToken || !this.apiUrl) {
      throw new Error('Must be authorized before getting bucket ID');
    }

    // Extract account ID from the application key ID
    // B2 application key IDs are in format: accountId or keyId format
    let accountId = this.applicationKeyId;
    if (this.applicationKeyId.includes(':')) {
      accountId = this.applicationKeyId.split(':')[0];
    }

    console.log('Getting bucket list for account:', accountId.substring(0, 8) + '...');

    const response = await fetch(`${this.apiUrl}/b2api/v3/b2_list_buckets`, {
      method: 'POST',
      headers: {
        'Authorization': this.authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: accountId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get bucket list:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        accountId: accountId.substring(0, 8) + '...'
      });
      throw new Error(`Failed to get bucket ID: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Bucket list response:', { bucketCount: data.buckets?.length, buckets: data.buckets?.map((b: any) => b.bucketName) });
    
    const bucket = data.buckets?.find((b: any) => b.bucketName === this.bucketName);
    
    if (!bucket) {
      console.error('Available buckets:', data.buckets?.map((b: any) => b.bucketName));
      throw new Error(`Bucket ${this.bucketName} not found. Available buckets: ${data.buckets?.map((b: any) => b.bucketName).join(', ')}`);
    }

    this.bucketId = bucket.bucketId;
    console.log('Found bucket ID:', this.bucketId);
  }
  async downloadFileContent(fileKey: string): Promise<string> {
    if (!this.authToken) {
      await this.authorize();
    }

    console.log('Downloading file content with key:', fileKey);
    console.log('Using downloadUrl:', this.downloadUrl);
    console.log('Using authToken:', this.authToken ? 'Present' : 'Missing');

    const downloadFileUrl = `${this.downloadUrl}/file/${this.bucketName}/${fileKey}`;
    console.log('Full download URL:', downloadFileUrl);

    const response = await fetch(downloadFileUrl, {
      headers: {
        'Authorization': this.authToken!,
      },
    });

    console.log('B2 download response status:', response.status);
    console.log('B2 download response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('B2 download failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: downloadFileUrl,
        fileKey
      });
      throw new Error(`Failed to download file: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const content = await response.text();
    console.log('Downloaded content length:', content.length);
    return content;
  }
  async downloadFileBuffer(fileKey: string): Promise<ArrayBuffer> {
    if (!this.authToken) {
      await this.authorize();
    }

    console.log('Downloading file buffer with key:', fileKey);
    console.log('Using downloadUrl:', this.downloadUrl);
    console.log('Using authToken:', this.authToken ? 'Present' : 'Missing');

    const downloadFileUrl = `${this.downloadUrl}/file/${this.bucketName}/${fileKey}`;
    console.log('Full download URL:', downloadFileUrl);
    
    const response = await fetch(downloadFileUrl, {
      headers: {
        'Authorization': this.authToken!,
      },
    });

    console.log('B2 download response status:', response.status);
    console.log('B2 download response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('B2 buffer download failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: downloadFileUrl,
        fileKey
      });
      throw new Error(`Failed to download file: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const buffer = await response.arrayBuffer();
    console.log('Downloaded buffer length:', buffer.byteLength);
    return buffer;
  }

  async getDownloadUrl(fileKey: string): Promise<string> {
    if (!this.authToken) {
      await this.authorize();
    }

    // Return the authenticated download URL
    return `${this.downloadUrl}/file/${this.bucketName}/${fileKey}`;
  }
  async getUploadUrl(fileName: string, contentType: string): Promise<{
    uploadUrl: string;
    authorizationToken: string;
    fileName: string;
    downloadUrl: string;
  }> {
    if (!this.authToken || !this.apiUrl || !this.bucketId) {
      await this.authorize();
    }

    console.log('Getting upload URL for file:', fileName);
    console.log('Content type:', contentType);
    console.log('Bucket ID:', this.bucketId);

    // Get upload URL from B2
    const response = await fetch(`${this.apiUrl}/b2api/v3/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': this.authToken!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: this.bucketId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get upload URL: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('B2 upload URL response:', data);

    // Generate the download URL for the file
    const downloadUrl = `${this.downloadUrl}/file/${this.bucketName}/${fileName}`;

    return {
      uploadUrl: data.uploadUrl,
      authorizationToken: data.authorizationToken,
      fileName: fileName,
      downloadUrl: downloadUrl,
    };
  }
  async uploadFile(fileName: string, fileBuffer: Buffer, contentType: string): Promise<{
    fileId: string;
    fileName: string;
    fileInfo: any;
  }> {
    if (!this.authToken || !this.apiUrl || !this.bucketId) {
      await this.authorize();
    }

    console.log('Uploading file directly to B2:', fileName);

    // Calculate SHA1 hash of the file
    const sha1Hash = crypto.createHash('sha1').update(fileBuffer).digest('hex');
    console.log('File SHA1 hash:', sha1Hash);

    // Get upload URL first
    const uploadUrlData = await this.getUploadUrl(fileName, contentType);

    // Upload the file using the upload URL
    const response = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrlData.authorizationToken,
        'X-Bz-File-Name': fileName,
        'Content-Type': contentType,
        'X-Bz-Content-Sha1': sha1Hash
      },
      body: fileBuffer as any // Buffer is compatible with BodyInit
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file to B2: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const uploadResult = await response.json();
    console.log('B2 upload result:', uploadResult);

    return {
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      fileInfo: uploadResult
    };
  }
}
