'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MeetingQA from '@/components/meetings/MeetingQA'
import MeetingHeader from '@/components/meetings/MeetingHeader'
import AudioPlayer from '@/components/meetings/AudioPlayerUpdated'
import MeetingSearch from '@/components/meetings/MeetingSearch'
import MeetingSummary from '@/components/meetings/MeetingSummary'
import MeetingSegments from '@/components/meetings/MeetingSegments'
import SentimentAnalysis from '@/components/meetings/SentimentAnalysis'
import ActionItems from '@/components/meetings/ActionItems'
import MeetingComments from '@/components/meetings/MeetingComments'
import MeetingParticipants from '@/components/meetings/MeetingParticipants'
import { ShareModal, ExportModal } from '@/components/meetings/MeetingModals'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useNotifications } from '@/contexts/NotificationContext'

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
  user_edited_summary?: string
  status: string
  createdAt: string
  updatedAt: string
  language?: string
  source?: string
  segmentCount: number
  raw_audio_path?: string
  video_path?: string
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
  const { addNotification } = useNotifications()
  
  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [currentSegment, setCurrentSegment] = useState<number | null>(null)
  
  // Audio loading state
  const [isAudioLoading, setIsAudioLoading] = useState(true)
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentTimestamp, setCommentTimestamp] = useState(0)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
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

  // Share meeting modal state
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [sharedUsers, setSharedUsers] = useState<{
    userId: string
    email: string
    name: string
    permission: 'VIEW' | 'EDIT'
    avatarUrl?: string
  }[]>([])
  
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

  // Fetch favorite status
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!meetingId) return;
      
      try {
        const response = await fetch(`/api/meetings/${meetingId}/favorite`);
        if (response.ok) {
          const data = await response.json();
          setIsFavorite(data.isFavorite);
        }
      } catch (error) {
        console.error('Failed to fetch favorite status:', error);
      }
    };
    
    fetchFavoriteStatus();
  }, [meetingId]);

  // Initialize audio when meeting data loads
  useEffect(() => {
    if (meeting && audioRef.current) {
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
      
      const handleLoadStart = () => {
        setIsAudioLoading(true);
      };
      
      const handleCanPlay = () => {
        setIsAudioLoading(false);
      };
      
      const handleError = () => {
        setIsAudioLoading(false);
        console.error('Error loading audio');
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
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
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Set the time first
    audio.currentTime = segment.startTime;
    setCurrentTime(segment.startTime);
    setCurrentSegment(segment.index);
    
    // Always start playing when jumping to a segment
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error('Audio play failed:', error);
          // Try to load the audio first if it failed
          audio.load();
          setTimeout(() => {
            audio.currentTime = segment.startTime;
            audio.play().then(() => setIsPlaying(true)).catch(console.error);
          }, 100);
        });
    } else {
      setIsPlaying(true);
    }
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
  const filteredSegments = useMemo(() => {
    if (!searchQuery) return meeting?.segments || []
    
    return (meeting?.segments || []).filter(segment => {
      const searchLower = searchQuery.toLowerCase()
      return (
        segment.title?.toLowerCase().includes(searchLower) ||
        segment.summary?.toLowerCase().includes(searchLower) ||
        segment.text?.toLowerCase().includes(searchLower)
      )
    })
  }, [meeting?.segments, searchQuery])
  
  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">$1</mark>')
  }

  // Export functions
  const exportToPDF = () => {
    setShowExportModal(false);
    const link = document.createElement('a');
    link.href = `/api/meetings/${meetingId}/export?format=pdf`;
    link.download = `Meeting_${meeting?.title?.replace(/\s+/g, '_') || meetingId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Add success notification
    addNotification({
      type: 'success',
      title: 'PDF export started',
      message: `Your meeting "${meeting?.title || 'Meeting'}" is being exported to PDF.`,
      metadata: { meetingId, category: 'meeting' }
    });
  };

  const exportToWord = () => {
    setShowExportModal(false);
    const link = document.createElement('a');
    link.href = `/api/meetings/${meetingId}/export?format=docx`;
    link.download = `Meeting_${meeting?.title?.replace(/\s+/g, '_') || meetingId}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Add success notification
    addNotification({
      type: 'success',
      title: 'Word export started',
      message: `Your meeting "${meeting?.title || 'Meeting'}" is being exported to Word.`,
      metadata: { meetingId, category: 'meeting' }
    });
  };

  const exportToJSON = () => {
    setShowExportModal(false);
    const link = document.createElement('a');
    link.href = `/api/meetings/${meetingId}/export?format=json`;
    link.download = `Meeting_${meeting?.title?.replace(/\s+/g, '_') || meetingId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Add success notification
    addNotification({
      type: 'success',
      title: 'JSON export started',
      message: `Your meeting "${meeting?.title || 'Meeting'}" is being exported to JSON.`,
      metadata: { meetingId, category: 'meeting' }
    });
  };

  // Action items functions
  const extractActionItems = async () => {
    try {
      setActionItems([{ 
        id: 'loading', 
        text: 'Analyzing meeting content...', 
        completed: false, 
        priority: 'medium' 
      }]);
      
      const response = await fetch(`/api/meetings/${meetingId}/extract-action-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract action items');
      }
      
      const data = await response.json();
      setActionItems(data.actionItems || []);
      
      // Add success notification
      addNotification({
        type: 'success',
        title: 'Action items extracted',
        message: `Found ${data.actionItems?.length || 0} action items in your meeting.`,
        metadata: { meetingId, category: 'meeting' }
      });
    } catch (error) {
      console.error('Error extracting action items:', error);
      setActionItems([]);
      
      // Add error notification
      addNotification({
        type: 'error',
        title: 'Failed to extract action items',
        message: 'Could not extract action items from the meeting. Please try again.',
        metadata: { meetingId, category: 'meeting' }
      });
    }
  }

  // Save favorite status to the database
  const toggleFavorite = async () => {
    try {
      const newStatus = !isFavorite;
      setIsFavorite(newStatus);
      
      const response = await fetch(`/api/meetings/${meetingId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFavorite: newStatus
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      
      // Add success notification
      addNotification({
        type: 'success',
        title: newStatus ? 'Meeting favorited' : 'Meeting removed from favorites',
        message: `${meeting?.title || 'Meeting'} has been ${newStatus ? 'added to' : 'removed from'} your favorites.`,
        metadata: { meetingId, category: 'meeting' }
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsFavorite(!isFavorite);
    }
  };

  // Toggle action item completion status
  const toggleActionItem = async (itemId: string) => {
    try {
      const item = actionItems.find(i => i.id === itemId);
      if (!item) return;
      
      const updatedItem = { ...item, completed: !item.completed };
      
      setActionItems(items => 
        items.map(item => 
          item.id === itemId ? updatedItem : item
        )
      );
      
      const response = await fetch(`/api/meetings/${meetingId}/action-items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: updatedItem.completed
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update action item');
      }
    } catch (error) {
      console.error('Error toggling action item:', error);
      setActionItems(items => 
        items.map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
        )
      );
    }
  };

  // Format time display
  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time < 0) return '0:00'
    const totalSeconds = Math.floor(time)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
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

  // Fetch shared users
  useEffect(() => {
    const fetchSharedUsers = async () => {
      if (!meetingId) return
      
      try {
        const response = await fetch(`/api/meetings/${meetingId}/shared-users`)
        if (response.ok) {
          const data = await response.json()
          setSharedUsers(data.users || [])
        }
      } catch (error) {
        console.error('Failed to fetch shared users:', error)
      }
    }
    
    fetchSharedUsers()
  }, [meetingId])

  // Update the current segment based on time
  const updateCurrentSegment = (time: number) => {
    if (!meeting) return;
    const index = meeting.segments.findIndex(
      (segment, i) => {
        const nextSegment = meeting.segments[i + 1];
        return time >= segment.startTime && (!nextSegment || time < nextSegment.startTime);
      }
    );
    setCurrentSegment(index !== -1 ? index : null);
  };

  const shareMeeting = async () => {
    if (!shareEmail || isSharing) return
    
    try {
      setIsSharing(true)
      setShareError('')
      
      const response = await fetch(`/api/meetings/${meetingId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: shareEmail,
          permission: sharePermission
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to share meeting')
      }
      
      const data = await response.json()
      setSharedUsers([...sharedUsers, data.user])
      setShareEmail('')
      
    } catch (error: any) {
      console.error('Error sharing meeting:', error)
      setShareError(error.message || 'Failed to share meeting')
    } finally {
      setIsSharing(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-purple-500/20 border-b-purple-500 rounded-full animate-spin mx-auto" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Loading Meeting</h3>
            <p className="text-slate-500 dark:text-slate-400">Preparing your meeting details...</p>
            <div className="mt-4 flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !meeting) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Meeting Not Found
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              The meeting you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => router.push('/meetings')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Back to Meetings
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-indigo-950/30 dark:to-purple-950/20">
        
        {/* Header */}
        <MeetingHeader
          meeting={meeting}
          router={router}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          setShowComments={setShowComments}
          showComments={showComments}
          setShowExportModal={setShowExportModal}
          setShowShareModal={setShowShareModal}
          getStatusColor={getStatusColor}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Audio Player - Fixed Position */}
          <AudioPlayer
            meeting={meeting}
            meetingId={meetingId}
            isAudioLoading={isAudioLoading}
            setIsAudioLoading={setIsAudioLoading}
            playbackRate={playbackRate}
            changePlaybackRate={changePlaybackRate}
            audioRef={audioRef as React.RefObject<HTMLAudioElement>}
            currentTime={currentTime}
            duration={duration}
            setCurrentTime={setCurrentTime}
            setDuration={setDuration}
            setIsPlaying={setIsPlaying}
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
            seekTo={seekTo}
            updateCurrentSegment={updateCurrentSegment}
            volume={volume}
            changeVolume={changeVolume}
            currentSegment={currentSegment}
            jumpToSegment={jumpToSegment}
            formatTime={formatTime}
          />
          
          {/* Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            {/* Main Content - Takes up 2/3 width */}
            <div className="xl:col-span-2 space-y-6">
              {/* Meeting Q&A */}
              <MeetingQA 
                meetingId={meetingId}
                segments={meeting.segments}
                onSeekTo={seekTo}
                className="shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fadeIn"
              />

              {/* Summary */}
              <MeetingSummary
                meeting={meeting}
                searchQuery={searchQuery}
                editingSummary={editingSummary}
                setEditingSummary={setEditingSummary}
                editedSummary={editedSummary}
                setEditedSummary={setEditedSummary}
                meetingId={meetingId}
                highlightText={highlightText}
              />

              {/* Search */}
              <MeetingSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredSegments={filteredSegments}
              />

              {/* Segments */}
              <MeetingSegments
                filteredSegments={filteredSegments}
                searchQuery={searchQuery}
                currentSegment={currentSegment}
                jumpToSegment={jumpToSegment}
                formatTime={formatTime}
                highlightText={highlightText}
              />
            </div>
            
            {/* Right Sidebar - Takes up 1/3 width */}
            <div className="xl:col-span-1 space-y-6">
              {/* Participants */}
              <MeetingParticipants
                meetingId={meetingId}
              />
              
              {/* Action Items */}
              <ActionItems
                actionItems={actionItems}
                extractActionItems={extractActionItems}
                toggleActionItem={toggleActionItem}
              />

              {/* Sentiment Analysis */}
              <SentimentAnalysis sentiment={sentiment} />

              {/* Comments */}
              <MeetingComments
                meetingId={meetingId}
                currentTime={currentTime}
                onSeekTo={seekTo}
                isOpen={showComments}
                onClose={() => setShowComments(false)}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Share Modal */}
        <ShareModal
          showShareModal={showShareModal}
          setShowShareModal={setShowShareModal}
          shareEmail={shareEmail}
          setShareEmail={setShareEmail}
          sharePermission={sharePermission}
          setSharePermission={setSharePermission}
          shareMeeting={shareMeeting}
          isSharing={isSharing}
          shareError={shareError}
          sharedUsers={sharedUsers}
          meetingId={meetingId}
        />

        {/* Export Modal */}
        <ExportModal
          showExportModal={showExportModal}
          setShowExportModal={setShowExportModal}
          exportToPDF={exportToPDF}
          exportToWord={exportToWord}
          exportToJSON={exportToJSON}
        />
    </DashboardLayout>
  );
}
