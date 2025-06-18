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
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface FileUploadProps {
  repositoryId?: string
  onUploadComplete?: (fileInfo: any[]) => void
  maxFileSize?: number // in bytes
  allowedTypes?: string[]
  maxFiles?: number
  className?: string
  multiple?: boolean
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

export default function EnhancedFileUpload({
  repositoryId,
  onUploadComplete,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
    'application/json', 'application/xml',
    'text/javascript', 'text/typescript', 'text/html', 'text/css',
    'application/javascript', 'application/typescript',
    'application/zip', 'application/x-zip-compressed'
  ],
  maxFiles = 10,
  className = '',
  multiple = true
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [completedUploads, setCompletedUploads] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (fileType.includes('csv') || fileName.endsWith('.csv')) {
      return <DocumentIcon className="w-5 h-5 text-green-500" />
    }
    return <DocumentIcon className="w-5 h-5 text-slate-500" />
  }

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`
    }

    const isTypeAllowed = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase())
      }
      if (type.includes('*')) {
        const baseType = type.split('/')[0]
        return file.type.startsWith(baseType)
      }
      return file.type === type
    })

    if (!isTypeAllowed) {
      return `File type "${file.type}" is not allowed`
    }

    return null
  }

  const uploadFileToB2 = async (file: File, progressId: string): Promise<any> => {
    try {      // Step 1: Get upload URL from our API
      const uploadUrlResponse = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          repositoryId
        }),
      })

      if (!uploadUrlResponse.ok) {
        const error = await uploadUrlResponse.json()
        throw new Error(error.error || 'Failed to get upload URL')
      }

      const uploadData = await uploadUrlResponse.json()
      
      // Step 2: Upload directly to B2 with progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Track upload progress
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
            resolve({
              fileName: uploadData.fileName,
              fileId: uploadData.fileId,
              downloadUrl: uploadData.downloadUrl,
              contentType: file.type,
              fileSize: file.size,
              originalFileName: file.name,
              metadata: uploadData.metadata
            })
          } else {
            setUploadProgress(prev => prev.map(item => 
              item.id === progressId 
                ? { ...item, status: 'error' as const, error: `Upload failed (${xhr.status})` }
                : item
            ))
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }

        xhr.onerror = () => {
          setUploadProgress(prev => prev.map(item => 
            item.id === progressId 
              ? { ...item, status: 'error' as const, error: 'Network error' }
              : item
          ))
          reject(new Error('Upload failed due to network error'))
        }

        xhr.open('POST', uploadData.uploadUrl)
        xhr.setRequestHeader('Authorization', uploadData.authorizationToken)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(file.name))
        xhr.setRequestHeader('X-Bz-Content-Sha1', 'unverified')

        xhr.send(file)
      })
    } catch (error) {
      setUploadProgress(prev => prev.map(item => 
        item.id === progressId 
          ? { ...item, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
          : item
      ))
      throw error
    }
  }

  const processFiles = useCallback(async (files: File[]) => {
    if (!multiple && files.length > 1) {
      toast.error('Multiple files not allowed')
      return
    }

    if (files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate all files first
    for (const file of files) {
      const validationError = validateFile(file)
      if (validationError) {
        toast.error(validationError)
        return
      }
    }

    setIsUploading(true)
    
    // Initialize progress tracking for all files
    const initialProgress = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      loaded: 0,
      total: file.size,
      percentage: 0,
      status: 'uploading' as const
    }))
    
    setUploadProgress(initialProgress)

    try {
      // Upload all files concurrently
      const uploadPromises = files.map((file, index) => 
        uploadFileToB2(file, initialProgress[index].id)
      )

      const results = await Promise.allSettled(uploadPromises)
      
      const successful = results
        .filter((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Upload failed for ${files[index].name}:`, result.reason)
            return false
          }
          return true
        })
        .map(result => (result as PromiseFulfilledResult<any>).value)

      if (successful.length > 0) {
        setCompletedUploads(prev => [...prev, ...successful])
        toast.success(`Successfully uploaded ${successful.length} file${successful.length > 1 ? 's' : ''}!`)
        
        if (onUploadComplete) {
          onUploadComplete(successful)
        }
      }

      if (successful.length < files.length) {
        toast.error(`${files.length - successful.length} file${files.length - successful.length > 1 ? 's' : ''} failed to upload`)
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
      // Clear progress after a delay
      setTimeout(() => setUploadProgress([]), 3000)
    }
  }, [multiple, maxFiles, onUploadComplete, repositoryId])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)

    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDragIn = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(true)
  }

  const handleDragOut = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)
  }

  const removeCompletedUpload = (index: number) => {
    setCompletedUploads(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllUploads = () => {
    setCompletedUploads([])
    setUploadProgress([])
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
        accept={allowedTypes.join(',')}
        multiple={multiple}
      />

      {/* Main Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ease-in-out transform
          ${dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105 shadow-lg' 
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }
          ${isUploading ? 'pointer-events-none opacity-75' : ''}
        `}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
      >
        <div className="space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
            dragActive 
              ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' 
              : 'bg-slate-100 dark:bg-slate-800'
          }`}>
            {isUploading ? (
              <CloudArrowUpIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : (
              <ArrowUpTrayIcon className={`w-8 h-8 transition-colors duration-300 ${
                dragActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400'
              }`} />
            )}
          </div>
          
          <div>
            <p className={`text-lg font-medium transition-colors duration-300 ${
              dragActive 
                ? 'text-blue-700 dark:text-blue-300' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {isUploading 
                ? 'Uploading files...' 
                : dragActive 
                  ? 'Drop files here to upload' 
                  : 'Drop files here or click to browse'
              }
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {multiple ? `Up to ${maxFiles} files, ` : 'Single file, '}
              max {formatFileSize(maxFileSize)} each
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Supported: Images, Documents, Text files, JSON, CSV
            </p>
          </div>
        </div>

        {/* Visual feedback overlay */}
        {dragActive && (
          <div className="absolute inset-0 bg-blue-500/10 rounded-xl pointer-events-none animate-pulse" />
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Upload Progress
          </h4>
          {uploadProgress.map((progress) => (
            <div key={progress.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {progress.status === 'success' ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ) : progress.status === 'error' ? (
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                  ) : (
                    <CloudArrowUpIcon className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {progress.name}
                  </span>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {progress.percentage}%
                </span>
              </div>
              
              {progress.status === 'error' && progress.error && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">{progress.error}</p>
              )}
              
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress.status === 'success' ? 'bg-green-500' :
                    progress.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Uploads */}
      {completedUploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Uploaded Files ({completedUploads.length})
            </h4>
            <button
              onClick={clearAllUploads}
              className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {completedUploads.map((upload, index) => (
              <div
                key={upload.fileId || `${upload.fileName}-${upload.originalFileName}-${index}`}
                className="group flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {getFileIcon(upload.originalFileName, upload.contentType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {upload.originalFileName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(upload.fileSize)} • Upload complete
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeCompletedUpload(index)}
                  className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 rounded-md opacity-0 group-hover:opacity-100"
                  title="Remove"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
