'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Brain,
  Plus,
  Settings,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  DollarSign,
  BarChart3,
  Key,
  RefreshCw,
  Star,
  AlertCircle,
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  type: string;
  apiEndpoint?: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  isDefault: boolean;
  monthlyBudget?: number;
  currentMonthUsage: number;
  totalTokensUsed: number;
  totalRequestsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProviderType {
  value: string;
  label: string;
  models: string[];
}

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  operationStats: { operation: string; count: number; tokens: number; cost: number }[];
}

const providerIcons: Record<string, string> = {
  OPENAI: '🤖',
  ANTHROPIC: '🧠',
  GOOGLE: '🔮',
  AZURE_OPENAI: '☁️',
};

export default function AISettingsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => api.getAIProviders(),
  });

  const { data: providerTypes } = useQuery({
    queryKey: ['ai-provider-types'],
    queryFn: () => api.getAIProviderTypes(),
  });

  const { data: usageStats } = useQuery({
    queryKey: ['ai-usage-stats'],
    queryFn: () => api.getAIUsageStats(30),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAIProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateAIProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      setEditingProvider(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAIProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testAIProvider(id),
    onSuccess: (data, id) => {
      setTestResult({ id, success: data.success, message: data.message });
      setTestingId(null);
    },
    onError: (error: any, id) => {
      setTestResult({ id, success: false, message: error.message || 'Erro ao testar conexão' });
      setTestingId(null);
    },
  });

  const handleTest = (id: string) => {
    setTestingId(id);
    setTestResult(null);
    testMutation.mutate(id);
  };

  const providersList: AIProvider[] = providers?.content || providers || [];
  const stats: UsageStats = usageStats || { totalRequests: 0, totalTokens: 0, totalCost: 0, operationStats: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              Inteligência Artificial
            </h1>
            <p className="text-dark-500 dark:text-dark-400">
              Configure provedores de IA para geração de conteúdo
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Provedor
        </button>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Requisições (30d)</p>
              <p className="text-xl font-bold text-dark-900 dark:text-white">
                {stats.totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Tokens Usados</p>
              <p className="text-xl font-bold text-dark-900 dark:text-white">
                {(stats.totalTokens / 1000).toFixed(1)}K
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Custo Estimado</p>
              <p className="text-xl font-bold text-dark-900 dark:text-white">
                ${stats.totalCost.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Provedores Ativos</p>
              <p className="text-xl font-bold text-dark-900 dark:text-white">
                {providersList.filter((p) => p.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operation Stats */}
      {stats.operationStats.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Uso por Operação
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left py-2 text-sm font-medium text-dark-500">Operação</th>
                  <th className="text-right py-2 text-sm font-medium text-dark-500">Requisições</th>
                  <th className="text-right py-2 text-sm font-medium text-dark-500">Tokens</th>
                  <th className="text-right py-2 text-sm font-medium text-dark-500">Custo</th>
                </tr>
              </thead>
              <tbody>
                {stats.operationStats.map((op) => (
                  <tr key={op.operation} className="border-b border-dark-100 dark:border-dark-800">
                    <td className="py-3 text-dark-700 dark:text-dark-300">
                      {op.operation.replace(/_/g, ' ').replace(/^./, (s) => s.toUpperCase())}
                    </td>
                    <td className="py-3 text-right text-dark-700 dark:text-dark-300">
                      {op.count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-dark-700 dark:text-dark-300">
                      {(op.tokens / 1000).toFixed(1)}K
                    </td>
                    <td className="py-3 text-right text-dark-700 dark:text-dark-300">
                      ${op.cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Providers List */}
      <div className="card">
        <div className="p-4 border-b border-dark-200 dark:border-dark-700">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Provedores Configurados
          </h2>
        </div>

        {loadingProviders ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : providersList.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto text-dark-300 dark:text-dark-600 mb-4" />
            <p className="text-dark-500 dark:text-dark-400">
              Nenhum provedor de IA configurado
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Provedor
            </button>
          </div>
        ) : (
          <div className="divide-y divide-dark-200 dark:divide-dark-700">
            {providersList.map((provider) => (
              <div key={provider.id} className="p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {providerIcons[provider.type] || '🤖'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-dark-900 dark:text-white">
                          {provider.name}
                        </h3>
                        {provider.isDefault && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs">
                            <Star className="w-3 h-3" />
                            Padrão
                          </span>
                        )}
                        {!provider.isActive && (
                          <span className="px-2 py-0.5 bg-dark-200 dark:bg-dark-700 text-dark-500 rounded text-xs">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-dark-500 dark:text-dark-400">
                        {provider.type} • {provider.defaultModel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Stats */}
                    <div className="text-right text-sm">
                      <p className="text-dark-500 dark:text-dark-400">
                        {provider.totalRequestsCount.toLocaleString()} requisições
                      </p>
                      <p className="text-dark-500 dark:text-dark-400">
                        {(provider.totalTokensUsed / 1000).toFixed(1)}K tokens
                      </p>
                    </div>

                    {/* Budget */}
                    {provider.monthlyBudget && (
                      <div className="text-right text-sm">
                        <p className="text-dark-500 dark:text-dark-400">Orçamento mensal</p>
                        <p className={cn(
                          'font-medium',
                          provider.currentMonthUsage > provider.monthlyBudget * 0.8
                            ? 'text-red-600'
                            : 'text-green-600'
                        )}>
                          ${provider.currentMonthUsage.toFixed(2)} / ${provider.monthlyBudget}
                        </p>
                      </div>
                    )}

                    {/* Test Result */}
                    {testResult?.id === provider.id && (
                      <div className={cn(
                        'flex items-center gap-1 text-sm',
                        testResult.success ? 'text-green-600' : 'text-red-600'
                      )}>
                        {testResult.success ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {testResult.message}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTest(provider.id)}
                        disabled={testingId === provider.id}
                        className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                        title="Testar conexão"
                      >
                        {testingId === provider.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingProvider(provider)}
                        className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este provedor?')) {
                            deleteMutation.mutate(provider.id);
                          }
                        }}
                        disabled={provider.isDefault}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600 disabled:opacity-50"
                        title={provider.isDefault ? 'Não é possível excluir o provedor padrão' : 'Excluir'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              Como configurar a IA
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              1. Adicione um provedor de IA (OpenAI ou Anthropic recomendado)<br />
              2. Insira sua chave de API do provedor<br />
              3. Marque como padrão para usar automaticamente<br />
              4. Use as funções de IA na edição de produtos
            </p>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingProvider) && (
        <ProviderModal
          provider={editingProvider}
          providerTypes={providerTypes || []}
          onClose={() => {
            setShowCreateModal(false);
            setEditingProvider(null);
          }}
          onSave={(data) => {
            if (editingProvider) {
              updateMutation.mutate({ id: editingProvider.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ProviderModal({
  provider,
  providerTypes,
  onClose,
  onSave,
  isLoading,
}: {
  provider: AIProvider | null;
  providerTypes: ProviderType[];
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    type: provider?.type || 'OPENAI',
    apiKey: '',
    apiEndpoint: provider?.apiEndpoint || '',
    defaultModel: provider?.defaultModel || 'gpt-4o-mini',
    maxTokens: provider?.maxTokens || 4096,
    temperature: provider?.temperature || 0.7,
    monthlyBudget: provider?.monthlyBudget || '',
    isActive: provider?.isActive ?? true,
    isDefault: provider?.isDefault ?? false,
  });

  const selectedType = providerTypes.find((t) => t.value === formData.type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name: formData.name,
      type: formData.type,
      defaultModel: formData.defaultModel,
      maxTokens: formData.maxTokens,
      temperature: formData.temperature,
      isActive: formData.isActive,
      isDefault: formData.isDefault,
    };

    if (formData.apiKey) data.apiKey = formData.apiKey;
    if (formData.apiEndpoint) data.apiEndpoint = formData.apiEndpoint;
    if (formData.monthlyBudget) data.monthlyBudget = Number(formData.monthlyBudget);

    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-900 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-dark-200 dark:border-dark-700">
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
            {provider ? 'Editar Provedor' : 'Adicionar Provedor de IA'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              placeholder="Ex: OpenAI Produção"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
              Provedor *
            </label>
            <select
              value={formData.type}
              onChange={(e) => {
                const type = e.target.value;
                const typeInfo = providerTypes.find((t) => t.value === type);
                setFormData({
                  ...formData,
                  type,
                  defaultModel: typeInfo?.models[0] || '',
                });
              }}
              className="input w-full"
              disabled={!!provider}
            >
              {providerTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
              Chave de API {provider ? '(deixe vazio para manter)' : '*'}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="input w-full pl-10"
                placeholder="sk-..."
                required={!provider}
              />
            </div>
          </div>

          {(formData.type === 'AZURE_OPENAI' || formData.apiEndpoint) && (
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Endpoint da API
              </label>
              <input
                type="url"
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                className="input w-full"
                placeholder="https://your-resource.openai.azure.com"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
              Modelo Padrão
            </label>
            <select
              value={formData.defaultModel}
              onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
              className="input w-full"
            >
              {selectedType?.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: Number(e.target.value) })}
                className="input w-full"
                min={100}
                max={128000}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Temperatura
              </label>
              <input
                type="number"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                className="input w-full"
                min={0}
                max={2}
                step={0.1}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
              Orçamento Mensal (USD)
            </label>
            <input
              type="number"
              value={formData.monthlyBudget}
              onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
              className="input w-full"
              placeholder="Deixe vazio para ilimitado"
              min={0}
              step={0.01}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-dark-700 dark:text-dark-300">Ativo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-dark-700 dark:text-dark-300">Provedor Padrão</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-200 dark:border-dark-700">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : provider ? (
                'Salvar Alterações'
              ) : (
                'Adicionar Provedor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
