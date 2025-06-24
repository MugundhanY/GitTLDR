// A reusable, dark/light mode optimized code viewer with syntax highlighting, themes, font size, line numbers, and code folding.
'use client'

import { useState } from 'react'
import { ClipboardIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs, oneLight, oneDark, duotoneDark, duotoneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

const THEMES = [
  { name: 'VS Code Dark', value: vscDarkPlus },
  { name: 'VS Code Light', value: vs },
  { name: 'One Dark', value: oneDark },
  { name: 'One Light', value: oneLight },
  { name: 'Duotone Dark', value: duotoneDark },
  { name: 'Duotone Light', value: duotoneLight },
]

const FONT_SIZES = [12, 14, 16, 18, 20]

export default function CodeViewer({
  code = '',
  language = 'javascript',
  initialTheme = 0,
  initialFontSize = 14,
  showLineNumbers = true,
}: {
  code: string
  language?: string
  initialTheme?: number
  initialFontSize?: number
  showLineNumbers?: boolean
}) {
  const [themeIdx, setThemeIdx] = useState(initialTheme)
  const [fontSize, setFontSize] = useState(initialFontSize)
  const [copied, setCopied] = useState(false)
  const [folded, setFolded] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFolded(f => !f)}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            title={folded ? 'Expand code' : 'Collapse code'}
          >
            {folded ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </button>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={themeIdx}
            onChange={e => setThemeIdx(Number(e.target.value))}
            className="text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5"
            title="Theme"
          >
            {THEMES.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}
          </select>
          <select
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5"
            title="Font size"
          >
            {FONT_SIZES.map(size => <option key={size} value={size}>{size}px</option>)}
          </select>
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Copy code"
          >
            <ClipboardIcon className="w-4 h-4" />
          </button>
          {copied && <span className="text-xs text-green-600 ml-1">Copied!</span>}
        </div>
      </div>
      {/* Code block */}
      {!folded && (
        <div className="overflow-x-auto" style={{ fontSize: fontSize }}>
          <SyntaxHighlighter
            language={language}
            style={THEMES[themeIdx].value}
            showLineNumbers={showLineNumbers}
            customStyle={{ margin: 0, fontSize: fontSize }} // removed background
            lineNumberStyle={{ color: '#888', opacity: 0.6 }}
            wrapLongLines={true}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}
