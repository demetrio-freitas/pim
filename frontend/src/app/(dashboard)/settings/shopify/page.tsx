'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Check,
  X,
  Loader2,
  ExternalLink,
  Link2,
  Link2Off,
  Play,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Settings,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowUpDown,
  Eye,
} from 'lucide-react';

interface ShopifyStore {
  id: string;
  name: string;
  shopDomain: string;
  apiVersion: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING_AUTH';
  description?: string;
  syncProducts: boolean;
  syncInventory: boolean;
  syncPrices: boolean;
  syncImages: boolean;
  syncDirection: 'PIM_TO_SHOPIFY' | 'SHOPIFY_TO_PIM' | 'BIDIRECTIONAL';
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  defaultProductType?: string;
  defaultVendor?: string;
  shopName?: string;
  shopEmail?: string;
  shopCurrency?: string;
  productsSynced: number;
  lastSyncAt?: string;
  lastSyncStatus?: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'IN_PROGRESS';
  lastSyncMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface SyncLog {
  id: string;
  type: string;
  status: string;
  direction: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  message?: string;
  triggeredBy?: string;
}

const syncDirectionLabels: Record<string, string> = {
  PIM_TO_SHOPIFY: 'PIM → Shopify',
  SHOPIFY_TO_PIM: 'Shopify → PIM',
  BIDIRECTIONAL: 'Bidirecional',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PENDING_AUTH: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const syncStatusIcons: Record<string, any> = {
  SUCCESS: CheckCircle,
  PARTIAL: AlertCircle,
  FAILED: XCircle,
  IN_PROGRESS: Activity,
};

export default function ShopifyPage() {
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<ShopifyStore | null>(null);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<Record<string, SyncLog[]>>({});
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);
  const [testingStoreId, setTestingStoreId] = useState<string | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    shopDomain: '',
    accessToken: '',
    description: '',
    apiVersion: '2024-01',
    syncProducts: true,
    syncInventory: true,
    syncPrices: true,
    syncImages: true,
    syncDirection: 'PIM_TO_SHOPIFY',
    autoSyncEnabled: false,
    syncIntervalMinutes: 60,
    defaultProductType: '',
    defaultVendor: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const response = await api.getShopifyStores();
      setStores(response.content || response || []);
    } catch (error) {
      console.error('Error loading Shopify stores:', error);
      toast.error('Erro ao carregar lojas Shopify');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncLogs = async (storeId: string) => {
    try {
      const response = await api.getShopifySyncLogs(storeId, { size: 10 });
      setSyncLogs(prev => ({
        ...prev,
        [storeId]: response.content || response || [],
      }));
    } catch (error) {
      console.error('Error loading sync logs:', error);
    }
  };

  const handleCreate = () => {
    setEditingStore(null);
    setFormData({
      name: '',
      shopDomain: '',
      accessToken: '',
      description: '',
      apiVersion: '2024-01',
      syncProducts: true,
      syncInventory: true,
      syncPrices: true,
      syncImages: true,
      syncDirection: 'PIM_TO_SHOPIFY',
      autoSyncEnabled: false,
      syncIntervalMinutes: 60,
      defaultProductType: '',
      defaultVendor: '',
    });
    setShowModal(true);
  };

  const handleEdit = (store: ShopifyStore) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      shopDomain: store.shopDomain,
      accessToken: '', // Don't show token
      description: store.description || '',
      apiVersion: store.apiVersion,
      syncProducts: store.syncProducts,
      syncInventory: store.syncInventory,
      syncPrices: store.syncPrices,
      syncImages: store.syncImages,
      syncDirection: store.syncDirection,
      autoSyncEnabled: store.autoSyncEnabled,
      syncIntervalMinutes: store.syncIntervalMinutes,
      defaultProductType: store.defaultProductType || '',
      defaultVendor: store.defaultVendor || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.shopDomain) {
      toast.error('Preencha nome e domínio da loja');
      return;
    }
    if (!editingStore && !formData.accessToken) {
      toast.error('Access Token é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSend = { ...formData };
      if (editingStore && !formData.accessToken) {
        delete (dataToSend as any).accessToken;
      }

      if (editingStore) {
        await api.updateShopifyStore(editingStore.id, dataToSend);
        toast.success('Loja atualizada');
      } else {
        await api.createShopifyStore(dataToSend);
        toast.success('Loja criada');
      }
      setShowModal(false);
      loadStores();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar loja');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta loja? Todos os mapeamentos de produtos serão removidos.')) {
      return;
    }

