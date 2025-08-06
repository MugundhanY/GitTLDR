'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, GitBranch, FileText, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
  };
  language: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
}

export default function ShareRepositoryPage() {
  const params = useParams();
  const router = useRouter();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repositoryId = params?.id as string;

  useEffect(() => {
    if (repositoryId) {
      fetchRepositoryInfo();
    }
  }, [repositoryId]);

  const fetchRepositoryInfo = async () => {
    try {
      const response = await fetch(`/api/repositories/${repositoryId}/public-info`);
      
      if (response.status === 404) {
        setError('Repository not found or is private');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch repository information');
      }

      const data = await response.json();
      setRepository(data.repository);
    } catch (error) {
      setError('Failed to load repository information');
    } finally {
      setLoading(false);
    }
  };

  const requestAccess = async () => {
    setRequesting(true);
    
    try {
      const response = await fetch(`/api/repositories/${repositoryId}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `I would like to request access to ${repository?.name}`
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request access');
      }

      setHasRequested(true);
      toast.success('Access request sent! The repository owner will review your request.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to request access');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Repository Not Found</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/auth/signin')}
              className="w-full"
            >
              Sign In to GitTLDR
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!repository) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <GitBranch className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">{repository.name}</CardTitle>
                <CardDescription>
                  by {repository.owner.name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {repository.description && (
              <p className="text-gray-700">{repository.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {repository.fileCount} files
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {repository.language || 'Multiple languages'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Created {new Date(repository.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-2">Repository Owner</h3>
              <div className="flex items-center space-x-3">
                {repository.owner.avatarUrl && (
                  <img
                    src={repository.owner.avatarUrl}
                    alt={repository.owner.name}
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{repository.owner.name}</p>
                  <p className="text-sm text-gray-500">{repository.owner.email}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              {hasRequested ? (
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4">
                    Request Pending
                  </Badge>
                  <p className="text-sm text-gray-600 mb-4">
                    Your access request has been sent to the repository owner. 
                    You&apos;ll be notified when they review your request.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/auth/signin')}
                  >
                    Go to GitTLDR
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Request Access to Repository
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This repository is private. You can request access from the owner.
                  </p>
                  <Button 
                    onClick={requestAccess}
                    disabled={requesting}
                    className="w-full"
                  >
                    {requesting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending Request...
                      </>
                    ) : (
                      'Request Access'
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    You need to be signed in to request access
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
