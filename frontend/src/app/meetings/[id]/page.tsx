'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MeetingQA from '@/components/meetings/MeetingQA'
import { 
  PlayIcon, 
  PauseIcon, 
  MagnifyingGlassIcon,
  ChatBubbleLeftIcon,
  ArrowDownTrayIcon,
  TagIcon,
  ClockIcon,
  ShareIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  SpeakerWaveIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  BookmarkIcon,
  HeartIcon,
  ArrowLeftIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { 
  PlayIcon as PlaySolidIcon, 
  PauseIcon as PauseSolidIcon,
  HeartIcon as HeartSolidIcon 
} from '@heroicons/react/24/solid'

interface MeetingSegment {
  id: string
  title: string
  summary: string
  excerpt?: string
  text?: string
  startTime: number
  endTime: number
  index: number
  duration?: number
}

interface Meeting {
  id: string
  title: string
  transcript?: string
  summary?: string
  status: string
  createdAt: string
  updatedAt: string
  language?: string
  source?: string
  segmentCount: number
  segments: MeetingSegment[]
  user?: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
}

interface Comment {
  id: string
  text: string
  timestamp: number
  segmentId?: string
  createdAt: string
  user: string
}

interface ActionItem {
  id: string
  text: string
  completed: boolean
  assignee?: string
  dueDate?: string
  priority: 'low' | 'medium' | 'high'
}

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params?.id as string
  
  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [currentSegment, setCurrentSegment] = useState<number | null>(null)
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedText, setHighlightedText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentTimestamp, setCommentTimestamp] = useState(0)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showExportModal, setShowExportModal] = useState(false)
  const [editingSummary, setEditingSummary] = useState(false)
  const [editedSummary, setEditedSummary] = useState('')
  const [sentiment, setSentiment] = useState<{positive: number, negative: number, neutral: number}>({
    positive: 0,
    negative: 0,
    neutral: 0
  })
  const [showShareModal, setShowShareModal] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  // Fetch meeting data
  const { data: meeting, isLoading, error } = useQuery<Meeting>({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}`)
      if (!res.ok) throw new Error('Failed to fetch meeting')
      const data = await res.json()
      return data.meeting
    },
    enabled: !!meetingId
  })

  // Initialize audio when meeting data loads
  useEffect(() => {
    if (meeting && audioRef.current) {
      // Set up audio event listeners
      const audio = audioRef.current
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration)
      }
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        
        // Update current segment based on playback time
        if (meeting.segments) {
          const current = meeting.segments.find(segment => 
            audio.currentTime >= segment.startTime && audio.currentTime <= segment.endTime
          )
          if (current) {
            setCurrentSegment(current.index)
          }
        }
      }
      
      const handleEnded = () => {
        setIsPlaying(false)
      }
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
      }
    }
  }, [meeting])

  // Initialize summary for editing
  useEffect(() => {
    if (meeting?.summary) {
      setEditedSummary(meeting.summary)
      
      // Calculate sentiment (mock implementation)
      const words = meeting.summary.split(' ')
      const positiveWords = words.filter(word => 
        ['good', 'great', 'excellent', 'positive', 'success', 'achieved', 'completed'].includes(word.toLowerCase())
      ).length
      const negativeWords = words.filter(word => 
        ['bad', 'issue', 'problem', 'concern', 'failed', 'difficult', 'challenge'].includes(word.toLowerCase())
      ).length
      
      const total = Math.max(words.length / 10, 1)
      setSentiment({
        positive: Math.min((positiveWords / total) * 100, 100),
        negative: Math.min((negativeWords / total) * 100, 100),
        neutral: Math.max(100 - (positiveWords + negativeWords) / total * 100, 0)
      })
    }
  }, [meeting])

  // Audio control functions
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const jumpToSegment = (segment: MeetingSegment) => {
    seekTo(segment.startTime)
    setCurrentSegment(segment.index)
  }

  const changePlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  const changeVolume = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol
      setVolume(vol)
    }
  }

  // Search and highlight functions
  const highlightText = (text: string, query: string) => {
    if (!query) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600">$1</mark>')
  }

  const filteredSegments = meeting?.segments?.filter(segment => {
    if (!searchQuery) return true
    return segment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           segment.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
           segment.text?.toLowerCase().includes(searchQuery.toLowerCase())
  }) || []

  // Comment functions
  const addComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment,
        timestamp: commentTimestamp || currentTime,
        createdAt: new Date().toISOString(),
        user: 'Current User' // Replace with actual user
      }
      setComments([...comments, comment])
      setNewComment('')
      setCommentTimestamp(0)
    }
  }

  const deleteComment = (commentId: string) => {
    setComments(comments.filter(c => c.id !== commentId))
  }

  // Export functions
  const exportToPDF = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeComments: true, includeActionItems: true })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${meeting?.title || 'meeting'}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('PDF export error:', error)
      // Fallback: generate simple text file
      generateTextExport('pdf')
    }
  }

  const exportToWord = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/export/docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeComments: true, includeActionItems: true })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${meeting?.title || 'meeting'}.docx`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Word export error:', error)
      // Fallback: generate simple text file
      generateTextExport('docx')
    }
  }

  const exportToJSON = () => {
    const data = {
      meeting,
      comments,
      actionItems,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting?.title || 'meeting'}-${meetingId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateTextExport = (format: string) => {
    const content = `
Meeting: ${meeting?.title || 'Untitled Meeting'}
Date: ${meeting?.createdAt ? new Date(meeting.createdAt).toLocaleDateString() : 'N/A'}
Status: ${meeting?.status || 'Unknown'}

SUMMARY:
${meeting?.summary || 'No summary available'}

SEGMENTS:
${meeting?.segments?.map(segment => `
${segment.title} (${formatTime(segment.startTime)} - ${formatTime(segment.endTime)})
${segment.summary}
${segment.text ? `\nTranscript: ${segment.text}` : ''}
`).join('\n') || 'No segments available'}

ACTION ITEMS:
${actionItems.map(item => `
- [${item.completed ? 'x' : ' '}] ${item.text} (Priority: ${item.priority})
`).join('') || 'No action items'}

COMMENTS:
${comments.map(comment => `
${comment.user} (${formatTime(comment.timestamp)}): ${comment.text}
`).join('') || 'No comments'}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting?.title || 'meeting'}.${format === 'pdf' ? 'txt' : 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Action items functions
  const extractActionItems = () => {
    // Mock AI extraction - replace with actual AI service
    const mockItems: ActionItem[] = [
      {
        id: '1',
        text: 'Follow up on project timeline discussion',
        completed: false,
        priority: 'high'
      },
      {
        id: '2', 
        text: 'Schedule next team meeting',
        completed: false,
        priority: 'medium'
      }
    ]
    setActionItems(mockItems)
  }

  const toggleActionItem = (itemId: string) => {
    setActionItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    )
  }

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
      case 'processing': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading meeting details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !meeting) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Meeting Not Found
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              The meeting you're looking for doesn't exist or has been deleted.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4 mb-4">
              {/* Back Button */}
              <button
                onClick={() => router.push('/meetings')}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Meetings</span>
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                    {meeting.title}
                  </h1>
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    {isFavorite ? (
                      <HeartSolidIcon className="w-5 h-5 text-red-500" />
                    ) : (
                      <HeartIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                    {meeting.status}
                  </span>
                  <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{meeting.segments.length} segments</span>
                  {meeting.language && (
                    <>
                      <span>•</span>
                      <span>{meeting.language}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ShareIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Audio Player */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <SpeakerWaveIcon className="w-5 h-5" />
                    Audio Player
                  </h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={playbackRate}
                      onChange={(e) => changePlaybackRate(Number(e.target.value))}
                      className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>
                </div>
                
                <audio
                  ref={audioRef}
                  src={`/api/meetings/${meetingId}/audio`}
                  preload="metadata"
                />
                
                <div className="space-y-4">
                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlayPause}
                      className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      {isPlaying ? (
                        <PauseSolidIcon className="w-6 h-6" />
                      ) : (
                        <PlaySolidIcon className="w-6 h-6 ml-1" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      <div className="relative">
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-100"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                          ></div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          value={currentTime}
                          onChange={(e) => seekTo(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <SpeakerWaveIcon className="w-4 h-4 text-slate-400" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={volume}
                        onChange={(e) => changeVolume(Number(e.target.value))}
                        className="w-20"
                      />
                    </div>
                  </div>
                  
                  {/* Segment Timeline */}
                  <div className="relative">
                    <div className="flex items-center gap-1 overflow-x-auto pb-2">
                      {meeting.segments.map((segment, index) => (
                        <button
                          key={segment.id}
                          onClick={() => jumpToSegment(segment)}
                          className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            currentSegment === index
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {segment.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in transcript and segments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Found {filteredSegments.length} matching segments
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Summary</h2>
                  <button
                    onClick={() => setEditingSummary(!editingSummary)}
                    className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
                
                {editingSummary ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      rows={6}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Save summary
                          setEditingSummary(false)
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditedSummary(meeting.summary || '')
                          setEditingSummary(false)
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-slate-600 dark:text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(meeting.summary || 'No summary available', searchQuery) 
                    }}
                  />
                )}
              </div>

              {/* Segments */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Meeting Segments ({filteredSegments.length})
                </h2>
                
                <div className="space-y-4">
                  {filteredSegments.map((segment, index) => (
                    <div
                      key={segment.id}
                      className={`border border-slate-200 dark:border-slate-700 rounded-lg p-4 transition-all ${
                        currentSegment === segment.index ? 'ring-2 ring-blue-500 border-blue-300' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 
                            className="font-medium text-slate-900 dark:text-white mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={() => jumpToSegment(segment)}
                            dangerouslySetInnerHTML={{ 
                              __html: highlightText(segment.title, searchQuery) 
                            }}
                          />
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <ClockIcon className="w-4 h-4" />
                            <span>{formatTime(segment.startTime)} - {formatTime(segment.endTime)}</span>
                            <span>•</span>
                            <span>{formatTime(segment.endTime - segment.startTime)} duration</span>
                          </div>
                        </div>
                        <button
                          onClick={() => jumpToSegment(segment)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <PlayIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Summary</h4>
                          <p 
                            className="text-sm text-slate-600 dark:text-slate-400"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightText(segment.summary, searchQuery) 
                            }}
                          />
                        </div>
                        
                        {segment.text && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transcript</h4>
                            <p 
                              className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                              dangerouslySetInnerHTML={{ 
                                __html: highlightText(segment.text, searchQuery) 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meeting Q&A */}
              <MeetingQA 
                meetingId={meetingId}
                segments={meeting.segments}
                onSeekTo={seekTo}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Action Items */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Action Items</h3>
                  <button
                    onClick={extractActionItems}
                    className="text-xs px-3 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                  >
                    Extract
                  </button>
                </div>
                
                <div className="space-y-2">
                  {actionItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <button
                        onClick={() => toggleActionItem(item.id)}
                        className="mt-0.5"
                      >
                        <CheckCircleIcon className={`w-4 h-4 ${
                          item.completed ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'
                        }`} />
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${
                          item.completed 
                            ? 'text-slate-400 line-through' 
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {item.text}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {actionItems.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                      No action items extracted yet
                    </p>
                  )}
                </div>
              </div>

              {/* Sentiment Analysis */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Sentiment Analysis</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600 dark:text-green-400">Positive</span>
                    <span className="text-sm font-medium">{Math.round(sentiment.positive)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sentiment.positive}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Neutral</span>
                    <span className="text-sm font-medium">{Math.round(sentiment.neutral)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-slate-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sentiment.neutral}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600 dark:text-red-400">Negative</span>
                    <span className="text-sm font-medium">{Math.round(sentiment.negative)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sentiment.negative}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Comments */}
              {showComments && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Comments</h3>
                  
                  <div className="space-y-4 mb-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {comment.user}
                          </span>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {comment.text}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <ClockIcon className="w-3 h-3" />
                          <span>{formatTime(comment.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <input
                          type="number"
                          value={commentTimestamp || currentTime}
                          onChange={(e) => setCommentTimestamp(Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-center bg-white dark:bg-slate-800"
                        />
                        <span>seconds</span>
                      </div>
                      <button
                        onClick={addComment}
                        disabled={!newComment.trim()}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Share Meeting
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Meeting Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/meetings/${meetingId}`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/meetings/${meetingId}`)
                        alert('Link copied to clipboard!')
                      }}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Share via Email
                  </label>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(`Meeting: ${meeting?.title}`)
                      const body = encodeURIComponent(`I wanted to share this meeting with you: ${window.location.origin}/meetings/${meetingId}`)
                      window.open(`mailto:?subject=${subject}&body=${body}`)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    Open Email App
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Social Media
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const url = encodeURIComponent(`${window.location.origin}/meetings/${meetingId}`)
                        const text = encodeURIComponent(`Check out this meeting: ${meeting?.title}`)
                        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`)
                      }}
                      className="flex-1 px-3 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                    >
                      Twitter
                    </button>
                    <button
                      onClick={() => {
                        const url = encodeURIComponent(`${window.location.origin}/meetings/${meetingId}`)
                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`)
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      LinkedIn
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Export Meeting
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={exportToPDF}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Export as PDF</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Complete meeting with transcript and summary
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={exportToWord}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Export as Word</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Editable document format
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={exportToJSON}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Export as JSON</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Raw data including comments and metadata
                    </div>
                  </div>
                </button>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
