export class B2StorageService {
  private authToken: string | null = null;
  private downloadUrl: string | null = null;
  private bucketName: string;
  private applicationKeyId: string;
  private applicationKey: string;

  constructor() {
    this.bucketName = process.env.B2_BUCKET_NAME || '';
    this.applicationKeyId = process.env.B2_APPLICATION_KEY_ID || '';
    this.applicationKey = process.env.B2_APPLICATION_KEY || '';
  }
  private async authorize(): Promise<void> {
    const credentials = btoa(`${this.applicationKeyId}:${this.applicationKey}`);
    
    const response = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`B2 authorization failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('B2 Auth Response:', data); // Debug log
      this.authToken = data.authorizationToken;
    
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
    
    console.log('B2 Service initialized:', {
      authToken: this.authToken ? 'Set' : 'Missing',
      downloadUrl: this.downloadUrl
    });
  }  async downloadFileContent(fileKey: string): Promise<string> {
    if (!this.authToken) {
      await this.authorize();
    }

    console.log('Downloading file with key:', fileKey);
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
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to download file: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.text();
  }

  async getDownloadUrl(fileKey: string): Promise<string> {
    if (!this.authToken) {
      await this.authorize();
    }

    // Return the authenticated download URL
    return `${this.downloadUrl}/file/${this.bucketName}/${fileKey}`;
  }
}
