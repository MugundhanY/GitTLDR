'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'

interface RepositorySettings {
  general: {
    name: string
    description: string
    visibility: 'public' | 'private'
    defaultBranch: string
    website: string
    topics: string[]
  }
  features: {
    issues: boolean
    projects: boolean
    wiki: boolean
    discussions: boolean
    actions: boolean
    packages: boolean
  }
  security: {
    dependencyAlerts: boolean
    secretScanning: boolean
    privateVulnerabilityReporting: boolean
    branchProtection: boolean
  }
  notifications: {
    pushes: boolean
    pullRequests: boolean
    issues: boolean
    releases: boolean
    discussions: boolean
  }
}

export default function SettingsPage() {
  const { selectedRepository } = useRepository()
  const [settings, setSettings] = useState<RepositorySettings>({
    general: {
      name: '',
      description: '',
      visibility: 'private',
      defaultBranch: 'main',
      website: '',
      topics: []
    },
    features: {
      issues: true,
      projects: true,
      wiki: false,
      discussions: false,
      actions: true,
      packages: false
    },
    security: {
      dependencyAlerts: true,
      secretScanning: true,
      privateVulnerabilityReporting: false,
      branchProtection: true
    },
    notifications: {
      pushes: true,
      pullRequests: true,
      issues: true,
      releases: true,
      discussions: false
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'general' | 'features' | 'security' | 'notifications' | 'danger'>('general')
  const [newTopic, setNewTopic] = useState('')

  useEffect(() => {
    if (selectedRepository) {
      loadSettings()
    }
  }, [selectedRepository])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      // Load settings from repository data and API
      setSettings(prev => ({
        ...prev,        general: {
          name: selectedRepository?.name || '',
          description: selectedRepository?.description || '',
          visibility: selectedRepository?.private ? 'private' : 'public',
          defaultBranch: 'main',
          website: selectedRepository?.html_url || '',
          topics: []
        }
      }))
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Mock save - replace with actual API call
      console.log('Saving settings:', settings)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateSettings = (section: keyof RepositorySettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const addTopic = () => {
    if (newTopic.trim() && !settings.general.topics.includes(newTopic.trim())) {
      updateSettings('general', 'topics', [...settings.general.topics, newTopic.trim()])
      setNewTopic('')
    }
  }

  const removeTopic = (topic: string) => {
    updateSettings('general', 'topics', settings.general.topics.filter(t => t !== topic))
  }

  const sections = [
    { id: 'general', name: 'General', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'features', name: 'Features', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-.42-.94l1.459-2.043a2 2 0 00-.205-2.687L16.146 8.146a2 2 0 00-2.687-.205l-2.043 1.459a6.002 6.002 0 00-.94-.42l-.477-2.387a2 2 0 00-1.566-1.548l-2.866-.716a2 2 0 00-2.312 1.651l-.477 2.387a6.002 6.002 0 00-.94.42L.447 6.328a2 2 0 00-2.687.205L-3.854 8.146a2 2 0 00-.205 2.687L-2.6 12.876a6.002 6.002 0 00-.42.94l-2.387.477a2 2 0 00-1.548 1.566l-.716 2.866a2 2 0 001.651 2.312l2.387.477a6.002 6.002 0 00.42.94l-1.459 2.043a2 2 0 00.205 2.687L-2.854 25.854a2 2 0 002.687.205l2.043-1.459a6.002 6.002 0 00.94.42l.477 2.387a2 2 0 001.566 1.548l2.866.716a2 2 0 002.312-1.651l.477-2.387a6.002 6.002 0 00.94-.42l2.043 1.459a2 2 0 002.687-.205L25.854 22.854a2 2 0 00.205-2.687L24.6 18.124a6.002 6.002 0 00.42-.94l2.387-.477a2 2 0 001.548-1.566l.716-2.866a2 2 0 00-1.651-2.312l-2.387-.477a6.002 6.002 0 00-.42-.94l1.459-2.043a2 2 0 00-.205-2.687L22.854 3.146a2 2 0 00-2.687-.205l-2.043 1.459a6.002 6.002 0 00-.94-.42L16.707.593a2 2 0 00-1.566-1.548l-2.866-.716a2 2 0 00-2.312 1.651L9.486 2.367a6.002 6.002 0 00-.94.42L6.503 1.328a2 2 0 00-2.687.205L1.203 4.146a2 2 0 00-.205 2.687L2.457 8.876a6.002 6.002 0 00-.42.94L-.35 10.293a2 2 0 00-1.548 1.566l-.716 2.866a2 2 0 001.651 2.312l2.387.477a6.002 6.002 0 00.42.94l-1.459 2.043a2 2 0 00.205 2.687L3.203 25.797a2 2 0 002.687.205l2.043-1.459a6.002 6.002 0 00.94.42l.477 2.387a2 2 0 001.566 1.548l2.866.716a2 2 0 002.312-1.651l.477-2.387a6.002 6.002 0 00.94-.42l2.043 1.459a2 2 0 002.687-.205L25.444 21.556a2 2 0 00.205-2.687l-1.459-2.043a6.002 6.002 0 00.42-.94l2.387-.477a2 2 0 001.548-1.566l.716-2.866a2 2 0 00-1.651-2.312l-2.387-.477a6.002 6.002 0 00-.42-.94l1.459-2.043z' },
    { id: 'security', name: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'notifications', name: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'danger', name: 'Danger Zone', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ]

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Select a Repository</h3>
          <p className="text-gray-400">Choose a repository from the dropdown above to manage settings.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
              </svg>
              {section.name}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="border-b border-gray-800 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Repository Settings</h1>
                <p className="text-gray-400">{selectedRepository.full_name}</p>
              </div>
            </div>
          </div>

          {/* Settings Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-400">Loading settings...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {activeSection === 'general' && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">General Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Repository Name</label>
                      <input
                        type="text"
                        value={settings.general.name}
                        onChange={(e) => updateSettings('general', 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                      <textarea
                        value={settings.general.description}
                        onChange={(e) => updateSettings('general', 'description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="A brief description of this repository"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                      <input
                        type="url"
                        value={settings.general.website}
                        onChange={(e) => updateSettings('general', 'website', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Visibility</label>
                      <select
                        value={settings.general.visibility}
                        onChange={(e) => updateSettings('general', 'visibility', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Topics</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {settings.general.topics.map((topic) => (
                          <span
                            key={topic}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-900/20 text-blue-400 border border-blue-800 rounded-full text-sm"
                          >
                            {topic}
                            <button
                              onClick={() => removeTopic(topic)}
                              className="ml-1 text-blue-400 hover:text-blue-300"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Add a topic..."
                        />
                        <button
                          onClick={addTopic}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'features' && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Repository Features</h2>
                  <div className="space-y-4">
                    {Object.entries(settings.features).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-3 border-b border-gray-700">
                        <div>
                          <h3 className="text-white font-medium capitalize">{key}</h3>
                          <p className="text-sm text-gray-400">
                            {key === 'issues' && 'Track bugs and feature requests'}
                            {key === 'projects' && 'Organize and track work with project boards'}
                            {key === 'wiki' && 'Create and maintain documentation'}
                            {key === 'discussions' && 'Enable community discussions'}
                            {key === 'actions' && 'Automate workflows with GitHub Actions'}
                            {key === 'packages' && 'Host and manage packages'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => updateSettings('features', key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Security Settings</h2>
                  <div className="space-y-4">
                    {Object.entries(settings.security).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-3 border-b border-gray-700">
                        <div>
                          <h3 className="text-white font-medium">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {key === 'dependencyAlerts' && 'Get notified about vulnerable dependencies'}
                            {key === 'secretScanning' && 'Scan for exposed secrets and tokens'}
                            {key === 'privateVulnerabilityReporting' && 'Allow private vulnerability reports'}
                            {key === 'branchProtection' && 'Protect important branches from force pushes'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => updateSettings('security', key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Notification Settings</h2>
                  <div className="space-y-4">
                    {Object.entries(settings.notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-3 border-b border-gray-700">
                        <div>
                          <h3 className="text-white font-medium">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {key === 'pushes' && 'Notifications for new commits and pushes'}
                            {key === 'pullRequests' && 'Notifications for pull request activity'}
                            {key === 'issues' && 'Notifications for issue updates'}
                            {key === 'releases' && 'Notifications for new releases'}
                            {key === 'discussions' && 'Notifications for discussion activity'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => updateSettings('notifications', key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'danger' && (
                <div className="bg-gray-900 border border-red-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-red-400 mb-6">Danger Zone</h2>
                  <div className="space-y-6">
                    <div className="border border-red-700 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Archive Repository</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Archive this repository to make it read-only. It will be hidden from most views.
                      </p>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        Archive Repository
                      </button>
                    </div>

                    <div className="border border-red-700 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Transfer Ownership</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Transfer this repository to another user or organization.
                      </p>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        Transfer Repository
                      </button>
                    </div>

                    <div className="border border-red-700 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Delete Repository</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Permanently delete this repository. This action cannot be undone.
                      </p>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        Delete Repository
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-6 border-t border-gray-800">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
