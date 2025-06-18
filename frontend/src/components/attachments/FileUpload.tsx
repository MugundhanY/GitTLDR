'use client'

import { useState, useRef } from 'react'
import { toast } from 'react-toastify'

interface FileUploadProps {
  repositoryId?: string
  onUploadComplete?: (fileInfo: any) => void
  maxFileSize?: number // in bytes
  allowedTypes?: string[]
  className?: string
}

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export default function FileUpload({
  repositoryId,
  onUploadComplete,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
    'application/json', 'application/xml',
    'text/javascript', 'text/typescript', 'text/html', 'text/css',
    'application/javascript', 'application/typescript',
    'application/zip', 'application/x-zip-compressed'
  ],
  className = ''
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`
    }

    if (!allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed`
    }

    return null
  }

  const uploadFileToB2 = async (file: File, uploadUrl: string, authToken: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100)
          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percentage
          })
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Upload failed due to network error'))
      }

      xhr.open('POST', uploadUrl)
      xhr.setRequestHeader('Authorization', authToken)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(file.name))
      xhr.setRequestHeader('X-Bz-Content-Sha1', 'unverified') // For simplicity, use unverified

      xhr.send(file)
    })
  }

  const handleFile = async (file: File) => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsUploading(true)
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 })

    try {
      // Step 1: Get upload URL from our API
      toast.info('Preparing upload...')
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
      
      // Step 2: Upload directly to B2
      toast.info('Uploading file...')
      
      await uploadFileToB2(file, uploadData.uploadUrl, uploadData.authorizationToken)

      // Step 3: Notify completion
      toast.success(`File "${file.name}" uploaded successfully!`)
      
      if (onUploadComplete) {
        onUploadComplete({
          fileName: uploadData.fileName,
          fileId: uploadData.fileId,
          downloadUrl: uploadData.downloadUrl,
          contentType: file.type,
          fileSize: file.size,
          originalFileName: file.name,
          metadata: uploadData.metadata
        })
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)

    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
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

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
        accept={allowedTypes.join(',')}
      />

      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Uploading...
              </p>
              {uploadProgress && (
                <div className="mt-2">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {uploadProgress.percentage}% - {Math.round(uploadProgress.loaded / 1024)} KB / {Math.round(uploadProgress.total / 1024)} KB
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Drop files here or <span className="text-blue-600 dark:text-blue-400">browse</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Max {Math.round(maxFileSize / (1024 * 1024))}MB • {allowedTypes.length} supported formats
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
