'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  Pause,
  TestTube,
  History,
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WebhookData {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
  events: string[];
  hasSecret: boolean;
  retryCount: number;
  lastTriggeredAt?: string;
  lastStatusCode?: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  event: string;
  entityId?: string;
  entityType?: string;
  responseStatus?: number;
  success: boolean;
  errorMessage?: string;
  attemptCount: number;
  durationMs?: number;
  createdAt: string;
}

interface EventOption {
  value: string;
  label: string;
  group: string;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    events: [] as string[],
    secretKey: '',
    retryCount: 3,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [webhooksData, eventsData] = await Promise.all([
        api.getWebhooks(),
        api.getWebhookEvents(),
      ]);
      setWebhooks(webhooksData.content || []);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar Webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error('Preencha nome, URL e selecione pelo menos um evento');
      return;
    }

    setIsCreating(true);
    try {
      await api.createWebhook({
        name: formData.name,
        url: formData.url,
        description: formData.description || undefined,
        events: formData.events,
        secretKey: formData.secretKey || undefined,
        retryCount: formData.retryCount,
      });

      toast.success('Webhook criado com sucesso!');
      setShowCreateModal(false);
      setFormData({
        name: '',
        url: '',
        description: '',
        events: [],
        secretKey: '',
        retryCount: 3,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar Webhook');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTest = async (id: string) => {
    setIsTesting(id);
    try {
      const result = await api.testWebhook(id);
      if (result.success) {
        toast.success(`Teste bem sucedido! Status: ${result.responseStatus}`);
      } else {
        toast.error(`Teste falhou: ${result.errorMessage || 'Erro desconhecido'}`);
      }
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao testar Webhook');
    } finally {
      setIsTesting(null);
    }
  };

  const handleToggleStatus = async (webhook: WebhookData) => {
    try {
      const newStatus = webhook.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.updateWebhook(webhook.id, { status: newStatus });
      toast.success(`Webhook ${newStatus === 'ACTIVE' ? 'ativado' : 'desativado'}`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este Webhook?')) {
      return;
    }

    try {
      await api.deleteWebhook(id);
      toast.success('Webhook excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir Webhook');
    }
  };

  const loadLogs = async (webhook: WebhookData) => {
    try {
      const logsData = await api.getWebhookLogs(webhook.id, { size: 50 });
      setWebhookLogs(logsData.content || []);
      setSelectedWebhook(webhook);
      setShowLogs(true);
    } catch (error) {
      toast.error('Erro ao carregar logs');
    }
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.group]) acc[event.group] = [];
    acc[event.group].push(event);
    return acc;
  }, {} as Record<string, EventOption[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'INACTIVE': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Webhooks
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Configure notificações para sistemas externos
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus size={18} className="mr-2" />
          Novo Webhook
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Criar Novo Webhook
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Ex: Notificar ERP"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">URL *</label>
                <input
                  type="url"
                  className="input w-full"
                  placeholder="https://api.example.com/webhook"
                  value={formData.url}
                  onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  placeholder="Descrição opcional"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Eventos *</label>
                <div className="space-y-4 mt-2">
                  {Object.entries(groupedEvents).map(([group, evts]) => (
                    <div key={group}>
                      <p className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                        {group}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {evts.map(evt => (
                          <button
                            key={evt.value}
                            type="button"
                            onClick={() => toggleEvent(evt.value)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              formData.events.includes(evt.value)
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                            }`}
                          >
                            {evt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Secret Key (opcional)</label>
                  <input
                    type="password"
                    className="input w-full"
                    placeholder="Para assinatura HMAC"
                    value={formData.secretKey}
                    onChange={e => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                  />
                  <p className="text-xs text-dark-400 mt-1">
                    Usado para assinar o payload (HMAC-SHA256)
                  </p>
                </div>

                <div>
                  <label className="label">Tentativas</label>
                  <select
                    className="input w-full"
                    value={formData.retryCount}
                    onChange={e => setFormData(prev => ({ ...prev, retryCount: parseInt(e.target.value) }))}
                  >
                    <option value={1}>1 tentativa</option>
                    <option value={3}>3 tentativas</option>
                    <option value={5}>5 tentativas</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="btn-primary"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Webhook'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogs && selectedWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
                Logs - {selectedWebhook.name}
              </h3>
              <button
                onClick={() => setShowLogs(false)}
                className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {webhookLogs.length === 0 ? (
                <p className="text-center text-dark-500 py-8">
                  Nenhum log encontrado
                </p>
              ) : (
                webhookLogs.map(log => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${
                      log.success
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {log.success ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <X className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <span className="font-medium text-dark-900 dark:text-white">
                            {log.event}
                          </span>
                          {log.responseStatus && (
                            <span className="ml-2 text-sm text-dark-500">
                              HTTP {log.responseStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-dark-500">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    {log.errorMessage && (
                      <p className="mt-2 text-sm text-red-600">
                        {log.errorMessage}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-dark-400">
                      <span>Tentativas: {log.attemptCount}</span>
                      {log.durationMs && <span>Duração: {log.durationMs}ms</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <div className="card p-8 text-center">
            <Webhook className="w-12 h-12 text-dark-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
              Nenhum Webhook configurado
            </h3>
            <p className="text-dark-500 mb-4">
              Configure webhooks para notificar sistemas externos sobre eventos
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Criar Webhook
            </button>
          </div>
        ) : (
          webhooks.map(webhook => (
            <div key={webhook.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    webhook.status === 'ACTIVE'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : webhook.status === 'PAUSED'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Webhook className={`w-5 h-5 ${
                      webhook.status === 'ACTIVE' ? 'text-green-600' :
                      webhook.status === 'PAUSED' ? 'text-yellow-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-dark-900 dark:text-white">
                        {webhook.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(webhook.status)}`}>
                        {webhook.status}
                      </span>
                    </div>
                    <a
                      href={webhook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      {webhook.url}
                      <ExternalLink size={12} />
                    </a>
                    {webhook.description && (
                      <p className="text-sm text-dark-400 mt-1">{webhook.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={isTesting === webhook.id}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Testar"
                  >
                    {isTesting === webhook.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <TestTube size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => loadLogs(webhook)}
                    className="p-2 text-dark-600 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                    title="Ver logs"
                  >
                    <History size={18} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(webhook)}
                    className={`p-2 rounded-lg ${
                      webhook.status === 'ACTIVE'
                        ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                    title={webhook.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                  >
                    {webhook.status === 'ACTIVE' ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-dark-100 dark:border-dark-700 text-sm">
                <div className="flex items-center gap-1 text-dark-500">
                  <span className="font-medium text-green-600">{webhook.successCount}</span>
                  <span>sucessos</span>
                </div>
                <div className="flex items-center gap-1 text-dark-500">
                  <span className="font-medium text-red-600">{webhook.failureCount}</span>
                  <span>falhas</span>
                </div>
                {webhook.lastTriggeredAt && (
                  <div className="flex items-center gap-1 text-dark-500">
                    <Clock size={14} />
                    <span>Último disparo: {new Date(webhook.lastTriggeredAt).toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {webhook.lastStatusCode && (
                  <div className="flex items-center gap-1 text-dark-500">
                    <span>Último status: HTTP {webhook.lastStatusCode}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {webhook.events.slice(0, 5).map(event => (
                  <span
                    key={event}
                    className="px-2 py-0.5 text-xs bg-dark-100 dark:bg-dark-700 rounded"
                  >
                    {event}
                  </span>
                ))}
                {webhook.events.length > 5 && (
                  <span className="px-2 py-0.5 text-xs text-dark-500">
                    +{webhook.events.length - 5} mais
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
