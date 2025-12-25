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
    <div className="flex items-start gap-4">
      <div className={cn('p-3 rounded-xl', color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-dark-500 dark:text-dark-400">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-dark-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {suffix && (
            <span className="text-sm text-dark-500">{suffix}</span>
          )}
          {trend && (
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              trend.isPositive
                ? 'text-green-700 bg-green-100'
                : 'text-red-700 bg-red-100'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-dark-400 mt-1">{description}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="card p-6 hover:shadow-md transition-shadow"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="card p-6">
      {content}
    </div>
  );
}
