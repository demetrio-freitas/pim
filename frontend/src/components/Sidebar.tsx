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
  Menu,
  X,
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
  const { sidebarOpen, toggleSidebar, mobileMenuOpen, setMobileMenuOpen, darkMode, toggleDarkMode } = useUIStore();

  const handleLogout = () => {
    api.logout();
    logoutStore();
    router.push('/login');
  };

  const handleNavClick = () => {
    // Fecha o menu mobile ao clicar em um link
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-white border-r border-dark-100 transition-all duration-300 dark:bg-dark-900 dark:border-dark-800',
          // Mobile: escondido por padrão, aparece com translate quando mobileMenuOpen
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: controle de largura normal
          sidebarOpen ? 'w-64' : 'lg:w-20 w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-dark-100 dark:border-dark-800">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              {(sidebarOpen || mobileMenuOpen) && (
                <span className="text-xl font-bold text-dark-900 dark:text-white">PIM</span>
              )}
            </Link>
            {/* Botão fechar no mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500 lg:hidden"
            >
              <X size={20} />
            </button>
            {/* Botão colapsar no desktop */}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500 hidden lg:block"
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
                  onClick={handleNavClick}
                  className={cn(
                    'sidebar-link',
                    pathname.startsWith(item.href) && 'active'
                  )}
                >
                  <item.icon size={20} />
                  {(sidebarOpen || mobileMenuOpen) && <span>{item.name}</span>}
                </Link>
              ))}
            </div>

            {(sidebarOpen || mobileMenuOpen) && (
              <div className="pt-4 mt-4 border-t border-dark-100 dark:border-dark-800">
                <p className="px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">
                  Ações
                </p>
                {actions.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleNavClick}
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
              {(sidebarOpen || mobileMenuOpen) && <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
            </button>

            {/* Settings */}
            <Link
              href="/settings"
              onClick={handleNavClick}
              className={cn('sidebar-link', pathname.startsWith('/settings') && 'active')}
            >
              <Settings size={20} />
              {(sidebarOpen || mobileMenuOpen) && <span>Configurações</span>}
            </Link>

            {/* User & Logout */}
            {(sidebarOpen || mobileMenuOpen) && user && (
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
              {(sidebarOpen || mobileMenuOpen) && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// Mobile Header Component
export function MobileHeader() {
  const { setMobileMenuOpen } = useUIStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-white border-b border-dark-100 dark:bg-dark-900 dark:border-dark-800 lg:hidden">
      <div className="flex items-center justify-between h-full px-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-300"
        >
          <Menu size={24} />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-dark-900 dark:text-white">PIM</span>
        </Link>
        <div className="w-10" /> {/* Spacer para centralizar o logo */}
      </div>
    </header>
  );
}
