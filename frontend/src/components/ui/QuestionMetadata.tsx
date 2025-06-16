'use client'

import { useState, useEffect } from 'react'
import { 
  TagIcon, 
  FolderIcon, 
  PencilIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface Question {
  id: string
  query: string
  answer?: string
  repositoryId: string
  repositoryName: string
  createdAt: string
  updatedAt?: string
  status: 'pending' | 'completed' | 'failed'
  confidence?: number
  relevantFiles?: string[]
  isFavorite?: boolean
  tags?: string[]
  category?: string
  notes?: string
}

interface QuestionMetadataProps {
  question: Question
  onUpdate: (updatedQuestion: Question) => void
  className?: string
}

const QuestionMetadata = ({ question, onUpdate, className = '' }: QuestionMetadataProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tags, setTags] = useState<string[]>(question.tags || [])
  const [category, setCategory] = useState(question.category || '')
  const [notes, setNotes] = useState(question.notes || '')
  const [newTag, setNewTag] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Common categories for quick selection
  const commonCategories = [
    'Architecture',
    'Configuration',
    'Development',
    'Security',
    'API',
    'Database',
    'Performance',
    'Testing',
    'Deployment',
    'Debugging'
  ];

  useEffect(() => {
    setTags(question.tags || [])
    setCategory(question.category || '')
    setNotes(question.notes || '')
  }, [question]);
  
  const handleSave = async () => {
    setIsUpdating(true)
      // Create optimistic update object
    const optimisticUpdate = {
      ...question,
      tags: tags.filter((tag: string) => tag.trim()),
      category: category.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString()
    }

    // Apply optimistic update immediately
    onUpdate(optimisticUpdate)
    setIsEditing(false)

    try {
      const response = await fetch('/api/qna', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },        body: JSON.stringify({
          questionId: question.id,
          userId: '1', // Replace with actual user ID
          tags: tags.filter((tag: string) => tag.trim()),
          category: category.trim() || undefined,
          notes: notes.trim() || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        onUpdate(data.question)
      } else {
        console.error('Failed to update question metadata')
        // Revert optimistic update on failure
        onUpdate(question)
        setIsEditing(true) // Re-open editing mode
      }
    } catch (error) {
      console.error('Error updating question metadata:', error)
      // Revert optimistic update on error
      onUpdate(question)
      setIsEditing(true) // Re-open editing mode
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setTags(question.tags || [])
    setCategory(question.category || '')
    setNotes(question.notes || '')
    setIsEditing(false)
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag: string) => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className={`bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-900 dark:text-white">
          Question Metadata
        </h4>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Edit metadata"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {commonCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    category === cat
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Custom category..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal notes about this Q&A..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded transition-colors flex items-center gap-1"
            >
              {isUpdating ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-3 h-3" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Display mode */}
          {category && (
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{category}</span>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex items-start gap-2">
              <TagIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {notes && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Notes:</strong> {notes}
            </div>
          )}

          {!category && tags.length === 0 && !notes && (
            <div className="text-sm text-slate-500 dark:text-slate-400 italic">
              No metadata added yet. Click edit to add categories, tags, or notes.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestionMetadata
