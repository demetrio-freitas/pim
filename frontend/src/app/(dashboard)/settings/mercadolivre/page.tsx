'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import {
  Package,
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
} from 'lucide-react';

interface MLAccount {
  id: string;
  name: string;
  mlUserId: string;
  mlNickname?: string;
  mlEmail?: string;
  siteId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TOKEN_EXPIRED' | 'ERROR';
  description?: string;
  syncProducts: boolean;
  syncStock: boolean;
  syncPrices: boolean;
  syncOrders: boolean;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  defaultListingType: string;
  defaultWarranty?: string;
  defaultCondition: string;
  defaultShippingMode: string;
  freeShippingEnabled: boolean;
  productsPublished: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncMessage?: string;
  sellerLevel?: string;
  createdAt: string;
  updatedAt: string;
}

interface MLMapping {
  id: string;
  accountId: string;
  productId: string;
  mlItemId: string;
  mlPermalink?: string;
  mlCategoryId?: string;
  mlCategoryName?: string;
  listingType: string;
  status: string;
  mlStatus?: string;
  mlPrice?: number;
  mlAvailableQuantity: number;
  mlSoldQuantity: number;
  freeShipping: boolean;
  healthScore?: number;
  lastSyncedAt?: string;
  syncError?: string;
}

export default function MercadoLivrePage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMappingsModal, setShowMappingsModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<MLAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mlUserId: '',
    mlNickname: '',
    mlEmail: '',
    accessToken: '',
    refreshToken: '',
    siteId: 'MLB',
    description: '',
    syncProducts: true,
    syncStock: true,
    syncPrices: true,
    syncOrders: false,
    autoSyncEnabled: false,
    syncIntervalMinutes: 30,
    defaultListingType: 'GOLD_SPECIAL',
    defaultWarranty: '12 meses de garantia do fabricante',
    defaultCondition: 'new',
    defaultShippingMode: 'me2',
    freeShippingEnabled: false,
  });

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['mercadolivre-accounts'],
    queryFn: () => api.getMercadoLivreAccounts(),
  });

  const accounts: MLAccount[] = accountsData?.content || [];

  const { data: mappingsData } = useQuery({
    queryKey: ['mercadolivre-mappings', selectedAccount?.id],
    queryFn: () => selectedAccount ? api.getMercadoLivreProductMappings(selectedAccount.id) : null,
    enabled: !!selectedAccount && showMappingsModal,
  });

  const mappings: MLMapping[] = mappingsData?.content || [];

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.createMercadoLivreAccount(data),
    onSuccess: () => {
      showSuccess('Conta do Mercado Livre criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['mercadolivre-accounts'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => showError(error),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      api.updateMercadoLivreAccount(id, data),
    onSuccess: () => {
      showSuccess('Conta atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['mercadolivre-accounts'] });
      setShowEditModal(false);
      setSelectedAccount(null);
    },
    onError: (error: any) => showError(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMercadoLivreAccount(id),
    onSuccess: () => {
      showSuccess('Conta removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['mercadolivre-accounts'] });
    },
    onError: (error: any) => showError(error),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testMercadoLivreConnection(id),
    onSuccess: (result) => {
      if (result.success) {
        showSuccess('Conexão estabelecida com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['mercadolivre-accounts'] });
      } else {
        showError(result.message || 'Falha na conexão');
      }
    },
    onError: (error: any) => showError(error),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.syncMercadoLivreProducts(id),
    onSuccess: (result) => {
      showSuccess(`Sincronização concluída! Criados: ${result.created}, Atualizados: ${result.updated}`);
      queryClient.invalidateQueries({ queryKey: ['mercadolivre-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['mercadolivre-mappings'] });
    },
    onError: (error: any) => showError(error),
  });

  const pauseProductMutation = useMutation({
    mutationFn: ({ accountId, productId }: { accountId: string; productId: string }) =>
      api.pauseMercadoLivreProduct(accountId, productId),
    onSuccess: () => {
      showSuccess('Anúncio pausado!');
      queryClient.invalidateQueries({ queryKey: ['mercadolivre-mappings'] });
    },
    onError: (error: any) => showError(error),
  });

  const reactivateProductMutation = useMutation({
    mutationFn: ({ accountId, productId }: { accountId: string; productId: string }) =>
      api.reactivateMercadoLivreProduct(accountId, productId),
    onSuccess: () => {
      showSuccess('Anúncio reativado!');
      queryClient.invalidateQueries({ queryKey: ['mercadolivre-mappings'] });
    },
    onError: (error: any) => showError(error),
  });

  const unlinkProductMutation = useMutation({
    mutationFn: ({ accountId, productId }: { accountId: string; productId: string }) =>
      api.unlinkMercadoLivreProduct(accountId, productId),
    onSuccess: () => {
      showSuccess('Produto desvinculado!');
      queryClient.invalidateQueries({ queryKey: ['mercadolivre-mappings'] });
    },
    onError: (error: any) => showError(error),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      mlUserId: '',
      mlNickname: '',
      mlEmail: '',
      accessToken: '',
      refreshToken: '',
      siteId: 'MLB',
      description: '',
      syncProducts: true,
      syncStock: true,
      syncPrices: true,
      syncOrders: false,
      autoSyncEnabled: false,
      syncIntervalMinutes: 30,
      defaultListingType: 'GOLD_SPECIAL',
      defaultWarranty: '12 meses de garantia do fabricante',
      defaultCondition: 'new',
      defaultShippingMode: 'me2',
      freeShippingEnabled: false,
    });
  };

  const handleEdit = (account: MLAccount) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      mlUserId: account.mlUserId,
      mlNickname: account.mlNickname || '',
      mlEmail: account.mlEmail || '',
      accessToken: '',
      refreshToken: '',
      siteId: account.siteId,
      description: account.description || '',
      syncProducts: account.syncProducts,
      syncStock: account.syncStock,
      syncPrices: account.syncPrices,
      syncOrders: account.syncOrders,
      autoSyncEnabled: account.autoSyncEnabled,
      syncIntervalMinutes: account.syncIntervalMinutes,
      defaultListingType: account.defaultListingType,
      defaultWarranty: account.defaultWarranty || '',
      defaultCondition: account.defaultCondition,
      defaultShippingMode: account.defaultShippingMode,
      freeShippingEnabled: account.freeShippingEnabled,
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
      case 'ERROR':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const listingTypes = [
    { value: 'GOLD_SPECIAL', label: 'Clássico (Gold Special)' },
    { value: 'GOLD_PRO', label: 'Premium (Gold Pro)' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'SILVER', label: 'Silver' },
    { value: 'BRONZE', label: 'Bronze' },
    { value: 'FREE', label: 'Gratuito' },
  ];

  const shippingModes = [
    { value: 'me1', label: 'Mercado Envios 1' },
    { value: 'me2', label: 'Mercado Envios 2' },
    { value: 'custom', label: 'Personalizado' },
  ];

  const sites = [
    { value: 'MLB', label: 'Brasil' },
    { value: 'MLA', label: 'Argentina' },
    { value: 'MLM', label: 'México' },
    { value: 'MLC', label: 'Chile' },
    { value: 'MLU', label: 'Uruguai' },
    { value: 'MCO', label: 'Colômbia' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Package className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              Mercado Livre
            </h1>
            <p className="text-dark-500 dark:text-dark-400">
              Gerencie suas contas e sincronize produtos com o Mercado Livre
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
      </div>

      {/* Accounts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700 p-12 text-center">
          <Package className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
            Nenhuma conta configurada
          </h3>
          <p className="text-dark-500 dark:text-dark-400 mb-4">
            Conecte sua conta do Mercado Livre para começar a sincronizar produtos.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
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
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Package className="w-6 h-6 text-yellow-600" />
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
                         account.status === 'ERROR' ? 'Erro' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">
                      {account.mlNickname || account.mlUserId}
                      {account.mlEmail && ` - ${account.mlEmail}`}
                    </p>
                    {account.description && (
                      <p className="text-dark-400 dark:text-dark-500 text-sm mt-1">
                        {account.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-dark-500">
                      <span>Site: {sites.find(s => s.value === account.siteId)?.label || account.siteId}</span>
                      <span>{account.productsPublished} produtos publicados</span>
                      {account.sellerLevel && <span>Nível: {account.sellerLevel}</span>}
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
                    <ExternalLink className="w-4 h-4" />
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
                <span className={`text-sm ${account.syncStock ? 'text-green-500' : 'text-dark-400'}`}>
                  Estoque: {account.syncStock ? 'Sim' : 'Não'}
                </span>
                <span className={`text-sm ${account.syncPrices ? 'text-green-500' : 'text-dark-400'}`}>
                  Preços: {account.syncPrices ? 'Sim' : 'Não'}
                </span>
                <span className={`text-sm ${account.autoSyncEnabled ? 'text-green-500' : 'text-dark-400'}`}>
                  Auto Sync: {account.autoSyncEnabled ? `${account.syncIntervalMinutes}min` : 'Não'}
                </span>
                <span className="text-sm text-dark-500">
                  Tipo: {listingTypes.find(l => l.value === account.defaultListingType)?.label}
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
                Nova Conta do Mercado Livre
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
                    placeholder="Minha Loja ML"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    ID do Usuário ML *
                  </label>
                  <input
                    type="text"
                    value={formData.mlUserId}
                    onChange={(e) => setFormData({ ...formData, mlUserId: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Apelido ML
                  </label>
                  <input
                    type="text"
                    value={formData.mlNickname}
                    onChange={(e) => setFormData({ ...formData, mlNickname: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Email ML
                  </label>
                  <input
                    type="email"
                    value={formData.mlEmail}
                    onChange={(e) => setFormData({ ...formData, mlEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Access Token *
                </label>
                <input
                  type="password"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  placeholder="APP_USR-..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Refresh Token
                </label>
                <input
                  type="password"
                  value={formData.refreshToken}
                  onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Site
                  </label>
                  <select
                    value={formData.siteId}
                    onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {sites.map((site) => (
                      <option key={site.value} value={site.value}>
                        {site.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Tipo de Anúncio Padrão
                  </label>
                  <select
                    value={formData.defaultListingType}
                    onChange={(e) => setFormData({ ...formData, defaultListingType: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {listingTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Modo de Envio Padrão
                  </label>
                  <select
                    value={formData.defaultShippingMode}
                    onChange={(e) => setFormData({ ...formData, defaultShippingMode: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {shippingModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Garantia Padrão
                  </label>
                  <input
                    type="text"
                    value={formData.defaultWarranty}
                    onChange={(e) => setFormData({ ...formData, defaultWarranty: e.target.value })}
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
                    checked={formData.syncStock}
                    onChange={(e) => setFormData({ ...formData, syncStock: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar estoque</span>
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
                    checked={formData.freeShippingEnabled}
                    onChange={(e) => setFormData({ ...formData, freeShippingEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Frete grátis padrão</span>
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
                      onChange={(e) => setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) || 30 })}
                      className="w-20 px-2 py-1 border border-dark-300 dark:border-dark-600 rounded dark:bg-dark-700"
                      min={5}
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
                disabled={createMutation.isPending || !formData.name || !formData.mlUserId || !formData.accessToken}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg disabled:opacity-50"
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
                    Tipo de Anúncio Padrão
                  </label>
                  <select
                    value={formData.defaultListingType}
                    onChange={(e) => setFormData({ ...formData, defaultListingType: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {listingTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Modo de Envio Padrão
                  </label>
                  <select
                    value={formData.defaultShippingMode}
                    onChange={(e) => setFormData({ ...formData, defaultShippingMode: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                  >
                    {shippingModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Garantia Padrão
                  </label>
                  <input
                    type="text"
                    value={formData.defaultWarranty}
                    onChange={(e) => setFormData({ ...formData, defaultWarranty: e.target.value })}
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
                    checked={formData.syncStock}
                    onChange={(e) => setFormData({ ...formData, syncStock: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Sincronizar estoque</span>
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
                    checked={formData.freeShippingEnabled}
                    onChange={(e) => setFormData({ ...formData, freeShippingEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">Frete grátis padrão</span>
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
                      onChange={(e) => setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) || 30 })}
                      className="w-20 px-2 py-1 border border-dark-300 dark:border-dark-600 rounded dark:bg-dark-700"
                      min={5}
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
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg disabled:opacity-50"
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
                            {mapping.mlItemId}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            mapping.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            mapping.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {mapping.mlStatus || mapping.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-dark-500">
                          {mapping.mlPrice && <span>R$ {mapping.mlPrice.toFixed(2)}</span>}
                          <span>Estoque: {mapping.mlAvailableQuantity}</span>
                          <span>Vendidos: {mapping.mlSoldQuantity}</span>
                          {mapping.healthScore && <span>Saúde: {mapping.healthScore}%</span>}
                        </div>
                        {mapping.syncError && (
                          <p className="text-red-500 text-xs mt-1">{mapping.syncError}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {mapping.mlPermalink && (
                          <a
                            href={mapping.mlPermalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-dark-500 hover:text-blue-600 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                            title="Ver no Mercado Livre"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {mapping.mlStatus === 'active' ? (
                          <button
                            onClick={() => pauseProductMutation.mutate({
                              accountId: selectedAccount.id,
                              productId: mapping.productId,
                            })}
                            className="p-2 text-dark-500 hover:text-yellow-600 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                            title="Pausar anúncio"
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
                            if (confirm('Desvincular este produto do Mercado Livre?')) {
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
