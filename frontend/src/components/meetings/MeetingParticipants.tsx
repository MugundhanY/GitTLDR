import React, { useEffect, useState } from 'react';
import { UserIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface Participant {
  id: string;
  name: string;
  role?: string;
  email?: string;
  speakingTime?: number;
  speakingPercentage?: number;
  avatarUrl?: string;
}

interface MeetingParticipantsProps {
  meetingId: string;
}

export default function MeetingParticipants({ meetingId }: MeetingParticipantsProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpeakingTime, setTotalSpeakingTime] = useState(0);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/participants`);
        if (response.ok) {
          const data = await response.json();
          setParticipants(data.participants || []);
          setTotalSpeakingTime(data.totalSpeakingTime || 0);
        } else {
          console.error('Failed to fetch participants');
          // Fallback to mock data
          setParticipants([
            { id: '1', name: 'Meeting Participant', role: 'Attendee', speakingTime: 60 }
          ]);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
        // Fallback to mock data
        setParticipants([
          { id: '1', name: 'Meeting Participant', role: 'Attendee', speakingTime: 60 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (meetingId) {
      fetchParticipants();
    }
  }, [meetingId]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Mock participants for fallback
  const mockParticipants: Participant[] = [
    { 
      id: '1', 
      name: 'Meeting Participant', 
      role: 'Attendee', 
      speakingTime: 60,
      email: 'participant@example.com',
      avatarUrl: undefined
    }
  ];

  const displayParticipants = participants.length > 0 ? participants : mockParticipants;
  const displayTotalSpeakingTime = totalSpeakingTime > 0 ? totalSpeakingTime : displayParticipants.reduce((sum, p) => sum + (p.speakingTime || 0), 0);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
          <UserGroupIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Participants ({displayParticipants.length})
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total speaking time: {formatTime(displayTotalSpeakingTime)}
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        {displayParticipants.map((participant) => (
          <div 
            key={participant.id}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                {participant.avatarUrl ? (
                  <img 
                    src={participant.avatarUrl} 
                    alt={participant.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {getInitials(participant.name)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-slate-900 dark:text-white truncate">
                  {participant.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  {participant.role && (
                    <>
                      <span className="truncate">{participant.role}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{participant.email}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {formatTime(participant.speakingTime || 0)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {displayTotalSpeakingTime > 0 ? Math.round(((participant.speakingTime || 0) / displayTotalSpeakingTime) * 100) : 0}%
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Speaking Time Distribution */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Speaking Distribution</h3>
        <div className="space-y-2">
          {displayParticipants.map((participant) => {
            const percentage = displayTotalSpeakingTime > 0 ? ((participant.speakingTime || 0) / displayTotalSpeakingTime) * 100 : 0;
            return (
              <div key={participant.id} className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {participant.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
