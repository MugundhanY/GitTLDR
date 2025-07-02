'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon as ClockSolidIcon } from '@heroicons/react/24/solid'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useMeetings } from '@/hooks/useMeetings'
import Link from 'next/link'

export default function AllMeetingsPage() {
  const router = useRouter()
  const { data: meetings = [], isLoading } = useMeetings()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'processing':
        return <ClockSolidIcon className="w-4 h-4 text-yellow-500 animate-pulse" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
      default:
        return <ClockSolidIcon className="w-4 h-4 text-slate-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'processing': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'failed': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (segments: any[]) => {
    if (!segments || segments.length === 0) return 'Unknown'
    const totalDuration = segments.reduce((acc, segment) => acc + (segment.endTime - segment.startTime), 0)
    const minutes = Math.floor(totalDuration / 60)
    const seconds = Math.floor(totalDuration % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Filter meetings based on search and status
  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         meeting.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading all meetings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/meetings')}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Meetings</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {filteredMeetings.length} of {meetings.length} meetings
                  </p>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Meetings Grid */}
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {filteredMeetings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No meetings match your filters' : 'No meetings found'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'Upload your first meeting recording to get started!'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {meeting.title}
                      </h3>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(meeting.status)} flex-shrink-0 ml-2`}>
                        {getStatusIcon(meeting.status)}
                        <span className="capitalize">{meeting.status}</span>
                      </div>
                    </div>

                    {meeting.summary && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-3">
                        {meeting.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatDate(meeting.createdAt)}</span>
                      <div className="flex items-center gap-3">
                        {meeting.segments && meeting.segments.length > 0 && (
                          <span>{formatDuration(meeting.segments)}</span>
                        )}
                        <span>{meeting.segmentCount} chapters</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
