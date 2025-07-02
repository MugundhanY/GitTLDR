'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import { useMeetings, Meeting } from '@/hooks/useMeetings'
import { 
  VideoCameraIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  DocumentArrowDownIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  SparklesIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { useSidebar } from '@/contexts/SidebarContext'
import Image from 'next/image'
import Link from 'next/link'
import MeetingUploader from '@/components/meetings/MeetingUploader'

export default function MeetingsPage() {
  const { selectedRepository } = useRepository()
  const { isCollapsed } = useSidebar()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'processing' | 'completed' | 'failed' | 'transcribing' | 'summarizing'>('all')
  const [showUploader, setShowUploader] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Use React Query for fetching meetings
  const { data: meetings = [], isLoading, refetch } = useMeetings(selectedRepository?.id)

  const handleMeetingUpload = (meeting: any) => {
    console.log('Meeting uploaded:', meeting)
    // Refresh the meetings list
    refetch()
    setShowUploader(false)
  }

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
    const totalSeconds = Math.floor(seconds)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Filter and search meetings with better logic
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      const matchesSearch = !searchQuery || 
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.transcript?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = filterStatus === 'all' || meeting.status === filterStatus
      
      return matchesSearch && matchesFilter
    })
  }, [meetings, searchQuery, filterStatus])

  // Calculate enhanced stats
  const stats = useMemo(() => {
    const totalMeetings = meetings.length
    const totalDuration = meetings.reduce((sum, m) => {
      if (m.segments && m.segments.length > 0) {
        return sum + m.segments.reduce((segSum, seg) => segSum + (seg.endTime - seg.startTime), 0)
      }
      return sum
    }, 0)

    const statusCounts = meetings.reduce((acc, meeting) => {
      acc[meeting.status] = (acc[meeting.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalMeetings,
      totalDuration,
      completed: statusCounts.completed || 0,
      processing: (statusCounts.processing || 0) + (statusCounts.transcribing || 0) + (statusCounts.summarizing || 0),
      failed: statusCounts.failed || 0,
      transcribing: statusCounts.transcribing || 0,
      summarizing: statusCounts.summarizing || 0
    }
  }, [meetings])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'processing':
      case 'transcribing':
      case 'summarizing':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-slate-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'processing':
      case 'transcribing':
      case 'summarizing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-md flex items-center justify-center">
                <VideoCameraIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-slate-900 dark:text-white">Meetings</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">No repository selected</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
                <VideoCameraIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                Select a Repository
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Choose a repository from the navigation above to view and manage meeting recordings.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 -z-50 animate-gradient-x"></div>
      
      <DashboardLayout>
        <div className="min-h-screen relative z-0">
          {/* Header */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 animate-in slide-in-from-top duration-700">
            <div className={`mx-auto px-4 py-5 sm:px-8 sm:py-7 transition-all duration-300 ${
              isCollapsed ? 'max-w-none' : 'max-w-7xl'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="relative group">
                    {selectedRepository.owner?.avatar_url ? (
                      <>
                        <Image
                          src={selectedRepository.owner.avatar_url}
                          alt={`${selectedRepository.name} avatar`}
                          width={48}
                          height={48}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover shadow-lg border-2 border-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in"
                        />
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                      </>
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in">
                        <VideoCameraIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                      </div>
                    )}
                  </div>
                  <div className="animate-in slide-in-from-left duration-500 delay-200">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
                      <VideoCameraIcon className="w-6 h-6 text-blue-500" />
                      Meetings
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs sm:text-base">
                      View, upload, and analyze meetings for {selectedRepository.name}
                    </p>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-3">
                  <Link
                    href="/meetings/upload"
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload Meeting</span>
                    <span className="sm:hidden">Upload</span>
                  </Link>
                  <button
                    onClick={() => setShowUploader(!showUploader)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Quick Upload</span>
                    <span className="sm:hidden">Quick</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mt-6">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMeetings}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Total</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Completed</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.processing}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Processing</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Failed</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatDuration(stats.totalDuration)}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Duration</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className={`mx-auto px-4 sm:px-8 py-6 sm:py-8 transition-all duration-300 ${
            isCollapsed ? 'max-w-none' : 'max-w-7xl'
          }`}>
            <div className="flex flex-col gap-6">
              {/* Upload Section - Only show when toggled */}
              {showUploader && (
                <div className="animate-in slide-in-from-top duration-300">
                  <MeetingUploader onUploadComplete={handleMeetingUpload} />
                </div>
              )}

              {/* Meetings Section */}
              <section className="animate-in fade-in slide-in-from-bottom duration-600 delay-200" aria-label="Meetings">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  {/* Header */}
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse shrink-0">
                          <VideoCameraIcon className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-[200px] md:max-w-[320px]">Meeting Recordings</h2>
                        <div className="flex items-center gap-1 sm:gap-2 ml-2 flex-wrap min-w-0">
                          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full truncate max-w-[80px] sm:max-w-[120px] md:max-w-[180px]">
                            {filteredMeetings.length} meetings
                          </div>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
                        {/* Filter Button */}
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Show filters"
                        >
                          <FunnelIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                      <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search meetings, summaries, transcripts..."
                          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                      <div className="bg-white/80 dark:bg-slate-950/80 rounded-2xl shadow p-4 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center mt-4">
                        <div className="flex items-center justify-between mb-2 w-full">
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Status Filter */}
                            <div className="relative">
                              <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[140px]"
                              >
                                <option value="all">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="processing">Processing</option>
                                <option value="transcribing">Transcribing</option>
                                <option value="summarizing">Summarizing</option>
                                <option value="failed">Failed</option>
                              </select>
                            </div>
                          </div>
                          {/* Clear All Button */}
                          <button
                            onClick={() => {
                              setSearchQuery('')
                              setFilterStatus('all')
                            }}
                            className="text-sm text-blue-700 dark:text-blue-200 hover:text-blue-900 dark:hover:text-blue-100 font-bold px-4 py-2 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900/30 transition-all shadow-sm"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Search Results Info */}
                    {searchQuery && (
                      <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        Found {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''} matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                  
                  {/* Meetings List */}
                  <div className="p-3 sm:p-6 rounded-b-2xl">
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500 dark:text-slate-400">Loading meetings...</p>
                      </div>
                    ) : filteredMeetings.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
                          <VideoCameraIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No meetings found</h4>
                        <p className="text-slate-600 dark:text-slate-400">
                          {searchQuery ? `No meetings match "${searchQuery}"` : 'Upload your first meeting to get started!'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredMeetings.map((meeting: Meeting, idx: number) => (
                          <div
                            key={meeting.id}
                            style={{
                              animation: `fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both`,
                              animationDelay: `${idx * 60}ms`,
                            }}
                            className="border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-400 outline-none hover:scale-[1.01] overflow-hidden"
                          >
                            <div className="p-4 sm:p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getStatusIcon(meeting.status)}
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(meeting.status)}`}>
                                      {meeting.status}
                                    </span>
                                  </div>
                                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                                    {meeting.title}
                                  </h3>
                                  {meeting.summary && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                                      {meeting.summary}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1">
                                      <CalendarIcon className="w-4 h-4" />
                                      {new Date(meeting.createdAt).toLocaleDateString()}
                                    </div>
                                    {meeting.segments && meeting.segments.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <ClockIcon className="w-4 h-4" />
                                        {formatDuration(meeting.segments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0))}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <DocumentArrowDownIcon className="w-4 h-4" />
                                      {meeting.segmentCount || 0} segments
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                  <Link 
                                    href={`/meetings/${meeting.id}`}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                  >
                                    <PlayIcon className="w-4 h-4" />
                                    View
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
