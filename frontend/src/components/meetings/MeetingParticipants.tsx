import React, { useEffect, useState } from 'react';
import { UserIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface Participant {
  id: string;
  name: string;
}

interface MeetingParticipantsProps {
  meetingId: string;
}

export default function MeetingParticipants({ meetingId }: MeetingParticipantsProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/participants`);
        if (response.ok) {
          const data = await response.json();
          setParticipants(data.participants || []);
        } else {
          console.error('Failed to fetch participants');
          setParticipants([]);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    if (meetingId) {
      fetchParticipants();
    }
  }, [meetingId]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-fadeIn">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Participants
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading participants...
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
          <UserGroupIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Participants ({participants.length})
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Meeting attendees
          </p>
        </div>
      </div>
      
      {participants.length === 0 ? (
        <div className="text-center py-8">
          <UserIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            No participants data available
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => (
            <div 
              key={participant.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {getInitials(participant.name)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-slate-900 dark:text-white truncate">
                  {participant.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Meeting participant
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
