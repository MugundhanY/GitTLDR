'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import {
  UsersIcon,
  ShareIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

interface TeamMember {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
  status: 'ACTIVE' | 'PENDING'
}

interface SharedRepository {
  id: string
  name: string
  fullName: string
  description?: string
  owner: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
  sharedAt: string
  stats: {
    files: number
    meetings: number
    questions: number
  }
}

interface ShareSetting {
  id: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
  createdAt: string
}

interface AccessRequest {
  id: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
  message?: string
  status: 'PENDING' | 'APPROVED' | 'DENIED'
  createdAt: string
}

export default function TeamPage() {
  const { selectedRepository } = useRepository()
  const [sharedRepositories, setSharedRepositories] = useState<SharedRepository[]>([])
  const [shareSettings, setShareSettings] = useState<ShareSetting[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'shared-with-me' | 'export-sharing' | 'team-members' | 'access-requests'>('shared-with-me')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [userRole, setUserRole] = useState<'OWNER' | 'MEMBER'>('MEMBER')

  useEffect(() => {
    fetchTeamData()
  }, [selectedRepository])

  const fetchTeamData = async () => {
    setIsLoading(true)
    try {
      // Fetch shared repositories
      const sharedResponse = await fetch('/api/repositories/shared')
      if (sharedResponse.ok) {
        const { sharedRepositories: shared } = await sharedResponse.json()
        setSharedRepositories(shared)
      }

      // Fetch data for current repository
      if (selectedRepository) {
        // Fetch share settings
        const shareResponse = await fetch(`/api/repositories/${selectedRepository.id}/share`)
        if (shareResponse.ok) {
          const { shareSettings: settings } = await shareResponse.json()
          setShareSettings(settings)
        }

        // Fetch team members
        const membersResponse = await fetch(`/api/repositories/${selectedRepository.id}/members`)
        if (membersResponse.ok) {
          const { members, userRole: role } = await membersResponse.json()
          setTeamMembers(members)
          setUserRole(role)
        }

        // Fetch access requests (owner only)
        if (userRole === 'OWNER') {
          const accessResponse = await fetch(`/api/repositories/${selectedRepository.id}/access-requests`)
          if (accessResponse.ok) {
            const { accessRequests } = await accessResponse.json()
            setAccessRequests(accessRequests)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching team data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShareRepository = async () => {
    if (!shareEmail.trim() || !selectedRepository) return
    
    setIsSharing(true)
    try {
      const response = await fetch(`/api/repositories/${selectedRepository.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: shareEmail.trim()
        })
      })

      if (response.ok) {
        await fetchTeamData()
        setShowShareModal(false)
        setShareEmail('')
        toast.success('Repository shared successfully!')
      } else {
        const { error } = await response.json()
        toast.error(error || 'Failed to share repository')
      }
    } catch (error) {
      console.error('Error sharing repository:', error)
      toast.error('Failed to share repository')
    } finally {
      setIsSharing(false)
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    if (!selectedRepository) return
    
    try {
      const response = await fetch(`/api/repositories/${selectedRepository.id}/share?userId=${shareId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTeamData()
        toast.success('Share removed successfully!')
      } else {
        toast.error('Failed to remove share')
      }
    } catch (error) {
      console.error('Error removing share:', error)
      toast.error('Failed to remove share')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedRepository) return
    
    if (!confirm('Are you sure you want to remove this member?')) return
    
    try {
      const response = await fetch(`/api/repositories/${selectedRepository.id}/members?memberId=${memberId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTeamData()
        toast.success('Member removed successfully!')
      } else {
        const { error } = await response.json()
        toast.error(error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    }
  }

  // Handle access request approval/denial
  const handleAccessRequest = async (requestId: string, action: 'APPROVED' | 'DENIED') => {
    if (!selectedRepository) return
    
    try {
      const response = await fetch(`/api/repositories/${selectedRepository.id}/access-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action
        })
      })

      if (response.ok) {
        await fetchTeamData()
        toast.success(`Access request ${action.toLowerCase()} successfully!`)
      } else {
        const { error } = await response.json()
        toast.error(error || `Failed to ${action.toLowerCase()} access request`)
      }
    } catch (error) {
      console.error('Error handling access request:', error)
      toast.error(`Failed to ${action.toLowerCase()} access request`)
    }
  }

  const copyExportLink = (type: 'meetings' | 'files' | 'qna') => {
    if (typeof window !== 'undefined' && selectedRepository) {
      const baseUrl = `${window.location.origin}/repositories/${selectedRepository.id}`
      const exportUrl = `${baseUrl}/${type}?export=true`
      navigator.clipboard.writeText(exportUrl)
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} export link copied to clipboard!`)
    }
  }

  const copyShareURL = () => {
    if (typeof window !== 'undefined' && selectedRepository) {
      const shareUrl = `${window.location.origin}/share/${selectedRepository.id}`
      navigator.clipboard.writeText(shareUrl)
      toast.success('Repository share URL copied to clipboard!')
    }
  }

  const handleExport = async (type: 'meetings' | 'files' | 'qna') => {
    if (!selectedRepository) return
    
    try {
      let exportUrl = ''
      switch (type) {
        case 'meetings':
          exportUrl = `/api/meetings?repositoryId=${selectedRepository.id}&export=true`
          break
        case 'files':
          exportUrl = `/api/repositories/${selectedRepository.id}/files?export=true`
          break
        case 'qna':
          exportUrl = `/api/qna/export?repositoryId=${selectedRepository.id}`
          break
      }
      
      const response = await fetch(exportUrl)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${selectedRepository.name}-${type}-export.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error)
      toast.error(`Failed to export ${type}`)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading team data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Team & Sharing
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage repository access and collaborate with your team
              </p>
            </div>
            
            {selectedRepository && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyExportLink('files')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Copy Export Link
                </button>
                <button
                  onClick={copyShareURL}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <ShareIcon className="w-4 h-4" />
                  Copy Share URL
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ShareIcon className="w-4 h-4" />
                  Share Repository
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6">
            <button
              onClick={() => setActiveTab('shared-with-me')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'shared-with-me'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Shared with Me ({sharedRepositories.length})
            </button>
            {selectedRepository && (
              <button
                onClick={() => setActiveTab('team-members')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'team-members'
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Team Members ({teamMembers.length})
              </button>
            )}
            {selectedRepository && userRole === 'OWNER' && (
              <button
                onClick={() => setActiveTab('access-requests')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'access-requests'
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Access Requests ({accessRequests.filter(req => req.status === 'PENDING').length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('export-sharing')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'export-sharing'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Export & Share ({shareSettings.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === 'shared-with-me' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sharedRepositories.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Shared Repositories
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No repositories have been shared with you yet.
                  </p>
                </div>
              ) : (
                sharedRepositories.map((repo) => (
                  <motion.div
                    key={repo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {repo.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {repo.description || 'No description available'}
                        </p>
                        <div className="flex items-center gap-2">
                          <img
                            src={repo.owner.avatarUrl || '/default-avatar.png'}
                            alt={repo.owner.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            by {repo.owner.name}
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                        <div className="flex items-center gap-1">
                          <EyeIcon className="w-3 h-3" />
                          Member
                        </div>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                          <DocumentTextIcon className="w-4 h-4" />
                          <span className="text-lg font-semibold">{repo.stats.files}</span>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Files</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
                          <VideoCameraIcon className="w-4 h-4" />
                          <span className="text-lg font-semibold">{repo.stats.meetings}</span>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Meetings</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                          <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          <span className="text-lg font-semibold">{repo.stats.questions}</span>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Q&A</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : activeTab === 'team-members' ? (
            <div className="space-y-6">
              {selectedRepository ? (
                <>
                  {/* Team Members List */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Team Members ({teamMembers.length})
                      </h3>
                      {userRole === 'OWNER' && (
                        <button
                          onClick={() => setShowShareModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <UsersIcon className="w-4 h-4" />
                          Add Member
                        </button>
                      )}
                    </div>

                    {teamMembers.length === 0 ? (
                      <div className="text-center py-8">
                        <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No Team Members
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Add team members to collaborate on this repository.
                        </p>
                        {userRole === 'OWNER' && (
                          <button
                            onClick={() => setShowShareModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Add First Member
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatarUrl || '/default-avatar.png'}
                                alt={member.name}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {member.name}
                                  {member.role === 'OWNER' && (
                                    <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded-full">
                                      Owner
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {member.role !== 'OWNER' && (
                                <>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                                    <div className="flex items-center gap-1">
                                      <UsersIcon className="w-3 h-3" />
                                      Member
                                    </div>
                                  </span>
                                  
                                  {userRole === 'OWNER' && (
                                    <button
                                      onClick={() => handleRemoveMember(member.id)}
                                      className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                              
                              {member.role === 'OWNER' && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400">
                                  <div className="flex items-center gap-1">
                                    <UsersIcon className="w-3 h-3" />
                                    Owner
                                  </div>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Select a Repository
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose a repository from the sidebar to view and manage team members.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'access-requests' ? (
            <div className="space-y-6">
              {selectedRepository && userRole === 'OWNER' ? (
                <>
                  {/* Access Requests */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Access Requests ({accessRequests.filter(req => req.status === 'PENDING').length} pending)
                      </h3>
                    </div>

                    {accessRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No Access Requests
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          No one has requested access to this repository yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {accessRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                {request.user.avatarUrl ? (
                                  <img
                                    src={request.user.avatarUrl}
                                    alt={request.user.name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {request.user.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {request.user.name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {request.user.email}
                                </div>
                                {request.message && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    &ldquo;{request.message}&rdquo;
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Requested {new Date(request.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                request.status === 'PENDING'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                                  : request.status === 'APPROVED'
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                              }`}>
                                {request.status}
                              </span>
                              
                              {request.status === 'PENDING' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAccessRequest(request.id, 'APPROVED')}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleAccessRequest(request.id, 'DENIED')}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                  >
                                    Deny
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Access Denied
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Only repository owners can view access requests.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {selectedRepository ? (
                <>
                  {/* Export Options */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <DocumentArrowDownIcon className="w-5 h-5" />
                      Export Repository Data
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Export and share repository data instead of providing direct access. Recipients can view exported files, meetings, and Q&A data.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900 dark:text-blue-300">Files Export</span>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                          Export all file summaries and analysis
                        </p>
                        <button
                          onClick={() => handleExport('files')}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Export Files
                        </button>
                      </div>
                      
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <VideoCameraIcon className="w-5 h-5 text-purple-600" />
                          <span className="font-medium text-purple-900 dark:text-purple-300">Meetings Export</span>
                        </div>
                        <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
                          Export meeting summaries and transcripts
                        </p>
                        <button
                          onClick={() => handleExport('meetings')}
                          className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          Export Meetings
                        </button>
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-900 dark:text-green-300">Q&A Export</span>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                          Export questions and answers
                        </p>
                        <button
                          onClick={() => handleExport('qna')}
                          className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Export Q&A
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Current Shares */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Current Repository Shares
                    </h3>
                    
                    {shareSettings.length === 0 ? (
                      <div className="text-center py-8">
                        <ShareIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Not Shared Yet
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Share this repository with team members or export data to share externally.
                        </p>
                        <button
                          onClick={() => setShowShareModal(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Share Repository
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {shareSettings.map((setting) => (
                          <div
                            key={setting.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={setting.user.avatarUrl || '/default-avatar.png'}
                                alt={setting.user.name}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {setting.user.name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {setting.user.email}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                                <div className="flex items-center gap-1">
                                  <EyeIcon className="w-3 h-3" />
                                  Member
                                </div>
                              </span>
                              
                              <button
                                onClick={() => handleRemoveShare(setting.id)}
                                className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Select a Repository
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose a repository from the sidebar to manage exports and sharing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Share Repository
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Enter user's email address"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShareRepository}
                    disabled={isSharing || !shareEmail.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSharing ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
