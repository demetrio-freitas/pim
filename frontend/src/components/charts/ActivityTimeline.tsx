'use client';

import { Package, FolderTree, Tag, Edit, Trash2, Plus, Image } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  entityName: string | null;
  userName: string | null;
  createdAt: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

const getActivityIcon = (type: string, action: string) => {
  const iconClass = "w-4 h-4";

  if (type === 'PRODUCT') {
    if (action === 'CREATE') return <Plus className={cn(iconClass, 'text-green-500')} />;
    if (action === 'UPDATE') return <Edit className={cn(iconClass, 'text-blue-500')} />;
    if (action === 'DELETE') return <Trash2 className={cn(iconClass, 'text-red-500')} />;
    return <Package className={iconClass} />;
  }

  if (type === 'CATEGORY') {
    return <FolderTree className={cn(iconClass, 'text-purple-500')} />;
  }

  if (type === 'ATTRIBUTE') {
    return <Tag className={cn(iconClass, 'text-amber-500')} />;
  }

  if (type === 'MEDIA') {
    return <Image className={cn(iconClass, 'text-cyan-500')} />;
  }

  return <Package className={iconClass} />;
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'CREATE': return 'criou';
    case 'UPDATE': return 'atualizou';
    case 'DELETE': return 'removeu';
    default: return action.toLowerCase();
  }
};

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'PRODUCT': return 'produto';
    case 'CATEGORY': return 'categoria';
    case 'ATTRIBUTE': return 'atributo';
    case 'MEDIA': return 'mídia';
    default: return type.toLowerCase();
  }
};

const getActionColor = (action: string): string => {
  switch (action) {
    case 'CREATE': return 'bg-green-100 dark:bg-green-900/30';
    case 'UPDATE': return 'bg-blue-100 dark:bg-blue-900/30';
    case 'DELETE': return 'bg-red-100 dark:bg-red-900/30';
    default: return 'bg-dark-100 dark:bg-dark-800';
  }
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-dark-500">
        <Package className="w-12 h-12 mb-2 text-dark-300" />
        <p>Nenhuma atividade recente</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-dark-200 dark:bg-dark-700" />

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="relative flex gap-4 pl-10">
            {/* Icon */}
            <div className={cn(
              'absolute left-0 p-2 rounded-full',
              getActionColor(activity.action)
            )}>
              {getActivityIcon(activity.type, activity.action)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-900 dark:text-white">
                <span className="font-medium">{activity.userName || 'Sistema'}</span>
                {' '}
                <span className="text-dark-500">{getActionLabel(activity.action)}</span>
                {' '}
                <span className="text-dark-500">{getTypeLabel(activity.type)}</span>
                {activity.entityName && (
                  <>
                    {' '}
                    <span className="font-medium text-dark-700 dark:text-dark-300">
                      "{activity.entityName}"
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-dark-400 mt-1">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
