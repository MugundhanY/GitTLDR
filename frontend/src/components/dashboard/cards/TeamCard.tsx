'use client';

import React from 'react';
import Image from 'next/image';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { TeamMember } from '@/types/dashboard';

interface TeamCardProps {
  teamMembers: TeamMember[];
  owner: TeamMember | null;
}

// Utility: Always include owner in normalized team members
function getNormalizedTeamMembers(owner: TeamMember | null, members: TeamMember[]): TeamMember[] {
  if (!owner) return members;
  if (!members || members.length === 0) return [owner];
  const exists = members.some(m => m.id === owner.id);
  return exists ? members : [owner, ...members];
}

export default function TeamCard({ teamMembers, owner }: TeamCardProps) {
  const normalizedTeamMembers = getNormalizedTeamMembers(owner, teamMembers);

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-purple-400/20 to-transparent rounded-full blur-2xl"></div>
      
      <div className="relative p-6 flex flex-col h-full min-h-0">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Team</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active collaborators</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col h-full min-h-0 space-y-4">
          <div className="text-4xl font-black text-slate-900 dark:text-white">
            {normalizedTeamMembers.length > 0 ? normalizedTeamMembers.length : (owner ? 1 : 0)}
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto custom-scrollbar pr-2">
              {normalizedTeamMembers.length === 0 ? (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 font-medium">
                  No team members yet
                </div>
              ) : (
                normalizedTeamMembers.map((member: TeamMember) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300">
                    <div className="relative">
                      <Image src={member.avatarUrl || '/default-avatar.png'} alt={member.name} width={40} height={40} className="rounded-full border-2 border-white/50 dark:border-slate-600/50" />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                        member.status === 'online' ? 'bg-emerald-500' : 
                        member.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{member.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{member.role} • {member.commits} commits</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
