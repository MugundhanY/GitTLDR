'use client';

import { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  UserGroupIcon, 
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface MeetingMetricsProps {
  meeting: {
    meeting_length?: number;
    segments?: any[];
    participants?: string[];
    status: string;
    createdAt: string;
  };
}

export default function MeetingMetrics({ meeting }: MeetingMetricsProps) {
  const [animatedValues, setAnimatedValues] = useState({
    duration: 0,
    segments: 0,
    participants: 0,
    wordsPerMinute: 0,
    completionRate: 0
  });

  const targetValues = {
    duration: meeting.meeting_length || 0,
    segments: meeting.segments?.length || 0,
    participants: meeting.participants?.length || 0,
    wordsPerMinute: meeting.meeting_length ? 
      Math.round(((meeting.segments || []).reduce((acc, seg) => acc + (seg.segment_text?.split(' ').length || 0), 0)) / (meeting.meeting_length / 60)) : 0,
    completionRate: meeting.status === 'COMPLETED' ? 100 : 
      meeting.status === 'PROCESSING' ? 65 : 
      meeting.status === 'TRANSCRIBING' ? 35 : 
      meeting.status === 'SUMMARIZING' ? 85 : 0
  };

  useEffect(() => {
    const animateValues = () => {
      const duration = 1500; // Animation duration in ms
      const steps = 60; // Number of animation steps
      const stepDuration = duration / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const progress = Math.min(currentStep / steps, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);

        setAnimatedValues({
          duration: Math.round(targetValues.duration * easeOutQuart),
          segments: Math.round(targetValues.segments * easeOutQuart),
          participants: Math.round(targetValues.participants * easeOutQuart),
          wordsPerMinute: Math.round(targetValues.wordsPerMinute * easeOutQuart),
          completionRate: Math.round(targetValues.completionRate * easeOutQuart)
        });

        if (currentStep >= steps) {
          clearInterval(interval);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    };

    const timer = setTimeout(animateValues, 300);
    return () => clearTimeout(timer);
  }, [targetValues]);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const metrics = [
    {
      id: 'duration',
      label: 'Duration',
      value: formatDuration(animatedValues.duration),
      icon: ClockIcon,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'segments',
      label: 'Segments',
      value: animatedValues.segments.toLocaleString(),
      icon: ChartBarIcon,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      id: 'participants',
      label: 'Participants',
      value: animatedValues.participants.toLocaleString(),
      icon: UserGroupIcon,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'wordsPerMinute',
      label: 'Words/Min',
      value: animatedValues.wordsPerMinute.toLocaleString(),
      icon: DocumentTextIcon,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400'
    },
    {
      id: 'completionRate',
      label: 'Completion',
      value: `${animatedValues.completionRate}%`,
      icon: SparklesIcon,
      color: 'from-teal-500 to-blue-500',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      iconColor: 'text-teal-600 dark:text-teal-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <div
          key={metric.id}
          className={`${metric.bgColor} rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] group`}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
              <metric.icon className="w-6 h-6 text-white" />
            </div>
            <div className="w-2 h-2 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 rounded-full opacity-60"></div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {metric.value}
            </p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
          </div>
          
          {/* Subtle animation bar */}
          <div className="mt-4 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${metric.color} transition-all duration-1000 ease-out`}
              style={{
                width: `${metric.id === 'completionRate' ? animatedValues.completionRate : 100}%`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
