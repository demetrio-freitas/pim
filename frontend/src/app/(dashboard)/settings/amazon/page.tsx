'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  PlugZap,
  Pause,
  Play,
  Link2Off,
  Award,
  Package,
  Truck,
  BarChart3,
} from 'lucide-react';

interface AmazonAccount {
  id: string;
  name: string;
  sellerId: string;
  marketplaceId: string;
  marketplaceName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TOKEN_EXPIRED' | 'SUSPENDED' | 'ERROR';
  description?: string;
  syncProducts: boolean;
  syncInventory: boolean;
  syncPrices: boolean;
  syncOrders: boolean;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  defaultFulfillmentChannel: 'FBA' | 'FBM';
  defaultCondition: string;
  defaultProductType?: string;
  productsPublished: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncMessage?: string;
  sellerName?: string;
  sellerRating?: number;
  createdAt: string;
  updatedAt: string;
}

interface AmazonMapping {
  id: string;
  accountId: string;
  productId: string;
  amazonAsin?: string;
  amazonSku: string;
  amazonFnsku?: string;
  fulfillmentChannel: 'FBA' | 'FBM';
  status: string;
  amazonStatus?: string;
  hasBuyBox: boolean;
  buyBoxPrice?: number;
  amazonPrice?: number;
  amazonQuantity: number;
  fbaQuantity: number;
  listingQualityScore?: number;
  lastSyncedAt?: string;
  syncError?: string;
}

interface AmazonStats {
  totalProducts: number;
  activeProducts: number;
  withBuyBox: number;
  suppressedProducts: number;
  fbaProducts: number;
  fbmProducts: number;
}

interface Marketplace {
  id: string;
  name: string;
  country: string;
  currency: string;
  region: string;
}

