import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

export interface WebhookProcessingJob {
  repositoryId: string;
  event: 'push' | 'repository';
  payload: any;
  timestamp: Date;
}

export class WebhookBackgroundProcessor {
  private static instance: WebhookBackgroundProcessor;
  private processingQueue: WebhookProcessingJob[] = [];
  private isProcessing = false;

  static getInstance(): WebhookBackgroundProcessor {
    if (!WebhookBackgroundProcessor.instance) {
      WebhookBackgroundProcessor.instance = new WebhookBackgroundProcessor();
    }
    return WebhookBackgroundProcessor.instance;
  }

  // Add job to processing queue
  async addJob(job: WebhookProcessingJob): Promise<void> {
    console.log(`Adding webhook job for repository ${job.repositoryId}, event: ${job.event}`);
    this.processingQueue.push(job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Process jobs in queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Starting to process ${this.processingQueue.length} webhook jobs`);

    while (this.processingQueue.length > 0) {
      const job = this.processingQueue.shift()!;
      try {
        await this.processJob(job);
        console.log(`Successfully processed job for repository ${job.repositoryId}`);
      } catch (error) {
        console.error(`Failed to process job for repository ${job.repositoryId}:`, error);
        // Optionally, add failed jobs back to queue or to a dead letter queue
      }
      
      // Small delay between processing jobs to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
    console.log('Finished processing webhook queue');
  }

  // Process individual job
  private async processJob(job: WebhookProcessingJob): Promise<void> {
    const { repositoryId, event, payload } = job;

    // Get repository details
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { user: true }
    });

    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    console.log(`Processing ${event} event for repository: ${repository.fullName}`);

    switch (event) {
      case 'push':
        await this.processPushEvent(repository, payload);
        break;
      case 'repository':
        await this.processRepositoryEvent(repository, payload);
        break;
      default:
        console.log(`Unhandled event type: ${event}`);
    }
  }

  // Process push events (new commits)
  private async processPushEvent(repository: any, payload: any): Promise<void> {
    const commits = payload.commits || [];
    console.log(`Processing ${commits.length} commits for ${repository.fullName}`);

    for (const commit of commits) {
      // Save commit to database
      await this.saveCommit(repository.id, commit);
      
      // Process changed files
      const changedFiles = [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || [])
      ];

      for (const filePath of changedFiles) {
        try {
          // Skip removed files
          if (commit.removed && commit.removed.includes(filePath)) {
            await this.handleFileRemoval(repository, filePath);
            continue;
          }

          // Process added/modified files
          await this.processChangedFile(repository, filePath, commit);
        } catch (error) {
          console.error(`Failed to process file ${filePath}:`, error);
        }
      }
    }

    // Update repository last activity
    await prisma.repository.update({
      where: { id: repository.id },
      data: { updatedAt: new Date() }
    });
  }

  // Process repository events (settings changes, etc.)
  private async processRepositoryEvent(repository: any, payload: any): Promise<void> {
    console.log(`Processing repository event for ${repository.fullName}:`, payload.action);
    
    // Handle different repository actions
    switch (payload.action) {
      case 'privatized':
      case 'publicized':
        await prisma.repository.update({
          where: { id: repository.id },
          data: { 
            isPrivate: payload.repository.private,
            updatedAt: new Date()
          }
        });
        break;
      case 'renamed':
        await prisma.repository.update({
          where: { id: repository.id },
          data: { 
            name: payload.repository.name,
            fullName: payload.repository.full_name,
            updatedAt: new Date()
          }
        });
        break;
      default:
        console.log(`Unhandled repository action: ${payload.action}`);
    }
  }

  // Save commit to database
  private async saveCommit(repositoryId: string, commit: any): Promise<void> {
    const existingCommit = await prisma.commit.findUnique({
      where: { sha: commit.id }
    });

    if (existingCommit) {
      console.log(`Commit ${commit.id} already exists, skipping`);
      return;
    }

    await prisma.commit.create({
      data: {
        sha: commit.id,
        message: commit.message,
        authorName: commit.author.name,
        authorEmail: commit.author.email,
        timestamp: new Date(commit.timestamp),
        url: commit.url,
        filesChanged: (commit.added?.length || 0) + (commit.modified?.length || 0) + (commit.removed?.length || 0),
        repositoryId: repositoryId
      }
    });

    console.log(`Saved commit ${commit.id} to database`);
  }

  // Process individual changed file
  private async processChangedFile(repository: any, filePath: string, commit: any): Promise<void> {
    console.log(`Processing file: ${filePath}`);

    // Get file content from GitHub API
    const fileContent = await this.fetchFileContent(repository, filePath, commit.id);
    if (!fileContent) {
      console.log(`Could not fetch content for ${filePath}`);
      return;
    }

    // Upload to B2 bucket
    const fileUrl = await this.uploadToB2(repository, filePath, fileContent);
    if (!fileUrl) {
      console.log(`Failed to upload ${filePath} to B2`);
      return;
    }

    // Save/update file record
    await this.saveFileRecord(repository.id, filePath, fileContent, fileUrl);

    // Generate embeddings
    await this.generateEmbeddings(repository, filePath, fileContent);

    console.log(`Successfully processed file: ${filePath}`);
  }

  // Fetch file content from GitHub
  private async fetchFileContent(repository: any, filePath: string, commitSha: string): Promise<string | null> {
    try {
      const [owner, repo] = repository.fullName.split('/');
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${commitSha}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitTLDR-Webhook-Processor'
        }
      });

      if (!response.ok) {
        console.error(`GitHub API error for ${filePath}: ${response.status}`);
        return null;
      }

      const data = await response.json() as any;
      
      if (data.type !== 'file') {
        console.log(`${filePath} is not a file, skipping`);
        return null;
      }

      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return content;
    } catch (error) {
      console.error(`Error fetching file content for ${filePath}:`, error);
      return null;
    }
  }

  // Upload file to B2 bucket
  private async uploadToB2(repository: any, filePath: string, content: string): Promise<string | null> {
    try {
      // Call Python worker API to upload to B2
      const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
      
      const response = await fetch(`${pythonWorkerUrl}/api/upload-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository_id: repository.id,
          file_path: filePath,
          content: content,
          metadata: {
            full_name: repository.fullName,
            owner: repository.owner
          }
        })
      });

      if (!response.ok) {
        console.error(`B2 upload failed for ${filePath}: ${response.status}`);
        return null;
      }

      const result = await response.json() as any;
      return result.file_url;
    } catch (error) {
      console.error(`Error uploading ${filePath} to B2:`, error);
      return null;
    }
  }

  // Save file record to database
  private async saveFileRecord(repositoryId: string, filePath: string, content: string, fileUrl: string): Promise<void> {
    const fileSize = Buffer.byteLength(content, 'utf8');
    const fileName = filePath.split('/').pop() || filePath;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    // Determine file type and language
    const fileType = this.getFileType(fileExtension);
    const language = this.getLanguage(fileExtension);

    await prisma.repositoryFile.upsert({
      where: {
        repositoryId_path: {
          repositoryId: repositoryId,
          path: filePath
        }
      },
      update: {
        size: fileSize,
        language: language,
        fileUrl: fileUrl,
        updatedAt: new Date()
      },
      create: {
        repositoryId: repositoryId,
        path: filePath,
        name: fileName,
        type: fileType,
        size: fileSize,
        language: language,
        fileUrl: fileUrl
      }
    });
  }

  // Generate embeddings for file
  private async generateEmbeddings(repository: any, filePath: string, content: string): Promise<void> {
    try {
      const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
      
      const response = await fetch(`${pythonWorkerUrl}/api/generate-embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository_id: repository.id,
          file_path: filePath,
          content: content,
          metadata: {
            full_name: repository.fullName,
            language: this.getLanguage(filePath.split('.').pop()?.toLowerCase() || '')
          }
        })
      });

      if (!response.ok) {
        console.error(`Embedding generation failed for ${filePath}: ${response.status}`);
        return;
      }

      console.log(`Generated embeddings for ${filePath}`);
    } catch (error) {
      console.error(`Error generating embeddings for ${filePath}:`, error);
    }
  }

  // Handle file removal
  private async handleFileRemoval(repository: any, filePath: string): Promise<void> {
    console.log(`Handling removal of file: ${filePath}`);
    
    // Remove from database
    await prisma.repositoryFile.deleteMany({
      where: {
        repositoryId: repository.id,
        path: filePath
      }
    });

    // Optionally remove from B2 and embeddings
    try {
      const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
      
      await fetch(`${pythonWorkerUrl}/api/remove-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository_id: repository.id,
          file_path: filePath
        })
      });
    } catch (error) {
      console.error(`Error removing file from B2/embeddings: ${error}`);
    }
  }

  // Utility methods
  private getFileType(extension: string): string {
    const codeExtensions = ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb'];
    const markupExtensions = ['html', 'xml', 'jsx', 'tsx', 'vue'];
    const dataExtensions = ['json', 'yaml', 'yml', 'csv', 'sql'];
    const docExtensions = ['md', 'txt', 'rst', 'adoc'];

    if (codeExtensions.includes(extension)) return 'code';
    if (markupExtensions.includes(extension)) return 'markup';
    if (dataExtensions.includes(extension)) return 'data';
    if (docExtensions.includes(extension)) return 'documentation';
    return 'other';
  }

  private getLanguage(extension: string): string | null {
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'html': 'html',
      'css': 'css',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'vue': 'vue',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql'
    };

    return languageMap[extension] || null;
  }
}

export default WebhookBackgroundProcessor;
