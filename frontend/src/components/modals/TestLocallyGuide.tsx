'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CommandLineIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface TestLocallyGuideProps {
  isOpen: boolean
  onClose: () => void
  repoName: string
  issueNumber: number
}

export default function TestLocallyGuide({ isOpen, onClose, repoName, issueNumber }: TestLocallyGuideProps) {
  const zipFileName = `${repoName}-fix-${issueNumber}.zip`

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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl transition-all">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                    <CommandLineIcon className="h-7 w-7" />
                    Test Locally Guide
                  </Dialog.Title>
                  <p className="text-emerald-50 text-sm mt-1">
                    Your test package is ready! Follow these steps to test the AI-generated fix locally.
                  </p>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6">
                  {/* Step 1: Prerequisites */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        1
                      </span>
                      Prerequisites
                    </h3>
                    <div className="ml-9 space-y-2">
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Make sure you have Docker Desktop installed:
                      </p>
                      <a
                        href="https://www.docker.com/products/docker-desktop/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Download Docker Desktop →
                      </a>
                    </div>
                  </div>

                  {/* Step 2: Extract Files */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        2
                      </span>
                      Extract the ZIP File
                    </h3>
                    <div className="ml-9">
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                        Extract the downloaded <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                          {zipFileName}
                        </code> to a folder.
                      </p>
                      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-mono text-slate-700 dark:text-slate-300">📦 {zipFileName}/</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 ml-4">├── README.md</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 ml-4">├── CHANGES.md</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 ml-4">├── Dockerfile</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 ml-4">├── docker-compose.yml</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 ml-4">├── run_tests.sh</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 ml-4">└── (modified code files)</p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Review Changes */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        3
                      </span>
                      Review the Changes
                    </h3>
                    <div className="ml-9">
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                        Read <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">CHANGES.md</code> to understand what the AI changed:
                      </p>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                          <DocumentTextIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>This file shows before/after diffs for each change, making it easy to review what was modified.</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Run Tests */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        4
                      </span>
                      Run Tests Locally
                    </h3>
                    <div className="ml-9 space-y-3">
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Open a terminal in the extracted folder and run:
                      </p>
                      <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4">
                        <p className="text-xs font-mono text-emerald-400 mb-1"># On macOS/Linux:</p>
                        <code className="text-sm font-mono text-slate-100">./run_tests.sh</code>
                        <p className="text-xs font-mono text-emerald-400 mt-3 mb-1"># On Windows:</p>
                        <code className="text-sm font-mono text-slate-100">run_tests.bat</code>
                        <p className="text-xs font-mono text-emerald-400 mt-3 mb-1"># Or use Docker Compose directly:</p>
                        <code className="text-sm font-mono text-slate-100">docker-compose up --build</code>
                      </div>
                    </div>
                  </div>

                  {/* Step 5: Next Steps */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                      Next Steps
                    </h3>
                    <div className="ml-8 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <p>✅ If tests pass: Approve the PR or create your own</p>
                      <p>✏️ If changes needed: Edit the files and re-run tests</p>
                      <p>📝 Full instructions are in the <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">README.md</code></p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Got it!
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
