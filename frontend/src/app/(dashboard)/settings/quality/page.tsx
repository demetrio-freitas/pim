'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Tag,
  Layers,
  Radio,
  Percent,
  Type,
  Hash,
  Calendar,
  Image,
} from 'lucide-react';

interface QualityRule {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  severity: string;
  attributeId?: string;
  attributeCode?: string;
  attributeName?: string;
  categoryId?: string;
  categoryName?: string;
  familyId?: string;
  familyName?: string;
  channelId?: string;
  channelName?: string;
  parameters: Record<string, any>;
  errorMessage?: string;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface RuleType {
  value: string;
  label: string;
  description: string;
}

interface Severity {
  value: string;
  label: string;
}

interface Attribute {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

interface Family {
  id: string;
  name: string;
  code: string;
}

interface Channel {
  id: string;
  name: string;
  code: string;
}

const severityIcons: Record<string, any> = {
  ERROR: AlertCircle,
  WARNING: AlertTriangle,
  INFO: Info,
};

const severityColors: Record<string, string> = {
  ERROR: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  WARNING: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  INFO: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
};

const typeIcons: Record<string, any> = {
  REQUIRED: FileText,
  MIN_LENGTH: Hash,
  MAX_LENGTH: Hash,
  REGEX: Type,
  UNIQUE: Tag,
  FORMAT: Type,
  RANGE: Percent,
  IMAGE_SIZE: Image,
  IMAGE_FORMAT: Image,
  DATE_RANGE: Calendar,
  COMPLETENESS: Percent,
  CUSTOM: ShieldCheck,
};

export default function QualityPage() {
  const [rules, setRules] = useState<QualityRule[]>([]);
  const [ruleTypes, setRuleTypes] = useState<RuleType[]>([]);
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<QualityRule | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'REQUIRED',
    severity: 'ERROR',
    attributeId: '',
    categoryId: '',
    familyId: '',
    channelId: '',
    parameters: {} as Record<string, any>,
    errorMessage: '',
    isActive: true,
    position: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesData, typesData, severitiesData, attrsData, catsData, familiesData, channelsData] = await Promise.all([
        api.getQualityRules(),
        api.getQualityRuleTypes(),
        api.getQualitySeverities(),
        api.getAttributes(),
        api.getCategories(),
        api.getFamilies(),
        api.getChannels(),
      ]);
      setRules(rulesData);
      setRuleTypes(typesData);
      setSeverities(severitiesData);
      setAttributes(attrsData.content || attrsData || []);
      setCategories(catsData.content || catsData || []);
      setFamilies(familiesData);
      setChannels(channelsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'REQUIRED',
      severity: 'ERROR',
      attributeId: '',
      categoryId: '',
      familyId: '',
      channelId: '',
      parameters: {},
      errorMessage: '',
      isActive: true,
      position: rules.length,
    });
    setShowModal(true);
  };

  const handleEdit = (rule: QualityRule) => {
    setEditingRule(rule);
    setFormData({
      code: rule.code,
      name: rule.name,
      description: rule.description || '',
      type: rule.type,
      severity: rule.severity,
      attributeId: rule.attributeId || '',
      categoryId: rule.categoryId || '',
      familyId: rule.familyId || '',
      channelId: rule.channelId || '',
      parameters: rule.parameters || {},
      errorMessage: rule.errorMessage || '',
      isActive: rule.isActive,
      position: rule.position,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Preencha código e nome da regra');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSend = {
        ...formData,
        attributeId: formData.attributeId || undefined,
        categoryId: formData.categoryId || undefined,
        familyId: formData.familyId || undefined,
        channelId: formData.channelId || undefined,
      };

      if (editingRule) {
        await api.updateQualityRule(editingRule.id, dataToSend);
        toast.success('Regra atualizada');
      } else {
        await api.createQualityRule(dataToSend);
        toast.success('Regra criada');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar regra');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) {
      return;
    }

    try {
      await api.deleteQualityRule(id);
      toast.success('Regra excluída');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir regra');
    }
  };

  const handleToggleActive = async (rule: QualityRule) => {
    try {
      await api.toggleQualityRule(rule.id);
      toast.success(`Regra ${!rule.isActive ? 'ativada' : 'desativada'}`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar regra');
    }
  };

  const updateParameter = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }));
  };

  const renderParameterFields = () => {
    switch (formData.type) {
      case 'MIN_LENGTH':
        return (
          <div>
            <label className="label">Tamanho Mínimo</label>
            <input
              type="number"
              className="input w-full"
              min={1}
              value={formData.parameters.minLength || ''}
              onChange={e => updateParameter('minLength', parseInt(e.target.value) || 0)}
            />
          </div>
        );
      case 'MAX_LENGTH':
        return (
          <div>
            <label className="label">Tamanho Máximo</label>
            <input
              type="number"
              className="input w-full"
              min={1}
              value={formData.parameters.maxLength || ''}
              onChange={e => updateParameter('maxLength', parseInt(e.target.value) || 0)}
            />
          </div>
        );
      case 'REGEX':
        return (
          <div>
            <label className="label">Expressão Regular</label>
            <input
              type="text"
              className="input w-full font-mono"
              placeholder="^[A-Z]{3}-[0-9]{4}$"
              value={formData.parameters.pattern || ''}
              onChange={e => updateParameter('pattern', e.target.value)}
            />
          </div>
        );
      case 'RANGE':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor Mínimo</label>
              <input
                type="number"
                className="input w-full"
                value={formData.parameters.min || ''}
                onChange={e => updateParameter('min', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">Valor Máximo</label>
              <input
                type="number"
                className="input w-full"
                value={formData.parameters.max || ''}
                onChange={e => updateParameter('max', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        );
      case 'IMAGE_SIZE':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Largura Mínima (px)</label>
              <input
                type="number"
                className="input w-full"
                min={1}
                value={formData.parameters.minWidth || ''}
                onChange={e => updateParameter('minWidth', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">Altura Mínima (px)</label>
              <input
                type="number"
                className="input w-full"
                min={1}
                value={formData.parameters.minHeight || ''}
                onChange={e => updateParameter('minHeight', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        );
      case 'IMAGE_FORMAT':
        return (
          <div>
            <label className="label">Formatos Permitidos</label>
            <input
              type="text"
              className="input w-full"
              placeholder="jpg, png, webp"
              value={formData.parameters.formats || ''}
              onChange={e => updateParameter('formats', e.target.value)}
            />
          </div>
        );
      case 'COMPLETENESS':
        return (
          <div>
            <label className="label">Completude Mínima (%)</label>
            <input
              type="number"
              className="input w-full"
              min={0}
              max={100}
              value={formData.parameters.minCompleteness || ''}
              onChange={e => updateParameter('minCompleteness', parseInt(e.target.value) || 0)}
            />
          </div>
        );
      default:
        return null;
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
            Regras de Qualidade de Dados
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Configure regras de validação para garantir a qualidade dos dados de produtos
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Nova Regra
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              {editingRule ? 'Editar Regra' : 'Nova Regra de Qualidade'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Código *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: sku_required"
                    value={formData.code}
                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    disabled={!!editingRule}
                  />
                </div>
                <div>
                  <label className="label">Nome *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: SKU Obrigatório"
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
                  placeholder="Descrição da regra"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo de Regra</label>
                  <select
                    className="input w-full"
                    value={formData.type}
                    onChange={e => {
                      setFormData(prev => ({
                        ...prev,
                        type: e.target.value,
                        parameters: {},
                      }));
                    }}
                  >
                    {ruleTypes.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Severidade</label>
                  <select
                    className="input w-full"
                    value={formData.severity}
                    onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                  >
                    {severities.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parameter fields based on type */}
              {renderParameterFields()}

              <div className="border-t border-dark-100 dark:border-dark-700 pt-4">
                <p className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-3">
                  Escopo da Regra (opcional)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Atributo</label>
                    <select
                      className="input w-full"
                      value={formData.attributeId}
                      onChange={e => setFormData(prev => ({ ...prev, attributeId: e.target.value }))}
                    >
                      <option value="">Todos os atributos</option>
                      {attributes.map(attr => (
                        <option key={attr.id} value={attr.id}>
                          {attr.name} ({attr.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Categoria</label>
                    <select
                      className="input w-full"
                      value={formData.categoryId}
                      onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    >
                      <option value="">Todas as categorias</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Família</label>
                    <select
                      className="input w-full"
                      value={formData.familyId}
                      onChange={e => setFormData(prev => ({ ...prev, familyId: e.target.value }))}
                    >
                      <option value="">Todas as famílias</option>
                      {families.map(fam => (
                        <option key={fam.id} value={fam.id}>
                          {fam.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Canal</label>
                    <select
                      className="input w-full"
                      value={formData.channelId}
                      onChange={e => setFormData(prev => ({ ...prev, channelId: e.target.value }))}
                    >
                      <option value="">Todos os canais</option>
                      {channels.map(ch => (
                        <option key={ch.id} value={ch.id}>
                          {ch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Mensagem de Erro Personalizada</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Ex: O campo SKU é obrigatório"
                  value={formData.errorMessage}
                  onChange={e => setFormData(prev => ({ ...prev, errorMessage: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-dark-300"
                />
                <label htmlFor="isActive" className="text-sm text-dark-700 dark:text-dark-300">
                  Regra ativa
                </label>
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

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="card p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-dark-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
              Nenhuma regra de qualidade criada
            </h3>
            <p className="text-dark-500 mb-4">
              Crie regras para validar e garantir a qualidade dos dados de produtos
            </p>
            <button onClick={handleCreate} className="btn-primary">
              Criar Regra
            </button>
          </div>
        ) : (
          rules.map(rule => {
            const SeverityIcon = severityIcons[rule.severity] || AlertCircle;
            const TypeIcon = typeIcons[rule.type] || ShieldCheck;
            const isExpanded = expandedRule === rule.id;

            return (
              <div key={rule.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${severityColors[rule.severity]}`}>
                        <SeverityIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-dark-900 dark:text-white">
                            {rule.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              rule.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400'
                            }`}
                          >
                            {rule.isActive ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <p className="text-sm text-dark-500 mt-0.5">
                          <code className="bg-dark-100 dark:bg-dark-900 px-1.5 py-0.5 rounded text-xs">
                            {rule.code}
                          </code>
                          {' '}• {ruleTypes.find(t => t.value === rule.type)?.label || rule.type}
                        </p>
                        {rule.description && (
                          <p className="text-sm text-dark-400 mt-1">{rule.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.isActive
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700'
                        }`}
                        title={rule.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {rule.isActive ? <Check size={18} /> : <X size={18} />}
                      </button>
                      <button
                        onClick={() => handleEdit(rule)}
                        className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                        className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Scope Tags */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {rule.attributeName && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                        <Tag size={12} />
                        {rule.attributeName}
                      </span>
                    )}
                    {rule.categoryName && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                        <Layers size={12} />
                        {rule.categoryName}
                      </span>
                    )}
                    {rule.familyName && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                        <Layers size={12} />
                        {rule.familyName}
                      </span>
                    )}
                    {rule.channelName && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                        <Radio size={12} />
                        {rule.channelName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="bg-dark-50 dark:bg-dark-900 p-4 border-t border-dark-100 dark:border-dark-700">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                          Parâmetros
                        </h4>
                        {Object.keys(rule.parameters || {}).length === 0 ? (
                          <p className="text-sm text-dark-500">Sem parâmetros</p>
                        ) : (
                          <div className="space-y-1">
                            {Object.entries(rule.parameters).map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="text-dark-500">{key}:</span>{' '}
                                <span className="text-dark-900 dark:text-white font-mono">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                          Mensagem de Erro
                        </h4>
                        <p className="text-sm text-dark-600 dark:text-dark-400">
                          {rule.errorMessage || 'Mensagem padrão do sistema'}
                        </p>
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
