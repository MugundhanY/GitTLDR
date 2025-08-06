'use client';

import React from 'react';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { DraggedCard, CardPosition } from '@/types/dashboard';

interface DashboardGridProps {
  children: React.ReactNode;
  editMode: boolean;
  isDragging: boolean;
  dropIndicator: {row: number, col: number, width: number, height: number} | null;
  dragOverlayPosition: {x: number, y: number} | null;
  draggedCard: DraggedCard | null;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  dropZoneRef: React.RefObject<HTMLDivElement | null>;
}

export default function DashboardGrid({
  children,
  editMode,
  isDragging,
  dropIndicator,
  dragOverlayPosition,
  draggedCard,
  onDrop,
  onDragOver,
  dropZoneRef
}: DashboardGridProps) {
  // Check if we're on mobile
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 450);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Disable drag and drop on mobile
  const shouldHandleDragDrop = !isMobile && editMode;

  return (
    <>
      <div 
        ref={dropZoneRef}
        onDrop={shouldHandleDragDrop ? onDrop : undefined}
        onDragOver={shouldHandleDragDrop ? onDragOver : undefined}
        className={`gap-3 sm:gap-4 md:gap-6 auto-rows-[220px] sm:auto-rows-[280px] transition-all duration-500 ${
          isDragging && shouldHandleDragDrop
            ? 'bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-dashed border-blue-400/50 dark:border-blue-600/50 rounded-2xl sm:rounded-3xl p-2 sm:p-4' 
            : ''
        } custom-grid-responsive`}
        style={{ minHeight: isMobile ? 'auto' : '900px', position: 'relative' }}
      >
        {/* Drop indicator overlay - only show on desktop */}
        {dropIndicator && shouldHandleDragDrop && (
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
        
        {/* Drag overlay for the card being dragged - only show on desktop */}
        {isDragging && draggedCard && dragOverlayPosition && shouldHandleDragDrop && (
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
        
        {children}
      </div>

      {/* Edit Mode Instructions - only show on desktop */}
      {editMode && !isMobile && (
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

      <style jsx>{`
        .custom-grid-responsive {
          display: flex !important;
          flex-direction: column !important;
          gap: 1rem !important;
        }
        @media (min-width: 450px) {
          .custom-grid-responsive {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)) !important;
            gap: 1rem !important;
          }
        }
        @media (min-width: 1024px) {
          .custom-grid-responsive {
            grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
            gap: 1.5rem !important;
          }
        }
        @media (min-width: 1280px) {
          .custom-grid-responsive {
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
            gap: 1.5rem !important;
          }
        }
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
    </>
  );
}
