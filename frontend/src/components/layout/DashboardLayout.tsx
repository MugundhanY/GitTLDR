'use client';

import React from 'react';
import { Header } from './Header-modern';
import Sidebar from './Sidebar-modern';
import { useRepository } from '@/contexts/RepositoryContext';
import AuthGuard from '@/components/auth/AuthGuard';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { selectedRepository } = useRepository();
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen text-gray-900 dark:text-white transition-colors duration-200">
        {/* Header */}
        <Header />
        
        {/* Main Content Area */}
        <div className="flex h-[calc(100vh-4rem)]"> {/* 4rem is header height */}
          {/* Sidebar */}
          <Sidebar selectedRepository={selectedRepository} />
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
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
