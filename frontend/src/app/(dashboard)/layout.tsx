'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Sidebar, MobileHeader } from '@/components/Sidebar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, setUser, logout } = useAuthStore();
  const { sidebarOpen } = useUIStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Load tokens from localStorage
      api.loadTokens();

      // Check if we have a token in localStorage
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');

      if (!hasToken && !isAuthenticated) {
        setIsLoading(false);
        router.push('/login');
        return;
      }

      // If we have a token, verify it's still valid
      try {
        const user = await api.getMe();
        setUser(user);
        setIsValidSession(true);
      } catch {
        // Token is invalid or expired
        api.logout();
        logout();
        router.push('/login');
        return;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, setUser, logout, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isValidSession && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      {/* Mobile Header - visível apenas em telas pequenas */}
      <MobileHeader />

      {/* Sidebar - desktop tem margin, mobile é overlay */}
      <Sidebar />

      <main
        className={cn(
          'transition-all duration-300',
          // Mobile: sem margin, padding-top para o header
          'pt-16 lg:pt-0',
          // Desktop: margin left baseada no sidebar
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        )}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
