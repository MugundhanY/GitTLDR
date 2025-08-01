'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRepository } from '@/contexts/RepositoryContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  StarIcon,
  EyeIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  ChartBarIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlayIcon,
  DocumentTextIcon,
  SparklesIcon,
  LockClosedIcon,
  GlobeAltIcon,
  LinkIcon,
  CogIcon,
  BoltIcon,
  ShieldCheckIcon,
  BeakerIcon,
  CommandLineIcon,
  ChartPieIcon,
  CloudArrowUpIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TagIcon,
  FolderOpenIcon,
  ComputerDesktopIcon,
  ServerIcon,
  WifiIcon,
  CpuChipIcon,
  CircleStackIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  ShareIcon,
  UserGroupIcon,
  Bars3Icon,
  EllipsisVerticalIcon,
  BellIcon,
  AdjustmentsHorizontalIcon,
  GiftIcon,
  TrophyIcon,
  ArchiveBoxIcon,
  BookOpenIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  repositories: number;
  totalCommits: number;
  activeProjects: number;
  aiAnalyses: number;
  meetings: number;
  questions: number;
  creditsUsed: number;
  creditsRemaining: number;
}
interface RecentActivity {
  id: string;
  type: 'commit' | 'analysis' | 'meeting' | 'question' | 'webhook';
  title: string;
  description: string;
  time: string;
  status: 'completed' | 'processing' | 'failed';
  repository?: string;
  author?: string;
  // For commit activities, the actual commit timestamp
  timestamp?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  repositories: number;
  commits: number;
  lastActivity: string;
  status: 'online' | 'offline' | 'away';
}

interface SharedRepository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  sharedAt: string;
  stats: {
    files: number;
    meetings: number;
    questions: number;
  };
}

interface DraggedCard {
  id: string;
  size: 'small' | 'medium' | 'large' | 'wide';
  order: number;
}

interface CardPosition {
  id: string;
  row: number;
  col: number;
  width: number;
  height: number;
}

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  isPrivate: boolean;
  processed: boolean;
  status: string;
  summary?: string;
  fileCount: number;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  commitCount: number;
}

// Extend Repository type to include creditsUsed
interface RepositoryWithCreditsUsed extends Repository {
  creditsUsed?: number;
}

