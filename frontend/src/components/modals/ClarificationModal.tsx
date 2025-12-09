import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

interface ClarificationModalProps {
  isOpen: boolean
  onClose: () => void
  issueFixId: string
  questions: string[]
  ambiguities: string[]
  confidence: number
  onSubmit: (answers: Array<{ question: string; answer: string }>) => Promise<void>
}

export default function ClarificationModal({
  isOpen,
  onClose,
  issueFixId,
  questions,
  ambiguities,
  confidence,
  onSubmit
}: ClarificationModalProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({ ...prev, [index]: value }))
  }

  const handleSubmit = async () => {
    // Validate all questions answered
    const unanswered = questions.filter((_, i) => !answers[i]?.trim())
    if (unanswered.length > 0) {
      setError('Please answer all questions before submitting.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const formattedAnswers = questions.map((question, i) => ({
        question,
        answer: answers[i]
      }))

      await onSubmit(formattedAnswers)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to submit answers. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl transition-all">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-6">
                  <div className="flex items-center gap-3">
                    <QuestionMarkCircleIcon className="h-8 w-8 text-white" />
                    <div>
                      <Dialog.Title className="text-xl font-bold text-white">
                        Clarification Needed
                      </Dialog.Title>
                      <p className="text-sm text-amber-100 mt-1">
                        Please answer these questions to help generate a better fix
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/20 transition"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {/* Confidence & Ambiguities Info */}
                  <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        AI Confidence: {(confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        {ambiguities.length} {ambiguities.length === 1 ? 'ambiguity' : 'ambiguities'} detected
                      </div>
                    </div>
                    {confidence < 0.5 && (
                      <div className="px-3 py-1 bg-amber-200 dark:bg-amber-800 rounded-full text-xs font-medium text-amber-900 dark:text-amber-100">
                        Low Confidence
                      </div>
                    )}
                  </div>

                  {/* Ambiguities List */}
                  {ambiguities.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Detected Ambiguities:
                      </h3>
                      <ul className="space-y-1.5">
                        {ambiguities.map((amb, i) => (
                          <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>{amb}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Questions */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <QuestionMarkCircleIcon className="h-5 w-5 text-amber-500" />
                      Please Answer These Questions:
                    </h3>

                    {questions.map((question, index) => (
                      <div key={index} className="space-y-2">
                        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold mr-2">
                            {index + 1}
                          </span>
                          {question}
                        </label>
                        <textarea
                          value={answers[index] || ''}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                          placeholder="Type your answer here..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition resize-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {Object.keys(answers).length} / {questions.length} questions answered
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || Object.keys(answers).length < questions.length}
                      className="px-6 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        'Submit Answers'
                      )}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
