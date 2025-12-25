'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Shield,
  Clock,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  permissions: string[];
  allowedIps: string[];
  rateLimit: number;
  requestsToday: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

interface Permission {
  value: string;
  label: string;
  group: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<{ apiKey: string; id: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    rateLimit: 1000,
    expiresIn: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [keysData, permsData] = await Promise.all([
        api.getApiKeys(),
        api.getApiKeyPermissions(),
      ]);
      setApiKeys(keysData.content || []);
      setPermissions(permsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar API Keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || formData.permissions.length === 0) {
      toast.error('Preencha nome e selecione pelo menos uma permissão');
      return;
    }

    setIsCreating(true);
    try {
      let expiresAt: string | undefined;
      if (formData.expiresIn) {
        const days = parseInt(formData.expiresIn);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const result = await api.createApiKey({
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions,
        rateLimit: formData.rateLimit,
        expiresAt,
      });

      setNewKeyResult({ apiKey: result.apiKey, id: result.id });
      loadData();
      setFormData({
        name: '',
        description: '',
        permissions: [],
        rateLimit: 1000,
        expiresIn: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar API Key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar esta API Key? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await api.revokeApiKey(id);
      toast.success('API Key revogada');
      loadData();
    } catch (error) {
      toast.error('Erro ao revogar API Key');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta API Key?')) {
      return;
    }

    try {
      await api.deleteApiKey(id);
      toast.success('API Key excluída');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir API Key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

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
            API Keys
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Gerencie chaves de API para integrações externas
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus size={18} className="mr-2" />
          Nova API Key
        </button>
      </div>

      {/* New Key Result Modal */}
      {newKeyResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
                  API Key Criada!
                </h3>
                <p className="text-sm text-dark-500">
                  Copie a chave agora. Ela não será mostrada novamente.
                </p>
              </div>
            </div>

            <div className="bg-dark-100 dark:bg-dark-900 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono text-dark-900 dark:text-white break-all">
                  {showKey ? newKeyResult.apiKey : '•'.repeat(40)}
                </code>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-2 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(newKeyResult.apiKey)}
                    className="p-2 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Guarde esta chave em um local seguro. Por motivos de segurança, não poderemos mostrá-la novamente.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setNewKeyResult(null);
                setShowCreateModal(false);
                setShowKey(false);
              }}
              className="btn-primary w-full"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && !newKeyResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Criar Nova API Key
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Ex: Integração ERP"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                <label className="label">Permissões *</label>
                <div className="space-y-4 mt-2">
                  {Object.entries(groupedPermissions).map(([group, perms]) => (
                    <div key={group}>
                      <p className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                        {group}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {perms.map(perm => (
                          <button
                            key={perm.value}
                            type="button"
                            onClick={() => togglePermission(perm.value)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              formData.permissions.includes(perm.value)
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                            }`}
                          >
                            {perm.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rate Limit (req/hora)</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={formData.rateLimit}
                    onChange={e => setFormData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) || 1000 }))}
                  />
                </div>

                <div>
                  <label className="label">Expira em</label>
                  <select
                    className="input w-full"
                    value={formData.expiresIn}
                    onChange={e => setFormData(prev => ({ ...prev, expiresIn: e.target.value }))}
                  >
                    <option value="">Nunca</option>
                    <option value="30">30 dias</option>
                    <option value="90">90 dias</option>
                    <option value="180">6 meses</option>
                    <option value="365">1 ano</option>
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
                  'Criar API Key'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="card p-8 text-center">
            <Key className="w-12 h-12 text-dark-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
              Nenhuma API Key criada
            </h3>
            <p className="text-dark-500 mb-4">
              Crie uma API Key para integrar sistemas externos ao PIM
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Criar API Key
            </button>
          </div>
        ) : (
          apiKeys.map(key => (
            <div key={key.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    key.status === 'ACTIVE'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <Key className={`w-5 h-5 ${
                      key.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-dark-900 dark:text-white">
                        {key.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        key.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {key.status}
                      </span>
                    </div>
                    <p className="text-sm text-dark-500 mt-1">
                      <code className="bg-dark-100 dark:bg-dark-900 px-2 py-0.5 rounded">
                        {key.keyPrefix}...
                      </code>
                    </p>
                    {key.description && (
                      <p className="text-sm text-dark-400 mt-1">{key.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {key.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
                      title="Revogar"
                    >
                      <Shield size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-dark-100 dark:border-dark-700 text-sm">
                <div className="flex items-center gap-1 text-dark-500">
                  <Shield size={14} />
                  <span>{key.permissions?.length || 0} permissões</span>
                </div>
                <div className="flex items-center gap-1 text-dark-500">
                  <RefreshCw size={14} />
                  <span>{key.requestsToday || 0} / {key.rateLimit || 1000} req/h</span>
                </div>
                {key.lastUsedAt && (
                  <div className="flex items-center gap-1 text-dark-500">
                    <Clock size={14} />
                    <span>Último uso: {new Date(key.lastUsedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {key.expiresAt && (
                  <div className="flex items-center gap-1 text-dark-500">
                    <AlertCircle size={14} />
                    <span>Expira: {new Date(key.expiresAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
