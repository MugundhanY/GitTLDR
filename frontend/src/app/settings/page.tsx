'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { 
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  CogIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PaintBrushIcon,
  LanguageIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  SunIcon,
  MoonIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface UserSettings {
  profile: {
    name: string
    email: string
    avatar: string
    bio: string
    location: string
    website: string
    timezone: string
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    dateFormat: string
    timeFormat: '12h' | '24h'
    notifications: boolean
    autoSave: boolean
    compactMode: boolean
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number
    loginNotifications: boolean
    deviceTracking: boolean
  }
  notifications: {
    email: {
      fileProcessing: boolean
      qaAnswers: boolean
      meetingTranscripts: boolean
      weeklyDigest: boolean
      securityAlerts: boolean
    }
    push: {
      fileProcessing: boolean
      qaAnswers: boolean
      meetingTranscripts: boolean
      mentions: boolean
    }
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatar: '',
      bio: 'Software Developer passionate about AI and automation',
      location: 'San Francisco, CA',
      website: 'https://johndoe.dev',
      timezone: 'America/Los_Angeles'
    },
    preferences: {
      theme: 'system',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      notifications: true,
      autoSave: true,
      compactMode: false
    },
    security: {
      twoFactorEnabled: true,
      sessionTimeout: 30,
      loginNotifications: true,
      deviceTracking: true
    },
    notifications: {
      email: {
        fileProcessing: true,
        qaAnswers: true,
        meetingTranscripts: true,
        weeklyDigest: false,
        securityAlerts: true
      },
      push: {
        fileProcessing: true,
        qaAnswers: false,
        meetingTranscripts: true,
        mentions: true
      }
    }
  })
  
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSavedMessage('Settings saved successfully!')
      setTimeout(() => setSavedMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSavedMessage('Error saving settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const updateNestedSetting = (section: keyof UserSettings, subsection: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...(prev[section] as any)[subsection],
          [key]: value
        }
      }
    }))
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'preferences', name: 'Preferences', icon: CogIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ]

  const themes = [
    { id: 'light', name: 'Light', icon: SunIcon },
    { id: 'dark', name: 'Dark', icon: MoonIcon },
    { id: 'system', name: 'System', icon: ComputerDesktopIcon }
  ]

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <CogIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-slate-600 dark:text-slate-400">Manage your account and preferences</p>
              </div>
            </div>
            
            {/* Save Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              
              {savedMessage && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
                  savedMessage.includes('Error') 
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                }`}>
                  <CheckCircleIcon className="w-4 h-4" />
                  {savedMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sticky top-24">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Profile Information</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={settings.profile.name}
                            onChange={(e) => updateSetting('profile', 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={settings.profile.email}
                            onChange={(e) => updateSetting('profile', 'email', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Bio
                          </label>
                          <textarea
                            value={settings.profile.bio}
                            onChange={(e) => updateSetting('profile', 'bio', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Location
                          </label>
                          <input
                            type="text"
                            value={settings.profile.location}
                            onChange={(e) => updateSetting('profile', 'location', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Website
                          </label>
                          <input
                            type="url"
                            value={settings.profile.website}
                            onChange={(e) => updateSetting('profile', 'website', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Appearance</h2>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            Theme
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {themes.map((theme) => (
                              <button
                                key={theme.id}
                                onClick={() => updateSetting('preferences', 'theme', theme.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                  settings.preferences.theme === theme.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                <theme.icon className="w-5 h-5" />
                                <span className="font-medium">{theme.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Compact Mode
                            </label>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Use a more compact interface layout
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.preferences.compactMode}
                              onChange={(e) => updateSetting('preferences', 'compactMode', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Localization</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Language
                          </label>
                          <select
                            value={settings.preferences.language}
                            onChange={(e) => updateSetting('preferences', 'language', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="zh">Chinese</option>
                            <option value="ja">Japanese</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Time Format
                          </label>
                          <select
                            value={settings.preferences.timeFormat}
                            onChange={(e) => updateSetting('preferences', 'timeFormat', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="12h">12 Hour</option>
                            <option value="24h">24 Hour</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Email Notifications</h2>
                      
                      <div className="space-y-4">
                        {Object.entries(settings.notifications.email).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </label>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {key === 'fileProcessing' && 'Get notified when files are processed'}
                                {key === 'qaAnswers' && 'Get notified when Q&A answers are generated'}
                                {key === 'meetingTranscripts' && 'Get notified when meeting transcripts are ready'}
                                {key === 'weeklyDigest' && 'Receive a weekly summary of your activity'}
                                {key === 'securityAlerts' && 'Get notified about security-related events'}
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => updateNestedSetting('notifications', 'email', key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Push Notifications</h2>
                      
                      <div className="space-y-4">
                        {Object.entries(settings.notifications.push).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </label>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {key === 'fileProcessing' && 'Browser notifications for file processing'}
                                {key === 'qaAnswers' && 'Browser notifications for Q&A answers'}
                                {key === 'meetingTranscripts' && 'Browser notifications for meeting transcripts'}
                                {key === 'mentions' && 'Browser notifications when you are mentioned'}
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => updateNestedSetting('notifications', 'push', key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Security</h2>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Change Password
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Current password"
                                className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                              </button>
                            </div>
                            <input
                              type="password"
                              placeholder="New password"
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            Update Password
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Two-Factor Authentication
                            </label>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Add an extra layer of security to your account
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.security.twoFactorEnabled}
                              onChange={(e) => updateSetting('security', 'twoFactorEnabled', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Login Notifications
                            </label>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Get notified when someone logs into your account
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.security.loginNotifications}
                              onChange={(e) => updateSetting('security', 'loginNotifications', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
                      <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        Danger Zone
                      </h2>
                      
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg p-4">
                        <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Delete Account</h3>
                        <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                          Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
