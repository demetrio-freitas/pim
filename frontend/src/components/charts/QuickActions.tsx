'use client';

import Link from 'next/link';
import { LucideIcon, Plus, FolderPlus, Upload, Download, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const colorClasses = {
  blue: {
    icon: 'bg-blue-500',
    hover: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10',
  },
  green: {
    icon: 'bg-green-500',
    hover: 'hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10',
  },
  purple: {
    icon: 'bg-purple-500',
    hover: 'hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10',
  },
  orange: {
    icon: 'bg-orange-500',
    hover: 'hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10',
  },
};

function QuickActionButton({ icon: Icon, label, description, href, color }: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dark-200 dark:border-dark-700 transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-1',
        colorClasses[color].hover
      )}
    >
      <div className={cn('p-4 rounded-full', colorClasses[color].icon)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-dark-900 dark:text-white">{label}</p>
        <p className="text-sm text-dark-500 dark:text-dark-400">{description}</p>
      </div>
    </Link>
  );
}

export function QuickActions() {
  const actions: QuickActionProps[] = [
    {
      icon: Plus,
      label: 'Novo Produto',
      description: 'Adicionar ao catálogo',
      href: '/products/new',
      color: 'blue',
    },
    {
      icon: FolderPlus,
      label: 'Nova Categoria',
      description: 'Organizar produtos',
      href: '/categories/new',
      color: 'green',
    },
    {
      icon: Upload,
      label: 'Importar',
      description: 'CSV ou Excel',
      href: '/import',
      color: 'purple',
    },
    {
      icon: Download,
      label: 'Exportar',
      description: 'Baixar dados',
      href: '/export',
      color: 'orange',
    },
  ];

  return (
    <div className="card">
      <div className="p-4 border-b border-dark-100 dark:border-dark-800">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Ações Rápidas
          </h2>
        </div>
        <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
          Acesso rápido às principais funcionalidades
        </p>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => (
          <QuickActionButton key={action.href} {...action} />
        ))}
      </div>
    </div>
  );
}
