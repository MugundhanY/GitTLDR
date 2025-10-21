export interface QuestionAttachment {
  id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  fileType: string;
  uploadUrl: string;
  backblazeFileId?: string;
  createdAt: string;
  questionId?: string;
}

export interface AttachmentUploaderProps {
  attachments: QuestionAttachment[];
  onAttachmentsChange: (attachments: QuestionAttachment[] | ((prev: QuestionAttachment[]) => QuestionAttachment[])) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
  repositoryId: string;
  onUploadingChange?: (uploading: boolean) => void;
}