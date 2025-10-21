'use client'

import { useState } from 'react'
import { 
  PaperClipIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import AttachmentPreviewModal from './AttachmentPreviewModal' // Import the modal

interface Attachment {
  id: string
  fileName: string
  originalFileName: string
  fileSize: number
  fileType: string
  uploadUrl: string
  backblazeFileId?: string
  createdAt: string
}

interface AttachmentDisplayProps {
  attachments: Attachment[]
  className?: string
  onRemoveAttachment?: (attachmentId: string) => void
}

const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({ 
  attachments, 
  className = '', 
  onRemoveAttachment 
}) => {  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(true)
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Generate consistent key for attachment
  const getAttachmentKey = (attachment: Attachment, index: number) => {
    return attachment.id || `attachment-${index}-${attachment.fileName || 'unknown'}`
  }

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase()
    
    if (type.startsWith('image/')) {
      return <PhotoIcon className="w-5 h-5 text-green-500" />
    } else if (type.startsWith('video/')) {
      return <VideoCameraIcon className="w-5 h-5 text-purple-500" />
    } else if (type.startsWith('audio/')) {
      return <MusicalNoteIcon className="w-5 h-5 text-blue-500" />
    } else if (type.includes('pdf')) {
      return <DocumentIcon className="w-5 h-5 text-red-500" />
    } else if (type.includes('spreadsheetml') || type.includes('ms-excel')) {
      return <DocumentIcon className="w-5 h-5 text-emerald-500" />
    } else if (type.includes('text') || type.includes('code')) {
      return <CodeBracketIcon className="w-5 h-5 text-gray-500" />
    } else if (type.includes('zip') || type.includes('archive')) {
      return <ArchiveBoxIcon className="w-5 h-5 text-yellow-500" />
    } else {
      return <DocumentIcon className="w-5 h-5 text-gray-500" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Check if file can be previewed
  const canPreview = (fileType: string): boolean => {
    const type = fileType.toLowerCase()
    return type.startsWith('image/') || 
           type.includes('pdf') || 
           type.startsWith('text/') ||
           type.includes('json') ||
           type.includes('xml') ||
           type.includes('csv')  // Enable CSV preview
  }
  
  // Get secure download URL
  const getSecureDownloadUrl = async (attachment: Attachment) => {
    const response = await fetch('/api/attachments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get-download-url',
        fileId: attachment.id,
        fileName: attachment.originalFileName
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Use download_url, uploadUrl, or the generated secure URL
    return data.download_url || data.downloadUrl || data.uploadUrl || attachment.uploadUrl;
  };  // Handle file download
  const handleDownload = async (attachment: Attachment, index: number) => {
    const attachmentKey = getAttachmentKey(attachment, index)
    if (downloadingFiles.has(attachmentKey)) return

    setDownloadingFiles(prev => new Set(prev).add(attachmentKey))

    try {
      const downloadUrl = await getSecureDownloadUrl(attachment);
      
      // Create a temporary link to trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = attachment.originalFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading file:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to download file'
      alert(`Download failed: ${errorMessage}. Please try again.`)
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(attachmentKey)
        return newSet
      })
    }
  }// Handle file preview
  const handlePreview = async (attachment: Attachment) => {
    setPreviewLoading(true)
    setPreviewError(null)
    
    try {
      // Add timeout to prevent indefinite loading
      const downloadUrl = await Promise.race([
        getSecureDownloadUrl(attachment),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000) // 30 second timeout
        )
      ])
      
      setPreviewAttachment({ ...attachment, downloadUrl })
    } catch (error) {
      console.error('Error previewing file:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Set user-friendly error message
      if (errorMessage === 'Timeout') {
        setPreviewError('⏱️ Preview is taking too long. Try downloading the file instead.')
      } else if (errorMessage.includes('HTTP 404')) {
        setPreviewError('📁 File not found. It may have been deleted.')
      } else if (errorMessage.includes('HTTP 403')) {
        setPreviewError('🔒 Access denied. You may not have permission to view this file.')
      } else {
        setPreviewError(`❌ Failed to load preview: ${errorMessage}`)
      }
      
      // Show error for 5 seconds
      setTimeout(() => setPreviewError(null), 5000)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewAttachment(null)
    setPreviewError(null)
  }

  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <div 
          className="flex items-center justify-between gap-2 cursor-pointer p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <PaperClipIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Attachments ({attachments.length})
            </h6>
          </div>
          <button 
            className="p-1 rounded-full"
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-slate-500" /> : <ChevronDownIcon className="w-5 h-5 text-slate-500" />}
          </button>
        </div>

        {isExpanded && (
          <div className="pl-5 space-y-3">            <div className="grid grid-cols-1 gap-2">
              {attachments.map((attachment, index) => (
                <div
                  key={getAttachmentKey(attachment, index)}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(attachment.fileType)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {attachment.originalFileName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatFileSize(attachment.fileSize)}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(attachment.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          {attachment.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    {/* Preview button for supported file types */}
                    {canPreview(attachment.fileType) && (
                      <button
                        onClick={() => handlePreview(attachment)}
                        disabled={previewLoading}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={previewLoading ? "Loading preview..." : "Preview file"}
                      >
                        {previewLoading ? (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}                    {/* Download button */}
                    <button
                      onClick={() => handleDownload(attachment, index)}
                      disabled={downloadingFiles.has(getAttachmentKey(attachment, index))}
                      className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"                      title="Download file"
                    >
                      {downloadingFiles.has(getAttachmentKey(attachment, index)) ? (
                        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      )}
                    </button>{/* Remove button */}
                    {onRemoveAttachment && attachment.id && (
                      <button
                        onClick={() => onRemoveAttachment(attachment.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove attachment"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Error message for preview failures */}
            {previewError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-300 flex-1">
                  <p className="font-medium">Preview Error</p>
                  <p className="mt-1">{previewError}</p>
                </div>
              </div>
            )}

            {/* Warning message for large files */}
            {attachments.some(att => att.fileSize > 10 * 1024 * 1024) && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium">Large files detected</p>
                  <p className="mt-1">
                    Some attachments are large and may take time to download. Preview functionality may be limited for files over 10MB.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AttachmentPreviewModal 
        isOpen={!!previewAttachment}
        onClose={closePreview}
        attachment={previewAttachment}
      />
    </>
  )
}

export default AttachmentDisplay