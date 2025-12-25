'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  User,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface WorkflowRequest {
  id: string;
  action: string;
  status: string;
  title: string;
  description: string | null;
  requester: {
    id: string;
    fullName: string;
    email: string;
  };
  reviewer: {
    id: string;
    fullName: string;
  } | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  metadata: string | null;
  createdAt: string;
}

const statusConfig = {
  PENDING: {
    label: 'Pendente',
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    icon: Clock,
  },
  APPROVED: {
    label: 'Aprovado',
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle,
  },
  REJECTED: {
    label: 'Rejeitado',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'text-dark-500 bg-dark-100 dark:bg-dark-800',
    icon: AlertCircle,
  },
};

const actionLabels: Record<string, string> = {
  PUBLISH: 'Publicar Produtos',
  UNPUBLISH: 'Despublicar Produtos',
  DELETE: 'Excluir Produtos',
  BULK_UPDATE: 'Atualização em Massa',
  PRICE_CHANGE: 'Alteração de Preços',
};

export default function WorkflowPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'my'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ['workflow-pending'],
    queryFn: () => api.getPendingWorkflowRequests(),
    enabled: activeTab === 'pending',
  });

  const { data: myData, isLoading: loadingMy } = useQuery({
    queryKey: ['workflow-my'],
    queryFn: () => api.getMyWorkflowRequests(),
    enabled: activeTab === 'my',
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, approved, comment }: { id: string; approved: boolean; comment?: string }) =>
      api.reviewWorkflowRequest(id, { approved, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-pending'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-my'] });
      setSelectedRequest(null);
      setReviewComment('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelWorkflowRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-my'] });
      setSelectedRequest(null);
    },
  });

  const requests = activeTab === 'pending'
    ? (pendingData?.content || [])
    : (myData?.content || []);
  const isLoading = activeTab === 'pending' ? loadingPending : loadingMy;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
          Workflow de Aprovação
        </h1>
        <p className="text-dark-500 dark:text-dark-400 mt-1">
          Gerencie solicitações de aprovação para ações em produtos
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-200 dark:border-dark-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'pending'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-dark-500 hover:text-dark-700'
            )}
          >
            Pendentes de Aprovação
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'my'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-dark-500 hover:text-dark-700'
            )}
          >
            Minhas Solicitações
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Request List */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="card p-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-dark-400 mb-4" />
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">
                Nenhuma solicitação
              </h3>
              <p className="text-dark-500 dark:text-dark-400">
                {activeTab === 'pending'
                  ? 'Não há solicitações pendentes de aprovação'
                  : 'Você ainda não fez nenhuma solicitação'}
              </p>
            </div>
          ) : (
            <div className="card divide-y divide-dark-100 dark:divide-dark-800">
              {requests.map((request: WorkflowRequest) => {
                const config = statusConfig[request.status as keyof typeof statusConfig];
                const Icon = config.icon;
                return (
                  <div
                    key={request.id}
                    onClick={() => setSelectedRequest(request)}
                    className={cn(
                      'p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 cursor-pointer transition-colors',
                      selectedRequest?.id === request.id && 'bg-primary-50 dark:bg-primary-900/20'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                          <span className="text-xs text-dark-400">
                            {actionLabels[request.action] || request.action}
                          </span>
                        </div>
                        <h3 className="font-medium text-dark-900 dark:text-white">
                          {request.title}
                        </h3>
                        <p className="text-sm text-dark-500 mt-1">
                          <User className="w-3 h-3 inline mr-1" />
                          {request.requester.fullName} • {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-dark-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Request Detail */}
        {selectedRequest && (
          <div className="w-96 flex-shrink-0">
            <div className="card p-6 sticky top-6">
              <div className="space-y-4">
                {/* Status */}
                <div>
                  {(() => {
                    const config = statusConfig[selectedRequest.status as keyof typeof statusConfig];
                    const Icon = config.icon;
                    return (
                      <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium', config.color)}>
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
                    {selectedRequest.title}
                  </h2>
                  <p className="text-sm text-dark-500 mt-1">
                    {actionLabels[selectedRequest.action] || selectedRequest.action}
                  </p>
                </div>

                {/* Description */}
                {selectedRequest.description && (
                  <div>
                    <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                      Descrição
                    </h4>
                    <p className="text-dark-600 dark:text-dark-400">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}

                {/* Requester */}
                <div>
                  <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Solicitante
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">
                        {selectedRequest.requester.fullName}
                      </p>
                      <p className="text-xs text-dark-500">
                        {selectedRequest.requester.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Review Info */}
                {selectedRequest.reviewer && (
                  <div className="border-t border-dark-100 dark:border-dark-800 pt-4">
                    <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                      Revisado por
                    </h4>
                    <p className="text-dark-900 dark:text-white">
                      {selectedRequest.reviewer.fullName}
                    </p>
                    {selectedRequest.reviewComment && (
                      <div className="mt-2 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-dark-400 mb-1" />
                        <p className="text-sm text-dark-600 dark:text-dark-400">
                          {selectedRequest.reviewComment}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-dark-500 mt-2">
                      {selectedRequest.reviewedAt && formatDate(selectedRequest.reviewedAt)}
                    </p>
                  </div>
                )}

                {/* Actions for Pending */}
                {selectedRequest.status === 'PENDING' && activeTab === 'pending' && (
                  <div className="border-t border-dark-100 dark:border-dark-800 pt-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-1 block">
                        Comentário (opcional)
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="input"
                        rows={2}
                        placeholder="Adicione um comentário..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewMutation.mutate({
                          id: selectedRequest.id,
                          approved: true,
                          comment: reviewComment || undefined,
                        })}
                        disabled={reviewMutation.isPending}
                        className="flex-1 btn-primary"
                      >
                        {reviewMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => reviewMutation.mutate({
                          id: selectedRequest.id,
                          approved: false,
                          comment: reviewComment || undefined,
                        })}
                        disabled={reviewMutation.isPending}
                        className="flex-1 btn-secondary text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rejeitar
                      </button>
                    </div>
                  </div>
                )}

                {/* Cancel for own pending requests */}
                {selectedRequest.status === 'PENDING' && activeTab === 'my' && (
                  <div className="border-t border-dark-100 dark:border-dark-800 pt-4">
                    <button
                      onClick={() => cancelMutation.mutate(selectedRequest.id)}
                      disabled={cancelMutation.isPending}
                      className="w-full btn-secondary text-red-600"
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Cancelar Solicitação'
                      )}
                    </button>
                  </div>
                )}

                {/* Created date */}
                <div className="text-xs text-dark-400 pt-2 border-t border-dark-100 dark:border-dark-800">
                  Criado em {formatDate(selectedRequest.createdAt)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
