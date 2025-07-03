import { useQuery } from '@tanstack/react-query';
import { useUserData } from '@/hooks/useUserData';

export interface MeetingSegment {
  id: string;
  title: string;
  summary: string;
  excerpt?: string;
  text?: string;
  startTime: number;
  endTime: number;
  index: number;
  duration?: number;
}

export interface Meeting {
  id: string;
  title: string;
  transcript?: string;
  summary?: string;
  status: 'uploaded' | 'processing' | 'transcribing' | 'summarizing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  language?: string;
  source?: string;
  segmentCount: number;
  segments: MeetingSegment[];
  isFavorite?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export function useMeetings(repositoryId?: string) {
  const { userData } = useUserData();
  
  return useQuery<Meeting[]>({
    queryKey: ['meetings', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      
      const res = await fetch(`/api/meetings?userId=${userData.id}`);
      if (!res.ok) throw new Error('Failed to fetch meetings');
      
      const data = await res.json();
      return data.meetings || [];
    },
    enabled: !!userData?.id,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute to get status updates
  });
}

export function useMeeting(meetingId: string) {
  return useQuery<Meeting>({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) throw new Error('Meeting ID is required');
      
      const res = await fetch(`/api/meetings/${meetingId}`);
      if (!res.ok) throw new Error('Failed to fetch meeting');
      
      const data = await res.json();
      return data.meeting;
    },
    enabled: !!meetingId,
    staleTime: 60_000, // 1 minute
  });
}

// Hook to get meeting count for sidebar/header
export function useMeetingCount() {
  const { userData } = useUserData();
  
  return useQuery<number>({
    queryKey: ['meeting-count', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return 0;
      
      const res = await fetch(`/api/meetings?userId=${userData.id}`);
      if (!res.ok) return 0;
      
      const data = await res.json();
      return data.meetings?.length || 0;
    },
    enabled: !!userData?.id,
    staleTime: 60_000, // 1 minute
  });
}
