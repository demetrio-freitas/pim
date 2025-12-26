'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings,
  Info,
  X,
  Check,
  Filter,
  Loader2,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAttributes } from '@/hooks/useAttributes';
import {
  TechnicalAttribute,
  AttributeValueInput,
  AttributeCategoryType,
  ATTRIBUTE_CATEGORY_LABELS,
  ATTRIBUTE_CATEGORY_ICONS,
  ATTRIBUTE_FIELD_TYPE_LABELS,
} from '@/types';

interface TechnicalSheetTabProps {
  productId?: string;
  initialValues?: AttributeValueInput[];
  onChange: (values: AttributeValueInput[]) => void;
}

export function TechnicalSheetTab({
  productId,
  initialValues = [],
  onChange,
}: TechnicalSheetTabProps) {
  const { availableAttributes, loading, createAttribute, isCustomAttribute } = useAttributes();

  const [selectedValues, setSelectedValues] = useState<AttributeValueInput[]>(initialValues);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AttributeCategoryType | 'all'>('all');
  const [showSelector, setShowSelector] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    hardware: true,
    vestuario: true,
    geral: true,
  });

  // Sincronizar com initialValues
  useEffect(() => {
    if (initialValues.length > 0) {
      setSelectedValues(initialValues);
    }
  }, [initialValues]);

  // IDs dos atributos já selecionados
  const selectedIds = useMemo(
    () => new Set(selectedValues.map((v) => v.attributeId)),
    [selectedValues]
  );

  // Atributos disponíveis para seleção (excluindo já selecionados)
  const availableToSelect = useMemo(() => {
    return availableAttributes.filter((attr) => !selectedIds.has(attr.id));
  }, [availableAttributes, selectedIds]);

  // Filtrar por busca e categoria
  const filteredAttributes = useMemo(() => {
    return availableToSelect.filter((attr) => {
      const matchesSearch =
        searchTerm.length < 2 ||
        attr.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attr.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || attr.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [availableToSelect, searchTerm, selectedCategory]);

  // Agrupar atributos por categoria
  const groupedAttributes = useMemo(() => {
    const groups: Record<string, TechnicalAttribute[]> = {};
    filteredAttributes.forEach((attr) => {
      if (!groups[attr.category]) {
        groups[attr.category] = [];
      }
      groups[attr.category].push(attr);
    });
    return groups;
  }, [filteredAttributes]);

  // Adicionar atributo
  const handleAddAttribute = (attributeId: string) => {
    if (selectedIds.has(attributeId)) return;

    const newValue: AttributeValueInput = {
      attributeId,
      value: '',
    };
    const updated = [...selectedValues, newValue];
    setSelectedValues(updated);
    onChange(updated);
  };

  // Atualizar valor
  const handleUpdateValue = (
    attributeId: string,
    value: string | number | boolean | string[]
  ) => {
    const updated = selectedValues.map((v) =>
      v.attributeId === attributeId ? { ...v, value } : v
    );
    setSelectedValues(updated);
    onChange(updated);
  };

  // Remover atributo
  const handleRemoveAttribute = (attributeId: string) => {
    const updated = selectedValues.filter((v) => v.attributeId !== attributeId);
    setSelectedValues(updated);
    onChange(updated);
  };

  // Toggle categoria expandida
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Obter atributo por ID
  const getAttributeById = (id: string): TechnicalAttribute | undefined => {
    return availableAttributes.find((a) => a.id === id);
  };

  // Criar novo atributo
  const handleCreateAttribute = async (newAttr: Omit<TechnicalAttribute, 'id' | 'createdAt'>) => {
    const created = await createAttribute(newAttr);
    if (created) {
      handleAddAttribute(created.id);
      setShowCreateModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <ClipboardList className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              Ficha Técnica
            </h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Defina especificações técnicas do produto. Use atributos pré-cadastrados
              ou crie novos personalizados. Estes dados aparecerão na página do produto
              e poderão ser usados como filtros.
            </p>
          </div>
        </div>
      </div>

      {/* Seletor de Atributos */}
      <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSelector(!showSelector)}
          className="w-full flex items-center justify-between p-4 bg-dark-50 dark:bg-dark-900 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-primary-600" />
            <div className="text-left">
              <h4 className="font-medium text-dark-900 dark:text-white">
                Adicionar Atributos
              </h4>
              <p className="text-sm text-dark-500">
                {availableToSelect.length} atributos disponíveis
              </p>
            </div>
          </div>
          {showSelector ? (
            <ChevronUp className="w-5 h-5 text-dark-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-dark-400" />
          )}
        </button>

        {showSelector && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700">
            {/* Busca e Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar atributos..."
                  className="w-full pl-10 pr-4 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value as AttributeCategoryType | 'all')
                }
                className="px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
              >
                <option value="all">Todas as categorias</option>
                {Object.entries(ATTRIBUTE_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {ATTRIBUTE_CATEGORY_ICONS[key as AttributeCategoryType]} {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Atributos por Categoria */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {Object.entries(groupedAttributes).length === 0 ? (
                <div className="text-center py-8 text-dark-500">
                  {searchTerm.length >= 2
                    ? 'Nenhum atributo encontrado'
                    : 'Digite pelo menos 2 caracteres para buscar'}
                </div>
              ) : (
                Object.entries(groupedAttributes).map(([category, attrs]) => (
                  <div
                    key={category}
                    className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-900 hover:bg-dark-100 dark:hover:bg-dark-800"
                    >
                      <span className="flex items-center gap-2 font-medium text-sm">
                        <span>
                          {ATTRIBUTE_CATEGORY_ICONS[category as AttributeCategoryType]}
                        </span>
                        {ATTRIBUTE_CATEGORY_LABELS[category as AttributeCategoryType]}
                        <span className="text-dark-400 font-normal">
                          ({attrs.length})
                        </span>
                      </span>
                      {expandedCategories[category] ? (
                        <ChevronUp className="w-4 h-4 text-dark-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-dark-400" />
                      )}
                    </button>

                    {expandedCategories[category] && (
                      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {attrs.map((attr) => (
                          <button
                            key={attr.id}
                            type="button"
                            onClick={() => handleAddAttribute(attr.id)}
                            className="flex items-center gap-2 p-2 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 text-left transition-colors group"
                          >
                            <Plus className="w-4 h-4 text-dark-400 group-hover:text-primary-600" />
                            <span className="flex-1 text-sm text-dark-700 dark:text-dark-300 group-hover:text-primary-700 dark:group-hover:text-primary-400">
                              {attr.label}
                            </span>
                            {attr.unit && (
                              <span className="text-xs text-dark-400 bg-dark-100 dark:bg-dark-700 px-1.5 py-0.5 rounded">
                                {attr.unit}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Botão Criar Novo */}
            <div className="mt-4 pt-4 border-t border-dark-200 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Criar Novo Atributo Personalizado
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Atributos Selecionados */}
      {selectedValues.length > 0 && (
        <div className="border border-dark-200 dark:border-dark-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-600" />
            Especificações do Produto
            <span className="text-sm font-normal text-dark-500">
              ({selectedValues.length} atributos)
            </span>
          </h3>

          <div className="space-y-4">
            {selectedValues.map((attrValue) => {
              const attribute = getAttributeById(attrValue.attributeId);
              if (!attribute) return null;

              return (
                <AttributeValueEditor
                  key={attribute.id}
                  attribute={attribute}
                  value={attrValue.value}
                  onChange={(value) => handleUpdateValue(attribute.id, value)}
                  onRemove={() => handleRemoveAttribute(attribute.id)}
                  isCustom={isCustomAttribute(attribute.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Preview */}
      {selectedValues.length > 0 && (
        <div className="border border-dark-200 dark:border-dark-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary-600" />
            Preview da Ficha Técnica
          </h3>

          <div className="bg-dark-50 dark:bg-dark-900 rounded-lg p-4">
            <h4 className="font-semibold text-dark-800 dark:text-dark-200 mb-3 pb-2 border-b border-dark-200 dark:border-dark-700">
              📋 Especificações Técnicas
            </h4>
            <div className="space-y-2">
              {selectedValues
                .filter((v) => v.value !== '' && v.value !== undefined)
                .map((attrValue) => {
                  const attribute = getAttributeById(attrValue.attributeId);
                  if (!attribute) return null;

                  const displayValue = Array.isArray(attrValue.value)
                    ? attrValue.value.join(', ')
                    : typeof attrValue.value === 'boolean'
                    ? attrValue.value
                      ? 'Sim'
                      : 'Não'
                    : attrValue.value;

                  return (
                    <div
                      key={attribute.id}
                      className="flex justify-between py-1.5 border-b border-dark-100 dark:border-dark-800 last:border-0"
                    >
                      <span className="text-dark-600 dark:text-dark-400">
                        {attribute.label}:
                      </span>
                      <span className="font-medium text-dark-900 dark:text-dark-100">
                        {displayValue}
                        {attribute.unit && ` ${attribute.unit}`}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Atributo */}
      {showCreateModal && (
        <CreateAttributeModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateAttribute}
        />
      )}
    </div>
  );
}

// ==================== COMPONENTE: AttributeValueEditor ====================

interface AttributeValueEditorProps {
  attribute: TechnicalAttribute;
  value: string | number | boolean | string[];
  onChange: (value: string | number | boolean | string[]) => void;
  onRemove: () => void;
  isCustom: boolean;
}

function AttributeValueEditor({
  attribute,
  value,
  onChange,
  onRemove,
  isCustom,
}: AttributeValueEditorProps) {
  const renderInput = () => {
    switch (attribute.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Digite ${attribute.label.toLowerCase()}...`}
            className="flex-1 px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
          />
        );

      case 'number':
        return (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              value={value as number}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="flex-1 px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
            />
            {attribute.unit && (
              <span className="text-sm text-dark-500 bg-dark-100 dark:bg-dark-700 px-2 py-1 rounded">
                {attribute.unit}
              </span>
            )}
          </div>
        );

      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
          >
            <option value="">Selecione...</option>
            {attribute.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
                {attribute.unit && ` ${attribute.unit}`}
              </option>
            ))}
          </select>
        );

      case 'multi-select':
        const selectedOptions = Array.isArray(value) ? value : [];
        return (
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((opt) => (
                <span
                  key={opt}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-sm"
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() =>
                      onChange(selectedOptions.filter((o) => o !== opt))
                    }
                    className="hover:text-primary-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !selectedOptions.includes(e.target.value)) {
                  onChange([...selectedOptions, e.target.value]);
                }
              }}
              className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
            >
              <option value="">Adicionar opção...</option>
              {attribute.options
                ?.filter((opt) => !selectedOptions.includes(opt))
                .map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`attr_${attribute.id}`}
                checked={value === true}
                onChange={() => onChange(true)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">Sim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`attr_${attribute.id}`}
                checked={value === false}
                onChange={() => onChange(false)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">Não</span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <label className="font-medium text-dark-800 dark:text-dark-200">
            {attribute.label}
            {attribute.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-dark-400">
              {ATTRIBUTE_FIELD_TYPE_LABELS[attribute.type]}
            </span>
            {attribute.unit && (
              <span className="text-xs text-dark-400">• {attribute.unit}</span>
            )}
            {isCustom && (
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                Personalizado
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          title="Remover atributo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {renderInput()}
    </div>
  );
}

// ==================== COMPONENTE: CreateAttributeModal ====================

interface CreateAttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (attribute: Omit<TechnicalAttribute, 'id' | 'createdAt'>) => void;
}

function CreateAttributeModal({
  isOpen,
  onClose,
  onCreate,
}: CreateAttributeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'text' as TechnicalAttribute['type'],
    unit: '',
    category: 'outro' as AttributeCategoryType,
    options: '',
    visibleFrontend: true,
    filterable: true,
    comparable: true,
    searchable: false,
    required: false,
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.label.trim()) {
      setError('Nome técnico e nome de exibição são obrigatórios');
      return;
    }

    // Validar nome técnico (slug)
    const slugRegex = /^[a-z][a-z0-9_]*$/;
    if (!slugRegex.test(formData.name)) {
      setError(
        'Nome técnico deve começar com letra minúscula e conter apenas letras, números e underscores'
      );
      return;
    }

    const options =
      formData.type === 'select' || formData.type === 'multi-select'
        ? formData.options
            .split('\n')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    onCreate({
      name: formData.name,
      label: formData.label,
      type: formData.type,
      unit: formData.unit || undefined,
      category: formData.category,
      options,
      visibleFrontend: formData.visibleFrontend,
      filterable: formData.filterable,
      comparable: formData.comparable,
      searchable: formData.searchable,
      required: formData.required,
      displayOrder: 999,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-200 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
            Criar Novo Atributo
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-dark-100 dark:hover:bg-dark-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Nome Técnico (slug) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                  })
                }
                placeholder="ex: tamanho_tela"
                className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Nome de Exibição *
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="ex: Tamanho da Tela"
                className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Tipo de Campo
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as TechnicalAttribute['type'],
                  })
                }
                className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
              >
                {Object.entries(ATTRIBUTE_FIELD_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as AttributeCategoryType,
                  })
                }
                className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
              >
                {Object.entries(ATTRIBUTE_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {ATTRIBUTE_CATEGORY_ICONS[key as AttributeCategoryType]} {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
              Unidade de Medida (opcional)
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="ex: cm, kg, polegadas"
              className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
            />
          </div>

          {(formData.type === 'select' || formData.type === 'multi-select') && (
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Opções (uma por linha)
              </label>
              <textarea
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                rows={4}
                className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-dark-700 dark:text-dark-300">
              Configurações
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'visibleFrontend', label: 'Visível no frontend' },
                { key: 'filterable', label: 'Usar como filtro' },
                { key: 'comparable', label: 'Comparável' },
                { key: 'searchable', label: 'Pesquisável' },
                { key: 'required', label: 'Obrigatório' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[key as keyof typeof formData] as boolean}
                    onChange={(e) =>
                      setFormData({ ...formData, [key]: e.target.checked })
                    }
                    className="w-4 h-4 text-primary-600 rounded border-dark-300"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-dark-200 dark:border-dark-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Criar Atributo
          </button>
        </div>
      </div>
    </div>
  );
}