    setDeletingStoreId(id);
    try {
      await api.deleteShopifyStore(id);
      toast.success('Loja excluída');
      loadStores();
    } catch (error) {
      toast.error('Erro ao excluir loja');
    } finally {
      setDeletingStoreId(null);
    }
  };

  const handleTestConnection = async (storeId: string) => {
    setTestingStoreId(storeId);
    try {
      const result = await api.testShopifyConnection(storeId);
      if (result.success) {
        toast.success(`Conexão OK! Loja: ${result.shopName}`);
      } else {
        toast.error(result.message);
      }
      loadStores();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao testar conexão');
    } finally {
      setTestingStoreId(null);
    }
  };

  const handleSync = async (storeId: string) => {
    setSyncingStoreId(storeId);
    try {
      const result = await api.syncShopifyProducts(storeId);
      if (result.success) {
        toast.success(`Sincronização concluída: ${result.itemsCreated} criados, ${result.itemsUpdated} atualizados`);
      } else {
        toast.error(result.message);
      }
      loadStores();
      if (expandedStore === storeId) {
        loadSyncLogs(storeId);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar');
    } finally {
      setSyncingStoreId(null);
    }
  };

  const toggleExpand = (storeId: string) => {
    if (expandedStore === storeId) {
      setExpandedStore(null);
    } else {
      setExpandedStore(storeId);
      loadSyncLogs(storeId);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
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
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-[#96BF48]" />
            Integração Shopify
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Conecte e sincronize produtos com suas lojas Shopify
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Nova Loja
        </button>
      </div>

      {/* Store Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              {editingStore ? 'Editar Loja Shopify' : 'Nova Loja Shopify'}
            </h3>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nome da Conexão *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: Minha Loja Principal"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Domínio Shopify *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="minhaloja.myshopify.com"
                    value={formData.shopDomain}
                    onChange={e => setFormData(prev => ({ ...prev, shopDomain: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  Access Token {editingStore ? '(deixe vazio para manter)' : '*'}
                </label>
                <input
                  type="password"
                  className="input w-full"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.accessToken}
                  onChange={e => setFormData(prev => ({ ...prev, accessToken: e.target.value }))}
                />
                <p className="text-xs text-dark-500 mt-1">
                  Gere um token em Shopify Admin → Apps → Develop apps
                </p>
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  placeholder="Descrição opcional da loja"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Sync Settings */}
              <div className="border-t border-dark-100 dark:border-dark-700 pt-4">
                <h4 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3">
                  Configurações de Sincronização
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Direção da Sincronização</label>
                    <select
                      className="input w-full"
                      value={formData.syncDirection}
                      onChange={e => setFormData(prev => ({ ...prev, syncDirection: e.target.value }))}
                    >
                      <option value="PIM_TO_SHOPIFY">PIM → Shopify (PIM é master)</option>
                      <option value="SHOPIFY_TO_PIM">Shopify → PIM (Shopify é master)</option>
                      <option value="BIDIRECTIONAL">Bidirecional</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Versão da API</label>
                    <select
                      className="input w-full"
                      value={formData.apiVersion}
                      onChange={e => setFormData(prev => ({ ...prev, apiVersion: e.target.value }))}
                    >
                      <option value="2024-01">2024-01 (Recomendado)</option>
                      <option value="2023-10">2023-10</option>
                      <option value="2023-07">2023-07</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.syncProducts}
                      onChange={e => setFormData(prev => ({ ...prev, syncProducts: e.target.checked }))}
                      className="rounded border-dark-300"
                    />
                    <span className="text-sm">Produtos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.syncInventory}
                      onChange={e => setFormData(prev => ({ ...prev, syncInventory: e.target.checked }))}
                      className="rounded border-dark-300"
                    />
                    <span className="text-sm">Estoque</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.syncPrices}
                      onChange={e => setFormData(prev => ({ ...prev, syncPrices: e.target.checked }))}
                      className="rounded border-dark-300"
                    />
                    <span className="text-sm">Preços</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.syncImages}
                      onChange={e => setFormData(prev => ({ ...prev, syncImages: e.target.checked }))}
                      className="rounded border-dark-300"
                    />
                    <span className="text-sm">Imagens</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.autoSyncEnabled}
                        onChange={e => setFormData(prev => ({ ...prev, autoSyncEnabled: e.target.checked }))}
                        className="rounded border-dark-300"
                      />
                      <span className="text-sm">Sincronização Automática</span>
                    </label>
                  </div>
                  {formData.autoSyncEnabled && (
                    <div>
                      <label className="label">Intervalo (minutos)</label>
                      <input
                        type="number"
                        className="input w-full"
                        min={15}
                        max={1440}
                        value={formData.syncIntervalMinutes}
                        onChange={e => setFormData(prev => ({ ...prev, syncIntervalMinutes: parseInt(e.target.value) }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Defaults */}
              <div className="border-t border-dark-100 dark:border-dark-700 pt-4">
                <h4 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3">
                  Valores Padrão
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tipo de Produto Padrão</label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="Ex: Clothing"
                      value={formData.defaultProductType}
                      onChange={e => setFormData(prev => ({ ...prev, defaultProductType: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Vendor Padrão</label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="Ex: Minha Marca"
                      value={formData.defaultVendor}
                      onChange={e => setFormData(prev => ({ ...prev, defaultVendor: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={isSaving} className="btn-primary">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stores List */}
      <div className="space-y-4">
        {stores.length === 0 ? (
          <div className="card p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-[#96BF48] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
              Nenhuma loja conectada
            </h3>
            <p className="text-dark-500 mb-4">
              Conecte suas lojas Shopify para sincronizar produtos
            </p>
            <button onClick={handleCreate} className="btn-primary">
              Conectar Loja
            </button>
          </div>
        ) : (
          stores.map(store => {
            const isExpanded = expandedStore === store.id;
            const SyncStatusIcon = syncStatusIcons[store.lastSyncStatus || ''] || Clock;

            return (
              <div key={store.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-[#96BF48]/10">
                        <ShoppingBag className="w-6 h-6 text-[#96BF48]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-dark-900 dark:text-white">
                            {store.name}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[store.status]}`}>
                            {store.status === 'ACTIVE' ? 'Ativo' :
                             store.status === 'INACTIVE' ? 'Inativo' :
                             store.status === 'ERROR' ? 'Erro' : 'Pendente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={`https://${store.shopDomain}/admin`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                          >
                            {store.shopDomain}
                            <ExternalLink size={12} />
                          </a>
                          <span className="text-dark-400">•</span>
                          <span className="text-sm text-dark-500">
                            {syncDirectionLabels[store.syncDirection]}
                          </span>
                        </div>
                        {store.shopName && (
                          <p className="text-sm text-dark-400 mt-0.5">
                            Loja: {store.shopName} {store.shopCurrency && `(${store.shopCurrency})`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestConnection(store.id)}
                        disabled={testingStoreId === store.id}
                        className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg disabled:opacity-50"
                        title="Testar Conexão"
                      >
                        {testingStoreId === store.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Link2 size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleSync(store.id)}
                        disabled={syncingStoreId === store.id || store.status !== 'ACTIVE'}
                        className="p-2 text-[#96BF48] hover:bg-[#96BF48]/10 rounded-lg disabled:opacity-50"
                        title="Sincronizar Agora"
                      >
                        {syncingStoreId === store.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <RefreshCw size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(store)}
                        className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(store.id)}
                        disabled={deletingStoreId === store.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletingStoreId === store.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => toggleExpand(store.id)}
                        className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 mt-4 pt-4 border-t border-dark-100 dark:border-dark-700">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-dark-400" />
                      <span className="text-sm text-dark-600 dark:text-dark-300">
                        <strong>{store.productsSynced}</strong> produtos sincronizados
                      </span>
                    </div>
                    {store.lastSyncAt && (
                      <div className="flex items-center gap-2">
                        <SyncStatusIcon
                          size={16}
                          className={
                            store.lastSyncStatus === 'SUCCESS' ? 'text-green-500' :
                            store.lastSyncStatus === 'FAILED' ? 'text-red-500' :
                            store.lastSyncStatus === 'PARTIAL' ? 'text-yellow-500' :
                            'text-blue-500'
                          }
                        />
                        <span className="text-sm text-dark-600 dark:text-dark-300">
                          Última sync: {formatDate(store.lastSyncAt)}
                        </span>
                      </div>
                    )}
                    {store.autoSyncEnabled && (
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-dark-400" />
                        <span className="text-sm text-dark-600 dark:text-dark-300">
                          Auto-sync: a cada {store.syncIntervalMinutes}min
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="bg-dark-50 dark:bg-dark-900 p-4 border-t border-dark-100 dark:border-dark-700">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3">
                        Configurações de Sync
                      </h4>
                      <div className="flex gap-4">
                        {store.syncProducts && (
                          <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded text-xs">
                            Produtos
                          </span>
                        )}
                        {store.syncInventory && (
                          <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded text-xs">
                            Estoque
                          </span>
                        )}
                        {store.syncPrices && (
                          <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded text-xs">
                            Preços
                          </span>
                        )}
                        {store.syncImages && (
                          <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded text-xs">
                            Imagens
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sync Logs */}
                    <div>
                      <h4 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3">
                        Histórico de Sincronização
                      </h4>
                      {syncLogs[store.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {syncLogs[store.id].map(log => {
                            const LogStatusIcon = syncStatusIcons[log.status] || Clock;
                            return (
                              <div
                                key={log.id}
                                className="flex items-center justify-between p-3 bg-white dark:bg-dark-800 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <LogStatusIcon
                                    size={16}
                                    className={
                                      log.status === 'SUCCESS' ? 'text-green-500' :
                                      log.status === 'FAILED' ? 'text-red-500' :
                                      log.status === 'PARTIAL' ? 'text-yellow-500' :
                                      'text-blue-500'
                                    }
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-dark-900 dark:text-white">
                                      {log.type.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-xs text-dark-500">
                                      {formatDate(log.startedAt)}
                                      {log.durationMs && ` • ${formatDuration(log.durationMs)}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <span className="text-green-600">+{log.itemsCreated}</span>
                                  {' / '}
                                  <span className="text-blue-600">{log.itemsUpdated} upd</span>
                                  {log.itemsFailed > 0 && (
                                    <>
                                      {' / '}
                                      <span className="text-red-600">{log.itemsFailed} err</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-dark-500">
                          Nenhuma sincronização realizada ainda
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
