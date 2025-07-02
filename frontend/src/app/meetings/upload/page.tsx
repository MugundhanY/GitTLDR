'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MeetingUploader from '@/components/meetings/MeetingUploader'
import { 
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  PlayIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function MeetingUploadPage() {
  const router = useRouter()
  const [recentUploads, setRecentUploads] = useState<any[]>([])

  const handleUploadComplete = (meeting: any) => {
    // Add to recent uploads
    setRecentUploads(prev => [meeting, ...prev.slice(0, 4)])
    
    // Show success message or redirect
    setTimeout(() => {
      router.push(`/meetings/${meeting.id}`)
    }, 2000)
  }

  const features = [
    {
      icon: ArrowUpTrayIcon,
      title: 'Easy Upload',
      description: 'Drag and drop your audio or video files. Supports MP3, WAV, M4A, OGG, MP4, and WebM formats up to 100MB.'
    },
    {
      icon: SparklesIcon,
      title: 'AI Processing',
      description: 'Our AI automatically transcribes, summarizes, and extracts key insights from your meetings.'
    },
    {
      icon: DocumentTextIcon,
      title: 'Smart Analysis',
      description: 'Get action items, decisions, and searchable segments with timestamps for easy navigation.'
    },
    {
      icon: PlayIcon,
      title: 'Interactive Playback',
      description: 'Jump to specific moments, search the transcript, and ask questions about your meeting content.'
    }
  ]

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link
                  href="/meetings"
                  className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Upload Meeting
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Transform your recordings into actionable insights
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Upload Area */}
            <div className="lg:col-span-2 space-y-8">
              <MeetingUploader onUploadComplete={handleUploadComplete} />
              
              {/* Recent Uploads */}
              {recentUploads.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Recent Uploads
                  </h2>
                  <div className="space-y-3">
                    {recentUploads.map((meeting) => (
                      <div key={meeting.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <PlayIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900 dark:text-white">{meeting.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <ClockIcon className="w-4 h-4" />
                            <span className="capitalize">{meeting.status}</span>
                            {meeting.participants?.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{meeting.participants.length} participants</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* How it works */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  How it works
                </h2>
                <div className="space-y-4">
                  {[
                    { step: 1, text: 'Upload your meeting recording' },
                    { step: 2, text: 'AI transcribes and analyzes content' },
                    { step: 3, text: 'Get summaries, action items, and insights' },
                    { step: 4, text: 'Search, export, and share results' }
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {item.step}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Features
                </h2>
                <div className="space-y-4">
                  {features.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center">
                        <feature.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  💡 Tips for best results
                </h2>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>• Use clear audio with minimal background noise</li>
                  <li>• Include meeting title and participant names</li>
                  <li>• Recordings up to 2 hours work best</li>
                  <li>• Wait for processing to complete for full features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
