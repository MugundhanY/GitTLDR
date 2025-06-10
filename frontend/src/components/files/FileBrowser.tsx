'use client'

import { FileItem } from './types'
import { getFileIcon, formatFileSize, formatDate } from './FileIconUtils'

interface FileBrowserProps {
  files: FileItem[]
  filteredFiles: FileItem[]
  selectedFile: FileItem | null
  isLoading: boolean
  currentPath: string
  onFileClick: (file: FileItem) => void
}

interface FolderNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children: Map<string, FolderNode>
  file?: FileItem
}

export default function FileBrowser({
  files,
  filteredFiles,
  selectedFile,
  isLoading,
  currentPath,
  onFileClick
}: FileBrowserProps) {  // Build folder structure from file paths
  const buildFolderStructure = (files: FileItem[]): FolderNode[] => {
    const root = new Map<string, FolderNode>()
    
    for (const file of files) {
      // Handle paths - split by '/' and filter empty parts
      const pathParts = file.path.split('/').filter(Boolean)
      
      // If path is empty or no parts, treat as root file with the file name
      if (pathParts.length === 0) {
        const fileName = file.name
        root.set(fileName, {
          name: fileName,
          path: fileName,
          type: 'file',
          children: new Map(),
          file: file
        })
        continue
      }
      
      // If path has only one part and it matches the filename, it's a root file
      if (pathParts.length === 1 && pathParts[0] === file.name) {
        root.set(file.name, {
          name: file.name,
          path: file.path,
          type: 'file',
          children: new Map(),
          file: file
        })
        continue
      }

      // Build nested structure for files in subdirectories
      let currentLevel = root
      let builtPath = ''
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i]
        builtPath = builtPath ? `${builtPath}/${part}` : part
        
        if (!currentLevel.has(part)) {
          const isLastPart = i === pathParts.length - 1
          currentLevel.set(part, {
            name: part,
            path: builtPath,
            type: isLastPart ? 'file' : 'dir',
            children: new Map(),
            file: isLastPart ? file : undefined
          })
        }
        
        if (i < pathParts.length - 1) {
          currentLevel = currentLevel.get(part)!.children
        }
      }
    }
    
    // Convert to array and sort (directories first, then files)
    return Array.from(root.values()).sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }
  // Get files to display based on current path
  const getDisplayFiles = (): FolderNode[] => {
    // Always show the complete folder structure, but we'll navigate through it
    const folderStructure = buildFolderStructure(filteredFiles)
    
    // If we're at root, return the root structure
    if (currentPath === '/' || currentPath === '') {
      return folderStructure
    }
    
    // Navigate to the current path in the folder structure
    const pathParts = currentPath.split('/').filter(Boolean)
    let currentNodes = folderStructure
    
    for (const part of pathParts) {
      const foundNode = currentNodes.find(node => node.name === part)
      if (foundNode && foundNode.type === 'dir') {
        currentNodes = Array.from(foundNode.children.values()).sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
      } else {
        // Path not found, return empty
        return []
      }
    }
    
    return currentNodes
  }

  const displayFiles = getDisplayFiles()

  const handleItemClick = (node: FolderNode) => {
    if (node.type === 'dir') {
      // Create a virtual directory FileItem
      const dirItem: FileItem = {
        id: `dir_${node.path}`,
        name: node.name,
        path: node.path,
        type: 'dir'
      }
      onFileClick(dirItem)    } else if (node.file) {
      onFileClick(node.file)
    }
  }
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          File Browser
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {filteredFiles.length} of {files.length} items
        </p>
      </div>
      
      <div className="max-h-[600px] overflow-y-auto">        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-teal-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Loading files...</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fetching repository structure</p>
          </div>
        ) : filteredFiles.length === 0 ? (          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-full">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {files.length === 0 ? 'Repository files are being processed' : 'No files match your filters'}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {files.length === 0 
                ? 'Files are being analyzed and will appear here once processing is complete.' 
                : 'Try adjusting your search or filters to see more results.'
              }
            </p>
            {files.length === 0 && (
              <div className="inline-flex items-center px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-emerald-700 dark:text-emerald-300">Processing in progress...</span>
              </div>
            )}
          </div>) : (          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {displayFiles.map((node) => (
              <div 
                key={node.path}
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors ${
                  selectedFile?.id === node.file?.id 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-r-4 border-emerald-500' 
                    : ''
                }`}
                onClick={() => handleItemClick(node)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {node.type === 'dir' ? (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    ) : (
                      node.file && getFileIcon(node.file)
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                        {node.name}
                        {node.type === 'dir' && <span className="text-slate-500 ml-1">/</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {node.file?.language && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {node.file.language}
                          </span>
                        )}
                        {node.file?.hasContent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            ✓ Content
                          </span>
                        )}
                        {node.type === 'dir' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                            📁 Folder
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400 ml-2">
                    {node.file?.size && <div>{formatFileSize(node.file.size)}</div>}
                    {node.file?.lastModified && <div className="mt-1">{formatDate(node.file.lastModified)}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
