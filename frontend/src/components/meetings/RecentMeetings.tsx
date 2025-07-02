'use client'

import React, { useEffect } from 'react'
import { ArrowTopRightOnSquareIcon, ClockIcon, PlayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon as ClockSolidIcon } from '@heroicons/react/24/solid'
import { Meeting } from '@/hooks/useMeetings'
import { useQueryClient } from '@tanstack/react-query'
import { useUserData } from '@/hooks/useUserData'
import Link from 'next/link'

interface RecentMeetingsProps {
  meetings: Meeting[]
  isLoading?: boolean
}

export default function RecentMeetings({ meetings, isLoading }: RecentMeetingsProps) {
  const queryClient = useQueryClient()
  const { userData } = useUserData()

  // Auto-refresh meetings when any are being processed
  useEffect(() => {
    const hasProcessingMeetings = meetings.some(meeting => 
      ['processing', 'transcribing', 'summarizing'].includes(meeting.status)
    )

    if (hasProcessingMeetings) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['meetings', userData?.id] })
      }, 3000) // Refresh every 3 seconds when processing

      return () => clearInterval(interval)
    }
  }, [meetings, queryClient, userData?.id])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'processing':
        return (
          <div className="relative">
            <ClockSolidIcon className="w-4 h-4 text-yellow-500 animate-pulse" />
            <div className="absolute -inset-0.5 bg-yellow-400 rounded-full opacity-20 animate-ping"></div>
          </div>
        )
      case 'transcribing':
        return (
          <div className="relative">
            <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div className="absolute -inset-0.5 bg-blue-400 rounded-full opacity-20 animate-ping"></div>
          </div>
        )
      case 'summarizing':
        return (
          <div className="relative">
            <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className="animate-pulse" />
            </svg>
            <div className="absolute -inset-0.5 bg-purple-400 rounded-full opacity-20 animate-ping"></div>
          </div>
        )
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
      case 'uploaded':
        return <ClockIcon className="w-4 h-4 text-slate-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-slate-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'processing': 
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'transcribing':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'summarizing':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800'
      case 'failed': 
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'uploaded':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
      default: 
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'processing': return 'Processing'
      case 'transcribing': return 'Transcribing'
      case 'summarizing': return 'Summarizing'
      case 'failed': return 'Failed'
      case 'uploaded': return 'Uploaded'
      default: return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (segments: Meeting['segments']) => {
    if (!segments || segments.length === 0) return 'Unknown'
    const totalDuration = segments.reduce((acc, segment) => acc + (segment.endTime - segment.startTime), 0)
    const minutes = Math.floor(totalDuration / 60)
    const seconds = Math.floor(totalDuration % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Meetings</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 rounded-t-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-2 lg:gap-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white whitespace-nowrap">Recent Meetings</h2>
          </div>
          <div className="flex items-center gap-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-full">
            <span className="font-semibold">{meetings.length}</span> meetings
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {meetings.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No meetings yet</h3>
            <p className="text-slate-500 dark:text-slate-400">Upload your first meeting recording to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.slice(0, 5).map((meeting) => (
              <Link 
                key={meeting.id} 
                href={`/meetings/${meeting.id}`}
                className="block border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {meeting.title}
                      </h3>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(meeting.status)}`}>
                        {getStatusIcon(meeting.status)}
                        <span>{getStatusText(meeting.status)}</span>
                        {(meeting.status === 'processing' || meeting.status === 'transcribing' || meeting.status === 'summarizing') && (
                          <div className="ml-1">
                            <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatDate(meeting.createdAt)}</span>
                      </div>
                      {meeting.segments && meeting.segments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <PlayIcon className="w-3 h-3" />
                          <span>{formatDuration(meeting.segments)}</span>
                        </div>
                      )}
                      {meeting.segmentCount > 0 && (
                        <div className="flex items-center gap-1">
                          <DocumentTextIcon className="w-3 h-3" />
                          <span>{meeting.segmentCount} chapters</span>
                        </div>
                      )}
                    </div>

                    {meeting.summary && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                        {meeting.summary}
                      </p>
                    )}
                  </div>
                  
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex-shrink-0" />
                </div>
              </Link>
            ))}

            {meetings.length > 5 && (
              <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
                <Link 
                  href="/meetings/all"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  View all {meetings.length} meetings →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
