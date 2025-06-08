'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface Meeting {
  id: string
  title: string
  audioUrl?: string
  transcript?: string
  summary?: string
  participants: string[]
  duration?: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
}

export default function MeetingsPage() {
  const { selectedRepository } = useRepository()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [participants, setParticipants] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMeetings()
  }, [])
  const fetchMeetings = async () => {
    try {
      // Mock data for demonstration - replace with actual API call
      const mockMeetings: Meeting[] = [
        {
          id: '1',
          title: 'Sprint Planning Meeting',
          participants: ['Alice Johnson', 'Bob Smith', 'Charlie Davis'],
          duration: 3600,
          status: 'completed',
          createdAt: '2024-01-15T10:00:00Z',
          summary: 'Discussed upcoming sprint goals, estimated story points for new features including user authentication and dashboard improvements. Assigned tasks to team members and identified potential blockers.',
          transcript: 'Alice: Good morning everyone, let\'s start with our sprint planning...\nBob: I think we should prioritize the authentication system first...\nCharlie: Agreed, that\'s a foundational piece for other features...'
        },
        {
          id: '2',
          title: 'Code Review Session',
          participants: ['Alice Johnson', 'Charlie Davis'],
          duration: 1800,
          status: 'completed',
          createdAt: '2024-01-14T14:30:00Z',
          summary: 'Reviewed pull requests for the new API endpoints. Discussed code quality improvements and identified areas for refactoring. All PRs approved with minor suggestions.',
          transcript: 'Alice: Let\'s go through the API changes first...\nCharlie: The error handling looks good, but we might want to add more detailed logging...'
        },
        {
          id: '3',
          title: 'Weekly Standup',
          participants: ['Alice Johnson', 'Bob Smith', 'Charlie Davis', 'Diana Wilson'],
          duration: 900,
          status: 'processing',
          createdAt: '2024-01-16T09:00:00Z',
        }
      ]
      
      // Filter meetings by repository if needed
      setMeetings(selectedRepository ? mockMeetings : [])
    } catch (error) {
      console.error('Error fetching meetings:', error)
      setMeetings([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file type
      const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'video/mp4', 'video/webm']
      if (!allowedTypes.some(type => file.type.includes(type.split('/')[1]))) {
        alert('Please select a valid audio or video file (MP3, WAV, M4A, OGG, MP4, WebM)')
        return
      }
      
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert('File size must be less than 100MB')
        return
      }
      
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !meetingTitle.trim()) {
      alert('Please provide a title and select a file')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Create form data
      const formData = new FormData()
      formData.append('audio', selectedFile)
      formData.append('title', meetingTitle.trim())
      formData.append('participants', participants.trim())
      formData.append('userId', '1') // Mock user ID

      const response = await fetch('/api/meetings', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()
        setMeetings([data.meeting, ...meetings])
        
        // Reset form
        setMeetingTitle('')
        setParticipants('')
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
        setTimeout(() => setUploadProgress(0), 1000)
      } else {
        throw new Error('Failed to upload meeting')
      }
    } catch (error) {
      console.error('Error uploading meeting:', error)
      alert('Failed to upload meeting. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-900/20 text-green-400 border-green-800'
      case 'processing': return 'bg-yellow-900/20 text-yellow-400 border-yellow-800'
      case 'failed': return 'bg-red-900/20 text-red-400 border-red-800'
      default: return 'bg-gray-800 text-gray-400 border-gray-700'
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  // Re-fetch meetings when repository changes
  useEffect(() => {
    fetchMeetings()
  }, [selectedRepository])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading meetings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Select a Repository</h3>
          <p className="text-gray-400">Choose a repository from the dropdown above to view and manage meeting recordings.</p>
        </div>
      </DashboardLayout>
    )
  }
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Repository Header */}
        <div className="border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Meeting Recordings</h1>
              <p className="text-gray-400">{selectedRepository.full_name}</p>
            </div>
          </div>
          <p className="text-gray-300">
            Upload and transcribe meeting recordings for your team. AI-powered transcription and summaries help you track decisions and action items.
          </p>
        </div>{/* Upload Section */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Meeting Recording
          </h2>
          
          <div className="space-y-4">
            {/* Meeting Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Meeting Title *
              </label>
              <input
                type="text"
                placeholder="Weekly Team Standup, Product Review, etc."
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Participants (optional)
              </label>
              <input
                type="text"
                placeholder="John Doe, Jane Smith, Alex Johnson"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Audio/Video File *
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose File
                </button>
                {selectedFile && (
                  <span className="text-sm text-gray-400">
                    {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: MP3, WAV, M4A, OGG, MP4, WebM (max 100MB)
              </p>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">Uploading...</span>
                  <span className="text-sm text-gray-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !meetingTitle.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload & Transcribe
                </>
              )}
            </button>
          </div>
        </div>        {/* Meetings List */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Recent Meetings
          </h3>
          
          {meetings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-white mb-2">No meetings yet</h4>
              <p className="text-gray-400">Upload your first meeting recording to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">{meeting.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{new Date(meeting.createdAt).toLocaleString()}</span>
                        {meeting.duration && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(meeting.duration)}</span>
                          </>
                        )}
                        {meeting.participants.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{meeting.participants.length} participants</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </div>

                  {meeting.participants.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-300">Participants: </span>
                      <span className="text-sm text-gray-400">{meeting.participants.join(', ')}</span>
                    </div>
                  )}

                  {meeting.status === 'processing' && (
                    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-yellow-400 font-medium">Processing audio...</span>
                      </div>
                      <p className="text-yellow-300/80 text-sm mt-1">
                        AI is transcribing your meeting and generating a summary. This may take a few minutes.
                      </p>
                    </div>
                  )}

                  {meeting.status === 'failed' && (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-400 font-medium">Processing failed</span>
                      </div>
                      <p className="text-red-300/80 text-sm">
                        There was an issue processing this meeting. Please try uploading again.
                      </p>
                    </div>
                  )}

                  {meeting.status === 'completed' && meeting.summary && (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                        <h5 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          AI Summary
                        </h5>
                        <p className="text-gray-300 text-sm leading-relaxed">{meeting.summary}</p>
                      </div>

                      {/* Transcript */}
                      {meeting.transcript && (
                        <details className="group">
                          <summary className="cursor-pointer font-medium text-gray-300 hover:text-white flex items-center gap-2 select-none">
                            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            View Full Transcript
                          </summary>
                          <div className="mt-3 bg-gray-950 border border-gray-700 rounded-lg p-4">
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                              {meeting.transcript}
                            </p>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
