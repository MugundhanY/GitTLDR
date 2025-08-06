'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNotifications } from '@/contexts/NotificationContext';
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
  Legend
} from 'chart.js';

// Components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardCard from '@/components/dashboard/DashboardCard';
import RepositoriesCard from '@/components/dashboard/cards/RepositoriesCard';
import CreditsCard from '@/components/dashboard/cards/CreditsCard';
import TeamCard from '@/components/dashboard/cards/TeamCard';
import CommitsCard from '@/components/dashboard/cards/CommitsCard';
import RecentActivitiesCard from '@/components/dashboard/cards/RecentActivitiesCard';
import SharedRepositoriesCard from '@/components/dashboard/cards/SharedRepositoriesCard';
import AnalyticsCard from '@/components/dashboard/cards/AnalyticsCard';
import PerformanceCard from '@/components/dashboard/cards/PerformanceCard';
import NotificationsCard from '@/components/dashboard/cards/NotificationsCard';

// Hooks
import { useDashboard } from '@/hooks/useDashboard';
import { useChartData } from '@/hooks/useChartData';
import { formatTimeAgo } from '@/utils/formatTime';

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

export default function DashboardPage() {
  const { unreadCount } = useNotifications();
  const {
    editMode,
    setEditMode,
    isDragging,
    draggedCard,
    dropIndicator,
    dragOverlayPosition,
    dropZoneRef,
    stats,
    recentActivities,
    sharedRepositories,
    allRepositories,
    teamMembers,
    normalizedAvailableCards,
    isLoading,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleDragOver,
    getCardStyle,
    getMobileCardOrder
  } = useDashboard();

  const { usageChartData } = useChartData(allRepositories, stats);

  // Process activities with correct time formatting
  const recentActivitiesWithCorrectDate = recentActivities
    .filter(activity => {
      if (!activity.repository) return true;
      const accessibleRepoNames = new Set([
        ...allRepositories.map(r => r.name?.toLowerCase?.() ?? ''),
        ...(sharedRepositories ? sharedRepositories.map(r => r.name?.toLowerCase?.() ?? '') : [])
      ]);
      return accessibleRepoNames.has(activity.repository.toLowerCase());
    })
    .map(activity => {
      if (activity.type === 'commit' && activity.timestamp) {
        return {
          ...activity,
          time: formatTimeAgo(activity.timestamp)
        };
      }
      return activity;
    });

  // Infer owner from teamMembers (role === 'Owner'), fallback to first member
  const owner = teamMembers.find(m => m.role === 'Owner') || teamMembers[0] || null;

  // Only show the credit usage analytics card if there is any usage
  const hasAnyCreditsUsage = allRepositories.some(repo => ((repo as any).creditsUsed ?? 0) > 0);

  // Create ordered cards array for mobile layout
  const createOrderedCards = () => {
    const cardComponents = [];

    // Define all possible cards with their conditions
    const cardDefinitions = [
      {
        id: 'repositories',
        condition: normalizedAvailableCards.includes('repositories'),
        component: <RepositoriesCard repositories={allRepositories} />,
        size: 'large' as const,
        shadowClass: 'shadow-blue-500/10 hover:shadow-blue-500/20'
      },
      {
        id: 'credits',
        condition: normalizedAvailableCards.includes('credits'),
        component: <CreditsCard stats={stats} />,
        size: 'medium' as const,
        shadowClass: 'shadow-amber-500/10 hover:shadow-amber-500/20'
      },
      {
        id: 'commits',
        condition: normalizedAvailableCards.includes('commits'),
        component: <CommitsCard stats={stats} repositories={allRepositories} sharedRepositories={sharedRepositories} />,
        size: 'small' as const,
        shadowClass: 'shadow-emerald-500/10 hover:shadow-emerald-500/20'
      },
      {
        id: 'activities',
        condition: normalizedAvailableCards.includes('activities'),
        component: <RecentActivitiesCard activities={recentActivitiesWithCorrectDate} />,
        size: 'large' as const,
        shadowClass: 'shadow-indigo-500/10 hover:shadow-indigo-500/20'
      },
      {
        id: 'team',
        condition: normalizedAvailableCards.includes('team'),
        component: <TeamCard teamMembers={teamMembers} owner={owner} />,
        size: 'medium' as const,
        shadowClass: 'shadow-purple-500/10 hover:shadow-purple-500/20'
      },
      {
        id: 'shared',
        condition: normalizedAvailableCards.includes('shared'),
        component: <SharedRepositoriesCard sharedRepositories={sharedRepositories} />,
        size: 'medium' as const,
        shadowClass: 'shadow-rose-500/10 hover:shadow-rose-500/20'
      },
      {
        id: 'analytics',
        condition: hasAnyCreditsUsage && normalizedAvailableCards.includes('analytics'),
        component: <AnalyticsCard repositories={allRepositories} usageChartData={usageChartData} />,
        size: 'small' as const,
        shadowClass: 'shadow-teal-500/10 hover:shadow-teal-500/20'
      },
      {
        id: 'performance',
        condition: normalizedAvailableCards.includes('performance'),
        component: <PerformanceCard repositories={allRepositories} />,
        size: 'large' as const,
        shadowClass: 'shadow-emerald-500/10 hover:shadow-emerald-500/20'
      },
      {
        id: 'notifications',
        condition: normalizedAvailableCards.includes('notifications'),
        component: <NotificationsCard unreadCount={unreadCount} />,
        size: 'small' as const,
        shadowClass: 'shadow-indigo-500/10 hover:shadow-indigo-500/20'
      }
    ];

    // Filter available cards and sort by mobile order
    return cardDefinitions
      .filter(card => card.condition)
      .sort((a, b) => getMobileCardOrder(a.id) - getMobileCardOrder(b.id))
      .map(card => (
        <DashboardCard
          key={card.id}
          cardId={card.id}
          editMode={editMode}
          cardStyle={getCardStyle(card.id)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          size={card.size}
          className={card.shadowClass}
        >
          {card.component}
        </DashboardCard>
      ));
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30 p-2 sm:p-4 md:p-6">
        
        {/* Dashboard Header */}
        <DashboardHeader editMode={editMode} setEditMode={setEditMode} />

        {/* Dashboard Grid with Cards */}
        <DashboardGrid
          editMode={editMode}
          isDragging={isDragging}
          dropIndicator={dropIndicator}
          dragOverlayPosition={dragOverlayPosition}
          draggedCard={draggedCard}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          dropZoneRef={dropZoneRef}
        >
          {createOrderedCards()}
        </DashboardGrid>
      </div>
    </DashboardLayout>
  );
}