export default function DashboardPage() {
  // ...existing hooks...
  // Import NotificationContext hook at top level to follow Rules of Hooks
  const { unreadCount } = useNotifications();
  const { selectedRepository } = useRepository();
  const [draggedCard, setDraggedCard] = useState<DraggedCard | null>(null);
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [availableCards, setAvailableCards] = useState<string[]>([]);
  // Always include 'team' and 'shared' in availableCards for consistent UI
  const normalizedAvailableCards = useMemo(() => {
    const cards = new Set(availableCards);
    cards.add('team');
    cards.add('shared');
    cards.add('notifications'); // Always show notifications card
    return Array.from(cards);
  }, [availableCards]);
  const [dragOverlayPosition, setDragOverlayPosition] = useState<{x: number, y: number} | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    }
  });

  // Fetch all repositories
  const { data: repositoriesData } = useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      const response = await fetch('/api/repositories');
      if (!response.ok) throw new Error('Failed to fetch repositories');
      return response.json();
    }
  });

  // Fetch shared repositories
  const { data: sharedData } = useQuery({
    queryKey: ['shared-repositories'],
    queryFn: async () => {
      const response = await fetch('/api/repositories/shared');
      if (!response.ok) throw new Error('Failed to fetch shared repositories');
      return response.json();
    }
  });

  // Real data from APIs
  const stats: DashboardStats = dashboardData?.stats || {
    repositories: 0,
    totalCommits: 0,
    activeProjects: 0,
    aiAnalyses: 0,
    meetings: 0,
    questions: 0,
    creditsUsed: 0,
    creditsRemaining: 150
  };

  const recentActivities: RecentActivity[] = dashboardData?.activities || [];
  const sharedRepositories: SharedRepository[] = sharedData?.sharedRepositories || [];
  const allRepositories: RepositoryWithCreditsUsed[] = repositoriesData?.repositories || [];

  // Team members data based on shared repositories (memoized to prevent infinite re-renders)
  const teamMembers: TeamMember[] = useMemo(() => 
    sharedRepositories.map((repo, index) => ({
      id: repo.owner.id,
      name: repo.owner.name,
      email: repo.owner.email,
      avatarUrl: repo.owner.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(repo.owner.name)}&size=40&background=6366f1&color=fff`,
      role: 'Developer',
      repositories: 1,
      commits: 50 + (index * 23) % 100, // Stable calculation based on index
      lastActivity: repo.sharedAt,
      status: index % 3 === 0 ? 'online' : index % 3 === 1 ? 'away' : 'offline'
    })), [sharedRepositories]
  );

  // Determine which cards should be available based on data
  useEffect(() => {
    const cards = [];
    
    // Always show if there's data
    if (allRepositories.length > 0) cards.push('repositories');
    if (stats.creditsRemaining > 0 || stats.creditsUsed > 0) cards.push('credits');
    if (teamMembers.length > 0) cards.push('team');
    if (stats.totalCommits > 0) cards.push('commits');
    if (recentActivities.length > 0) cards.push('activities');
    if (sharedRepositories.length > 0) cards.push('shared');
    if (stats.repositories > 0 || stats.meetings > 0 || stats.questions > 0) cards.push('analytics');
    if (stats.aiAnalyses > 0) cards.push('insights');
    
    // Additional useful cards with real data
    if (stats.repositories > 0) cards.push('performance');
    if (recentActivities.length > 0 || stats.repositories > 0) cards.push('notifications');
    
    // Only update if cards array has changed
    const arraysEqual = (a: string[], b: string[]) => (
      a.length === b.length && a.every((v, i) => v === b[i])
    );
    if (!arraysEqual(cards, availableCards)) {
      setAvailableCards(cards);
    }
  }, [allRepositories, stats, teamMembers, recentActivities, sharedRepositories]);


  // Improved gravity system with collision detection
  const applyGravity = useCallback((positions: CardPosition[]) => {
    const newPositions = [...positions];
    let changed = true;
    let iterations = 0;
    const maxIterations = 50; // Prevent infinite loops
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      // Sort by row to process top cards first
      newPositions.sort((a, b) => a.row - b.row);
      
      newPositions.forEach((card, index) => {
        if (card.row > 0) {
          // Try to move card up one row at a time
          const testCard = { ...card, row: card.row - 1 };
          const otherCards = newPositions.filter((_, i) => i !== index);
          
          // Check if moving up would cause collision
          if (!checkCollision(testCard, otherCards)) {
            newPositions[index] = testCard;
            changed = true;
          }
        }
      });
    }
    
    return newPositions;
  }, []);

  const getInitialLayout = useCallback((cards: string[]): CardPosition[] => {
    const getCardSize = (cardId: string) => {
      switch (cardId) {
        case 'repositories': {
          const repoCount = allRepositories.length;
          return { width: repoCount > 5 ? 6 : 5, height: repoCount > 10 ? 3 : 2 };
        }
        case 'credits':
          return { width: 3, height: 1 };
        case 'team': {
          const teamCount = teamMembers.length;
          return { width: teamCount > 3 ? 5 : 4, height: teamCount > 6 ? 2 : 1 };
        }
        case 'commits':
          return { width: 3, height: 1 };
        case 'shared': {
          const sharedCount = sharedRepositories.length;
          return { width: sharedCount > 3 ? 5 : 4, height: sharedCount > 6 ? 2 : 1 };
        }
        case 'activities': {
          const activityCount = recentActivities.length;
          return { width: activityCount > 5 ? 9 : 8, height: activityCount > 10 ? 3 : 2 };
        }
        case 'analytics':
          return { width: 4, height: 2 };
        case 'insights':
          return { width: 6, height: 1 };
        case 'performance':
          return { width: 6, height: 1 };
        case 'notifications':
          return { width: 3, height: 1 };
        default:
          return { width: 4, height: 1 };
      }
    };

    // Spiral search for available slot using checkCollision
    const findSlot = (cardId: string, width: number, height: number, placed: CardPosition[]): { row: number; col: number } => {
      const maxCols = 12;
      for (let row = 0; row < 100; row++) {
        for (let col = 0; col <= maxCols - width; col++) {
          const test: CardPosition = { id: cardId, row, col, width, height };
          if (!checkCollision(test, placed)) {
            return { row, col };
          }
        }
      }
      // fallback to 0,0 if not found (should never happen)
      return { row: 0, col: 0 };
    };

    const placed: CardPosition[] = [];
    for (const cardId of cards) {
      const size = getCardSize(cardId);
      const { row, col } = findSlot(cardId, size.width, size.height, placed);
      placed.push({ id: cardId, row, col, width: size.width, height: size.height });
    }
    return placed;
  }, []);

  // Initialize card positions based on available data
  // Drop indicator state for drag-and-drop
  const [dropIndicator, setDropIndicator] = useState<{row: number, col: number, width: number, height: number} | null>(null);

  useEffect(() => {
    if (availableCards.length > 0) {
      const initialLayout = getInitialLayout(availableCards);
      const gravityLayout = applyGravity(initialLayout);
      setCardPositions(gravityLayout);
    }
  }, [availableCards, getInitialLayout, applyGravity]);

  // Advanced collision detection with better accuracy
  const checkCollision = (newCard: CardPosition, existingCards: CardPosition[], excludeId?: string) => {
    return existingCards.some(card => {
      if (card.id === excludeId) return false;
      // Check if cards overlap (more precise collision detection)
      const horizontalOverlap = newCard.col < card.col + card.width && newCard.col + newCard.width > card.col;
      const verticalOverlap = newCard.row < card.row + card.height && newCard.row + newCard.height > card.row;
      return horizontalOverlap && verticalOverlap;
    });
  };

  // Find available position for displaced cards - prioritize nearby positions
  const findAvailablePosition = (card: CardPosition, occupiedPositions: CardPosition[]): CardPosition => {
    const maxCols = 12;
    const maxRows = 20; // Increased for more flexibility
    
    // First, try positions near the original position (spiral search)
    const originalRow = card.row;
    const originalCol = card.col;
    const searchRadius = 3; // Search within 3 grid units first
    
    // Spiral search starting from the original position
    for (let radius = 0; radius <= searchRadius; radius++) {
      for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
        for (let colOffset = -radius; colOffset <= radius; colOffset++) {
          // Skip positions that aren't on the border of current radius (except center)
          if (radius > 0 && Math.abs(rowOffset) < radius && Math.abs(colOffset) < radius) continue;
          
          const testRow = Math.max(0, originalRow + rowOffset);
          const testCol = Math.max(0, Math.min(originalCol + colOffset, maxCols - card.width));
          
          const testPosition = { ...card, row: testRow, col: testCol };
          if (!checkCollision(testPosition, occupiedPositions, card.id)) {
            return testPosition;
          }
        }
      }
    }
    
    // If no nearby position found, do a full grid search
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col <= maxCols - card.width; col++) {
        const testPosition = { ...card, row, col };
        if (!checkCollision(testPosition, occupiedPositions, card.id)) {
          return testPosition;
        }
      }
    }
    
    // Last resort: place at the bottom
    const maxRow = Math.max(...occupiedPositions.map(p => p.row + p.height), 0);
    return { ...card, row: maxRow, col: 0 };
  };

  // Enhanced drag handlers with collision detection
  const handleDragStart = (cardId: string, size: 'small' | 'medium' | 'large' | 'wide', e: React.DragEvent) => {
    if (!editMode) return;
    const cardPos = cardPositions.find(p => p.id === cardId);
    setDraggedCard({ 
      id: cardId, 
      size, 
      order: cardPos ? cardPos.row * 12 + cardPos.col : 0 
    });
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
    
    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.7';
    target.style.transform = 'scale(0.98) rotate(1deg)';
    target.style.zIndex = '1000';
    
    // Set drag image to a transparent image for custom overlay
    const img = document.createElement('img');
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedCard(null);
    setIsDragging(false);
    setDragOverlayPosition(null);
    setDropIndicator(null);
    // Reset visual feedback with smooth transition
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '';
    target.style.transform = '';
    target.style.zIndex = '';
    target.style.transition = 'all 0.3s ease';
    
    // Remove transition after animation
    setTimeout(() => {
      target.style.transition = '';
    }, 300);
  };

  // Utility to get grid position from pointer event
  const getGridPositionFromPointer = (e: React.DragEvent, card: CardPosition) => {
    if (!dropZoneRef.current) return { row: 0, col: 0 };
    const rect = dropZoneRef.current.getBoundingClientRect();
    const colWidth = rect.width / 12;
    const rowHeight = 286; // 280px + 6px gap
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newCol = Math.max(0, Math.min(Math.floor((x + colWidth/2) / colWidth), 11));
    const newRow = Math.max(0, Math.floor((y + rowHeight/2) / rowHeight));
    const finalCol = Math.min(newCol, 12 - card.width);
    const finalRow = newRow;
    return { row: finalRow, col: finalCol };
  };

  // Insert card at drop position, push down cards below in column, then apply gravity
  // Insert card at drop position, push down cards below in column, then apply gravity
  // Insert card at drop position, push down cards below in column, then apply gravity
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCard || !dropZoneRef.current || !editMode) return;
    const currentCard = cardPositions.find(p => p.id === draggedCard.id);
    if (!currentCard) return;
    const { row: dropRow, col: dropCol } = getGridPositionFromPointer(e, currentCard);
    const cardWidth = currentCard.width;
    const cardHeight = currentCard.height;
    const otherCards = cardPositions.filter(p => p.id !== draggedCard.id);

    // Step 1: Insert at drop position, push down cards below in column
    // Find all cards in the same columns that overlap or are below the drop position
    let updatedPositions = [...otherCards];
    // Sort by row ascending so we push from top to bottom
    updatedPositions.sort((a, b) => a.row - b.row);

    // Helper: does card overlap with the drop area in column?
    const overlapsInColumn = (card: CardPosition) => {
      const colOverlap = card.col < dropCol + cardWidth && card.col + card.width > dropCol;
      const rowOverlap = card.row >= dropRow && card.row < dropRow + cardHeight;
      return colOverlap && rowOverlap;
    };

    // Push down all cards in the way (recursively)
    const pushDownCards = (
      positions: CardPosition[],
      startRow: number,
      col: number,
      width: number,
      height: number,
      alreadyMoved: Set<string> = new Set()
    ): CardPosition[] => {
      let moved = false;
      let newPositions = positions.map(card => {
        // Check for full area overlap, not just top row
        const horizontalOverlap = card.col < col + width && card.col + card.width > col;
        const verticalOverlap = card.row < startRow + height && card.row + card.height > startRow;
        if (horizontalOverlap && verticalOverlap && !alreadyMoved.has(card.id)) {
          moved = true;
          alreadyMoved.add(card.id);
          // Move this card down by height (insert effect)
          return { ...card, row: card.row + height };
        }
        return card;
      });
      // If we moved any, check recursively for new collisions
      if (moved) {
        return pushDownCards(newPositions, startRow + height, col, width, height, alreadyMoved);
      }
      return newPositions;
    };

    // Step 2: Update dragged card position
    const updatedCard = { ...currentCard, row: dropRow, col: dropCol };
    updatedPositions = pushDownCards(updatedPositions, dropRow, dropCol, cardWidth, cardHeight);
    updatedPositions.push(updatedCard);

    // Extra step: resolve any remaining overlaps after pushDownCards
    const resolveAllOverlaps = (positions: CardPosition[]): CardPosition[] => {
      let changed = true;
      let iterations = 0;
      const maxIterations = 50;
      let newPositions = [...positions];
      while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        for (let i = 0; i < newPositions.length; i++) {
          const cardA = newPositions[i];
          for (let j = 0; j < newPositions.length; j++) {
            if (i === j) continue;
            const cardB = newPositions[j];
            const horizontalOverlap = cardA.col < cardB.col + cardB.width && cardA.col + cardA.width > cardB.col;
            const verticalOverlap = cardA.row < cardB.row + cardB.height && cardA.row + cardA.height > cardB.row;
            if (horizontalOverlap && verticalOverlap) {
              // Push cardB down by the height of cardA
              newPositions[j] = { ...cardB, row: cardA.row + cardA.height };
              changed = true;
            }
          }
        }
      }
      return newPositions;
    };

    // Apply gravity to settle cards
    let finalPositions = applyGravity(updatedPositions);
    finalPositions = resolveAllOverlaps(finalPositions);
    finalPositions = applyGravity(finalPositions);
    setCardPositions(finalPositions);
    setDraggedCard(null);
    setIsDragging(false);
    setDropIndicator(null);
  };

  // Track drag overlay position for custom drag preview
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCard || !dropZoneRef.current || !editMode) return;
    const currentCard = cardPositions.find(p => p.id === draggedCard.id);
    if (!currentCard) return;
    const { row: finalRow, col: finalCol } = getGridPositionFromPointer(e, currentCard);
    const newDrop = {
      row: finalRow,
      col: finalCol,
      width: currentCard.width,
      height: currentCard.height,
      isValid: true // Always show indicator, collision will be resolved in drop
    };
    setDragOverlayPosition(pos => {
      if (!pos || Math.abs(pos.x - e.clientX) > 5 || Math.abs(pos.y - e.clientY) > 5) {
        return { x: e.clientX, y: e.clientY };
      }
      return pos;
    });
    setDropIndicator(prev => {
      if (!prev || prev.row !== newDrop.row || prev.col !== newDrop.col || 
          prev.width !== newDrop.width || prev.height !== newDrop.height) {
        return newDrop;
      }
      return prev;
    });
  };

  // Dynamic chart data based on real usage patterns (memoized)
  const usageChartData = useMemo(() => {
    // Repo-based division: each repo is a slice, 8 credits per repo, labeled by repo name
    const repoLabels = allRepositories.map(repo => repo.name);
    const repoCredits = allRepositories.map(repo => repo.creditsUsed ?? 0); // Use real creditsUsed
    // Generate distinct colors for each repo (fallback to blue if not enough)
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(251, 191, 36, 0.8)',
      'rgba(14, 165, 233, 0.8)'
    ];
    return {
      labels: repoLabels.length > 0 ? repoLabels : ['No repositories'],
      datasets: [{
        data: repoCredits.length > 0 ? repoCredits : [0],
        backgroundColor: repoLabels.map((_, i) => colors[i % colors.length]),
        borderWidth: 2,
        borderColor: repoLabels.map((_, i) => colors[i % colors.length].replace('0.8', '1'))
      }]
    };
  }, [allRepositories]);

  // Activity chart with realistic data distribution (memoized)
  const activityChartData = useMemo(() => ({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Commits',
        data: stats.totalCommits > 0 ? [
          Math.floor(stats.totalCommits * 0.15),
          Math.floor(stats.totalCommits * 0.18), 
          Math.floor(stats.totalCommits * 0.12),
          Math.floor(stats.totalCommits * 0.20),
          Math.floor(stats.totalCommits * 0.25),
          Math.floor(stats.totalCommits * 0.06),
          Math.floor(stats.totalCommits * 0.04)
        ] : [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'AI Analyses', 
        data: stats.aiAnalyses > 0 ? [
          Math.floor(stats.aiAnalyses * 0.10),
          Math.floor(stats.aiAnalyses * 0.15),
          Math.floor(stats.aiAnalyses * 0.20),
          Math.floor(stats.aiAnalyses * 0.25),
          Math.floor(stats.aiAnalyses * 0.20),
          Math.floor(stats.aiAnalyses * 0.06),
          Math.floor(stats.aiAnalyses * 0.04)
        ] : [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }), [stats]);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: 'rgb(100, 116, 139)',
          font: {
            size: 12,
            weight: 500
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(100, 116, 139, 0.8)',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.08)'
        },
        ticks: {
          color: 'rgba(100, 116, 139, 0.8)',
          font: {
            size: 11
          }
        }
      }
    }
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          color: 'rgb(100, 116, 139)',
          font: {
            size: 11,
            weight: 500
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        cornerRadius: 8
      }
    },
    cutout: '65%'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50';
      case 'away': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/50';
      case 'offline': return 'text-slate-500 bg-slate-50 dark:bg-slate-950/50';
      case 'completed': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50';
      case 'processing': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/50';
      case 'failed': return 'text-red-500 bg-red-50 dark:bg-red-950/50';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-950/50';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit': return CodeBracketIcon;
      case 'analysis': return SparklesIcon;
      case 'meeting': return PlayIcon;
      case 'question': return LightBulbIcon;
      case 'webhook': return LinkIcon;
      default: return DocumentTextIcon;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Get card position for a specific card with smooth transitions
  const getCardPosition = (cardId: string) => {
    const position = cardPositions.find(p => p.id === cardId);
    if (!position) return { 
      gridColumn: 'span 4', 
      gridRow: 'span 1',
      transition: 'grid-column 0.4s ease-in-out, grid-row 0.4s ease-in-out, transform 0.3s ease'
    };
    
    return {
      gridColumn: `${position.col + 1} / span ${position.width}`,
      gridRow: `${position.row + 1} / span ${position.height}`,
      transition: 'grid-column 0.4s ease-in-out, grid-row 0.4s ease-in-out, transform 0.3s ease'
    };
  };

  // Get enhanced card styling with smooth transitions
  const getCardStyle = (cardId: string) => {
    return {
      ...getCardPosition(cardId),
      transition: 'grid-column 0.4s ease-in-out, grid-row 0.4s ease-in-out, transform 0.3s ease, opacity 0.3s ease'
    };
  };

  // --- Team Member Normalization Utility & Types ---
type TeamMember = {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  commits: number;
};

// Utility: Always include owner in normalized team members
function getNormalizedTeamMembers(owner: TeamMember | null, members: TeamMember[]): TeamMember[] {
  if (!owner) return members;
  if (!members || members.length === 0) return [owner];
  const exists = members.some(m => m.id === owner.id);
  return exists ? members : [owner, ...members];
}
// Infer owner from teamMembers (role === 'Owner'), fallback to first member
const owner = teamMembers.find(m => m.role === 'Owner') || teamMembers[0] || null;
const normalizedTeamMembers = getNormalizedTeamMembers(owner, teamMembers);

  // Only show the credit usage analytics card if there is any usage
  const hasAnyCreditsUsage = allRepositories.some(repo => (repo.creditsUsed ?? 0) > 0);

  // Patch: Use activity.timestamp for commit activities if available, fallback to activity.createdAt
const recentActivitiesWithCorrectDate = recentActivities.map(activity => {
  if (activity.type === 'commit' && activity.timestamp) {
    return {
      ...activity,
      time: formatTimeAgo(activity.timestamp)
    };
  }
  return activity;
});

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30 p-2 sm:p-4 md:p-6">
        
        {/* Premium Header with Glass Morphism */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="relative overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/5">
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-teal-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-teal-500/10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-purple-400/10 to-transparent rounded-full blur-3xl"></div>
            
            <div className="relative flex flex-col gap-4 sm:gap-0 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                    <ChartBarIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-purple-700 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent mb-1">
                      GitTLDR
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                      All your code, team, and insights—at a glance
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 lg:mt-0 flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50/80 dark:bg-emerald-950/50 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl shadow-lg">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                  <span className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">System Online</span>
                </div>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-3 rounded-2xl font-semibold transition-all duration-300 shadow-lg flex items-center gap-2 ${
                    editMode 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25' 
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 shadow-slate-500/10'
                  }`}
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4" />
                  {editMode ? 'Exit Edit' : 'Edit Layout'}
                </button>
                <Link 
                  href="/repositories/create" 
                  className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  New Repository
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Bento Grid with Advanced Drag & Drop */}
        <div 
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6 auto-rows-[220px] sm:auto-rows-[280px] transition-all duration-500 ${
            isDragging && editMode 
              ? 'bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-dashed border-blue-400/50 dark:border-blue-600/50 rounded-2xl sm:rounded-3xl p-2 sm:p-4' 
              : ''
          }`}
          style={{ minHeight: '900px', position: 'relative' }}
        >
          {/* Drop indicator overlay */}
          {dropIndicator && (
            <div
              style={{
                position: 'absolute',
                zIndex: 50,
                left: `calc((100% / 12) * ${dropIndicator.col} + 0.75rem)`,
                top: `calc(286px * ${dropIndicator.row} + 0.75rem)`,
                width: `calc((100% / 12) * ${dropIndicator.width} - 1.5rem)`,
                height: `calc(286px * ${dropIndicator.height} - 1.5rem)`,
                background: 'rgba(59,130,246,0.12)',
                border: '3px dashed #3b82f6',
                borderRadius: '1.5rem',
                pointerEvents: 'none',
                transition: 'all 0.15s ease-out',
                boxShadow: '0 0 20px rgba(59,130,246,0.3)',
              }}
            />
          )}
          {/* Drag overlay for the card being dragged */}
          {isDragging && draggedCard && dragOverlayPosition && (
            <div
              style={{
                position: 'fixed',
                zIndex: 1000,
                left: 0,
                top: 0,
                pointerEvents: 'none',
                width: '100vw',
                height: '100vh',
              }}
            >
              <div
                className="opacity-90 scale-105 shadow-2xl border-2 border-blue-400 border-dashed rounded-3xl bg-white dark:bg-slate-800 backdrop-blur-sm"
                style={{
                  position: 'absolute',
                  left: `${dragOverlayPosition.x - 150}px`,
                  top: `${dragOverlayPosition.y - 40}px`,
                  width: '300px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Moving {draggedCard.id}
                </div>
              </div>
            </div>
          )}
          
          {/* Render only cards with data */}
          {normalizedAvailableCards.includes('repositories') && (
            <div 
              className={`group transition-all duration-500 ease-in-out ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('repositories')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('repositories', 'large', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-500">
                {/* Premium card background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-full blur-2xl"></div>
                
                <div className="relative p-6 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                        <FolderOpenIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">All Repositories</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Complete project portfolio</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editMode && (
                        <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm border border-blue-200/30 dark:border-blue-700/30">
                          <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                      )}
                      <Link href="/repositories/create" className="p-2 bg-blue-100/50 dark:bg-blue-950/50 backdrop-blur-sm rounded-lg hover:bg-blue-200/50 dark:hover:bg-blue-950/70 transition-colors">
                        <PlusIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </Link>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">{allRepositories.length}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total repositories</div>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="space-y-3 max-h-full overflow-y-auto custom-scrollbar pr-2">
                      {allRepositories.slice(0, 8).map((repo) => (
                        <div key={repo.id} className="group/item flex items-center justify-between p-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${repo.processed ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50'}`}></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{repo.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{repo.language || 'Mixed'} • {repo.fileCount} files</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-600/50 px-2 py-1 rounded-full">
                              <StarIcon className="w-3 h-3" />
                              {repo.stars}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-600/50 px-2 py-1 rounded-full">
                              <CodeBracketIcon className="w-3 h-3" />
                              {repo.commitCount ?? 0}
                            </span>
                            {repo.isPrivate && <LockClosedIcon className="w-3 h-3 text-amber-500" />}
                          </div>
                        </div>
                      ))}
                      {allRepositories.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FolderOpenIcon className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-medium">No repositories yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Credits Balance Card */}
          {normalizedAvailableCards.includes('credits') && (
            <div 
              className={`group transition-all duration-500 ease-in-out ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('credits')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('credits', 'medium', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-amber-500/10 hover:shadow-amber-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5"></div>
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-full blur-2xl"></div>
                
                <div className="relative p-6 h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                        <BoltIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Credits</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Available balance</p>
                      </div>
                    </div>
                    {editMode && (
                      <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm">
                        <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{stats.creditsRemaining.toLocaleString()}</div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Usage this month</span>
                        <span className="text-slate-900 dark:text-white font-bold">{stats.creditsUsed}</span>
                      </div>
                      <div className="relative w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-3 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full"></div>
                        <div 
                          className="relative bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-1000 shadow-lg" 
                          style={{width: `${Math.min(100, Math.max(10, (stats.creditsUsed / (stats.creditsUsed + stats.creditsRemaining)) * 100))}%`}}
                        ></div>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <BoltIcon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{((stats.creditsUsed / (stats.creditsUsed + stats.creditsRemaining)) * 100).toFixed(1)}% utilized</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Collaboration Card */}
          {normalizedAvailableCards.includes('team') && (
            <div 
              className={`group transition-all duration-500 ease-in-out ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('team')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('team', 'medium', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-purple-400/20 to-transparent rounded-full blur-2xl"></div>
                
                <div className="relative p-6 h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                        <UserGroupIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Team</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Active collaborators</p>
                      </div>
                    </div>
                    {editMode && (
                      <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm">
                        <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{normalizedTeamMembers.length > 0 ? normalizedTeamMembers.length : (owner ? 1 : 0)}</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {normalizedTeamMembers.length === 1 && normalizedTeamMembers[0].role === 'Owner' ? (
                        <div className="text-center py-6 text-slate-500 dark:text-slate-400 font-medium">
                          No other team members yet
                        </div>
                      ) : (
                        normalizedTeamMembers.slice(0, 4).map((member: TeamMember) => (
                          <div key={member.id} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300">
                            <div className="relative">
                              <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full border-2 border-white/50 dark:border-slate-600/50" />
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                                member.status === 'online' ? 'bg-emerald-500' : 
                                member.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'
                              }`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{member.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{member.role} • {member.commits} commits</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Total Commits Card */}
          {normalizedAvailableCards.includes('commits') && (
            <div 
              className={`group transition-all duration-500 ease-in-out ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('commits')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('commits', 'small', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5"></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-400/20 to-transparent rounded-full blur-xl"></div>
                
                <div className="relative p-6 h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                        <CodeBracketIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Commits</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total activity</p>
                      </div>
                    </div>
                    {editMode && (
                      <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm">
                        <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{stats.totalCommits.toLocaleString()}</div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                      <ArrowTrendingUpIcon className="w-4 h-4" />
                      <span className="text-sm font-semibold">Across all repositories</span>
                    </div>
                    <div className="space-y-3">
                      {/* Most Active Repository - improved UI */}
                      {allRepositories && allRepositories.length > 0 ? (
                        (() => {
                          const mostActiveRepo = allRepositories.reduce((max, repo) => (repo.commitCount > (max.commitCount ?? 0) ? repo : max), allRepositories[0]);
                          return (
                            <div className="flex items-center gap-2 py-1">
                              <span className="text-sm text-slate-600 dark:text-slate-400">Most active repo:</span>
                              <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold text-xs shadow-sm">
                                {mostActiveRepo.name}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <CodeBracketIcon className="w-3 h-3" />
                                {mostActiveRepo.commitCount ?? 0} commits
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400 py-1">No repositories yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activities Card */}
          {normalizedAvailableCards.includes('activities') && (
            <div 
              className={`group transition-all duration-300 ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('activities')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('activities', 'large', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-400/15 to-transparent rounded-full blur-3xl"></div>
                
                <div className="relative p-6 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl shadow-lg">
                        <ClockIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activities</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Latest project updates</p>
                      </div>
                    </div>
                    {editMode && (
                      <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm">
                        <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <div className="space-y-3 max-h-full overflow-y-auto custom-scrollbar pr-2">
                      {recentActivitiesWithCorrectDate.map((activity) => {
                        const Icon = getActivityIcon(activity.type);
                        return (
                          <div key={activity.id} className="group/item flex items-start gap-3 p-4 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300">
                            <div className="p-2.5 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-xl border border-white/50 dark:border-slate-500/50">
                              <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{activity.title}</h4>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)} border border-current border-opacity-20`}>
                                  {activity.status}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{activity.description}</p>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                                <span className="font-medium">{activity.time}</span>
                                {activity.repository && (
                                  <span className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-600/60 px-2 py-1 rounded-full">
                                    <FolderOpenIcon className="w-3 h-3" />
                                    {activity.repository}
                                  </span>
                                )}
                                {activity.author && <span className="text-slate-600 dark:text-slate-400">by {activity.author}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shared Repositories Card */}
          {normalizedAvailableCards.includes('shared') && (
            <div 
              className={`group transition-all duration-300 ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('shared')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('shared', 'medium', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-rose-500/10 hover:shadow-rose-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-orange-500/5"></div>
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-rose-400/20 to-transparent rounded-full blur-2xl"></div>
                
                <div className="relative p-6 h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl shadow-lg">
                        <ShareIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Shared</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">With you</p>
                      </div>
                    </div>
                    {editMode && (
                      <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm">
                        <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {sharedRepositories.slice(0, 4).map((repo) => (
                      <div key={repo.id} className="p-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300">
                        <div className="flex items-start gap-3">
                          <img 
                            src={repo.owner.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(repo.owner.name)}&size=32&background=6366f1&color=fff`} 
                            alt={repo.owner.name} 
                            className="w-8 h-8 rounded-full border-2 border-white/50 dark:border-slate-600/50" 
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{repo.name}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">by {repo.owner.name}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                              <span className="bg-slate-100/60 dark:bg-slate-600/60 px-2 py-1 rounded-full">{repo.stats.files} files</span>
                              <span className="bg-slate-100/60 dark:bg-slate-600/60 px-2 py-1 rounded-full">{repo.stats.meetings} meetings</span>
                              <span className="bg-slate-100/60 dark:bg-slate-600/60 px-2 py-1 rounded-full">{repo.stats.questions} Q&As</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Credit Usage Analytics Card */}
          {hasAnyCreditsUsage && normalizedAvailableCards.includes('analytics') && (
            <div 
              className={`group transition-all duration-300 ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('analytics')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('analytics', 'small', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-teal-500/10 hover:shadow-teal-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5"></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-400/20 to-transparent rounded-full blur-xl"></div>
                
                <div className="relative p-6 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-lg">
                        <ChartPieIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Usage</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Credit distribution</p>
                      </div>
                    </div>
                    {editMode && (
                      <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm">
                        <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="h-48">
                    <Doughnut data={usageChartData} options={doughnutOptions} />
                    {/* Repo breakdown list for better space usage */}
                    <div className="mt-6 space-y-2">
                      {allRepositories.length > 0 ? (
                        allRepositories.map((repo, i) => (
                          <div key={repo.id} className="flex items-center justify-between px-4 py-2 bg-slate-100/60 dark:bg-slate-700/60 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-3 h-3 rounded-full mr-2" style={{backgroundColor: usageChartData.datasets[0].backgroundColor[i]}}></span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{repo.name}</span>
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{repo.creditsUsed !== undefined ? repo.creditsUsed : 8} credits</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-4">No repositories yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* AI Insights Card */}
          {normalizedAvailableCards.includes('insights') && (
            <div 
              className={`group transition-all duration-300 ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('insights')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('insights', 'wide', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-violet-500/10 hover:shadow-violet-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-400/20 to-transparent rounded-full blur-2xl"></div>
                
                <div className="relative p-6 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl shadow-lg">
                        <SparklesIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Insights</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Intelligent recommendations</p>
                      </div>
                    </div>
                    {editMode && (
                      <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm">
                        <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-black text-slate-900 dark:text-white">{stats.aiAnalyses}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">AI analyses generated</div>
                    </div>
                    <div className="h-20 w-48">
                      <Line data={activityChartData} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {display: false}}}} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Notifications Card */}
          {normalizedAvailableCards.includes('notifications') && (
            <div 
              className={`group transition-all duration-300 ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''}`}
              style={getCardStyle('notifications')}
              draggable={editMode}
              onDragStart={(e) => handleDragStart('notifications', 'small', e)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5"></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-400/20 to-transparent rounded-full blur-xl"></div>
                <div className="relative p-6 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl shadow-lg relative">
                        <BellIcon className="w-6 h-6 text-white" />
                        {unreadCount > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse border-2 border-white dark:border-slate-800">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Alerts</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">System updates</p>
                      </div>
                    </div>
                    {editMode && (
                      <div className="p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm">
                        <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 flex-1 flex flex-col justify-center items-center">
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{unreadCount}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pending notifications</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Edit Mode Instructions */}
        {editMode && (
          <div className="fixed bottom-6 right-6 p-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Edit Mode Active</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Drag any card to rearrange • Dynamic sizing • Auto-gravity • Collision detection
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </DashboardLayout>
  );
}
