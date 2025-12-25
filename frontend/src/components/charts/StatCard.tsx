'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  color: string;
  href?: string;
  suffix?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  href,
  suffix,
  trend,
}: StatCardProps) {
  const content = (
    <div className="flex items-start gap-2 lg:gap-4">
      <div className={cn('p-2 lg:p-3 rounded-lg lg:rounded-xl flex-shrink-0', color)}>
        <Icon className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400 truncate">{title}</p>
        <div className="flex items-baseline gap-1 lg:gap-2 flex-wrap">
          <p className="text-lg lg:text-2xl font-bold text-dark-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {suffix && (
            <span className="text-xs lg:text-sm text-dark-500">{suffix}</span>
          )}
          {trend && (
            <span className={cn(
              'text-xs font-medium px-1 lg:px-1.5 py-0.5 rounded',
              trend.isPositive
                ? 'text-green-700 bg-green-100'
                : 'text-red-700 bg-red-100'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-dark-400 mt-1 hidden lg:block">{description}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="card p-3 lg:p-6 hover:shadow-md transition-shadow"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="card p-3 lg:p-6">
      {content}
    </div>
  );
}
