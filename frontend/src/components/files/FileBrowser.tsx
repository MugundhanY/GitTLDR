'use client'

import { useState } from 'react'
import { FileItem } from './types'
import { getFileIcon, formatFileSize } from './FileIconUtils'

interface FileBrowserProps {
  files: FileItem[]
  filteredFiles: FileItem[]
  selectedFile: FileItem | null
  isLoading: boolean
  currentPath: string
  onFileClick: (file: FileItem) => void
}

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children: TreeNode[]
  file?: FileItem
  depth: number
}

export default function FileBrowser({
  files,
  filteredFiles,
  selectedFile,
  isLoading,
  currentPath,
  onFileClick
}: FileBrowserProps) {  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([
    'src', 'app', 'components', 'lib', 'utils', 'pages', 'public', 'docs',
    'api', 'auth', 'dashboard', 'repositories', 'files', 'meetings', 'qna'
  ]))
  // Build tree structure from files
  const buildTree = (files: FileItem[]): TreeNode[] => {
    console.log('Building tree from files:', files.map(f => ({ name: f.name, path: f.path, type: f.type })))
    
    if (!files || files.length === 0) {
      console.log('No files provided to buildTree')
      return []
    }
    
    const nodeMap = new Map<string, TreeNode>()    // First pass: create all nodes
    for (const file of files) {
      // Clean up path - more careful path processing
      let cleanPath = file.path
      
      // Remove repository prefixes but preserve directory structure
      if (cleanPath.includes('/files/')) {
        const filesIndex = cleanPath.indexOf('/files/')
        cleanPath = cleanPath.substring(filesIndex + 7) // Remove everything up to and including '/files/'
      }
      
      // Convert Windows-style backslashes to forward slashes
      cleanPath = cleanPath.replace(/\\/g, '/')
      
      // Remove leading slash if present
      cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath
      
      // If cleanPath is empty or just the filename, treat as root level
      if (!cleanPath || cleanPath === file.name) {
        cleanPath = file.name
      }
        const pathParts = cleanPath.split('/').filter(Boolean)
      console.log(`Processing ${file.name}: originalPath="${file.path}", cleanPath="${cleanPath}", pathParts=`, pathParts)

      // Handle root files (files at the root level)
      if (pathParts.length === 1 && file.type === 'file') {
        const rootPath = file.name
        nodeMap.set(rootPath, {
          name: file.name,
          path: rootPath,
          type: 'file',
          children: [],
          file: file,
          depth: 0,
        })
        continue
      }

      // For files, use all path parts except the last one as directories
      // For directories, use all path parts
      const dirParts = file.type === 'dir' ? pathParts : pathParts.slice(0, -1)
      const fileName = file.type === 'file' ? pathParts[pathParts.length - 1] : null

      // Create all directory nodes in the path
      let currentPathBuild = ''
      for (let i = 0; i < dirParts.length; i++) {
        const part = dirParts[i]
        currentPathBuild = currentPathBuild ? `${currentPathBuild}/${part}` : part
        const depth = i

        if (!nodeMap.has(currentPathBuild)) {
          nodeMap.set(currentPathBuild, {
            name: part,
            path: currentPathBuild,
            type: 'dir',
            children: [],
            file: undefined,
            depth: depth,
          })
        }
      }

      // If this is a file, create the file node
      if (file.type === 'file' && fileName) {
        const filePath = dirParts.length > 0 ? `${currentPathBuild}/${fileName}` : fileName
        if (!nodeMap.has(filePath)) {
          nodeMap.set(filePath, {
            name: fileName,
            path: filePath,
            type: 'file',
            children: [],
            file: file,
            depth: dirParts.length,
          })
        }
      }
    }

    // Second pass: build parent-child relationships
    const rootNodes: TreeNode[] = []

    // Sort entries by path depth to ensure parents are processed first
    const sortedEntries = Array.from(nodeMap.entries()).sort((a, b) => {
      const depthA = a[0].split('/').length
      const depthB = b[0].split('/').length
      return depthA - depthB
    })

    for (const [path, node] of sortedEntries) {
      const pathParts = path.split('/')

      if (pathParts.length === 1) {
        // Root level node
        rootNodes.push(node)
      } else {
        // Find parent and add as child
        const parentPath = pathParts.slice(0, -1).join('/')
        const parent = nodeMap.get(parentPath)
        if (parent && !parent.children.some((child) => child.path === node.path)) {
          parent.children.push(node)
          // Update child depth
          node.depth = parent.depth + 1
        }
      }
    }

    // Recursive sort function
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
      const sorted = nodes.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1
        }
        // Alphabetical within same type
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      })

      // Recursively sort children
      sorted.forEach((node) => {
        if (node.children.length > 0) {
          node.children = sortNodes(node.children)
        }
      })

      return sorted
    }

    const result = sortNodes(rootNodes)
    console.log('Built tree structure:', result)
    return result
  }

  const tree = buildTree(filteredFiles)

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }
  const handleItemClick = (node: TreeNode) => {
    if (node.type === 'dir') {
      // Only toggle directory expansion, don't trigger file loading
      toggleDirectory(node.path)
    } else if (node.file) {
      // Only call onFileClick for actual files
      onFileClick(node.file)
    }
  }  // Tree node component with enhanced animations
  const TreeNodeComponent = ({ node }: { node: TreeNode }) => {
    const isSelected = selectedFile?.id === node.file?.id || selectedFile?.path === node.path
    const isExpanded = node.type === 'dir' && expandedDirs.has(node.path)

    return (
      <div key={node.path} className="animate-in fade-in slide-in-from-left duration-300" style={{ animationDelay: `${node.depth * 50}ms` }}>
        {/* Node Item */}
        <div
          onClick={() => handleItemClick(node)}
          className={`group relative flex items-center gap-1 py-1 cursor-pointer transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-700/50 hover:scale-[1.02] hover:shadow-sm rounded-md ${
            isSelected
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-slate-900 dark:text-slate-100 shadow-sm border border-blue-200 dark:border-blue-700 scale-[1.02]'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          style={{ paddingLeft: `${4 + node.depth * 16}px` }}
        >
          {/* Tree connecting lines */}
          {node.depth > 0 && (
            <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
              {Array.from({ length: node.depth }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-slate-300/60 dark:bg-slate-600/60"
                  style={{ left: `${4 + i * 16 + 8}px` }}
                />
              ))}
              {/* Horizontal line to this item */}
              <div
                className="absolute top-1/2 w-2 h-px bg-slate-300/60 dark:bg-slate-600/60"
                style={{ left: `${4 + (node.depth - 1) * 16 + 8}px` }}
              />
            </div>
          )}          {/* Expand/Collapse Icon for Directories */}
          {node.type === 'dir' ? (
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center relative z-10 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-all duration-200 hover:scale-110">
              <svg
                className={`w-3 h-3 text-slate-600 dark:text-slate-400 transition-all duration-200 ${
                  isExpanded ? 'rotate-90 text-blue-600 dark:text-blue-400' : 'rotate-0'
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8.59 16.58L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.58Z"/>
              </svg>
            </div>
          ) : (
            <div className="flex-shrink-0 w-4 h-4"></div>
          )}          {/* Icon with enhanced animations */}
          <div className="flex-shrink-0 mr-1 transition-all duration-200 group-hover:scale-110">
            {node.type === 'dir' ? (
              <svg
                className={`w-4 h-4 transition-all duration-300 ${
                  isExpanded 
                    ? 'text-blue-500 dark:text-blue-400 drop-shadow-sm' 
                    : 'text-yellow-600 dark:text-yellow-500'
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                {isExpanded ? (
                  <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
                ) : (
                  <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
                )}
              </svg>
            ) : (
              <div className="w-4 h-4 flex items-center justify-center">
                {node.file && getFileIcon(node.file)}
              </div>
            )}
          </div>          {/* File/Directory Name with enhanced styling */}
          <span
            className={`text-base flex-1 truncate transition-all duration-200 ${
              isSelected 
                ? 'text-slate-900 dark:text-slate-100 font-semibold' 
                : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white font-normal'
            }`}
          >
            {node.name}
          </span>

          {/* Directory file count with animation */}
          {node.type === 'dir' && node.children.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded mr-2 transition-all duration-200 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 animate-in fade-in delay-100">
              {node.children.length}
            </span>
          )}

          {/* File Size (for files only) - Enhanced with color coding and animations */}
          {node.file && node.file.size && (
            <span className={`text-xs px-2 py-0.5 rounded-full transition-all duration-200 mr-2 animate-in fade-in delay-200 group-hover:scale-105 ${
              node.file.size > 1000000 
                ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50' // Large files (>1MB)
                : node.file.size > 100000 
                ? 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50' // Medium files (>100KB)
                : 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50' // Small files
            }`}>
              {formatFileSize(node.file.size)}
            </span>
          )}

          {/* File Language Badge with enhanced animations */}
          {node.file && node.file.language && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full mr-2 transition-all duration-200 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 animate-in fade-in delay-300 group-hover:scale-105">
              {node.file.language}
            </span>
          )}
        </div>        {/* Children (if directory is expanded) */}
        {node.type === 'dir' && isExpanded && node.children.length > 0 && (
          <div className="animate-in slide-in-from-top duration-300 ease-out">
            {node.children.map((child, index) => (
              <div key={child.path} style={{ animationDelay: `${index * 25}ms` }}>
                <TreeNodeComponent node={child} />
              </div>
            ))}
          </div>
        )}
      </div>
    )}
    return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">No files found</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="py-1">
            {tree.map((node) => (
              <TreeNodeComponent key={node.path} node={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
