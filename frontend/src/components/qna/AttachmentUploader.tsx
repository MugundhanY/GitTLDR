'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  PaperClipIcon, 
  XMarkIcon, 
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon
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
  repositoryId
}) => {
  const [internalAttachments, setInternalAttachments] = useState<AttachmentWithClientKey[]>([]);
  const [uploading, setUploading] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
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
  })();  useEffect(() => {
    console.log('AttachmentUploader useEffect triggered with attachments:', attachments.length);
    setInternalAttachments(currentInternal => {
      console.log('Current internal attachments:', currentInternal.length);
      
      // Handle explicit clearing - when parent passes empty array, clear internal state
      if (attachments.length === 0) {
        console.log('Clearing all attachments due to empty parent array');
        return [];
      }
      
      // Only process attachments that don't already exist in our internal state
      const existingIds = new Set(currentInternal.map(att => att.id).filter(Boolean));
      const newAttachments = attachments.filter(att => att.id && !existingIds.has(att.id));
      
      console.log('New attachments to add:', newAttachments.length);
      
      // If no new attachments and lengths match, keep current state unchanged
      if (newAttachments.length === 0 && currentInternal.length === attachments.length) {
        return currentInternal;
      }
      
      // Create new internal attachments only for new ones
      const newInternalAttachments = newAttachments.map((att, index) => ({
        ...att,
        clientKey: generateUniqueKey(att.id || 'external')
      }));
      
      // Merge existing and new attachments, ensuring no duplicates
      const merged = [...currentInternal, ...newInternalAttachments];
      const uniqueById = merged.reduce((acc, att) => {
        if (att.id && !acc.find(existing => existing.id === att.id)) {
          acc.push(att);
        } else if (!att.id) {
          // For attachments without ID (temp uploads), keep them all but ensure unique keys
          acc.push(att);
        }
        return acc;
      }, [] as AttachmentWithClientKey[]);
      
      console.log('Final unique attachments:', uniqueById.length);
      return uniqueById;
    });
  }, [attachments]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <PhotoIcon className="h-5 w-5 text-purple-500" />;
    }
    if (fileType === 'application/pdf') {
      return <DocumentIcon className="h-5 w-5 text-red-500" />;
    }
    if (fileType.includes('json')) {
      return <DocumentIcon className="h-5 w-5 text-orange-500" />;
    }
    if (fileType.includes('text') || fileType.includes('markdown')) {
      return <DocumentIcon className="h-5 w-5 text-blue-500" />;
    }
    if (fileType.includes('csv')) {
      return <DocumentIcon className="h-5 w-5 text-green-500" />;
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

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    if (internalAttachments.length + files.length > maxFiles) {
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
    setUploading(prev => [...prev, ...tempIds]);

    const uploadPromises = validFiles.map(file => uploadFile(file));

    const results = await Promise.allSettled(uploadPromises);

    setUploading(prev => prev.filter(id => !tempIds.includes(id)));    const newInternalAttachments: AttachmentWithClientKey[] = [];
    const failedUploads: string[] = [];    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        // Use index and additional random string to ensure absolute uniqueness
        const uniqueClientKey = generateUniqueKey(result.value.id || 'upload');
        console.log(`Creating attachment with key: ${uniqueClientKey}`);
        newInternalAttachments.push({
          ...result.value,
          clientKey: uniqueClientKey,
        });
      } else {
        console.error('Upload failed:', result.reason);
        if (result.reason instanceof Error) {
          failedUploads.push(result.reason.message);
        } else {
          failedUploads.push(String(result.reason));
        }
      }
    });

    if (failedUploads.length > 0) {
      setUploadError(`Failed to upload ${failedUploads.length} file(s). ${failedUploads[0]}`);
    }    if (newInternalAttachments.length > 0) {
      setInternalAttachments(prev => {
        // Ensure no duplicates by checking both ID and clientKey
        const existingIds = new Set(prev.map(att => att.id).filter(Boolean));
        const existingKeys = new Set(prev.map(att => att.clientKey));
        
        const filteredNew = newInternalAttachments.filter(newAtt => 
          !existingIds.has(newAtt.id) && !existingKeys.has(newAtt.clientKey)
        );
        
        const updated = [...prev, ...filteredNew];
        
        // Only call onAttachmentsChange if we actually added new attachments
        if (filteredNew.length > 0) {
          setTimeout(() => onAttachmentsChange(updated.map(({ clientKey, ...rest }) => rest)), 0);
        }
        
        return updated;
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (clientKeyToRemove: string) => {
    const attachmentToRemove = internalAttachments.find(att => att.clientKey === clientKeyToRemove);
    if (!attachmentToRemove || !attachmentToRemove.id) return;

    const originalAttachments = internalAttachments;

    setInternalAttachments(prev => prev.filter(att => att.clientKey !== clientKeyToRemove));

    fetch(`/api/attachments/${attachmentToRemove.id}`, {
      method: 'DELETE',
    })
    .then(response => {
      if (!response.ok) {
        console.error('Failed to delete attachment from server');
        setInternalAttachments(originalAttachments); // Revert on failure
      } else {
        // If successful, update the parent component
        const updated = originalAttachments.filter(att => att.clientKey !== clientKeyToRemove);
        setTimeout(() => onAttachmentsChange(updated.map(({ clientKey, ...rest }) => rest)), 0);
      }
    })
    .catch(error => {
      console.error('Error deleting attachment:', error);
      setInternalAttachments(originalAttachments); // Revert on error
    });
  };

  const clearAllAttachments = () => {
    const allAttachments = [...internalAttachments];
    setInternalAttachments([]);
    setTimeout(() => onAttachmentsChange([]), 0);

    allAttachments.forEach(attachment => {
      if (attachment.id) {
        fetch(`/api/attachments/${attachment.id}`, {
          method: 'DELETE',
        })
        .then(response => {
          if (!response.ok) {
            console.error(`Failed to delete attachment ${attachment.id}`);
            // Optionally, add it back to the list to show the user it failed
          }
        })
        .catch(error => {
          console.error(`Error deleting attachment ${attachment.id}:`, error);
        });
      }
    });
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
          ${uploading.length > 0 ? 'pointer-events-none opacity-75' : ''}
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

        {uploading.length > 0 ? (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <CloudArrowUpIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Uploading {uploading.length} file{uploading.length > 1 ? 's' : ''}...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Please wait while your files are being uploaded
              </p>
            </div>
          </div>
        ) : (
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
              <p className={`text-sm font-medium transition-colors duration-200 ${
                isDragActive 
                  ? 'text-blue-700 dark:text-blue-300' 
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {isDragActive 
                  ? 'Drop files here to upload' 
                  : 'Drop files here or click to browse'
                }
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Max {maxFiles} files, up to {formatFileSize(maxFileSize)} each
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Supported: {acceptedFileTypes.slice(0, 3).join(', ')}{acceptedFileTypes.length > 3 ? `, +${acceptedFileTypes.length - 3} more` : ''}
              </p>
            </div>
          </div>
        )}

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
      {internalAttachments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Attached Files ({internalAttachments.length}/{maxFiles})
            </p>
            {internalAttachments.length > 0 && (
              <button
                type="button"
                onClick={clearAllAttachments}
                className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>          <div className="grid gap-2">
            {internalAttachments
              .filter((attachment, index, array) => 
                // Remove duplicates by clientKey - keep only the first occurrence
                array.findIndex(a => a.clientKey === attachment.clientKey) === index
              )
              .map((attachment) => (
              <div
                key={attachment.clientKey}
                className="group flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {getFileIcon(attachment.fileType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {attachment.originalFileName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(attachment.fileSize)} • {attachment.fileType.split('/')[1]?.toUpperCase() || 'File'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.clientKey)}
                  disabled={disabled}
                  className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-md opacity-0 group-hover:opacity-100"
                  title="Remove file"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;