export default function AmazonPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMappingsModal, setShowMappingsModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AmazonAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sellerId: '',
    marketplaceId: 'A2Q3Y263D00KWC',
    marketplaceName: 'Amazon.com.br',
    refreshToken: '',
    lwaClientId: '',
    lwaClientSecret: '',
    description: '',
    syncProducts: true,
    syncInventory: true,
    syncPrices: true,
    syncOrders: false,
    autoSyncEnabled: false,
    syncIntervalMinutes: 60,
    defaultFulfillmentChannel: 'FBM',
    defaultCondition: 'new_new',
    defaultProductType: '',
  });

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['amazon-accounts'],
    queryFn: () => api.getAmazonAccounts(),
  });

  const accounts: AmazonAccount[] = accountsData?.content || [];

  const { data: marketplaces } = useQuery({
    queryKey: ['amazon-marketplaces'],
    queryFn: () => api.getAmazonMarketplaces(),
  });

  const { data: mappingsData } = useQuery({
    queryKey: ['amazon-mappings', selectedAccount?.id],
    queryFn: () => selectedAccount ? api.getAmazonProductMappings(selectedAccount.id) : null,
    enabled: !!selectedAccount && showMappingsModal,
  });

  const { data: accountStats } = useQuery({
    queryKey: ['amazon-stats', selectedAccount?.id],
    queryFn: () => selectedAccount ? api.getAmazonAccountStats(selectedAccount.id) : null,
    enabled: !!selectedAccount && showMappingsModal,
  });

  const mappings: AmazonMapping[] = mappingsData?.content || [];
  const stats: AmazonStats | null = accountStats || null;

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.createAmazonAccount(data),
    onSuccess: () => {
      showSuccess('Conta Amazon criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['amazon-accounts'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => showError(error),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      api.updateAmazonAccount(id, data),
    onSuccess: () => {
      showSuccess('Conta atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['amazon-accounts'] });
      setShowEditModal(false);
      setSelectedAccount(null);
    },
    onError: (error: any) => showError(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAmazonAccount(id),
    onSuccess: () => {
      showSuccess('Conta removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['amazon-accounts'] });
    },
    onError: (error: any) => showError(error),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testAmazonConnection(id),
    onSuccess: (result) => {
      if (result.success) {
        showSuccess('Conexão estabelecida com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['amazon-accounts'] });
      } else {
        showError(result.message || 'Falha na conexão');
      }
    },
    onError: (error: any) => showError(error),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.syncAmazonProducts(id),
    onSuccess: (result) => {
      showSuccess(`Sincronização concluída! Criados: ${result.created}, Atualizados: ${result.updated}`);
      queryClient.invalidateQueries({ queryKey: ['amazon-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['amazon-mappings'] });
    },
    onError: (error: any) => showError(error),
  });

  const deactivateProductMutation = useMutation({
    mutationFn: ({ accountId, productId }: { accountId: string; productId: string }) =>
      api.deactivateAmazonProduct(accountId, productId),
    onSuccess: () => {
      showSuccess('Anúncio desativado!');
      queryClient.invalidateQueries({ queryKey: ['amazon-mappings'] });
    },
    onError: (error: any) => showError(error),
  });

  const reactivateProductMutation = useMutation({
    mutationFn: ({ accountId, productId }: { accountId: string; productId: string }) =>
      api.reactivateAmazonProduct(accountId, productId),
    onSuccess: () => {
      showSuccess('Anúncio reativado!');
      queryClient.invalidateQueries({ queryKey: ['amazon-mappings'] });
    },
    onError: (error: any) => showError(error),
  });

  const unlinkProductMutation = useMutation({
    mutationFn: ({ accountId, productId }: { accountId: string; productId: string }) =>
      api.unlinkAmazonProduct(accountId, productId),
    onSuccess: () => {
      showSuccess('Produto desvinculado!');
      queryClient.invalidateQueries({ queryKey: ['amazon-mappings'] });
    },
    onError: (error: any) => showError(error),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      sellerId: '',
      marketplaceId: 'A2Q3Y263D00KWC',
      marketplaceName: 'Amazon.com.br',
      refreshToken: '',
      lwaClientId: '',
      lwaClientSecret: '',
      description: '',
      syncProducts: true,
      syncInventory: true,
      syncPrices: true,
      syncOrders: false,
      autoSyncEnabled: false,
      syncIntervalMinutes: 60,
      defaultFulfillmentChannel: 'FBM',
      defaultCondition: 'new_new',
      defaultProductType: '',
    });
  };

  const handleEdit = (account: AmazonAccount) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      sellerId: account.sellerId,
      marketplaceId: account.marketplaceId,
      marketplaceName: account.marketplaceName,
      refreshToken: '',
      lwaClientId: '',
      lwaClientSecret: '',
      description: account.description || '',
      syncProducts: account.syncProducts,
      syncInventory: account.syncInventory,
      syncPrices: account.syncPrices,
      syncOrders: account.syncOrders,
      autoSyncEnabled: account.autoSyncEnabled,
      syncIntervalMinutes: account.syncIntervalMinutes,
      defaultFulfillmentChannel: account.defaultFulfillmentChannel,
      defaultCondition: account.defaultCondition,
      defaultProductType: account.defaultProductType || '',
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-500';
      case 'INACTIVE':
        return 'text-gray-500';
      case 'TOKEN_EXPIRED':
        return 'text-yellow-500';
      case 'SUSPENDED':
        return 'text-red-500';
      case 'ERROR':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />;
      case 'INACTIVE':
        return <XCircle className="w-4 h-4" />;
      case 'TOKEN_EXPIRED':
        return <AlertCircle className="w-4 h-4" />;
      case 'SUSPENDED':
      case 'ERROR':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const fulfillmentChannels = [
    { value: 'FBA', label: 'FBA (Fulfilled by Amazon)' },
    { value: 'FBM', label: 'FBM (Fulfilled by Merchant)' },
  ];

  const conditions = [
    { value: 'new_new', label: 'Novo' },
    { value: 'refurbished', label: 'Recondicionado' },
    { value: 'used_like_new', label: 'Usado - Como Novo' },
    { value: 'used_very_good', label: 'Usado - Muito Bom' },
    { value: 'used_good', label: 'Usado - Bom' },
    { value: 'used_acceptable', label: 'Usado - Aceitável' },
  ];

  const handleMarketplaceChange = (marketplaceId: string) => {
    const marketplace = (marketplaces as Marketplace[])?.find(m => m.id === marketplaceId);
    setFormData({
      ...formData,
      marketplaceId,
      marketplaceName: marketplace?.name || '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <ShoppingCart className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              Amazon Seller Central
            </h1>
            <p className="text-dark-500 dark:text-dark-400">
              Gerencie suas contas de vendedor e sincronize produtos com a Amazon
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
      </div>

      {/* Accounts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700 p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
            Nenhuma conta configurada
          </h3>
          <p className="text-dark-500 dark:text-dark-400 mb-4">
            Conecte sua conta de vendedor Amazon para começar a sincronizar produtos.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Adicionar Conta
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
                        {account.name}
                      </h3>
                      <span className={`flex items-center gap-1 text-sm ${getStatusColor(account.status)}`}>
                        {getStatusIcon(account.status)}
                        {account.status === 'ACTIVE' ? 'Ativo' :
                         account.status === 'TOKEN_EXPIRED' ? 'Token Expirado' :
                         account.status === 'SUSPENDED' ? 'Suspenso' :
                         account.status === 'ERROR' ? 'Erro' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">
                      {account.marketplaceName} - Seller ID: {account.sellerId}
                    </p>
                    {account.description && (
                      <p className="text-dark-400 dark:text-dark-500 text-sm mt-1">
                        {account.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-dark-500">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {account.productsPublished} produtos
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {account.defaultFulfillmentChannel}
                      </span>
                      {account.sellerRating && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {account.sellerRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {account.lastSyncAt && (
                      <p className="text-dark-400 text-xs mt-2">
                        Última sincronização: {new Date(account.lastSyncAt).toLocaleString('pt-BR')}
                        {account.lastSyncMessage && ` - ${account.lastSyncMessage}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedAccount(account);
                      setShowMappingsModal(true);
                    }}
                    className="p-2 text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                    title="Ver produtos vinculados"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => testMutation.mutate(account.id)}
                    disabled={testMutation.isPending}
                    className="p-2 text-dark-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                    title="Testar conexão"
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlugZap className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => syncMutation.mutate(account.id)}
                    disabled={syncMutation.isPending || account.status !== 'ACTIVE'}
                    className="p-2 text-dark-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg disabled:opacity-50"
                    title="Sincronizar produtos"
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-2 text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                    title="Configurações"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover esta conta?')) {
                        deleteMutation.mutate(account.id);
                      }
                    }}
                    className="p-2 text-dark-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sync Options Summary */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-200 dark:border-dark-700">
                <span className={`text-sm ${account.syncProducts ? 'text-green-500' : 'text-dark-400'}`}>
                  Produtos: {account.syncProducts ? 'Sim' : 'Não'}
                </span>
                <span className={`text-sm ${account.syncInventory ? 'text-green-500' : 'text-dark-400'}`}>
                  Inventário: {account.syncInventory ? 'Sim' : 'Não'}
                </span>
                <span className={`text-sm ${account.syncPrices ? 'text-green-500' : 'text-dark-400'}`}>
                  Preços: {account.syncPrices ? 'Sim' : 'Não'}
                </span>
                <span className={`text-sm ${account.autoSyncEnabled ? 'text-green-500' : 'text-dark-400'}`}>
                  Auto Sync: {account.autoSyncEnabled ? `${account.syncIntervalMinutes}min` : 'Não'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
                Nova Conta Amazon Seller
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Nome da Conta *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                    placeholder="Minha Loja Amazon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Seller ID *
                  </label>
                  <input
                    type="text"
                    value={formData.sellerId}
                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                    placeholder="A1B2C3D4E5F6G7"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Marketplace
                </label>
                <select
                  value={formData.marketplaceId}
                  onChange={(e) => handleMarketplaceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                >
                  {(marketplaces as Marketplace[])?.map((mp) => (
                    <option key={mp.id} value={mp.id}>
                      {mp.name} ({mp.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Refresh Token *
                </label>
                <input
                  type="password"
                  value={formData.refreshToken}
                  onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  placeholder="Atzr|..."
                />
                <p className="text-xs text-dark-500 mt-1">
                  Obtenha o refresh token através do processo de autorização SP-API
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    LWA Client ID
                  </label>
                  <input
                    type="text"
                    value={formData.lwaClientId}
                    onChange={(e) => setFormData({ ...formData, lwaClientId: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    LWA Client Secret
                  </label>
                  <input
                    type="password"
                    value={formData.lwaClientSecret}
                    onChange={(e) => setFormData({ ...formData, lwaClientSecret: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Canal de Fulfillment Padrão
                  </label>
                  <select
                    value={formData.defaultFulfillmentChannel}
                    onChange={(e) => setFormData({ ...formData, defaultFulfillmentChannel: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {fulfillmentChannels.map((channel) => (
                      <option key={channel.value} value={channel.value}>
                        {channel.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Condição Padrão
                  </label>
                  <select
                    value={formData.defaultCondition}
                    onChange={(e) => setFormData({ ...formData, defaultCondition: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {conditions.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.syncProducts}
                    onChange={(e) => setFormData({ ...formData, syncProducts: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar produtos</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.syncInventory}
                    onChange={(e) => setFormData({ ...formData, syncInventory: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar inventário</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.syncPrices}
                    onChange={(e) => setFormData({ ...formData, syncPrices: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar preços</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.syncOrders}
                    onChange={(e) => setFormData({ ...formData, syncOrders: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar pedidos</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.autoSyncEnabled}
                    onChange={(e) => setFormData({ ...formData, autoSyncEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronização automática</span>
                </label>
                {formData.autoSyncEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-dark-500">a cada</span>
                    <input
                      type="number"
                      value={formData.syncIntervalMinutes}
                      onChange={(e) => setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) || 60 })}
                      className="w-20 px-2 py-1 border border-dark-300 dark:border-dark-600 rounded dark:bg-dark-700"
                      min={15}
                    />
                    <span className="text-sm text-dark-500">minutos</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate(formData)}
                disabled={createMutation.isPending || !formData.name || !formData.sellerId || !formData.refreshToken}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
              >
                {createMutation.isPending ? 'Salvando...' : 'Criar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
                Editar Conta: {selectedAccount.name}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Nome da Conta
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Canal de Fulfillment Padrão
                  </label>
                  <select
                    value={formData.defaultFulfillmentChannel}
                    onChange={(e) => setFormData({ ...formData, defaultFulfillmentChannel: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {fulfillmentChannels.map((channel) => (
                      <option key={channel.value} value={channel.value}>
                        {channel.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Condição Padrão
                  </label>
                  <select
                    value={formData.defaultCondition}
                    onChange={(e) => setFormData({ ...formData, defaultCondition: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {conditions.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Tipo de Produto Padrão
                  </label>
                  <input
                    type="text"
                    value={formData.defaultProductType}
                    onChange={(e) => setFormData({ ...formData, defaultProductType: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.syncProducts}
                    onChange={(e) => setFormData({ ...formData, syncProducts: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar produtos</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.syncInventory}
                    onChange={(e) => setFormData({ ...formData, syncInventory: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar inventário</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.syncPrices}
                    onChange={(e) => setFormData({ ...formData, syncPrices: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar preços</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.syncOrders}
                    onChange={(e) => setFormData({ ...formData, syncOrders: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar pedidos</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.autoSyncEnabled}
                    onChange={(e) => setFormData({ ...formData, autoSyncEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronização automática</span>
                </label>
                {formData.autoSyncEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-dark-500">a cada</span>
                    <input
                      type="number"
                      value={formData.syncIntervalMinutes}
                      onChange={(e) => setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) || 60 })}
                      className="w-20 px-2 py-1 border border-dark-300 dark:border-dark-600 rounded dark:bg-dark-700"
                      min={15}
                    />
                    <span className="text-sm text-dark-500">minutos</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAccount(null);
                }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateMutation.mutate({ id: selectedAccount.id, data: formData })}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mappings Modal */}
      {showMappingsModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
                Produtos Vinculados - {selectedAccount.name}
              </h2>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-6 gap-4 mt-4">
                  <div className="text-center p-2 bg-dark-50 dark:bg-dark-700 rounded">
                    <p className="text-lg font-semibold text-dark-900 dark:text-white">{stats.totalProducts}</p>
                    <p className="text-xs text-dark-500">Total</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="text-lg font-semibold text-green-600">{stats.activeProducts}</p>
                    <p className="text-xs text-dark-500">Ativos</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <p className="text-lg font-semibold text-yellow-600">{stats.withBuyBox}</p>
                    <p className="text-xs text-dark-500">Buy Box</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <p className="text-lg font-semibold text-red-600">{stats.suppressedProducts}</p>
                    <p className="text-xs text-dark-500">Suprimidos</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <p className="text-lg font-semibold text-orange-600">{stats.fbaProducts}</p>
                    <p className="text-xs text-dark-500">FBA</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="text-lg font-semibold text-blue-600">{stats.fbmProducts}</p>
                    <p className="text-xs text-dark-500">FBM</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {mappings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-dark-400 mx-auto mb-4" />
                  <p className="text-dark-500">Nenhum produto vinculado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center justify-between p-4 border border-dark-200 dark:border-dark-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-dark-900 dark:text-white">
                            {mapping.amazonAsin || mapping.amazonSku}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            mapping.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            mapping.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' :
                            mapping.status === 'SUPPRESSED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {mapping.amazonStatus || mapping.status}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            mapping.fulfillmentChannel === 'FBA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {mapping.fulfillmentChannel}
                          </span>
                          {mapping.hasBuyBox && (
                            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                              Buy Box
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-dark-500">
                          {mapping.amazonPrice && <span>R$ {mapping.amazonPrice.toFixed(2)}</span>}
                          <span>Estoque: {mapping.amazonQuantity}</span>
                          {mapping.fbaQuantity > 0 && <span>FBA: {mapping.fbaQuantity}</span>}
                          {mapping.listingQualityScore && <span>Qualidade: {mapping.listingQualityScore}%</span>}
                        </div>
                        {mapping.syncError && (
                          <p className="text-red-500 text-xs mt-1">{mapping.syncError}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {mapping.amazonAsin && (
                          <a
                            href={`https://www.amazon.com.br/dp/${mapping.amazonAsin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-dark-500 hover:text-blue-600 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                            title="Ver na Amazon"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {mapping.status === 'ACTIVE' ? (
                          <button
                            onClick={() => deactivateProductMutation.mutate({
                              accountId: selectedAccount.id,
                              productId: mapping.productId,
                            })}
                            className="p-2 text-dark-500 hover:text-yellow-600 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                            title="Desativar anúncio"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivateProductMutation.mutate({
                              accountId: selectedAccount.id,
                              productId: mapping.productId,
                            })}
                            className="p-2 text-dark-500 hover:text-green-600 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                            title="Reativar anúncio"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Desvincular este produto da Amazon?')) {
                              unlinkProductMutation.mutate({
                                accountId: selectedAccount.id,
                                productId: mapping.productId,
                              });
                            }
                          }}
                          className="p-2 text-dark-500 hover:text-red-600 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                          title="Desvincular"
                        >
                          <Link2Off className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700">
              <button
                onClick={() => {
                  setShowMappingsModal(false);
                  setSelectedAccount(null);
                }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
