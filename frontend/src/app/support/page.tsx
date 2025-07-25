'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { toast } from 'sonner'
import {
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  BugAntIcon,
  LightBulbIcon,
  HeartIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  VideoCameraIcon,
  AcademicCapIcon,
  SparklesIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface SupportTicket {
  id: string
  subject: string
  category: 'bug' | 'feature' | 'question' | 'billing'
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: string
  updatedAt: string
  description: string
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('help')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'question' as 'bug' | 'feature' | 'question' | 'billing',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    description: ''
  })

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketForm)
      })

      if (!response.ok) throw new Error('Failed to submit ticket')

      toast.success('Support ticket submitted successfully!')
      setTicketForm({
        subject: '',
        category: 'question',
        priority: 'medium',
        description: ''
      })
    } catch (error) {
      toast.error('Failed to submit support ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  const faqItems = [
    {
      question: "How do I add a new repository?",
      answer: "Navigate to your dashboard and click the 'Add Repository' button. You can either import from GitHub or manually create a new repository. Make sure you have proper access permissions for private repositories."
    },
    {
      question: "Why is my repository processing taking so long?",
      answer: "Processing time depends on repository size and current server load. Small repositories (< 50 files) process in 1-3 minutes, medium repositories (50-200 files) take 5-10 minutes, and large repositories (200+ files) may take 15-30 minutes. If processing exceeds 1 hour, contact support."
    },
    {
      question: "How are credits calculated and consumed?",
      answer: "Credits are consumed as follows: 1 credit per Q&A question, 5 credits per meeting upload (up to 1 hour), 2 credits per repository analysis, 1 credit per commit analysis, and 3 credits per meeting summary generation. You start with 150 free credits."
    },
    {
      question: "Can I share repositories with team members?",
      answer: "Yes! Use the share button on any repository to generate sharing links or invite team members directly. Shared repositories allow collaborators to view files, ask questions, and see meeting summaries without consuming their own credits."
    },
    {
      question: "What file types are supported for meetings?",
      answer: "We support most audio and video formats including MP3, MP4, WAV, M4A, WebM, MOV, and AVI. Maximum file size is 500MB. For best results, use clear audio recordings with minimal background noise."
    },
    {
      question: "How does the AI Q&A system work?",
      answer: "Our AI analyzes your repository files using vector embeddings and semantic search. When you ask a question, it finds the most relevant code sections and provides context-aware answers with confidence scores and file references."
    },
    {
      question: "Can I edit or customize meeting summaries?",
      answer: "Yes! After a meeting is processed, you can edit the generated summary, add your own notes, create action items, and organize content into custom segments for better team collaboration."
    },
    {
      question: "What happens to my data and privacy?",
      answer: "Your code and meeting data are stored securely with enterprise-grade encryption. We don't train our models on your private data, and you maintain full ownership. You can delete your data at any time from the settings page."
    },
    {
      question: "How do I upgrade or purchase more credits?",
      answer: "Go to the Billing page to purchase credit packages. We offer Starter (500 credits), Professional (1000+100 bonus), Business (2500+500 bonus), and Enterprise (5000+1000 bonus) packages with secure Stripe payments."
    },
    {
      question: "What integrations are available?",
      answer: "We integrate with GitHub for repository imports, Stripe for payments, and support webhook integrations for custom workflows. More integrations (Slack, Microsoft Teams, Jira) are coming soon."
    }
  ]

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full"
          >
            <HeartIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              We're here to help
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-slate-900 dark:text-white"
          >
            Support Center
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto"
          >
            Get help with GitTLDR, find answers to common questions, or contact our support team.
          </motion.p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center">
          <nav className="flex space-x-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {[
              { id: 'help', label: 'Help Center', icon: BookOpenIcon },
              { id: 'faq', label: 'FAQ', icon: QuestionMarkCircleIcon },
              { id: 'contact', label: 'Contact Us', icon: ChatBubbleLeftRightIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {activeTab === 'help' && (
            <div className="space-y-8">
              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: 'Getting Started',
                    description: 'Learn the basics',
                    icon: AcademicCapIcon,
                    color: 'emerald',
                    link: '#getting-started'
                  },
                  {
                    title: 'Video Tutorials',
                    description: 'Watch guides',
                    icon: VideoCameraIcon,
                    color: 'blue',
                    link: '#tutorials'
                  },
                  {
                    title: 'Documentation',
                    description: 'API docs',
                    icon: DocumentTextIcon,
                    color: 'purple',
                    link: '#docs'
                  },
                  {
                    title: 'Feature Requests',
                    description: 'Suggest features',
                    icon: LightBulbIcon,
                    color: 'orange',
                    link: '#features'
                  }
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className={`inline-flex p-2 rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/30 mb-3`}>
                      <item.icon className={`h-5 w-5 text-${item.color}-600 dark:text-${item.color}-400`} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Detailed Help Sections */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Getting Started */}
                <div id="getting-started" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <AcademicCapIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
                    Getting Started
                  </h3>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Step 1:</strong> Connect your GitHub account to import repositories</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Step 2:</strong> Add repositories for AI analysis and Q&A</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Step 3:</strong> Upload meeting recordings for automatic summaries</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Step 4:</strong> Ask questions about your code and meetings</span>
                    </div>
                  </div>
                </div>

                {/* Troubleshooting */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <BugAntIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                    Common Issues
                  </h3>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Repository stuck processing:</strong> Large repos may take 30+ minutes</span>
                    </div>
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Meeting upload failed:</strong> Check file size (max 500MB) and format</span>
                    </div>
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Low confidence answers:</strong> Try more specific questions</span>
                    </div>
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Credits depleted:</strong> Purchase more credits in Billing</span>
                    </div>
                  </div>
                </div>

                {/* Features Overview */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <SparklesIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                    Key Features
                  </h3>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-start">
                      <StarIcon className="h-4 w-4 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>AI-Powered Q&A:</strong> Ask questions about your codebase</span>
                    </div>
                    <div className="flex items-start">
                      <StarIcon className="h-4 w-4 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Meeting Summaries:</strong> Automatic transcription and summaries</span>
                    </div>
                    <div className="flex items-start">
                      <StarIcon className="h-4 w-4 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Team Collaboration:</strong> Share repos and meetings</span>
                    </div>
                    <div className="flex items-start">
                      <StarIcon className="h-4 w-4 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>GitHub Integration:</strong> Seamless repository imports</span>
                    </div>
                  </div>
                </div>

                {/* Best Practices */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <LightBulbIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                    Best Practices
                  </h3>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-start">
                      <LightBulbIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Specific Questions:</strong> Ask detailed, context-specific questions</span>
                    </div>
                    <div className="flex items-start">
                      <LightBulbIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Clean Audio:</strong> Use clear recordings with minimal noise</span>
                    </div>
                    <div className="flex items-start">
                      <LightBulbIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Organized Repos:</strong> Keep repositories well-structured</span>
                    </div>
                    <div className="flex items-start">
                      <LightBulbIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span><strong>Regular Updates:</strong> Re-process repos after major changes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {faqItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                    <QuestionMarkCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
                    {item.question}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.answer}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmitTicket} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="question">General Question</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="billing">Billing Issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Please provide as much detail as possible..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Submit Ticket
                    </>
                  )}
                </button>
              </form>

              {/* Contact Information */}
              <div className="mt-8 grid md:grid-cols-2 gap-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-6">
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2" />
                    Response Time
                  </h3>
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                    We typically respond within 24 hours during business days.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                    <EnvelopeIcon className="h-5 w-5 mr-2" />
                    Direct Email
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    support@gittldr.com
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}