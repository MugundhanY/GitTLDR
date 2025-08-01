'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { 
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  CogIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  TrashIcon,
  ArchiveBoxIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  DeviceTabletIcon,
  GlobeAltIcon,
  ClockIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  LinkIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Repository {
  id: string
  name: string
  url: string
  isPrivate: boolean
  lastAnalyzed: string
  status: 'active' | 'archived' | 'error'
  webhookEnabled: boolean
  analysisCount: number
}

interface UserSettings {
  profile: {
    name: string
    email: string
    avatar: string
    bio: string
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    analysisComplete: boolean
    weeklyReports: boolean
    securityAlerts: boolean
  }
  privacy: {
    publicProfile: boolean
    shareAnalytics: boolean
    allowIndexing: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    defaultAnalysisDepth: 'quick' | 'standard' | 'deep'
  }
  repositories: Repository[]
  stats: {
    totalRepositories: number
    activeRepositories: number
    archivedRepositories: number
    totalAnalyses: number
  }
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserSettings>>({})
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch user settings
  const { data: settings, isLoading, error } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      return response.json()
    }
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      if (!response.ok) throw new Error('Failed to update settings')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings updated successfully!')
      setIsEditing(false)
      setFormData({})
    },
    onError: () => {
      toast.error('Failed to update settings')
    }
  })

  // Repository actions
  const archiveRepositoryMutation = useMutation({
    mutationFn: async (repoId: string) => {
      const response = await fetch(`/api/repositories/${repoId}/archive`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to archive repository')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Repository archived successfully!')
      setShowArchiveModal(false)
      setSelectedRepo(null)
    },
    onError: () => {
      toast.error('Failed to archive repository')
    }
  })

  const deleteRepositoryMutation = useMutation({
    mutationFn: async (repoId: string) => {
      const response = await fetch(`/api/repositories/${repoId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete repository')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Repository deleted successfully!')
      setShowDeleteModal(false)
      setSelectedRepo(null)
    },
    onError: () => {
      toast.error('Failed to delete repository')
    }
  })

  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ repoId, enabled }: { repoId: string, enabled: boolean }) => {
      const response = await fetch(`/api/repositories/${repoId}/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      if (!response.ok) throw new Error('Failed to update webhook')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Webhook settings updated!')
    },
    onError: () => {
      toast.error('Failed to update webhook')
    }
  })

  const settingsSections = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'repositories', name: 'Repositories', icon: FolderOpenIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'privacy', name: 'Privacy & Security', icon: ShieldCheckIcon },
    { id: 'preferences', name: 'Preferences', icon: CogIcon }
  ]

  const handleSave = () => {
    if (Object.keys(formData).length > 0) {
      updateSettingsMutation.mutate(formData)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setFormData(settings || {})
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
  }

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof UserSettings],
        [field]: value
      }
    }))
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600">Error loading settings</h2>
            <p className="text-gray-600 mt-2">Please try again later</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'stats', label: 'Statistics', icon: ChartBarIcon },
    { id: 'preferences', label: 'Preferences', icon: CogIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Profile Information</h2>
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={updateSettingsMutation.isPending}
                          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.profile?.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value, 'profile')}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white">{settings?.profile.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email
                      </label>
                      <p className="text-slate-900 dark:text-white">{settings?.profile.email}</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Bio
                      </label>
                      {isEditing ? (
                        <textarea
                          value={formData.profile?.bio || ''}
                          onChange={(e) => handleInputChange('bio', e.target.value, 'profile')}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white">{settings?.profile.bio || 'No bio provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Location
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.profile?.location || ''}
                          onChange={(e) => handleInputChange('location', e.target.value, 'profile')}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white">{settings?.profile.location || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Company
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.profile?.company || ''}
                          onChange={(e) => handleInputChange('company', e.target.value, 'profile')}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white">{settings?.profile.company || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Website
                      </label>
                      {isEditing ? (
                        <input
                          type="url"
                          value={formData.profile?.website || ''}
                          onChange={(e) => handleInputChange('website', e.target.value, 'profile')}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white">
                          {settings?.profile.website ? (
                            <a href={settings.profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {settings.profile.website}
                            </a>
                          ) : (
                            'Not specified'
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        GitHub
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.profile?.github || ''}
                          onChange={(e) => handleInputChange('github', e.target.value, 'profile')}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white">
                          {settings?.profile.github ? (
                            <a href={`https://github.com/${settings.profile.github}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              @{settings.profile.github}
                            </a>
                          ) : (
                            'Not specified'
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Section */}
              {activeSection === 'stats' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Your Statistics</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div 
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                          <GitBranchIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Repositories</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{settings?.stats.repositories}</p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                          <UsersIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Meetings</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{settings?.stats.meetings}</p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                          <SparklesIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-purple-600 dark:text-purple-400">Q&A Questions</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{settings?.stats.qaQuestions}</p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                          <StarIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm text-orange-600 dark:text-orange-400">Credits</p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{settings?.stats.credits}</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Activity</h3>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-5 w-5 text-slate-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          Last active: {new Date(settings?.stats.lastActive || '').toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Section */}
              {activeSection === 'preferences' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Preferences</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Theme
                      </label>
                      <select 
                        value={settings?.preferences.theme || 'system'}
                        onChange={(e) => handleInputChange('theme', e.target.value, 'preferences')}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Language
                      </label>
                      <select 
                        value={settings?.preferences.language || 'en'}
                        onChange={(e) => handleInputChange('language', e.target.value, 'preferences')}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Notifications</h3>
                      <div className="space-y-3">
                        {Object.entries(settings?.preferences.notifications || {}).map(([key, value]) => (
                          <label key={key} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => handleInputChange(`notifications.${key}`, e.target.checked, 'preferences')}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Security Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {settings?.security.twoFactorEnabled ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Enable
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">Account Information</h3>
                        <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>Last password change: {new Date(settings?.security.lastPasswordChange || '').toLocaleDateString()}</p>
                          <p>Active sessions: {settings?.security.activeSessions}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                      <button className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400">
                        Change Password
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
