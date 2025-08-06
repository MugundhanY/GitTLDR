import React from 'react';
import Image from 'next/image';
import { useSidebar } from '@/contexts/SidebarContext';
import Link from 'next/link';
import { CodeBracketIcon, UserCircleIcon, Cog6ToothIcon, CreditCardIcon, QuestionMarkCircleIcon, HomeIcon, FolderIcon, VideoCameraIcon, ChatBubbleLeftRightIcon, ChartBarIcon, UsersIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useUserData } from '@/hooks/useUserData';
import { usePathname } from 'next/navigation';
import { useRepository } from '@/contexts/RepositoryContext';

interface MobileSidebarProps {
  navigation: Array<{ name: string; href: string }>;

  secondaryItems: Array<{ name: string; href: string }>;

  selectedRepository?: any;
  onClose: () => void;
  credits?: number;
}

const navIcons: Record<string, any> = {
  Dashboard: HomeIcon,
  Files: FolderIcon,
  Meetings: VideoCameraIcon,
  'Q&A': ChatBubbleLeftRightIcon,
  Analytics: ChartBarIcon,
  Team: UsersIcon,
  Billing: CreditCardIcon,
  'Help & Support': QuestionMarkCircleIcon,
  Settings: Cog6ToothIcon,
  Profile: UserCircleIcon,
};

export default function MobileSidebar({ navigation, secondaryItems, selectedRepository, onClose, credits }: MobileSidebarProps) {
  const { userData } = useUserData();
  const pathname = usePathname();
  const { repositories, selectRepository } = useRepository();

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-40 flex md:hidden`}>
      <div className="relative w-64 bg-white dark:bg-slate-900 h-full shadow-xl flex flex-col">
        <button
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <svg className="w-6 h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center">
          <Link href="/dashboard" className="flex items-center" onClick={onClose}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <CodeBracketIcon className="w-5 h-5 text-white" />
            </div>
            <span className="ml-2 text-xl font-bold text-slate-900 dark:text-white">GitTLDR</span>
          </Link>
        </div>
        {/* Profile Section */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          {userData?.avatarUrl ? (
            <Image src={userData.avatarUrl} alt={userData.name || 'User'} width={40} height={40} className="rounded-full object-cover" />
          ) : (
            <UserCircleIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          )}
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{userData?.name || 'Guest User'}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{userData?.email || 'Not signed in'}</div>
            <Link href="/settings" className="text-xs text-emerald-600 hover:underline" onClick={onClose}>Profile & Settings</Link>
            {typeof credits === 'number' && (
              <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <CreditCardIcon className="w-4 h-4 mr-1" />
                Credits: {credits}
              </div>
            )}
          </div>
        </div>
        {/* Repo Selector */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Repository</label>
          <select
            className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            value={selectedRepository?.id || ''}
            onChange={e => {
              const repo = repositories.find(r => r.id === e.target.value);
              if (repo) selectRepository(repo);
              onClose();
            }}
          >
            <option value="" disabled>Select repository</option>
            {repositories.map(repo => (
              <option key={repo.id} value={repo.id}>{repo.name}</option>
            ))}
          </select>
        </div>
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = navIcons[item.name] || HomeIcon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                onClick={onClose}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        {/* Secondary Items and Sign Out */}
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {secondaryItems.map((item) => {
            const Icon = navIcons[item.name] || HomeIcon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={onClose}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
          <button
            className="flex items-center gap-3 px-4 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
              }
              window.location.href = '/';
            }}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
