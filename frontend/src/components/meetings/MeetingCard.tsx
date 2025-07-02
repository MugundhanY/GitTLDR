import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ClockIcon as ClockSolidIcon } from '@heroicons/react/24/solid';

interface MeetingCardProps {
  meeting: {
    id: string;
    title: string;
    participants: string[];
    duration?: number;
    status: 'uploaded' | 'processing' | 'transcribing' | 'summarizing' | 'completed' | 'failed';
    createdAt: string;
    summary?: string;
    transcript?: string;
    progress?: number;
  };
  getStatusColor: (status: string) => string;
  formatDuration: (seconds?: number) => string;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, getStatusColor, formatDuration }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'processing':
        return (
          <div className="relative">
            <ClockSolidIcon className="w-5 h-5 text-yellow-500 animate-pulse" />
            <div className="absolute -inset-1 bg-yellow-400 rounded-full opacity-20 animate-ping"></div>
          </div>
        )
      case 'transcribing':
        return (
          <div className="relative">
            <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div className="absolute -inset-1 bg-blue-400 rounded-full opacity-20 animate-ping"></div>
          </div>
        )
      case 'summarizing':
        return (
          <div className="relative">
            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className="animate-pulse" />
            </svg>
            <div className="absolute -inset-1 bg-purple-400 rounded-full opacity-20 animate-ping"></div>
          </div>
        )
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-slate-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'processing': return 'Processing'
      case 'transcribing': return 'Transcribing Audio'
      case 'summarizing': return 'Generating Summary'
      case 'failed': return 'Failed'
      case 'uploaded': return 'Uploaded'
      default: return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const getProcessingMessage = (status: string) => {
    switch (status) {
      case 'processing': return 'Processing your meeting recording...'
      case 'transcribing': return 'Converting speech to text using AI...'
      case 'summarizing': return 'Generating insights and key points...'
      default: return 'Processing...'
    }
  }

  return (
  <section className="py-6 first:pt-0 last:pb-0">
    {/* Header */}
    <div className="flex items-center gap-4 mb-2">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white truncate max-w-[220px] md:max-w-[340px]">{meeting.title}</h4>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span>{new Date(meeting.createdAt).toLocaleString()}</span>
          {meeting.duration && <><span>•</span><span>{formatDuration(meeting.duration)}</span></>}
          {meeting.participants.length > 0 && <><span>•</span><span>{meeting.participants.length} participants</span></>}
        </div>
      </div>
      <span className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full border ${getStatusColor(meeting.status)}`}>
        {getStatusIcon(meeting.status)}
        <span>{getStatusText(meeting.status)}</span>
      </span>
    </div>
    {/* Main Content */}
    <div className="flex flex-col gap-4">
      {meeting.participants.length > 0 && (
        <div>
          <span className="text-xs font-medium text-slate-700 dark:text-gray-300">Participants: </span>
          <span className="text-xs text-slate-500 dark:text-gray-400">{meeting.participants.join(', ')}</span>
        </div>
      )}
      {(meeting.status === 'processing' || meeting.status === 'transcribing' || meeting.status === 'summarizing') && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            {getStatusIcon(meeting.status)}
            <span className="text-blue-700 dark:text-blue-400 font-semibold">{getProcessingMessage(meeting.status)}</span>
          </div>
          {meeting.progress !== undefined && (
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${meeting.progress}%` }}
              ></div>
            </div>
          )}
          <p className="text-sm text-blue-600 dark:text-blue-300">
            This usually takes a few minutes depending on the length of your recording.
          </p>
        </div>
      )}
      {meeting.status === 'failed' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700 dark:text-red-400 font-medium">Processing failed</span>
          </div>
          <p className="text-red-700/80 dark:text-red-300/80 text-xs">
            There was an issue processing this meeting. Please try uploading again.
          </p>
        </div>
      )}
      {meeting.status === 'completed' && meeting.summary && (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <h5 className="font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              AI Summary
            </h5>
            <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed">{meeting.summary}</p>
          </div>
          {meeting.transcript && (
            <details className="group">
              <summary className="cursor-pointer font-medium text-slate-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-white flex items-center gap-2 select-none">
                <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                View Full Transcript
              </summary>
              <div className="mt-2 bg-slate-100 dark:bg-gray-950 border border-slate-200 dark:border-gray-700 rounded-lg p-3">
                <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                  {meeting.transcript}
                </p>
              </div>
            </details>
          )}
        </div>
      )}

      {/* Processing Status */}
      {(['processing', 'transcribing', 'summarizing'].includes(meeting.status)) && (
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(meeting.status)}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {getStatusText(meeting.status)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {getProcessingMessage(meeting.status)}
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                meeting.status === 'transcribing' ? 'bg-blue-500 w-1/3' :
                meeting.status === 'summarizing' ? 'bg-purple-500 w-2/3' :
                'bg-yellow-500 w-1/6'
              }`}
            />
          </div>
        </div>
      )}

    </div>
  </section>
);

}

export default MeetingCard;
