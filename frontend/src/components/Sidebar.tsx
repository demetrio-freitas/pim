'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  LayoutDashboard,
  Boxes,
  FolderTree,
  Tags,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Moon,
  Sun,
  Image,
  GitPullRequest,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, useUIStore } from '@/lib/store';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Produtos', href: '/products', icon: Boxes },
  { name: 'Categorias', href: '/categories', icon: FolderTree },
  { name: 'Atributos', href: '/attributes', icon: Tags },
  { name: 'Mídia', href: '/media', icon: Image },
  { name: 'Workflow', href: '/workflow', icon: GitPullRequest },
];

const actions = [
  { name: 'Importar', href: '/import', icon: Upload },
  { name: 'Exportar', href: '/export', icon: Download },
];


export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout: logoutStore } = useAuthStore();
  const { sidebarOpen, toggleSidebar, darkMode, toggleDarkMode } = useUIStore();

  const handleLogout = () => {
    api.logout();
    logoutStore();
    router.push('/login');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-dark-100 transition-all duration-300 dark:bg-dark-900 dark:border-dark-800',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-100 dark:border-dark-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="text-xl font-bold text-dark-900 dark:text-white">PIM</span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'sidebar-link',
                  pathname.startsWith(item.href) && 'active'
                )}
              >
                <item.icon size={20} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            ))}
          </div>

          {sidebarOpen && (
            <div className="pt-4 mt-4 border-t border-dark-100 dark:border-dark-800">
              <p className="px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">
                Ações
              </p>
              {actions.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'sidebar-link',
                    pathname.startsWith(item.href) && 'active'
                  )}
                >
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          )}

        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-dark-100 dark:border-dark-800">
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="sidebar-link w-full mb-2"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {sidebarOpen && <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>

          {/* Settings */}
          <Link
            href="/settings"
            className={cn('sidebar-link', pathname.startsWith('/settings') && 'active')}
          >
            <Settings size={20} />
            {sidebarOpen && <span>Configurações</span>}
          </Link>

          {/* User & Logout */}
          {sidebarOpen && user && (
            <div className="mt-4 pt-4 border-t border-dark-100 dark:border-dark-800">
              <div className="px-3 mb-2">
                <p className="text-sm font-medium text-dark-900 dark:text-white truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <button onClick={handleLogout} className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
            <LogOut size={20} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
