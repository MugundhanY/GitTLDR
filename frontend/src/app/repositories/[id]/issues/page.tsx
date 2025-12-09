'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bug, Loader2, Sparkles, Download } from 'lucide-react';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  comments: number;
  created_at: string;
  state: string;
}

interface IssueFix {
  id: string;
  issueNumber: number;
  status: string;
  explanation?: string;
  confidence?: number;
  proposedFix?: {
    files: Array<{
      path: string;
      original: string;
      modified: string;
      language: string;
      changes_summary: string;
    }>;
    changes_overview: string;
  };
  prUrl?: string;
}

export default function IssuesPage() {
  const params = useParams();
  const router = useRouter();
  const repositoryId = params.id as string;
  
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIssues, setProcessingIssues] = useState<Set<number>>(new Set());
  const [currentFix, setCurrentFix] = useState<IssueFix | null>(null);
  
  useEffect(() => {
    fetchIssues();
  }, [repositoryId]);
  
  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/issues/list?repositoryId=${repositoryId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }
      
      const data = await response.json();
      setIssues(data.issues || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFixIssue = async (issue: GitHubIssue) => {
    try {
      setProcessingIssues(prev => new Set(prev).add(issue.number));
      
      // Start fix generation
      const response = await fetch('/api/issues/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId,
          issueNumber: issue.number,
          issueTitle: issue.title,
          issueBody: issue.body,
          issueUrl: issue.html_url
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start issue analysis');
      }
      
      const { jobId, issueFixId } = await response.json();
      
      // Poll for status updates
      pollFixStatus(jobId, issue.number);
      
    } catch (err: any) {
      console.error('Error fixing issue:', err);
      setProcessingIssues(prev => {
        const next = new Set(prev);
        next.delete(issue.number);
        return next;
      });
    }
  };
  
  const pollFixStatus = async (jobId: string, issueNumber: number) => {
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;
    
    const interval = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setProcessingIssues(prev => {
          const next = new Set(prev);
          next.delete(issueNumber);
          return next;
        });
        return;
      }
      
      try {
        const response = await fetch(`/api/issues/fix-status/${jobId}`);
        const data = await response.json();
        
        if (data.fix) {
          setCurrentFix(data.fix);
          
          if (data.fix.status === 'READY_FOR_REVIEW' || 
              data.fix.status === 'COMPLETED' || 
              data.fix.status === 'FAILED') {
            clearInterval(interval);
            setProcessingIssues(prev => {
              const next = new Set(prev);
              next.delete(issueNumber);
              return next;
            });
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000);
  };
  
  const handleCreatePR = async (fix: IssueFix) => {
    try {
      const response = await fetch('/api/issues/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueFixId: fix.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create PR');
      }
      
      const { prUrl } = await response.json();
      
      // Update local state
      setCurrentFix({ ...fix, prUrl, status: 'COMPLETED' });
      
      // Open PR in new tab
      window.open(prUrl, '_blank');
      
    } catch (err: any) {
      console.error('Error creating PR:', err);
      alert('Failed to create PR: ' + err.message);
    }
  };
  
  const handleDownloadTestPackage = async (issueFixId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/download-test-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_fix_id: issueFixId,
          repository_id: repositoryId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to download test package');
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'test-package.zip';
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert('✅ Test package downloaded!\n\n1. Extract the ZIP file\n2. Open terminal in extracted folder\n3. Run: docker-compose up\n4. Test the fix locally\n5. Modify if needed\n6. Create your own PR or approve ours');
      
    } catch (err: any) {
      console.error('Error downloading test package:', err);
      alert('Failed to download test package: ' + err.message);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };
  
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDING': 'Queued',
      'ANALYZING': 'Analyzing issue...',
      'RETRIEVING_CODE': 'Finding relevant code...',
      'GENERATING_FIX': 'Generating fix...',
      'VALIDATING': 'Validating solution...',
      'READY_FOR_REVIEW': 'Ready for review',
      'CREATING_PR': 'Creating PR...',
      'COMPLETED': 'PR created!',
      'FAILED': 'Failed',
    };
    return labels[status] || status;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        
        <div className="flex items-center gap-3 mb-2">
          <Bug className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Auto-Fix Issues</h1>
        </div>
        <p className="text-gray-600">
          Select an issue to automatically generate a fix using AI
        </p>
      </div>
      
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Bug className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No open issues found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.number}
              className="border rounded-lg p-6 hover:shadow-lg transition bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500 font-mono text-sm">
                      #{issue.number}
                    </span>
                    <h3 className="text-xl font-semibold">{issue.title}</h3>
                  </div>
                  
                  {issue.body && (
                    <p className="text-gray-700 mb-4 line-clamp-2">
                      {issue.body}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <img
                        src={issue.user.avatar_url}
                        alt={issue.user.login}
                        className="w-5 h-5 rounded-full"
                      />
                      <span>{issue.user.login}</span>
                    </div>
                    <span>opened {formatDate(issue.created_at)}</span>
                    <span>{issue.comments} comments</span>
                  </div>
                  
                  {issue.labels.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {issue.labels.map((label) => (
                        <span
                          key={label.name}
                          className="px-2 py-1 text-xs rounded-full"
                          style={{
                            backgroundColor: `#${label.color}20`,
                            color: `#${label.color}`
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="ml-4">
                  <button
                    onClick={() => handleFixIssue(issue)}
                    disabled={processingIssues.has(issue.number)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {processingIssues.has(issue.number) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Auto-Fix
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Fix Preview Modal */}
      {currentFix && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="border-b p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Issue Fix Status</h2>
                <button
                  onClick={() => setCurrentFix(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Status:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {getStatusLabel(currentFix.status)}
                </span>
                {currentFix.confidence && (
                  <span className="ml-4 text-sm text-gray-600">
                    Confidence: {(currentFix.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {currentFix.status === 'READY_FOR_REVIEW' && currentFix.explanation && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Explanation</h3>
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {currentFix.explanation}
                    </p>
                  </div>
                  
                  {currentFix.proposedFix && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Proposed Changes ({currentFix.proposedFix.files.length} files)
                      </h3>
                      {currentFix.proposedFix.files.map((file, idx) => (
                        <div key={idx} className="mb-4 border rounded-lg overflow-hidden">
                          <div className="bg-gray-100 px-4 py-2 font-mono text-sm">
                            {file.path}
                          </div>
                          <div className="p-4 bg-gray-50">
                            <p className="text-sm text-gray-700">{file.changes_summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {currentFix.status === 'FAILED' && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    Fix Generation Failed
                  </h3>
                  <p className="text-red-700">
                    Unable to generate a fix for this issue. Please try again or fix manually.
                  </p>
                </div>
              )}
              
              {currentFix.status === 'COMPLETED' && currentFix.prUrl && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Pull Request Created!
                  </h3>
                  <a
                    href={currentFix.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View PR →
                  </a>
                </div>
              )}
              
              {['PENDING', 'ANALYZING', 'RETRIEVING_CODE', 'GENERATING_FIX', 'VALIDATING'].includes(currentFix.status) && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">{getStatusLabel(currentFix.status)}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            {currentFix.status === 'READY_FOR_REVIEW' && (
              <div className="border-t p-6 flex justify-between gap-4">
                {/* Download Test Package Button */}
                <button
                  onClick={() => handleDownloadTestPackage(currentFix.id)}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  Download Test Package
                </button>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentFix(null)}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                  >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreatePR(currentFix)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✅ Create Pull Request
                </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
