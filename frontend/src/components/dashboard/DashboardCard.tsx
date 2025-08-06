'use client';

import React from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { DraggedCard } from '@/types/dashboard';

interface DashboardCardProps {
  cardId: string;
  children: React.ReactNode;
  editMode: boolean;
  cardStyle: React.CSSProperties;
  onDragStart: (cardId: string, size: 'small' | 'medium' | 'large' | 'wide', e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  size?: 'small' | 'medium' | 'large' | 'wide';
  showEditHandle?: boolean;
  className?: string;
}

export default function DashboardCard({ 
  cardId, 
  children, 
  editMode, 
  cardStyle, 
  onDragStart, 
  onDragEnd,
  size = 'medium',
  showEditHandle = true,
  className = ''
}: DashboardCardProps) {
  return (
    <div 
      className={`group transition-all duration-500 ease-in-out ${editMode ? 'cursor-grab hover:cursor-grabbing hover:scale-[1.02] hover:shadow-2xl hover:z-10' : ''} ${className} mobile-card`}
      style={cardStyle}
      draggable={editMode}
      onDragStart={(e) => onDragStart(cardId, size, e)}
      onDragEnd={onDragEnd}
    >
      <div className="relative h-full overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl transition-all duration-500">
        {children}
        {editMode && showEditHandle && (
          <div className="absolute top-4 right-4 p-2 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm border border-blue-200/30 dark:border-blue-700/30">
            <Bars3Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
        )}
      </div>
      
      <style jsx>{`
        @media (max-width: 449px) {
          .mobile-card {
            grid-column: unset !important;
            grid-row: unset !important;
            width: 100% !important;
            min-height: 280px !important;
          }
        }
      `}</style>
    </div>
  );
}
