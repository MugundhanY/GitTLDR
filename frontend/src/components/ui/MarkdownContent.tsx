'use client'

import { memo, useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface MarkdownContentProps {
  content: string
  className?: string
}

// ✅ FIX: Lazy-loading code block component for smooth scrolling
const LazyCodeBlock = memo(({ className, children, ...props }: any) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Delay rendering slightly to avoid blocking scroll
            setTimeout(() => setShouldRender(true), 50);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Load 200px before entering viewport
        threshold: 0.01
      }
    );

    if (codeRef.current) {
      observer.observe(codeRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!shouldRender) {
    return (
      <code 
        ref={codeRef}
        className="block bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg mb-4 border border-slate-200 dark:border-slate-700 min-h-[100px]"
        style={{ display: 'block' }}
      >
        <div className="flex items-center justify-center h-24">
          <div className="text-slate-400 text-sm">Loading code...</div>
        </div>
      </code>
    );
  }

  return (
    <code className={`${className} hljs`} {...props} style={{ willChange: 'auto', contain: 'layout style paint' }}>
      {children}
    </code>
  );
});

LazyCodeBlock.displayName = 'LazyCodeBlock';

const MarkdownContent = memo(({ content, className = '' }: MarkdownContentProps) => {
  return (
    <div className={`markdown-content prose prose-slate dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom components for better styling
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3 mt-6">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2 mt-4">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 mb-3 space-y-1 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-slate-700 dark:text-slate-300 mb-3 space-y-1 ml-4">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-700 dark:text-slate-300">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg mb-3 italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            
            if (isInline) {
              return (
                <code className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              )
            }
            
            // ✅ Use lazy-loading code block for better scroll performance
            return <LazyCodeBlock className={className} {...props}>{children}</LazyCodeBlock>
          },
          pre: ({ children }) => (
            <pre 
              className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4 border border-slate-200 dark:border-slate-700"
              style={{ contain: 'layout style paint' }}
            >
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-600 hover:decoration-blue-500 dark:hover:decoration-blue-400 transition-colors"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 dark:bg-slate-800">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-slate-900 dark:text-white font-medium border-b border-slate-200 dark:border-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-700 dark:text-slate-300">
              {children}
            </em>
          ),
          hr: () => (
            <hr className="border-slate-200 dark:border-slate-700 my-6" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
      
      <style jsx global>{`
        .markdown-content .hljs {
          background: rgb(30 41 59) !important;
          color: rgb(226 232 240) !important;
        }
        
        .dark .markdown-content .hljs {
          background: rgb(15 23 42) !important;
          color: rgb(241 245 249) !important;
        }
        
        .markdown-content .hljs-keyword {
          color: rgb(139 92 246) !important;
        }
        
        .markdown-content .hljs-string {
          color: rgb(34 197 94) !important;
        }
        
        .markdown-content .hljs-comment {
          color: rgb(148 163 184) !important;
          font-style: italic;
        }
        
        .markdown-content .hljs-function {
          color: rgb(59 130 246) !important;
        }
        
        .markdown-content .hljs-number {
          color: rgb(251 146 60) !important;
        }
        
        .markdown-content .hljs-variable {
          color: rgb(236 72 153) !important;
        }
      `}</style>
    </div>
  )
})

MarkdownContent.displayName = 'MarkdownContent'

export default MarkdownContent
