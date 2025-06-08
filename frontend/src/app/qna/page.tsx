'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { 
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Repository {
  id: string
  name: string
  embeddingStatus: string
}

interface Question {
  id: string
  query: string
  answer?: string
  repositoryId: string
  repositoryName: string
  createdAt: string
  status: 'pending' | 'completed' | 'failed'
}

export default function QnAPage() {
  const { selectedRepository } = useRepository()
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAsking, setIsAsking] = useState(false)
  const fetchQuestions = useCallback(async () => {
    if (!selectedRepository?.id) {
      setIsLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/qna')
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedRepository?.id])
  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])
  const handleAskQuestion = async () => {
    if (!newQuestion.trim() || !selectedRepository?.id) return

    setIsAsking(true)
    try {
      const response = await fetch('/api/qna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId: selectedRepository.id,
          question: newQuestion.trim(),
          userId: '1' // Mock user ID
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQuestions([data.question, ...questions])
        setNewQuestion('')
      } else {
        throw new Error('Failed to ask question')
      }
    } catch (error) {
      console.error('Error asking question:', error)
      alert('Failed to ask question. Please try again.')
    } finally {
      setIsAsking(false)
    }  }

  const filteredQuestions = selectedRepository?.id 
    ? questions.filter(q => q.repositoryId === selectedRepository.id)
    : questions

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <QuestionMarkCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading Q&A...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <QuestionMarkCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-300">No repository selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select a repository from the dropdown above to ask questions about your code.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="border-b border-gray-700 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <ChatBubbleLeftRightIcon className="h-8 w-8 mr-3 text-blue-400" />
                Q&A Assistant
              </h1>
              <p className="text-gray-400 mt-1">
                Ask questions about {selectedRepository.name} and get AI-powered answers
              </p>
            </div>
          </div>
        </div>

        {/* Ask Question Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center">
            <QuestionMarkCircleIcon className="h-6 w-6 mr-2 text-blue-400" />
            Ask a Question
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Question
              </label>
              <textarea
                placeholder="What does this code do? How does authentication work? Explain the main architecture..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAskQuestion()}
              />
            </div>

            <Button
              onClick={handleAskQuestion}
              disabled={isAsking || !newQuestion.trim() || !selectedRepository}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-medium disabled:opacity-50"
            >
              {isAsking ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Question...
                </div>
              ) : (
                'Ask AI Assistant'
              )}
            </Button>
          </div>
        </div>

        {/* Questions & Answers */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Recent Questions</h3>
          </div>
          
          <div className="p-6">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <QuestionMarkCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-300 mb-2">No questions yet</h4>
                <p className="text-gray-500">
                  Ask your first question about {selectedRepository.name} to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredQuestions.map((question) => (
                  <div key={question.id} className="border border-gray-700 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-white mb-2">
                          {question.query}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span>{selectedRepository.name}</span>
                          <span>•</span>
                          <span>{new Date(question.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(question.status)}
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(question.status)}`}>
                          {question.status}
                        </span>
                      </div>
                    </div>
                    
                    {question.answer ? (
                      <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-400">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-blue-400">AI Assistant</span>
                        </div>
                        <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {question.answer}
                        </div>
                      </div>
                    ) : question.status === 'pending' ? (
                      <div className="bg-gray-700 rounded-lg p-4 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-300">AI is analyzing your question and the repository...</span>
                      </div>
                    ) : (
                      <div className="bg-red-900 bg-opacity-50 rounded-lg p-4 border border-red-600">
                        <div className="flex items-center gap-2 mb-2">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                          <span className="font-medium text-red-400">Failed to generate answer</span>
                        </div>
                        <p className="text-red-300">
                          There was an issue processing your question. Please try asking again or rephrase your question.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
