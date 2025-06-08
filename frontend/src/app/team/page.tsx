'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'

interface TeamMember {
  id: string
  name: string
  username: string
  email: string
  avatar: string
  role: 'owner' | 'admin' | 'member' | 'contributor'
  joinedAt: string
  lastActive: string
  contributions: {
    commits: number
    pullRequests: number
    issues: number
  }
}

interface Contributor {
  username: string
  contributions: number
  avatar: string
}

export default function TeamPage() {
  const { selectedRepository } = useRepository()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'contributors'>('members')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    fetchTeamData()
  }, [selectedRepository])

  const fetchTeamData = async () => {
    setIsLoading(true)
    try {
      // Mock data for demonstration - replace with actual API call
      const mockMembers: TeamMember[] = [
        {
          id: '1',
          name: 'Alice Johnson',
          username: 'alice-dev',
          email: 'alice@company.com',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b900?w=150',
          role: 'owner',
          joinedAt: '2023-01-15T10:00:00Z',
          lastActive: '2024-01-16T15:30:00Z',
          contributions: {
            commits: 245,
            pullRequests: 67,
            issues: 23
          }
        },
        {
          id: '2',
          name: 'Bob Smith',
          username: 'bob-engineer',
          email: 'bob@company.com',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          role: 'admin',
          joinedAt: '2023-02-20T14:00:00Z',
          lastActive: '2024-01-15T09:45:00Z',
          contributions: {
            commits: 189,
            pullRequests: 42,
            issues: 31
          }
        },
        {
          id: '3',
          name: 'Charlie Davis',
          username: 'charlie-code',
          email: 'charlie@company.com',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          role: 'member',
          joinedAt: '2023-06-10T09:30:00Z',
          lastActive: '2024-01-14T11:20:00Z',
          contributions: {
            commits: 156,
            pullRequests: 38,
            issues: 19
          }
        },
        {
          id: '4',
          name: 'Diana Wilson',
          username: 'diana-dev',
          email: 'diana@company.com',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
          role: 'member',
          joinedAt: '2023-08-05T16:00:00Z',
          lastActive: '2024-01-13T14:15:00Z',
          contributions: {
            commits: 98,
            pullRequests: 24,
            issues: 12
          }
        }
      ]

      const mockContributors: Contributor[] = [
        { username: 'external-dev-1', contributions: 15, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
        { username: 'oss-contributor', contributions: 8, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
        { username: 'bug-hunter', contributions: 5, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
        { username: 'doc-writer', contributions: 3, avatar: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150' }
      ]

      setTeamMembers(selectedRepository ? mockMembers : [])
      setContributors(selectedRepository ? mockContributors : [])
    } catch (error) {
      console.error('Error fetching team data:', error)
      setTeamMembers([])
      setContributors([])
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-900/20 text-purple-400 border-purple-800'
      case 'admin': return 'bg-blue-900/20 text-blue-400 border-blue-800'
      case 'member': return 'bg-green-900/20 text-green-400 border-green-800'
      case 'contributor': return 'bg-gray-800 text-gray-400 border-gray-700'
      default: return 'bg-gray-800 text-gray-400 border-gray-700'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    try {
      // Mock invite functionality - replace with actual API call
      console.log('Inviting user:', inviteEmail)
      setInviteEmail('')
      setShowInviteModal(false)
      // Show success message
    } catch (error) {
      console.error('Error sending invite:', error)
    }
  }

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Select a Repository</h3>
          <p className="text-gray-400">Choose a repository from the dropdown above to manage team members.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Repository Header */}
        <div className="border-b border-gray-800 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Team</h1>
                <p className="text-gray-400">{selectedRepository.full_name}</p>
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invite Member
            </button>
          </div>
          <p className="text-gray-300 mt-4">
            Manage team members and contributors for this repository. View contributions and control access levels.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Team Members ({teamMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('contributors')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'contributors'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Contributors ({contributors.length})
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-400">Loading team data...</span>
          </div>
        ) : activeTab === 'members' ? (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                      <p className="text-gray-400">@{member.username}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                    <button className="text-gray-400 hover:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Commits</div>
                    <div className="text-xl font-bold text-white">{member.contributions.commits}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Pull Requests</div>
                    <div className="text-xl font-bold text-white">{member.contributions.pullRequests}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Issues</div>
                    <div className="text-xl font-bold text-white">{member.contributions.issues}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Last Active</div>
                    <div className="text-sm font-medium text-white">{formatDate(member.lastActive)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {contributors.map((contributor) => (
              <div key={contributor.username} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={contributor.avatar}
                      alt={contributor.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-white">@{contributor.username}</h3>
                      <p className="text-sm text-gray-400">{contributor.contributions} contributions</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 transition-colors">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-gray-300 font-medium">Total Members</span>
            </div>
            <div className="text-2xl font-bold text-white">{teamMembers.length}</div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-300 font-medium">Total Commits</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {teamMembers.reduce((sum, member) => sum + member.contributions.commits, 0)}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-gray-300 font-medium">External Contributors</span>
            </div>
            <div className="text-2xl font-bold text-white">{contributors.length}</div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-white mb-4">Invite Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleInvite}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                >
                  Send Invite
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 text-gray-300 rounded-md font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
