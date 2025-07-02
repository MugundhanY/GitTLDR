'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ArrowUpTrayIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useUserData } from '@/hooks/useUserData'

interface MeetingUploaderProps {
  onUploadComplete?: (meeting: any) => void
}

export default function MeetingUploader({ onUploadComplete }: MeetingUploaderProps) {
  const [meetingTitle, setMeetingTitle] = useState('')
  const [participants, setParticipants] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { userData } = useUserData()

  // Reset upload status after successful upload
  useEffect(() => {
    if (uploadStatus === 'uploaded') {
      const timer = setTimeout(() => {
        setUploadStatus('idle')
        setStatusMessage('')
        setUploadProgress(0)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [uploadStatus])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleDragOver = (event: React.DragEvent) => event.preventDefault()
  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault(); setIsDragActive(true)
  }
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault(); setIsDragActive(false)
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadStatus('idle')
    setStatusMessage('')
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const resetForm = () => {
    setMeetingTitle('')
    setParticipants('')
    setSelectedFile(null)
    setUploadStatus('idle')
    setStatusMessage('')
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !meetingTitle.trim() || !userData?.id) {
      setStatusMessage('Please provide a title, select a file, and ensure you are logged in.')
      setUploadStatus('error')
      return
    }

    if (isUploading) {
      setStatusMessage('Upload already in progress. Please wait...')
      return
    }
    
    console.log('🚀 [UPLOAD] Starting upload process...')
    setIsUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setStatusMessage('Preparing upload...')
    
    try {
      const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      setUploadProgress(5)
      setStatusMessage('Uploading file to server...')
      
      console.log('🔄 [UPLOAD] Step 1: Uploading to server (server-side B2 upload)')
      
      // Step 1: Upload file to server, which will upload to B2
      const uploadForm = new FormData()
      uploadForm.append('file', selectedFile)
      uploadForm.append('meetingId', meetingId)
      uploadForm.append('title', meetingTitle.trim())
      uploadForm.append('participants', participants.trim())
      uploadForm.append('userId', userData.id)
      
      const uploadRes = await fetch('/api/meetings/upload', {
        method: 'POST',
        body: uploadForm
      })
      
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        console.error('❌ [UPLOAD] Server upload failed:', errorText)
        throw new Error(`Upload failed: ${uploadRes.status} ${errorText}`)
      }
      
      const uploadResult = await uploadRes.json()
      const { b2FileKey } = uploadResult
      console.log('✅ [UPLOAD] File uploaded to B2 via server:', b2FileKey)
      
      setUploadProgress(70)
      setStatusMessage('Registering meeting for processing...')
      
      console.log('🔄 [UPLOAD] Step 2: Registering with node-worker')
      
      // Step 2: Register meeting with node-worker to queue for python-worker processing
      const nodeWorkerUrl = process.env.NODE_WORKER_URL || 'http://localhost:3001'
      console.log('Node worker URL:', nodeWorkerUrl)
      
      const registerRes = await fetch(`${nodeWorkerUrl}/register-meeting-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          userId: userData.id,
          b2FileKey,
          participants: participants.trim() ? participants.split(',').map(p => p.trim()) : [],
          title: meetingTitle,
          source: 'website'
        })
      })
      
      if (!registerRes.ok) {
        const errorText = await registerRes.text()
        console.error('❌ [UPLOAD] Failed to register meeting:', errorText)
        throw new Error(`Failed to register meeting for processing: ${registerRes.status} ${errorText}`)
      }
      
      const registerResult = await registerRes.json()
      console.log('✅ [UPLOAD] Meeting registered successfully:', registerResult)
      
      setUploadProgress(100)
      setStatusMessage('Meeting successfully uploaded and queued for processing!')
      setUploadStatus('uploaded')
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete({
          id: meetingId,
          title: meetingTitle.trim(),
          participants: participants.trim() ? participants.split(',').map(p => p.trim()) : [],
          status: 'processing',
          jobId: registerResult.jobId
        })
      }
      // Automatically clear form after short delay
      setTimeout(() => {
        resetForm()
      }, 1000)
      
    } catch (err: any) {
      console.error('❌ [UPLOAD] Upload failed:', err)
      setUploadStatus('error')
      setUploadProgress(0)
      setStatusMessage(err?.message || 'Error uploading meeting. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 rounded-t-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-2 lg:gap-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white whitespace-nowrap">Upload Meeting Recording</h2>
          </div>
        </div>
      </div>
      {/* Input Form */}
      <div className="py-8 px-2 sm:px-6 flex justify-center">
        <form className="w-full space-y-6" onSubmit={e => { e.preventDefault(); handleUpload(); }}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Meeting Title</label>
            <input
              type="text"
              placeholder="Weekly Team Standup, Product Review, etc."
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
              className="block w-full px-3 py-2 dark:bg-gray-800 border border-gray-600 rounded-md dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Participants <span className="text-xs text-slate-400">(optional)</span></label>
            <input
              type="text"
              placeholder="John Doe, Jane Smith, Alex Johnson"
              value={participants}
              onChange={e => setParticipants(e.target.value)}
              className="block w-full px-3 py-2 dark:bg-gray-800 border border-gray-600 rounded-md dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Drag and Drop Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105' : 
              selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
              'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            
            {!selectedFile ? (
              <>
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-all duration-200 ${
                  isDragActive ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <ArrowUpTrayIcon className={`w-6 h-6 transition-colors duration-200 ${
                    isDragActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drop audio/video file here or click to browse</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Max 100MB • Supported: MP3, WAV, M4A, OGG, MP4, WebM</p>
                  {!userData?.id && <p className="text-xs text-red-500 mt-1">Please log in to upload meetings</p>}
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 mb-3">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)}MB • Ready for upload
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUpTrayIcon className="h-3 w-3" />
                      Replace file
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XMarkIcon className="h-3 w-3" />
                      Remove file
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Upload Progress & Status (only show when needed) */}
          {(uploadStatus === 'uploading' || uploadStatus === 'error') && (
            <div className="space-y-3">
              {/* Status Message */}
              <div className="flex items-center justify-center">
                {uploadStatus === 'uploading' && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>{statusMessage}</span>
                  </div>
                )}
                {uploadStatus === 'error' && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{statusMessage}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {uploadStatus === 'uploading' && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !meetingTitle.trim() || !userData?.id || uploadStatus === 'uploaded'}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing Upload...
                </>
              ) : uploadStatus === 'uploaded' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Upload Complete
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  Upload & Process Meeting
                </>
              )}
            </button>

            {uploadStatus === 'uploaded' && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Upload Another
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

