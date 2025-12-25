'use client';

import { cn } from '@/lib/utils';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

interface CompletenessRule {
  field: string;
  label: string;
  required: boolean;
  filled: boolean;
  weight: number;
}

interface CompletenessScoreProps {
  score: number;
  rules?: CompletenessRule[];
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getScoreTrackColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

function getScoreIcon(score: number) {
  if (score >= 80) return CheckCircle;
  if (score >= 50) return AlertCircle;
  return XCircle;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente';
  if (score >= 80) return 'Bom';
  if (score >= 60) return 'Regular';
  if (score >= 40) return 'Incompleto';
  return 'Crítico';
}

export function CompletenessScore({
  score,
  rules = [],
  size = 'md',
  showDetails = false,
  className,
}: CompletenessScoreProps) {
  const [expanded, setExpanded] = useState(false);

  const Icon = getScoreIcon(score);
  const sizeClasses = {
    sm: {
      circle: 'w-10 h-10',
      text: 'text-sm',
      icon: 'w-3 h-3',
    },
    md: {
      circle: 'w-16 h-16',
      text: 'text-lg',
      icon: 'w-4 h-4',
    },
    lg: {
      circle: 'w-24 h-24',
      text: 'text-2xl',
      icon: 'w-5 h-5',
    },
  };

  const missingRequired = rules.filter(r => r.required && !r.filled);
  const missingOptional = rules.filter(r => !r.required && !r.filled);
  const filledRules = rules.filter(r => r.filled);

  return (
    <div className={cn('', className)}>
      <div className="flex items-center gap-4">
        {/* Circular Progress */}
        <div className={cn('relative', sizeClasses[size].circle)}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className={getScoreTrackColor(score)}
              strokeWidth="3"
              stroke="currentColor"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className={getScoreColor(score)}
              strokeWidth="3"
              stroke="currentColor"
              strokeDasharray={`${score} 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('font-bold', sizeClasses[size].text, getScoreColor(score))}>
              {score}%
            </span>
          </div>
        </div>

        {/* Score Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon className={cn(sizeClasses[size].icon, getScoreColor(score))} />
            <span className={cn('font-medium text-dark-900 dark:text-white', size === 'sm' && 'text-sm')}>
              {getScoreLabel(score)}
            </span>
          </div>
          {showDetails && rules.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 flex items-center gap-1 mt-1"
            >
              {expanded ? (
                <>
                  Ocultar detalhes <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  {missingRequired.length > 0
                    ? `${missingRequired.length} campos obrigatórios faltando`
                    : `${missingOptional.length} campos opcionais faltando`}
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Detailed Rules */}
      {showDetails && expanded && rules.length > 0 && (
        <div className="mt-4 space-y-4">
          {/* Missing Required */}
          {missingRequired.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                Campos Obrigatórios Faltando ({missingRequired.length})
              </h4>
              <div className="space-y-1">
                {missingRequired.map((rule) => (
                  <div
                    key={rule.field}
                    className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400"
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>{rule.label}</span>
                    <span className="text-xs text-dark-400">({rule.weight}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Optional */}
          {missingOptional.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                Campos Opcionais Faltando ({missingOptional.length})
              </h4>
              <div className="space-y-1">
                {missingOptional.map((rule) => (
                  <div
                    key={rule.field}
                    className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400"
                  >
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span>{rule.label}</span>
                    <span className="text-xs text-dark-400">({rule.weight}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filled Fields */}
          {filledRules.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                Campos Preenchidos ({filledRules.length})
              </h4>
              <div className="space-y-1">
                {filledRules.map((rule) => (
                  <div
                    key={rule.field}
                    className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{rule.label}</span>
                    <span className="text-xs text-dark-400">({rule.weight}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact inline version
export function CompletenessBar({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 h-2 rounded-full', getScoreTrackColor(score))}>
        <div
          className={cn('h-full rounded-full transition-all', getScoreBgColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('text-sm font-medium w-10 text-right', getScoreColor(score))}>
        {score}%
      </span>
    </div>
  );
}

// Badge version
export function CompletenessBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const Icon = getScoreIcon(score);
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        score >= 80
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : score >= 50
          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {score}%
    </div>
  );
}
