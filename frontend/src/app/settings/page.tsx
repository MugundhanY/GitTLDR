'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  CogIcon,
  FolderOpenIcon,
  TrashIcon,
  ArchiveBoxIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  LinkIcon,
  ChevronRightIcon
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
    location: string
    company: string
    website: string
    twitterUsername: string
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
  const { refreshRepositories } = useRepository()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
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
      refreshRepositories() // Refresh sidebar
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
      refreshRepositories() // Refresh sidebar
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
    // Special handling for theme changes
    if (section === 'preferences' && field === 'theme') {
      setTheme(value) // Update global theme immediately
    }
    
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 dark:text-slate-500">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Failed to load settings</h3>
          <p className="text-slate-600 dark:text-slate-400">Please try refreshing the page.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-600 via-emerald-500 to-lime-400 bg-clip-text text-transparent">Settings</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">Manage your account, repositories, and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-12">
          {/* Sidebar */}
          <aside className="lg:col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col gap-2 shadow-md sticky top-8 h-fit">
            <nav className="flex flex-col gap-2">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl text-left text-base font-semibold transition-all ${
                    activeSection === section.id
                      ? 'bg-gradient-to-r from-green-50 to-lime-100 dark:from-green-900/40 dark:to-lime-800/40 text-green-700 dark:text-lime-200 border border-green-200 dark:border-green-700 shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  {section.name}
                  <ChevronRightIcon className="w-4 h-4 ml-auto" />
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-1 flex flex-col gap-12">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 shadow-lg">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-100 dark:border-slate-700 pb-6 mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Profile Information</h2>
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg text-base font-semibold"
                      >
                        <PencilIcon className="w-5 h-5" />
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={handleCancel}
                          className="px-6 py-3 text-slate-600 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-base font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg text-base font-semibold"
                        >
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="flex flex-col gap-2">
                      <label className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={isEditing ? formData.profile?.name || '' : settings?.profile?.name || ''}
                        onChange={(e) => handleInputChange('profile', 'name', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-5 py-4 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-400 transition-all focus:shadow-lg hover:shadow"
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Email</label>
                      <input
                        type="email"
                        value={isEditing ? formData.profile?.email || '' : settings?.profile?.email || ''}
                        onChange={(e) => handleInputChange('profile', 'email', e.target.value)}
                        disabled={true}
                        className="w-full px-5 py-4 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl placeholder-slate-400 dark:placeholder-slate-400 transition-all focus:shadow-lg hover:shadow"
                        title="Email cannot be changed as it's linked to your GitHub account"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Location</label>
                      <input
                        type="text"
                        value={isEditing ? formData.profile?.location || '' : settings?.profile?.location || ''}
                        onChange={(e) => handleInputChange('profile', 'location', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-5 py-4 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-400 transition-all focus:shadow-lg hover:shadow"
                        placeholder="e.g. San Francisco, CA"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Company</label>
                      <input
                        type="text"
                        value={isEditing ? formData.profile?.company || '' : settings?.profile?.company || ''}
                        onChange={(e) => handleInputChange('profile', 'company', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-5 py-4 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-400 transition-all focus:shadow-lg hover:shadow"
                        placeholder="e.g. Acme Inc."
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Website</label>
                      <input
                        type="url"
                        value={isEditing ? formData.profile?.website || '' : settings?.profile?.website || ''}
                        onChange={(e) => handleInputChange('profile', 'website', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-5 py-4 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-400 transition-all focus:shadow-lg hover:shadow"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Twitter Username</label>
                      <input
                        type="text"
                        value={isEditing ? formData.profile?.twitterUsername || '' : settings?.profile?.twitterUsername || ''}
                        onChange={(e) => handleInputChange('profile', 'twitterUsername', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-5 py-4 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-400 transition-all focus:shadow-lg hover:shadow"
                        placeholder="username (without @)"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-8">
                    <label className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Bio</label>
                    <textarea
                      value={isEditing ? formData.profile?.bio || '' : settings?.profile?.bio || ''}
                      onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
                      disabled={!isEditing}
                      rows={4}
                      className="w-full px-5 py-4 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-400 transition-all focus:shadow-lg hover:shadow"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              )}

              {/* Repositories Section */}
              {activeSection === 'repositories' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Repository Management</h2>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your connected repositories and their settings</p>
                    </div>
                    <button 
                      onClick={() => router.push('/repositories/create')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Repository
                    </button>
                  </div>

                  {/* Repository Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total', value: settings?.stats?.totalRepositories || 0, color: 'blue' },
                      { label: 'Active', value: settings?.stats?.activeRepositories || 0, color: 'green' },
                      { label: 'Archived', value: settings?.stats?.archivedRepositories || 0, color: 'yellow' },
                      { label: 'Analyses', value: settings?.stats?.totalAnalyses || 0, color: 'purple' }
                    ].map((stat, index) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Repository List */}
                  <div className="space-y-3">
                    {settings?.repositories?.map((repo) => (
                      <div key={repo.id} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              repo.status === 'active' ? 'bg-green-500' :
                              repo.status === 'archived' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-slate-900 dark:text-white">{repo.name}</h3>
                                {repo.isPrivate ? (
                                  <EyeSlashIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                ) : (
                                  <EyeIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{repo.url}</p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                <span>Last analyzed: {repo.lastAnalyzed}</span>
                                <span>•</span>
                                <span>{repo.analysisCount} analyses</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Webhook Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={repo.webhookEnabled}
                                onChange={(e) => toggleWebhookMutation.mutate({ 
                                  repoId: repo.id, 
                                  enabled: e.target.checked 
                                })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <LinkIcon className="w-4 h-4 text-slate-400" />
                            </label>

                            {/* Archive Button */}
                            {repo.status === 'active' && (
                              <button
                                onClick={() => {
                                  setSelectedRepo(repo)
                                  setShowArchiveModal(true)
                                }}
                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Archive repository"
                              >
                                <ArchiveBoxIcon className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                setSelectedRepo(repo)
                                setShowDeleteModal(true)
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete repository"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!settings?.repositories?.length && (
                    <div className="text-center py-12">
                      <FolderOpenIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No repositories connected</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">Connect your first repository to get started with AI analysis</p>
                      <button 
                        onClick={() => router.push('/repositories/create')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Connect Repository
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                      { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive browser push notifications' },
                      { key: 'analysisComplete', label: 'Analysis Complete', description: 'Notify when repository analysis is finished' },
                      { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly activity summaries' },
                      { key: 'securityAlerts', label: 'Security Alerts', description: 'Get notified of security issues in your code' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">{item.label}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings?.notifications?.[item.key as keyof typeof settings.notifications] || false}
                            onChange={(e) => handleInputChange('notifications', item.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Section */}
              {activeSection === 'privacy' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Privacy & Security</h2>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheckIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Your data is secure</h3>
                        <p className="text-sm text-blue-800 dark:text-blue-300">We use industry-standard encryption and security practices to protect your code and data.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'publicProfile', label: 'Public Profile', description: 'Allow others to view your public profile and statistics' },
                      { key: 'shareAnalytics', label: 'Share Analytics', description: 'Help improve our service by sharing anonymous usage data' },
                      { key: 'allowIndexing', label: 'Search Engine Indexing', description: 'Allow search engines to index your public repositories' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-700">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">{item.label}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings?.privacy?.[item.key as keyof typeof settings.privacy] || false}
                            onChange={(e) => handleInputChange('privacy', item.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferences Section */}
              {activeSection === 'preferences' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Preferences</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</label>
                      <select
                        value={theme}
                        onChange={(e) => handleInputChange('preferences', 'theme', e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Language</label>
                      <select
                        value={settings?.preferences?.language || 'en'}
                        onChange={(e) => handleInputChange('preferences', 'language', e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Timezone</label>
                      <select
                        value={settings?.preferences?.timezone || 'UTC'}
                        onChange={(e) => handleInputChange('preferences', 'timezone', e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Analysis Depth</label>
                      <select
                        value={settings?.preferences?.defaultAnalysisDepth || 'standard'}
                        onChange={(e) => handleInputChange('preferences', 'defaultAnalysisDepth', e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="quick">Quick (Fast, basic insights)</option>
                        <option value="standard">Standard (Balanced speed and depth)</option>
                        <option value="deep">Deep (Comprehensive analysis)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Delete Repository Modal */}
      {showDeleteModal && selectedRepo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Repository</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete <strong>{selectedRepo.name}</strong>? This action cannot be undone and will remove all analysis data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedRepo(null)
                }}
                className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRepositoryMutation.mutate(selectedRepo.id)}
                disabled={deleteRepositoryMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteRepositoryMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Repository Modal */}
      {showArchiveModal && selectedRepo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <ArchiveBoxIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Archive Repository</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to archive <strong>{selectedRepo.name}</strong>? This will stop all analysis and webhooks, but preserve existing data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowArchiveModal(false)
                  setSelectedRepo(null)
                }}
                className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => archiveRepositoryMutation.mutate(selectedRepo.id)}
                disabled={archiveRepositoryMutation.isPending}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                {archiveRepositoryMutation.isPending ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
