'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DraggedCard, CardPosition, DashboardStats, RecentActivity, TeamMember, SharedRepository, Repository } from '@/types/dashboard';

// Extend Repository type to include creditsUsed
interface RepositoryWithCreditsUsed extends Repository {
  creditsUsed?: number;
}

export function useDashboard() {
  const [draggedCard, setDraggedCard] = useState<DraggedCard | null>(null);
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [availableCards, setAvailableCards] = useState<string[]>([]);
  const [dragOverlayPosition, setDragOverlayPosition] = useState<{x: number, y: number} | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{row: number, col: number, width: number, height: number} | null>(null);
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

  // Fetch team members
  const { data: teamData } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await fetch('/api/team');
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    }
  });

  // Real data from APIs
  const stats: DashboardStats = dashboardData?.stats || {
    repositories: 0,
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
  const realTeamMembers: TeamMember[] = teamData?.teamMembers || [];
  const teamMembers: TeamMember[] = realTeamMembers;

  // Only add team and shared if there's actual data
  const normalizedAvailableCards = useMemo(() => {
    const cards = new Set(availableCards);
    if (teamMembers.length > 0) cards.add('team');
    if (sharedRepositories.length > 0) cards.add('shared');
    cards.add('notifications');
    return Array.from(cards);
  }, [availableCards, teamMembers, sharedRepositories]);

  // Improved gravity system with collision detection
  const applyGravity = useCallback((positions: CardPosition[]) => {
    const newPositions = [...positions];
    let changed = true;
    let iterations = 0;
    const maxIterations = 50;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      newPositions.sort((a, b) => a.row - b.row);
      
      newPositions.forEach((card, index) => {
        if (card.row > 0) {
          const testCard = { ...card, row: card.row - 1 };
          const otherCards = newPositions.filter((_, i) => i !== index);
          
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
        case 'metrics':
          return { width: 6, height: 2 };
        case 'performance':
          return { width: 8, height: 2 };
        case 'notifications':
          return { width: 3, height: 1 };
        default:
          return { width: 4, height: 1 };
      }
    };

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
      return { row: 0, col: 0 };
    };

    const placed: CardPosition[] = [];
    for (const cardId of cards) {
      const size = getCardSize(cardId);
      const { row, col } = findSlot(cardId, size.width, size.height, placed);
      placed.push({ id: cardId, row, col, width: size.width, height: size.height });
    }
    return placed;
  }, [allRepositories, teamMembers, sharedRepositories, recentActivities]);

  // Determine which cards should be available based on data
  useEffect(() => {
    const cards = [];
    
    if (allRepositories.length > 0) cards.push('repositories');
    if (stats.creditsRemaining > 0 || stats.creditsUsed > 0) cards.push('credits');
    if (recentActivities.length > 0) cards.push('activities');
    if (stats.repositories > 0 || stats.meetings > 0 || stats.questions > 0) cards.push('analytics');
    if (stats.repositories > 0) cards.push('performance');
    if (recentActivities.length > 0 || stats.repositories > 0) cards.push('notifications');
    
    const arraysEqual = (a: string[], b: string[]) => (
      a.length === b.length && a.every((v, i) => v === b[i])
    );
    if (!arraysEqual(cards, availableCards)) {
      setAvailableCards(cards);
    }
  }, [allRepositories, stats, teamMembers, recentActivities, sharedRepositories, availableCards]);

  // Initialize card positions based on available data
  useEffect(() => {
    if (availableCards.length > 0) {
      const initialLayout = getInitialLayout(availableCards);
      const gravityLayout = applyGravity(initialLayout);
      setCardPositions(prev => {
        const same = prev.length === gravityLayout.length &&
          prev.every((c, i) =>
            c.id === gravityLayout[i].id &&
            c.row === gravityLayout[i].row &&
            c.col === gravityLayout[i].col &&
            c.width === gravityLayout[i].width &&
            c.height === gravityLayout[i].height
          );
        return same ? prev : gravityLayout;
      });
    }
  }, [availableCards, getInitialLayout, applyGravity]);

  // Advanced collision detection with better accuracy
  const checkCollision = (newCard: CardPosition, existingCards: CardPosition[], excludeId?: string) => {
    return existingCards.some(card => {
      if (card.id === excludeId) return false;
      const horizontalOverlap = newCard.col < card.col + card.width && newCard.col + newCard.width > card.col;
      const verticalOverlap = newCard.row < card.row + card.height && newCard.row + newCard.height > card.row;
      return horizontalOverlap && verticalOverlap;
    });
  };

  // Find available position for displaced cards
  const findAvailablePosition = (card: CardPosition, occupiedPositions: CardPosition[]): CardPosition => {
    const maxCols = 12;
    const maxRows = 20;
    
    const originalRow = card.row;
    const originalCol = card.col;
    const searchRadius = 3;
    
    for (let radius = 0; radius <= searchRadius; radius++) {
      for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
        for (let colOffset = -radius; colOffset <= radius; colOffset++) {
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
    
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col <= maxCols - card.width; col++) {
        const testPosition = { ...card, row, col };
        if (!checkCollision(testPosition, occupiedPositions, card.id)) {
          return testPosition;
        }
      }
    }
    
    const maxRow = Math.max(...occupiedPositions.map(p => p.row + p.height), 0);
    return { ...card, row: maxRow, col: 0 };
  };

  // Utility to get grid position from pointer event
  const getGridPositionFromPointer = (e: React.DragEvent, card: CardPosition) => {
    if (!dropZoneRef.current) return { row: 0, col: 0 };
    const rect = dropZoneRef.current.getBoundingClientRect();
    const colWidth = rect.width / 12;
    const rowHeight = 286;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newCol = Math.max(0, Math.min(Math.floor((x + colWidth/2) / colWidth), 11));
    const newRow = Math.max(0, Math.floor((y + rowHeight/2) / rowHeight));
    const finalCol = Math.min(newCol, 12 - card.width);
    const finalRow = newRow;
    return { row: finalRow, col: finalCol };
  };

  // Enhanced drag handlers
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
    
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.7';
    target.style.transform = 'scale(0.98) rotate(1deg)';
    target.style.zIndex = '1000';
    
    const img = document.createElement('img');
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedCard(null);
    setIsDragging(false);
    setDragOverlayPosition(null);
    setDropIndicator(null);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '';
    target.style.transform = '';
    target.style.zIndex = '';
    target.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
      target.style.transition = '';
    }, 300);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCard || !dropZoneRef.current || !editMode) return;
    const currentCard = cardPositions.find(p => p.id === draggedCard.id);
    if (!currentCard) return;
    const { row: dropRow, col: dropCol } = getGridPositionFromPointer(e, currentCard);
    const cardWidth = currentCard.width;
    const cardHeight = currentCard.height;
    const otherCards = cardPositions.filter(p => p.id !== draggedCard.id);

    let updatedPositions = [...otherCards];
    updatedPositions.sort((a, b) => a.row - b.row);

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
        const horizontalOverlap = card.col < col + width && card.col + card.width > col;
        const verticalOverlap = card.row < startRow + height && card.row + card.height > startRow;
        if (horizontalOverlap && verticalOverlap && !alreadyMoved.has(card.id)) {
          moved = true;
          alreadyMoved.add(card.id);
          return { ...card, row: card.row + height };
        }
        return card;
      });
      if (moved) {
        return pushDownCards(newPositions, startRow + height, col, width, height, alreadyMoved);
      }
      return newPositions;
    };

    const updatedCard = { ...currentCard, row: dropRow, col: dropCol };
    updatedPositions = pushDownCards(updatedPositions, dropRow, dropCol, cardWidth, cardHeight);
    updatedPositions.push(updatedCard);

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
              newPositions[j] = { ...cardB, row: cardA.row + cardA.height };
              changed = true;
            }
          }
        }
      }
      return newPositions;
    };

    let finalPositions = applyGravity(updatedPositions);
    finalPositions = resolveAllOverlaps(finalPositions);
    finalPositions = applyGravity(finalPositions);
    setCardPositions(finalPositions);
    setDraggedCard(null);
    setIsDragging(false);
    setDropIndicator(null);
  };

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
      isValid: true
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

  // Get card position for a specific card
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

  const getCardStyle = (cardId: string) => {
    const position = cardPositions.find(p => p.id === cardId);
    if (!position) return { 
      gridColumn: 'span 4', 
      gridRow: 'span 1',
      transition: 'grid-column 0.4s ease-in-out, grid-row 0.4s ease-in-out, transform 0.3s ease, opacity 0.3s ease'
    };
    
    return {
      gridColumn: `${position.col + 1} / span ${position.width}`,
      gridRow: `${position.row + 1} / span ${position.height}`,
      transition: 'grid-column 0.4s ease-in-out, grid-row 0.4s ease-in-out, transform 0.3s ease, opacity 0.3s ease'
    };
  };

  // Mobile-specific ordering for single column layout
  const getMobileCardOrder = (cardId: string) => {
    const mobileOrder = {
      'repositories': 1,
      'credits': 2, 
      'commits': 3,
      'activities': 4,
      'team': 5,
      'shared': 6,
      'analytics': 7,
      'performance': 8,
      'notifications': 9
    };
    return mobileOrder[cardId as keyof typeof mobileOrder] || 10;
  };

  return {
    // State
    editMode,
    setEditMode,
    isDragging,
    draggedCard,
    dropIndicator,
    dragOverlayPosition,
    dropZoneRef,
    
    // Data
    stats,
    recentActivities,
    sharedRepositories,
    allRepositories,
    teamMembers,
    normalizedAvailableCards,
    isLoading,
    
    // Functions
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleDragOver,
    getCardStyle,
    getMobileCardOrder,
    checkCollision,
    findAvailablePosition
  };
}
