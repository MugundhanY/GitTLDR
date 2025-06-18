'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface PreviewableAttachment {
  originalFileName: string
  fileType: string
  downloadUrl: string
}

interface AttachmentPreviewModalProps {
  attachment: PreviewableAttachment | null
  isOpen: boolean
  onClose: () => void
}

const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  attachment,
  isOpen,
  onClose,
}) => {
  if (!attachment) {
    return null
  }

  const renderContent = () => {
    const { fileType, downloadUrl, originalFileName } = attachment

    if (fileType.startsWith('image/')) {
      return (
        <img
          src={downloadUrl}
          alt={originalFileName}
          className="max-w-full max-h-[80vh] object-contain mx-auto"
        />
      )
    }

    if (fileType.includes('pdf') || fileType.startsWith('text/')) {
      return (
        <iframe
          src={downloadUrl}
          title={originalFileName}
          className="w-full h-[80vh] bg-white"
          frameBorder="0"
        />
      )
    }

    return (
      <div className="p-6 text-center">
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
          Preview is not available for this file type.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          You can download the file to view it.
        </p>
      </div>
    )
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-slate-900 dark:text-white flex justify-between items-center"
                >
                  <span>{attachment.originalFileName}</span>
                  <button
                    type="button"
                    className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
                    onClick={onClose}
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </Dialog.Title>
                <div className="mt-4">
                  {renderContent()}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default AttachmentPreviewModal
