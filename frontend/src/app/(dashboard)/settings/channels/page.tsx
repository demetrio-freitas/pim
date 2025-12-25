'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  Radio,
  Plus,
  Trash2,
  Edit2,
  Globe,
  ShoppingCart,
  Store,
  Smartphone,
  Package,
  Building2,
  Share2,
  Settings,
  BarChart3,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Channel {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  currency: string;
  locale: string;
  url?: string;
  logoUrl?: string;
  color?: string;
  requiredAttributes: string[];
  allowedCategoryIds: string[];
  position: number;
  productCount: number;
  publishedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChannelType {
  value: string;
  label: string;
}

interface Attribute {
  id: string;
  code: string;
  name: string;
  group?: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
  children?: Category[];
}

const channelTypeIcons: Record<string, any> = {
  ECOMMERCE: ShoppingCart,
  MARKETPLACE: Store,
  CATALOG: Package,
  MOBILE_APP: Smartphone,
  POS: Building2,
  B2B: Building2,
  SOCIAL: Share2,
  CUSTOM: Settings,
};

const defaultColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelTypes, setChannelTypes] = useState<ChannelType[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'ECOMMERCE',
    currency: 'BRL',
    locale: 'pt_BR',
    url: '',
    color: '#3B82F6',
    requiredAttributes: [] as string[],
    allowedCategoryIds: [] as string[],
    position: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [channelsData, typesData, attrsData, catsData] = await Promise.all([
        api.getChannels(),
        api.getChannelTypes(),
        api.getAttributes(),
        api.getCategoryTree(),
      ]);
      setChannels(channelsData);
      setChannelTypes(typesData);
      setAttributes(attrsData.content || attrsData || []);
      setCategories(catsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingChannel(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'ECOMMERCE',
      currency: 'BRL',
      locale: 'pt_BR',
      url: '',
      color: defaultColors[channels.length % defaultColors.length],
      requiredAttributes: [],
      allowedCategoryIds: [],
      position: channels.length,
    });
    setShowModal(true);
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      code: channel.code,
      name: channel.name,
      description: channel.description || '',
      type: channel.type,
      currency: channel.currency,
      locale: channel.locale,
      url: channel.url || '',
      color: channel.color || '#3B82F6',
      requiredAttributes: channel.requiredAttributes || [],
      allowedCategoryIds: channel.allowedCategoryIds || [],
      position: channel.position,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Preencha código e nome do canal');
      return;
    }

    setIsSaving(true);
    try {
      if (editingChannel) {
        await api.updateChannel(editingChannel.id, formData);
        toast.success('Canal atualizado');
      } else {
        await api.createChannel(formData);
        toast.success('Canal criado');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar canal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal? Todos os produtos associados serão desvinculados.')) {
      return;
    }

    try {
      await api.deleteChannel(id);
      toast.success('Canal excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir canal');
    }
  };

  const handleToggleStatus = async (channel: Channel) => {
    const newStatus = channel.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateChannel(channel.id, { status: newStatus });
      toast.success(`Canal ${newStatus === 'ACTIVE' ? 'ativado' : 'desativado'}`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const toggleAttribute = (code: string) => {
    setFormData(prev => ({
      ...prev,
      requiredAttributes: prev.requiredAttributes.includes(code)
        ? prev.requiredAttributes.filter(a => a !== code)
        : [...prev.requiredAttributes, code],
    }));
  };

  const toggleCategory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      allowedCategoryIds: prev.allowedCategoryIds.includes(id)
        ? prev.allowedCategoryIds.filter(c => c !== id)
        : [...prev.allowedCategoryIds, id],
    }));
  };

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return cats.map(cat => (
      <div key={cat.id}>
        <button
          type="button"
          onClick={() => toggleCategory(cat.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            formData.allowedCategoryIds.includes(cat.id)
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'hover:bg-dark-100 dark:hover:bg-dark-700'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              formData.allowedCategoryIds.includes(cat.id)
                ? 'bg-primary-500 border-primary-500'
                : 'border-dark-300 dark:border-dark-600'
            }`}>
              {formData.allowedCategoryIds.includes(cat.id) && (
                <Check size={12} className="text-white" />
              )}
            </div>
            <span>{cat.name}</span>
          </div>
        </button>
        {cat.children && cat.children.length > 0 && renderCategoryTree(cat.children, level + 1)}
      </div>
    ));
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
            Canais de Distribuição
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Configure os canais de venda e destinos de publicação
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Novo Canal
        </button>
      </div>

      {/* Channel Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              {editingChannel ? 'Editar Canal' : 'Novo Canal'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Código *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: ecommerce_br"
                    value={formData.code}
                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    disabled={!!editingChannel}
                  />
                </div>
                <div>
                  <label className="label">Nome *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: E-commerce Brasil"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  placeholder="Descrição do canal"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo</label>
                  <select
                    className="input w-full"
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    {channelTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Cor</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer border-0"
                      value={formData.color}
                      onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    />
                    <div className="flex gap-1">
                      {defaultColors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                          className={`w-6 h-6 rounded-full border-2 ${
                            formData.color === c ? 'border-dark-900 dark:border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Moeda</label>
                  <select
                    className="input w-full"
                    value={formData.currency}
                    onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <option value="BRL">BRL - Real Brasileiro</option>
                    <option value="USD">USD - Dólar Americano</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
                <div>
                  <label className="label">Locale</label>
                  <select
                    className="input w-full"
                    value={formData.locale}
                    onChange={e => setFormData(prev => ({ ...prev, locale: e.target.value }))}
                  >
                    <option value="pt_BR">Português (Brasil)</option>
                    <option value="en_US">English (US)</option>
                    <option value="es_ES">Español</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">URL do Canal</label>
                <input
                  type="url"
                  className="input w-full"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>

              {/* Required Attributes */}
              <div>
                <label className="label">Atributos Obrigatórios</label>
                <p className="text-xs text-dark-500 mb-2">
                  Produtos precisam ter estes atributos preenchidos para serem publicados neste canal
                </p>
                <div className="max-h-48 overflow-y-auto border border-dark-200 dark:border-dark-700 rounded-lg p-2">
                  <div className="flex flex-wrap gap-2">
                    {attributes.map(attr => (
                      <button
                        key={attr.id}
                        type="button"
                        onClick={() => toggleAttribute(attr.code)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          formData.requiredAttributes.includes(attr.code)
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                        }`}
                      >
                        {attr.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Allowed Categories */}
              <div>
                <label className="label">Categorias Permitidas</label>
                <p className="text-xs text-dark-500 mb-2">
                  Deixe vazio para permitir todas as categorias
                </p>
                <div className="max-h-48 overflow-y-auto border border-dark-200 dark:border-dark-700 rounded-lg p-2">
                  {renderCategoryTree(categories)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
              >
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

      {/* Channels List */}
      <div className="space-y-4">
        {channels.length === 0 ? (
          <div className="card p-8 text-center">
            <Radio className="w-12 h-12 text-dark-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
              Nenhum canal criado
            </h3>
            <p className="text-dark-500 mb-4">
              Crie canais para gerenciar onde seus produtos serão publicados
            </p>
            <button onClick={handleCreate} className="btn-primary">
              Criar Canal
            </button>
          </div>
        ) : (
          channels.map(channel => {
            const TypeIcon = channelTypeIcons[channel.type] || Globe;
            const isExpanded = expandedChannel === channel.id;

            return (
              <div key={channel.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${channel.color}20` }}
                      >
                        <TypeIcon
                          className="w-6 h-6"
                          style={{ color: channel.color }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-dark-900 dark:text-white">
                            {channel.name}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            channel.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400'
                          }`}>
                            {channel.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-sm text-dark-500 mt-0.5">
                          <code className="bg-dark-100 dark:bg-dark-900 px-1.5 py-0.5 rounded text-xs">
                            {channel.code}
                          </code>
                          {' '}• {channelTypes.find(t => t.value === channel.type)?.label || channel.type}
                        </p>
                        {channel.description && (
                          <p className="text-sm text-dark-400 mt-1">{channel.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(channel)}
                        className={`p-2 rounded-lg transition-colors ${
                          channel.status === 'ACTIVE'
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700'
                        }`}
                        title={channel.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                      >
                        {channel.status === 'ACTIVE' ? <Check size={18} /> : <X size={18} />}
                      </button>
                      <button
                        onClick={() => handleEdit(channel)}
                        className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(channel.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => setExpandedChannel(isExpanded ? null : channel.id)}
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
                        <strong>{channel.productCount}</strong> produtos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-green-500" />
                      <span className="text-sm text-dark-600 dark:text-dark-300">
                        <strong>{channel.publishedCount}</strong> publicados
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-dark-400" />
                      <span className="text-sm text-dark-600 dark:text-dark-300">
                        {channel.currency} • {channel.locale}
                      </span>
                    </div>
                    {channel.url && (
                      <a
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline"
                      >
                        {channel.url}
                      </a>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="bg-dark-50 dark:bg-dark-900 p-4 border-t border-dark-100 dark:border-dark-700">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                          Atributos Obrigatórios ({channel.requiredAttributes.length})
                        </h4>
                        {channel.requiredAttributes.length === 0 ? (
                          <p className="text-sm text-dark-500">Nenhum atributo obrigatório</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {channel.requiredAttributes.map(code => {
                              const attr = attributes.find(a => a.code === code);
                              return (
                                <span
                                  key={code}
                                  className="px-2 py-1 bg-dark-200 dark:bg-dark-700 rounded text-xs"
                                >
                                  {attr?.name || code}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                          Categorias Permitidas
                        </h4>
                        {channel.allowedCategoryIds.length === 0 ? (
                          <p className="text-sm text-dark-500">Todas as categorias</p>
                        ) : (
                          <p className="text-sm text-dark-600 dark:text-dark-400">
                            {channel.allowedCategoryIds.length} categorias selecionadas
                          </p>
                        )}
                      </div>
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
