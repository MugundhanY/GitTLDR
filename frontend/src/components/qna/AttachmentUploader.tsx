'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  PaperClipIcon, 
  XMarkIcon, 
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { QuestionAttachment, AttachmentUploaderProps } from '@/types/attachments';

type AttachmentWithClientKey = QuestionAttachment & { clientKey: string };

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  attachments,
  onAttachmentsChange,
  disabled = false,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedFileTypes = [
    'image/*',
    'text/*',
    '.pdf',
    '.doc',
    '.docx',
    '.json',
    '.csv',
    '.md',
    '.yml',
    '.yaml'
  ],
  repositoryId,
  onUploadingChange
}) => {
  const [uploading, setUploading] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ [key: string]: File }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
    // Unique key generator with timestamp, counter, and multiple random elements
  const generateUniqueKey = (() => {
    let counter = 0;
    return (prefix: string = 'attachment') => {
      counter++;
      const timestamp = Date.now();
      const performanceNow = performance.now().toString().replace('.', '');
      const uuid = crypto.randomUUID();
      const randomStr = Math.random().toString(36).substring(2, 15);
      return `${prefix}-${timestamp}-${counter}-${performanceNow}-${uuid}-${randomStr}`;
    };
  })();  

  useEffect(() => {
    if (typeof onUploadingChange === 'function') {
      onUploadingChange(uploading.length > 0);
    }
  }, [uploading, onUploadingChange]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const getFileIcon = (fileType: string, fileName?: string) => {
    const ext = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
    if (fileType.startsWith('image/') || ['jpg','jpeg','png','gif','bmp','svg','webp'].includes(ext || '')) {
      return <PhotoIcon className="h-5 w-5 text-purple-500" />;
    }
    if (fileType === 'application/pdf' || ext === 'pdf') {
      return <DocumentIcon className="h-5 w-5 text-red-500" />;
    }
    if (fileType.includes('json') || ext === 'json') {
      return <DocumentTextIcon className="h-5 w-5 text-orange-500" />;
    }
    if (fileType.includes('csv') || ext === 'csv') {
      return <DocumentChartBarIcon className="h-5 w-5 text-green-500" />;
    }
    if (fileType.includes('text') || ext === 'txt') {
      return <DocumentTextIcon className="h-5 w-5 text-blue-400" />;
    }
    if (ext === 'md') {
      return <DocumentTextIcon className="h-5 w-5 text-pink-500" />;
    }
    if (['doc','docx'].includes(ext || '')) {
      return <DocumentArrowDownIcon className="h-5 w-5 text-indigo-500" />;
    }
    if (['ppt','pptx'].includes(ext || '')) {
      return <DocumentIcon className="h-5 w-5 text-orange-400" />;
    }
    if (['xls','xlsx'].includes(ext || '')) {
      return <DocumentChartBarIcon className="h-5 w-5 text-lime-500" />;
    }
    if (['zip','rar','7z','tar','gz'].includes(ext || '')) {
      return <DocumentIcon className="h-5 w-5 text-gray-500" />;
    }
    if (['mp3','wav','ogg','flac'].includes(ext || '')) {
      return <DocumentIcon className="h-5 w-5 text-amber-500" />;
    }
    if (['mp4','mov','avi','mkv','webm'].includes(ext || '')) {
      return <DocumentIcon className="h-5 w-5 text-cyan-500" />;
    }
    if ([
      'js','ts','jsx','tsx','py','java','cpp','c','cs','go','rb','php','swift','sh','bat','pl','rs','kt','scala','dart','lua','r','m','vb','groovy','asm','sql','html','css','scss','less','xml','json5','yml','yaml'
    ].includes(ext || '')) {
      return <DocumentTextIcon className="h-5 w-5 text-emerald-500" />;
    }
    return <DocumentIcon className="h-5 w-5 text-slate-500" />;
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`;
    }

    // Check file type
    const isAccepted = acceptedFileTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return `File type not supported. Accepted types: ${acceptedFileTypes.join(', ')}`;
    }

    return null;
  };  const uploadFile = async (file: File): Promise<QuestionAttachment> => {
    try {      // Step 1: Get pre-signed upload URL
      const uploadUrlResponse = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          repositoryId: repositoryId
        }),      });

      if (!uploadUrlResponse.ok) {
        let errorMessage = 'Failed to get upload URL';
        try {
          const error = await uploadUrlResponse.json();
          errorMessage = error.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text
          errorMessage = uploadUrlResponse.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const uploadUrlData = await uploadUrlResponse.json();
      console.log('Upload URL data:', uploadUrlData);      let uploadSuccess = false;
      let uploadResult: any = null;

      // Step 2a: Try direct upload to B2 first
      try {
        console.log('Attempting direct upload to B2:', uploadUrlData.uploadUrl);
        
        // Calculate SHA1 hash for the file
        const fileBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-1', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha1Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log('Upload headers:', {
          'Authorization': uploadUrlData.authorizationToken ? 'Present' : 'Missing',
          'Content-Type': file.type,
          'X-Bz-File-Name': encodeURIComponent(uploadUrlData.fileName),
          'X-Bz-Content-Sha1': sha1Hash
        });
        
        const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': uploadUrlData.authorizationToken,
            'Content-Type': file.type,
            'X-Bz-File-Name': encodeURIComponent(uploadUrlData.fileName),
            'X-Bz-Content-Sha1': sha1Hash
          },
          body: file,
        });

        if (uploadResponse.ok) {
          console.log('Direct B2 upload successful');
          uploadSuccess = true;        uploadResult = {
          fileName: uploadUrlData.fileName,
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          downloadUrl: uploadUrlData.downloadUrl,
          fileKey: uploadUrlData.fileName,
          repositoryId: repositoryId,
          attachmentId: uploadUrlData.attachmentId
        };

        } else {
          const errorText = await uploadResponse.text();
          console.error('Direct B2 upload failed:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            errorText,
            headers: Object.fromEntries(uploadResponse.headers.entries())
          });
          throw new Error(`Direct upload failed: ${uploadResponse.status} - ${errorText}`);
        }
      } catch (directUploadError) {
        console.warn('Direct B2 upload failed, trying fallback:', directUploadError);
        
        // Step 2b: Fallback to server-side upload
        try {
          const fallbackFormData = new FormData();
          fallbackFormData.append('file', file);
          fallbackFormData.append('repositoryId', repositoryId || '');

          const fallbackResponse = await fetch('/api/attachments/upload-fallback', {
            method: 'POST',
            body: fallbackFormData,
          });

          if (fallbackResponse.ok) {
            console.log('Fallback server upload successful');
            uploadResult = await fallbackResponse.json();
            uploadSuccess = true;          } else {
            let errorMessage = 'Fallback upload failed';
            try {
              const errorData = await fallbackResponse.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = fallbackResponse.statusText || errorMessage;
            }
            throw new Error(errorMessage);
          }
        } catch (fallbackError) {
          throw new Error(`Both direct and fallback uploads failed. Direct: ${directUploadError}. Fallback: ${fallbackError}`);
        }
      }      if (!uploadSuccess || !uploadResult) {
        throw new Error('Upload failed');
      }

      // Return the attachment data - no need to store metadata again since 
      // /api/attachments/upload already created the database record
      return {
        id: uploadResult.attachmentId,
        fileName: uploadResult.fileName,
        originalFileName: uploadResult.originalFileName,
        fileSize: uploadResult.fileSize,
        fileType: uploadResult.fileType,
        uploadUrl: uploadResult.downloadUrl,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    await processFiles(files);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);

    if (disabled) return;

    const files = Array.from(event.dataTransfer.files);
    await processFiles(files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    // Only set drag inactive if we're leaving the component entirely
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragActive(false);
    }
  };

  // Track cancelled pending uploads
  const cancelledUploadsRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0); // Forcing re-render if needed

  const removeAttachment = (key: string, isPending: boolean) => {
    if (isPending) {
      setPendingFiles(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setUploading(prev => prev.filter(id => id !== key));
      cancelledUploadsRef.current.add(key);
      return;
    }
    // Uploaded file: use id
    const updated = attachments.filter(att => att.id !== key);
    onAttachmentsChange(updated);
  };

  const addUploadedAttachment = (attachment: AttachmentWithClientKey) => {
    if (cancelledUploadsRef.current.has(attachment.clientKey)) {
      return;
    }
    // Only pass QuestionAttachment fields to parent
    const { clientKey, ...rest } = attachment;
    onAttachmentsChange([...attachments, rest]);
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (attachments.length + files.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }
    setUploadError(null);
    const validFiles = files.filter(file => {
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) {
      return;
    }
    const tempIds = validFiles.map(() => `temp-${crypto.randomUUID()}`);
    setPendingFiles(prev => {
      const next = { ...prev };
      validFiles.forEach((file, idx) => {
        next[tempIds[idx]] = file;
      });
      return next;
    });
    setUploading(prev => [...prev, ...tempIds]);
    const uploadPromises = validFiles.map(file => uploadFile(file));
    const results = await Promise.allSettled(uploadPromises);
    setUploading(prev => prev.filter(id => !tempIds.includes(id)));
    setPendingFiles(prev => {
      const next = { ...prev };
      tempIds.forEach(id => { delete next[id]; });
      return next;
    });
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        // Use tempId as clientKey for the uploaded file (preserve for removal)
        const uploaded = { ...result.value, clientKey: tempIds[idx] };
        addUploadedAttachment(uploaded);
      }
    });
    // ...existing code for error handling...
  };

  const clearAllAttachments = () => {
    setPendingFiles({});
    setUploading([]);
    onAttachmentsChange([]);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  return (
    <div className="space-y-3">
      {/* Drag and Drop Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105' 
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }
          ${disabled ? 'pointer-events-none opacity-50' : ''}
        `}
        onClick={handleButtonClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Remove uploading message block entirely, always show drag-and-drop UI */}
        <div className="space-y-3">
          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-all duration-200 ${
            isDragActive 
              ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' 
              : 'bg-slate-100 dark:bg-slate-800'
          }`}>
            <ArrowUpTrayIcon className={`w-6 h-6 transition-colors duration-200 ${
              isDragActive 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-slate-600 dark:text-slate-400'
            }`} />
          </div>
          
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Max {maxFiles} files, up to {formatFileSize(maxFileSize)} each
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Supported: {acceptedFileTypes.slice(0, 3).join(', ')}{acceptedFileTypes.length > 3 ? `, +${acceptedFileTypes.length - 3} more` : ''}
            </p>
          </div>
        </div>

        {/* Visual feedback overlay for drag state */}
        {isDragActive && (
          <div className="absolute inset-0 bg-blue-500/10 rounded-lg pointer-events-none" />
        )}
      </div>      {/* Upload Error */}
      {uploadError && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{uploadError}</span>
        </div>
      )}      {/* Attached Files */}
      {(Object.keys(pendingFiles).length > 0 || attachments.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Attached Files ({attachments.length + Object.keys(pendingFiles).length}/{maxFiles})
            </p>
            {(attachments.length > 0 || Object.keys(pendingFiles).length > 0) && (
              <button
                type="button"
                onClick={clearAllAttachments}
                className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {[
              ...Object.entries(pendingFiles)
                .filter(([clientKey]) => !cancelledUploadsRef.current.has(clientKey))
                .map(([clientKey, file]) => ({
                  key: clientKey,
                  removeKey: clientKey,
                  isPending: true,
                  originalFileName: file.name,
                  fileName: '',
                  fileSize: file.size,
                  fileType: file.type,
                  id: '',
                  uploadUrl: '',
                  createdAt: '',
                  isUploading: true,
                })),
              ...attachments
                .filter((attachment, index, array) =>
                  array.findIndex(a => a.id === attachment.id) === index &&
                  !cancelledUploadsRef.current.has(attachment.id)
                )
                .map((attachment, idx) => ({
                  ...attachment,
                  key: attachment.id || `uploaded-${idx}`,
                  removeKey: attachment.id,
                  isPending: false,
                  isUploading: false
                }))
            ].map((attachment, idx) => {
              const isUploading = attachment.isUploading;
              const isPending = attachment.isPending;
              return (
                <div
                  key={attachment.key || idx}
                  className="group flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {getFileIcon(attachment.fileType, attachment.originalFileName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {attachment.originalFileName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        {attachment.fileSize > 0 && `${formatFileSize(attachment.fileSize)} • ${attachment.fileType.split('/')[1]?.toUpperCase() || 'File'}`}
                        {isUploading && (
                          <span className="inline-flex items-center gap-1 text-blue-500 ml-2">
                            <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                            Uploading
                          </span>
                        )}
                        {!isUploading && attachment.fileSize > 0 && (
                          <span className="inline-flex items-center gap-1 text-green-500 ml-2">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            Uploaded
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.removeKey, isPending)}
                    disabled={disabled}
                    className={`ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-md opacity-100`}
                    title="Remove file"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;