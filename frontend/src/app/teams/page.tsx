'use client';

import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRepository } from '@/contexts/RepositoryContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  CalendarIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  ShieldCheckIcon,
  UserIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joinDate: string;
  lastActive: string;
  permissions: string[];
  repositoriesAccess: number;
  questionsAsked: number;
  meetingsAttended: number;
  isStarred: boolean;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  createdAt: string;
  settings: {
    defaultRole: 'member' | 'viewer';
    allowInvites: boolean;
    requireApproval: boolean;
  };
}

export default function TeamsPage() {
  const { selectedRepository } = useRepository();
  const { isCollapsed } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'admin' | 'member' | 'viewer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Fetch team data
  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team', selectedRepository?.id],
    queryFn: async () => {
      if (!selectedRepository?.id) return null;
      
      // Mock data for now - replace with actual API call
      return {
        team: {
          id: 'team-1',
          name: `${selectedRepository.name} Team`,
          description: 'Development team for this repository',
          createdAt: '2024-01-15T10:00:00Z',
          settings: {
            defaultRole: 'member' as const,
            allowInvites: true,
            requireApproval: false
          },
          members: [
            {
              id: '1',
              name: 'John Doe',
              email: 'john@example.com',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
              role: 'owner' as const,
              status: 'active' as const,
              joinDate: '2024-01-15T10:00:00Z',
              lastActive: '2024-12-02T14:30:00Z',
              permissions: ['admin', 'write', 'read'],
              repositoriesAccess: 5,
              questionsAsked: 24,
              meetingsAttended: 8,
              isStarred: true
            },
            {
              id: '2',
              name: 'Sarah Wilson',
              email: 'sarah@example.com',
              avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
              role: 'admin' as const,
              status: 'active' as const,
              joinDate: '2024-01-20T10:00:00Z',
              lastActive: '2024-12-02T12:15:00Z',
              permissions: ['write', 'read'],
              repositoriesAccess: 3,
              questionsAsked: 18,
              meetingsAttended: 6,
              isStarred: false
            },
            {
              id: '3',
              name: 'Mike Johnson',
              email: 'mike@example.com',
              role: 'member' as const,
              status: 'active' as const,
              joinDate: '2024-02-01T10:00:00Z',
              lastActive: '2024-12-01T16:45:00Z',
              permissions: ['read'],
              repositoriesAccess: 2,
              questionsAsked: 12,
              meetingsAttended: 4,
              isStarred: false
            },
            {
              id: '4',
              name: 'Emily Davis',
              email: 'emily@example.com',
              role: 'member' as const,
              status: 'pending' as const,
              joinDate: '2024-11-30T10:00:00Z',
              lastActive: '',
              permissions: ['read'],
              repositoriesAccess: 0,
              questionsAsked: 0,
              meetingsAttended: 0,
              isStarred: false
            },
            {
              id: '5',
              name: 'David Brown',
              email: 'david@example.com',
              role: 'viewer' as const,
              status: 'inactive' as const,
              joinDate: '2024-01-25T10:00:00Z',
              lastActive: '2024-11-15T09:30:00Z',
              permissions: ['read'],
              repositoriesAccess: 1,
              questionsAsked: 3,
              meetingsAttended: 1,
              isStarred: false
            }
          ]
        }
      };
    },
    enabled: !!selectedRepository?.id
  });

  const team = teamData?.team;

  // Filter and search members
  const filteredMembers = useMemo(() => {
    if (!team?.members) return [];
    
    return team.members.filter(member => {
      const matchesSearch = !searchQuery || 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [team?.members, searchQuery, roleFilter, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!team?.members) return { total: 0, active: 0, pending: 0, admins: 0 };
    
    return {
      total: team.members.length,
      active: team.members.filter(m => m.status === 'active').length,
      pending: team.members.filter(m => m.status === 'pending').length,
      admins: team.members.filter(m => ['owner', 'admin'].includes(m.role)).length
    };
  }, [team?.members]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <CommandLineIcon className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <ShieldCheckIcon className="w-4 h-4 text-blue-500" />;
      case 'member':
        return <UserIcon className="w-4 h-4 text-green-500" />;
      case 'viewer':
        return <EyeIcon className="w-4 h-4 text-slate-500" />;
      default:
        return <UserIcon className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    try {
      // API call would go here
      setInviteEmail('');
      setShowInviteModal(false);
      // Refresh team data
    } catch (error) {
      // Handle error appropriately
    }
  };

  const toggleMemberStar = (memberId: string) => {
    // API call would go here
    // Toggle star status for member
  };

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-md flex items-center justify-center">
                <UserGroupIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-slate-900 dark:text-white">Teams</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">No repository selected</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
                <UserGroupIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                Select a Repository
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Choose a repository from the navigation above to manage team members and permissions.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
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
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                      </>
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in">
                        <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                      </div>
                    )}
                  </div>
                  <div className="animate-in slide-in-from-left duration-500 delay-200">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
                      <UserGroupIcon className="w-6 h-6 text-purple-500" />
                      Team Management
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs sm:text-base">
                      Manage team members and permissions for {selectedRepository.name}
                    </p>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Invite Member</span>
                    <span className="sm:hidden">Invite</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Total Members</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Active</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Pending</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.admins}</div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Admins</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className={`mx-auto px-4 sm:px-8 py-6 sm:py-8 transition-all duration-300 ${
            isCollapsed ? 'max-w-none' : 'max-w-7xl'
          }`}>
            <div className="flex flex-col gap-6">
              {/* Team Members Section */}
              <section className="animate-in fade-in slide-in-from-bottom duration-600 delay-200" aria-label="Team Members">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  {/* Header */}
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center animate-pulse shrink-0">
                          <UserGroupIcon className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-[200px] md:max-w-[320px]">Team Members</h2>
                        <div className="flex items-center gap-1 sm:gap-2 ml-2 flex-wrap min-w-0">
                          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full truncate max-w-[80px] sm:max-w-[120px] md:max-w-[180px]">
                            {filteredMembers.length} members
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
                          placeholder="Search members by name or email..."
                          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                      <div className="bg-white/80 dark:bg-slate-950/80 rounded-2xl shadow p-4 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center mt-4">
                        <div className="flex items-center justify-between mb-2 w-full">
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Role Filter */}
                            <div className="relative">
                              <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as any)}
                                className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm min-w-[120px]"
                              >
                                <option value="all">All Roles</option>
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            </div>
                            {/* Status Filter */}
                            <div className="relative">
                              <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm min-w-[120px]"
                              >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>
                          {/* Clear All Button */}
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setRoleFilter('all');
                              setStatusFilter('all');
                            }}
                            className="text-sm text-purple-700 dark:text-purple-200 hover:text-purple-900 dark:hover:text-purple-100 font-bold px-4 py-2 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900/30 transition-all shadow-sm"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Search Results Info */}
                    {searchQuery && (
                      <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        Found {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                  
                  {/* Members List */}
                  <div className="p-3 sm:p-6 rounded-b-2xl">
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500 dark:text-slate-400">Loading team members...</p>
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
                          <UserGroupIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No members found</h4>
                        <p className="text-slate-600 dark:text-slate-400">
                          {searchQuery ? `No members match "${searchQuery}"` : 'Invite team members to get started!'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredMembers.map((member: TeamMember, idx: number) => (
                          <div
                            key={member.id}
                            style={{
                              animation: `fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both`,
                              animationDelay: `${idx * 60}ms`,
                            }}
                            className="border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-purple-400 outline-none hover:scale-[1.01] overflow-hidden"
                          >
                            <div className="p-4 sm:p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                  {/* Avatar */}
                                  <div className="relative">
                                    {member.avatar ? (
                                      <Image
                                        src={member.avatar}
                                        alt={member.name}
                                        width={48}
                                        height={48}
                                        className="w-12 h-12 rounded-xl object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                                        <span className="text-white font-semibold text-lg">
                                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    {/* Status indicator */}
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                                      member.status === 'active' ? 'bg-green-500' :
                                      member.status === 'pending' ? 'bg-yellow-500' : 'bg-slate-400'
                                    }`} />
                                  </div>
                                  
                                  {/* Member Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                                        {member.name}
                                      </h3>
                                      {getRoleIcon(member.role)}
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(member.status)}`}>
                                        {member.status}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 truncate">
                                      {member.email}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                      <div className="flex items-center gap-1">
                                        <CalendarIcon className="w-4 h-4" />
                                        Joined {formatDate(member.joinDate)}
                                      </div>
                                      {member.lastActive && (
                                        <div className="flex items-center gap-1">
                                          <ClockIcon className="w-4 h-4" />
                                          Last active {formatDate(member.lastActive)}
                                        </div>
                                      )}
                                    </div>
                                    {/* Stats */}
                                    <div className="flex flex-wrap gap-4 mt-3 text-xs">
                                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                                        {member.questionsAsked} Q&As
                                      </span>
                                      <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full">
                                        {member.meetingsAttended} Meetings
                                      </span>
                                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">
                                        {member.repositoriesAccess} Repos
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                  <button
                                    onClick={() => toggleMemberStar(member.id)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  >
                                    {member.isStarred ? (
                                      <StarSolidIcon className="w-5 h-5 text-yellow-500" />
                                    ) : (
                                      <StarIcon className="w-5 h-5 text-slate-400" />
                                    )}
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
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

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Invite Team Member
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700"
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
