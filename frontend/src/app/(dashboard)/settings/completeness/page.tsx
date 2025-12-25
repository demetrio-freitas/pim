'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Loader2,
  GripVertical,
  CheckCircle,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CompletenessRule {
  id: string;
  field: string;
  label: string;
  isRequired: boolean;
  weight: number;
  isActive: boolean;
  categoryId: string | null;
}

const fieldOptions = [
  { value: 'name', label: 'Nome' },
  { value: 'description', label: 'Descrição' },
  { value: 'shortDescription', label: 'Descrição Curta' },
  { value: 'price', label: 'Preço' },
  { value: 'images', label: 'Imagens' },
  { value: 'category', label: 'Categoria' },
  { value: 'brand', label: 'Marca' },
  { value: 'manufacturer', label: 'Fabricante' },
  { value: 'weight', label: 'Peso' },
  { value: 'metaTitle', label: 'Meta Título (SEO)' },
  { value: 'metaDescription', label: 'Meta Descrição (SEO)' },
  { value: 'metaKeywords', label: 'Palavras-chave (SEO)' },
  { value: 'urlKey', label: 'URL Amigável' },
];

export default function CompletenessSettingsPage() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<CompletenessRule> | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['completeness-rules'],
    queryFn: () => api.getAllCompletenessRules(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CompletenessRule>) => api.createCompletenessRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completeness-rules'] });
      setNewRule(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompletenessRule> }) =>
      api.updateCompletenessRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completeness-rules'] });
      setEditingRule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCompletenessRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completeness-rules'] });
    },
  });

  const initializeMutation = useMutation({
    mutationFn: () => api.initializeCompletenessRules(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completeness-rules'] });
    },
  });

  const handleSaveRule = (rule: CompletenessRule) => {
    updateMutation.mutate({ id: rule.id, data: rule });
  };

  const handleCreateRule = () => {
    if (newRule && newRule.field && newRule.label) {
      createMutation.mutate({
        ...newRule,
        weight: newRule.weight || 10,
        isRequired: newRule.isRequired || false,
        isActive: true,
      });
    }
  };

  const totalWeight = rules.filter((r: CompletenessRule) => r.isActive).reduce((sum: number, r: CompletenessRule) => sum + r.weight, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Regras de Completude
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Configure quais campos são necessários para considerar um produto completo
          </p>
        </div>
        {rules.length === 0 && (
          <button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
            className="btn-secondary"
          >
            {initializeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            Inicializar Regras Padrão
          </button>
        )}
      </div>

      {/* Weight Summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-500 dark:text-dark-400">Peso Total das Regras Ativas</p>
            <p className={cn(
              'text-2xl font-bold',
              totalWeight === 100 ? 'text-green-500' : 'text-yellow-500'
            )}>
              {totalWeight}%
            </p>
          </div>
          {totalWeight !== 100 && (
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">O peso total deveria ser 100% para cálculos precisos</span>
            </div>
          )}
          {totalWeight === 100 && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Peso total correto</span>
            </div>
          )}
        </div>
      </div>

      {/* Rules List */}
      <div className="card">
        <div className="p-4 border-b border-dark-100 dark:border-dark-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-dark-900 dark:text-white">Regras</h2>
            <button
              onClick={() => setNewRule({ field: '', label: '', weight: 10, isRequired: false })}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova Regra
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="divide-y divide-dark-100 dark:divide-dark-800">
            {/* New Rule Form */}
            {newRule && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <select
                      value={newRule.field || ''}
                      onChange={(e) => {
                        const field = fieldOptions.find(f => f.value === e.target.value);
                        setNewRule({
                          ...newRule,
                          field: e.target.value,
                          label: field?.label || '',
                        });
                      }}
                      className="input text-sm"
                    >
                      <option value="">Selecionar campo...</option>
                      {fieldOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={newRule.label || ''}
                      onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
                      className="input text-sm"
                      placeholder="Rótulo"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={newRule.weight || 10}
                        onChange={(e) => setNewRule({ ...newRule, weight: parseInt(e.target.value) })}
                        className="input text-sm w-20"
                        min="1"
                        max="100"
                      />
                      <span className="text-sm text-dark-500">%</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRule.isRequired || false}
                        onChange={(e) => setNewRule({ ...newRule, isRequired: e.target.checked })}
                        className="w-4 h-4 rounded border-dark-300 text-primary-600"
                      />
                      <span className="text-sm">Obrigatório</span>
                    </label>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 justify-end">
                    <button
                      onClick={handleCreateRule}
                      disabled={!newRule.field || !newRule.label || createMutation.isPending}
                      className="btn-primary text-sm py-1.5"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setNewRule(null)}
                      className="btn-secondary text-sm py-1.5"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Rules */}
            {rules.map((rule: CompletenessRule) => (
              <div
                key={rule.id}
                className={cn(
                  'p-4 transition-colors',
                  !rule.isActive && 'opacity-50 bg-dark-50 dark:bg-dark-800/50'
                )}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1 flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-dark-400 cursor-move" />
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={(e) => handleSaveRule({ ...rule, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-dark-300 text-primary-600"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-mono text-dark-500">{rule.field}</span>
                  </div>
                  <div className="col-span-3">
                    {editingRule === rule.id ? (
                      <input
                        type="text"
                        value={rule.label}
                        onChange={(e) => {
                          const updated = rules.map((r: CompletenessRule) =>
                            r.id === rule.id ? { ...r, label: e.target.value } : r
                          );
                          queryClient.setQueryData(['completeness-rules'], updated);
                        }}
                        className="input text-sm"
                      />
                    ) : (
                      <span className="text-dark-900 dark:text-white">{rule.label}</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    {editingRule === rule.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={rule.weight}
                          onChange={(e) => {
                            const updated = rules.map((r: CompletenessRule) =>
                              r.id === rule.id ? { ...r, weight: parseInt(e.target.value) } : r
                            );
                            queryClient.setQueryData(['completeness-rules'], updated);
                          }}
                          className="input text-sm w-20"
                          min="1"
                          max="100"
                        />
                        <span className="text-sm text-dark-500">%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-dark-600 dark:text-dark-400">{rule.weight}%</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    {rule.isRequired ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Obrigatório
                      </span>
                    ) : (
                      <span className="text-xs text-dark-500">Opcional</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center gap-2 justify-end">
                    {editingRule === rule.id ? (
                      <>
                        <button
                          onClick={() => handleSaveRule(rule)}
                          disabled={updateMutation.isPending}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingRule(null)}
                          className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800 rounded"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingRule(rule.id)}
                          className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800 rounded"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Excluir esta regra?')) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {rules.length === 0 && !newRule && (
              <div className="p-12 text-center">
                <Settings className="w-12 h-12 mx-auto text-dark-400 mb-4" />
                <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">
                  Nenhuma regra configurada
                </h3>
                <p className="text-dark-500 dark:text-dark-400 mb-4">
                  Crie regras para calcular a completude dos produtos
                </p>
                <button
                  onClick={() => initializeMutation.mutate()}
                  disabled={initializeMutation.isPending}
                  className="btn-primary"
                >
                  {initializeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  Inicializar Regras Padrão
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
