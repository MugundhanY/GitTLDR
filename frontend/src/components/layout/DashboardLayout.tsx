'use client';

import React from 'react';
import { Header } from './Header-modern';
import Sidebar from './Sidebar-modern';
import { useRepository } from '@/contexts/RepositoryContext';
import { useSidebar } from '@/contexts/SidebarContext';
import AuthGuard from '@/components/auth/AuthGuard';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { selectedRepository } = useRepository();
  const { isCollapsed } = useSidebar();
  
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen text-gray-900 dark:text-white transition-colors duration-200">
        {/* Header */}
        <Header />
          {/* Main Content Area */}
        <div className="flex h-[calc(100vh-4rem)]"> {/* 4rem is header height */}
          {/* Sidebar */}
          <Sidebar selectedRepository={selectedRepository} />
            {/* Main Content - truly responsive to sidebar state */}
          <main className="flex-1 overflow-auto transition-all duration-300">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default DashboardLayout;
