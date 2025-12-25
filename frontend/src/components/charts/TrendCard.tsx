'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendCardProps {
  title: string;
  value: number;
  previousValue: number;
  suffix?: string;
  icon?: React.ReactNode;
  invertColors?: boolean;
}

export function TrendCard({
  title,
  value,
  previousValue,
  suffix = '',
  icon,
  invertColors = false,
}: TrendCardProps) {
  const growth = previousValue > 0
    ? Math.round(((value - previousValue) / previousValue) * 100)
    : value > 0 ? 100 : 0;

  const isPositive = growth > 0;
  const isNeutral = growth === 0;

  const trendColor = isNeutral
    ? 'text-dark-500'
    : invertColors
      ? (isPositive ? 'text-red-500' : 'text-green-500')
      : (isPositive ? 'text-green-500' : 'text-red-500');

  const bgColor = isNeutral
    ? 'bg-dark-100'
    : invertColors
      ? (isPositive ? 'bg-red-100' : 'bg-green-100')
      : (isPositive ? 'bg-green-100' : 'bg-red-100');

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-dark-500 dark:text-dark-400">{title}</span>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-dark-900 dark:text-white">
            {value.toLocaleString('pt-BR')}
          </span>
          {suffix && (
            <span className="text-sm text-dark-500 ml-1">{suffix}</span>
          )}
        </div>
        <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', bgColor, trendColor)}>
          {isNeutral ? (
            <Minus className="w-3 h-3" />
          ) : isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {growth > 0 ? '+' : ''}{growth}%
        </div>
      </div>
      <p className="text-xs text-dark-400 mt-2">
        vs. semana anterior: {previousValue.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}
