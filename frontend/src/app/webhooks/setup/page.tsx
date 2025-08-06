'use client';

import React, { useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  hasWebhook?: boolean;
  webhookUrl?: string;
}


export default function WebhookSetupPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [showSecret, setShowSecret] = useState(false);
  const queryClient = useQueryClient();

  // Fetch repositories
  const { data: repositoriesData, isLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      const response = await fetch('/api/webhooks/setup');
      if (!response.ok) throw new Error('Failed to fetch repositories');
      return response.json();
    }
  });

  // Setup webhook mutation
  const setupWebhookMutation = useMutation({
    mutationFn: async ({ repositoryId, githubToken }: { repositoryId: string; githubToken: string }) => {
      const response = await fetch('/api/webhooks/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId, githubToken })
      });
      if (!response.ok) throw new Error('Failed to setup webhook');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Webhook configured successfully!');
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      setSelectedRepo('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to setup webhook');
    }
  });

  const repositories: Repository[] = repositoriesData?.repositories || [];
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'}/api/webhooks/github`;
  const webhookSecret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET || 'your-webhook-secret';

  const handleSetupWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const githubToken = formData.get('githubToken') as string;
    
    if (!selectedRepo || !githubToken) {
      toast.error('Please select a repository and provide GitHub token');
      return;
    }

    setupWebhookMutation.mutate({ repositoryId: selectedRepo, githubToken });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Dashboard
            </Link>
            
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <LinkIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-purple-700 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
                    Webhook Setup
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Automatically sync repository changes with GitTLDR
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl p-6 mb-8 border border-blue-200/30 dark:border-blue-700/30">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">How it works</h2>
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <p className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    When you push changes to your GitHub repository, a webhook will notify GitTLDR
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    New files are automatically uploaded to B2 storage and processed for embeddings
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    Your dashboard and Q&A system stay up-to-date with the latest code changes
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Manual Setup */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Manual Setup</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Webhook URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(webhookUrl)}
                      className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                    >
                      <ClipboardDocumentIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Webhook Secret
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={webhookSecret}
                      readOnly
                      className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono"
                    />
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {showSecret ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(webhookSecret)}
                      className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                    >
                      <ClipboardDocumentIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200/30 dark:border-amber-700/30">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    Manual Steps Required
                  </h3>
                  <ol className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-decimal list-inside">
                    <li>Go to your GitHub repository settings</li>
                    <li>Navigate to Webhooks section</li>
                    <li>Click &quot;Add webhook&quot;</li>
                    <li>Paste the webhook URL above</li>
                    <li>Set Content type to &quot;application/json&quot;</li>
                    <li>Add the webhook secret</li>
                    <li>Select &quot;Push events&quot; and &quot;Repository events&quot;</li>
                    <li>Click &quot;Add webhook&quot;</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Automatic Setup */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Automatic Setup</h2>
              
              <form onSubmit={handleSetupWebhook} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Select Repository
                  </label>
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose a repository...</option>
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.fullName} {repo.hasWebhook ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    GitHub Personal Access Token
                  </label>
                  <input
                    type="password"
                    name="githubToken"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Token needs &apos;admin:repo_hook&apos; and &apos;repo&apos; permissions. 
                    <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
                      Create token →
                    </a>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={setupWebhookMutation.isPending}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg disabled:shadow-none"
                >
                  {setupWebhookMutation.isPending ? 'Setting up...' : 'Setup Webhook'}
                </button>
              </form>
            </div>
          </div>

          {/* Repository Status */}
          {repositories.length > 0 && (
            <div className="mt-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Repository Status</h2>
              
              <div className="space-y-3">
                {repositories.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-xl border border-slate-200/30 dark:border-slate-600/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${repo.hasWebhook ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{repo.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{repo.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {repo.hasWebhook ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                          <CheckCircleIcon className="w-4 h-4" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-sm font-medium">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          Not connected
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
