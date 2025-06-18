'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'react-toastify'
import { 
  ArrowUpTrayIcon, 
  DocumentIcon, 
  PhotoIcon, 
  XMarkIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { QuestionAttachment } from '@/types/attachments'

interface AttachmentManagerProps {
  attachments: QuestionAttachment[]
  onAttachmentsChange: (attachments: QuestionAttachment[]) => void
  repositoryId: string
  userId: string
  disabled?: boolean
  maxFiles?: number
  maxFileSize?: number
  className?: string
}

interface UploadProgress {
  id: string
  name: string
  loaded: number
  total: number
  percentage: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

export default function AttachmentManager({
  attachments,
  onAttachmentsChange,
  repositoryId,
  userId,
  disabled = false,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  className = ''
}: AttachmentManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
    'application/json', 'application/xml',
    'text/javascript', 'text/typescript', 'text/html', 'text/css',
    'application/javascript', 'application/typescript'
  ]

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string, fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <PhotoIcon className="w-5 h-5 text-purple-500" />
    }
    if (fileType === 'application/pdf') {
      return <DocumentIcon className="w-5 h-5 text-red-500" />
    }
    if (fileType.includes('json') || fileName.endsWith('.json')) {
      return <DocumentIcon className="w-5 h-5 text-orange-500" />
    }
    if (fileType.includes('text') || fileName.endsWith('.md') || fileName.endsWith('.txt')) {
      return <DocumentIcon className="w-5 h-5 text-blue-500" />
    }
    return <DocumentIcon className="w-5 h-5 text-slate-500" />
  }

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`
    }

    if (!allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed`
    }

    return null
  }

  const uploadFile = async (file: File): Promise<QuestionAttachment> => {
    const progressId = Date.now().toString() + Math.random().toString(36)
    
    // Add to upload progress
    setUploadProgress(prev => [...prev, {
      id: progressId,
      name: file.name,
      loaded: 0,
      total: file.size,
      percentage: 0,
      status: 'uploading'
    }])

    try {
      // Step 1: Get upload URL from Python worker
      const pythonWorkerUrl = process.env.NEXT_PUBLIC_PYTHON_WORKER_URL || 'http://localhost:8001'
      const uploadUrlResponse = await fetch(`${pythonWorkerUrl}/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          user_id: userId,
          repository_id: repositoryId
        })
      })

      if (!uploadUrlResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const uploadData = await uploadUrlResponse.json()

      // Step 2: Upload file to B2 with progress tracking
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(prev => prev.map(item => 
              item.id === progressId 
                ? { ...item, loaded: event.loaded, total: event.total, percentage }
                : item
            ))
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            setUploadProgress(prev => prev.map(item => 
              item.id === progressId 
                ? { ...item, status: 'success' as const, percentage: 100 }
                : item
            ))
            resolve(uploadData)
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }

        xhr.onerror = () => {
          reject(new Error('Network error during upload'))
        }

        xhr.open('POST', uploadData.upload_url)
        xhr.setRequestHeader('Authorization', uploadData.authorization_token)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(uploadData.file_name))
        xhr.setRequestHeader('X-Bz-Content-Sha1', 'unverified')

        xhr.send(file)
      })

      // Step 3: Create attachment record via our API
      const attachmentResponse = await fetch('/api/attachments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uploadData.file_name,
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadUrl: uploadData.download_url,
          backblazeFileId: uploadData.file_name,
          repositoryId,
          userId
        })
      })

      if (!attachmentResponse.ok) {
        throw new Error('Failed to create attachment record')
      }

      const attachment = await attachmentResponse.json()
      
      // Remove from upload progress
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(item => item.id !== progressId))
      }, 2000)

      return attachment

    } catch (error) {
      setUploadProgress(prev => prev.map(item => 
        item.id === progressId 
          ? { ...item, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
          : item
      ))
      throw error
    }
  }

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    if (attachments.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate all files first
    const validationErrors: string[] = []
    fileArray.forEach((file, index) => {
      const error = validateFile(file)
      if (error) {
        validationErrors.push(`${file.name}: ${error}`)
      }
    })

    if (validationErrors.length > 0) {
      toast.error(validationErrors.join('\n'))
      return
    }

    setIsUploading(true)

    try {
      const uploadPromises = fileArray.map(file => uploadFile(file))
      const uploadedFiles = await Promise.allSettled(uploadPromises)
      
      const successfulUploads: QuestionAttachment[] = []
      const failedUploads: string[] = []

      uploadedFiles.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value)
        } else {
          failedUploads.push(`${fileArray[index].name}: ${result.reason?.message || 'Upload failed'}`)
        }
      })

      if (successfulUploads.length > 0) {
        onAttachmentsChange([...attachments, ...successfulUploads])
        toast.success(`${successfulUploads.length} file(s) uploaded successfully`)
      }

      if (failedUploads.length > 0) {
        toast.error(`Failed uploads:\n${failedUploads.join('\n')}`)
      }

    } catch (error) {
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [attachments, onAttachmentsChange, maxFiles, repositoryId, userId])

  const removeAttachment = (attachmentToRemove: QuestionAttachment) => {
    onAttachmentsChange(attachments.filter(att => att.id !== attachmentToRemove.id))
  }
  const getSecureDownloadUrl = async (attachment: QuestionAttachment): Promise<string> => {
    try {
      const response = await fetch('/api/attachments/secure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: attachment.id,
          userId: userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const data = await response.json()
      return data.downloadUrl
    } catch (error) {
      toast.error('Failed to get download URL')
      throw error
    }
  }

  const handleViewFile = async (attachment: QuestionAttachment) => {
    try {
      const downloadUrl = await getSecureDownloadUrl(attachment)
      window.open(downloadUrl, '_blank')
    } catch (error) {
      // Error already handled in getSecureDownloadUrl
    }
  }

  const handleDownloadFile = async (attachment: QuestionAttachment) => {
    try {
      const downloadUrl = await getSecureDownloadUrl(attachment)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = attachment.originalFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      // Error already handled in getSecureDownloadUrl
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled || isUploading) return
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [disabled, isUploading, handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files)
    }
  }, [handleFileSelect])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        <CloudArrowUpIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-300 mb-2">
          {isUploading ? 'Uploading files...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Max {formatFileSize(maxFileSize)} per file • Up to {maxFiles} files
        </p>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((progress) => (
            <div key={progress.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {progress.name}
                </span>
                <span className="text-xs text-slate-500">
                  {progress.status === 'uploading' && `${progress.percentage}%`}
                  {progress.status === 'success' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                  {progress.status === 'error' && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                </span>
              </div>
              {progress.status === 'uploading' && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              )}
              {progress.status === 'error' && progress.error && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{progress.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attached Files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Attached Files ({attachments.length})
          </h4>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {getFileIcon(attachment.originalFileName, attachment.fileType)}
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {attachment.originalFileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(attachment.fileSize)} • {attachment.fileType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewFile(attachment)}
                    className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                    title="View file"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadFile(attachment)}
                    className="p-1 text-slate-500 hover:text-green-600 transition-colors"
                    title="Download file"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeAttachment(attachment)}
                    className="p-1 text-slate-500 hover:text-red-600 transition-colors"
                    title="Remove file"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
