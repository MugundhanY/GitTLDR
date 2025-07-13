'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import {
  UsersIcon,
  ShareIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

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
  permission: 'VIEW' | 'EDIT'
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
  permission: 'VIEW' | 'EDIT'
  createdAt: string
}

export default function TeamPage() {
  const { selectedRepository } = useRepository()
  const [sharedRepositories, setSharedRepositories] = useState<SharedRepository[]>([])
  const [shareSettings, setShareSettings] = useState<ShareSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'shared-with-me' | 'my-shares'>('shared-with-me')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

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

      // Fetch share settings for current repository
      if (selectedRepository) {
        const shareResponse = await fetch(`/api/repositories/${selectedRepository.id}/share`)
        if (shareResponse.ok) {
          const { shareSettings: settings } = await shareResponse.json()
          setShareSettings(settings)
        }
        
        // Generate share URL
        if (typeof window !== 'undefined') {
          setShareUrl(`${window.location.origin}/repositories/${selectedRepository.id}`)
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
          email: shareEmail,
          permission: sharePermission
        })
      })

      if (response.ok) {
        const { shareSetting } = await response.json()
        setShareSettings(prev => [...prev, shareSetting])
        setShareEmail('')
        setShowShareModal(false)
        alert('Repository shared successfully!')
      } else {
        const { error } = await response.json()
        alert(error || 'Failed to share repository')
      }
    } catch (error) {
      console.error('Error sharing repository:', error)
      alert('Failed to share repository')
    } finally {
      setIsSharing(false)
    }
  }

  const handleRemoveShare = async (userId: string) => {
    if (!selectedRepository) return
    
    try {
      const response = await fetch(`/api/repositories/${selectedRepository.id}/share?userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setShareSettings(prev => prev.filter(setting => setting.user.id !== userId))
        alert('Share removed successfully!')
      } else {
        alert('Failed to remove share')
      }
    } catch (error) {
      console.error('Error removing share:', error)
      alert('Failed to remove share')
    }
  }

  const copyShareUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(shareUrl)
      alert('Share URL copied to clipboard!')
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
                  onClick={copyShareUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Copy URL
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
            <button
              onClick={() => setActiveTab('my-shares')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'my-shares'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              My Shares ({shareSettings.length})
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
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <img
                              src={repo.owner.avatarUrl || '/default-avatar.png'}
                              alt={repo.owner.name}
                              className="w-4 h-4 rounded-full"
                            />
                            {repo.owner.name}
                          </div>
                          <span>•</span>
                          <span>
                            Shared {new Date(repo.sharedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        repo.permission === 'EDIT'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      }`}>
                        {repo.permission === 'EDIT' ? (
                          <div className="flex items-center gap-1">
                            <PencilIcon className="w-3 h-3" />
                            Edit
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" />
                            View
                          </div>
                        )}
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

                    <button
                      onClick={() => window.location.href = `/repositories/${repo.id}`}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Access Repository
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedRepository ? (
                <>
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Repository: {selectedRepository.name}
                    </h3>
                    
                    {shareSettings.length === 0 ? (
                      <div className="text-center py-8">
                        <ShareIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Not Shared Yet
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Share this repository with team members to collaborate.
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
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                setting.permission === 'EDIT'
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                  : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                              }`}>
                                {setting.permission}
                              </span>
                              <button
                                onClick={() => handleRemoveShare(setting.user.id)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                    Choose a repository to manage its sharing settings.
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6"
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
                    placeholder="Enter user's email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permission
                  </label>
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value as 'VIEW' | 'EDIT')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="VIEW">View Only</option>
                    <option value="EDIT">View & Edit</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4">
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
