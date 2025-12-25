'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  Tags,
  Settings,
  GripVertical,
} from 'lucide-react';

interface Family {
  id: string;
  code: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  productCount: number;
  attributeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FamilyAttribute {
  id: string;
  attributeId: string;
  attributeCode: string;
  attributeName: string;
  isRequired: boolean;
  weight: number;
  position: number;
  groupCode?: string;
  defaultValue?: string;
  placeholder?: string;
  helpText?: string;
}

interface Attribute {
  id: string;
  code: string;
  name: string;
  type: string;
  group?: string;
}

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [familyAttributes, setFamilyAttributes] = useState<FamilyAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    imageUrl: '',
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Attribute form state
  const [attrFormData, setAttrFormData] = useState({
    attributeId: '',
    isRequired: false,
    weight: 1,
    position: 0,
    groupCode: '',
    defaultValue: '',
    placeholder: '',
    helpText: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [familiesData, attrsData] = await Promise.all([
        api.getFamilies(),
        api.getAttributes(),
      ]);
      setFamilies(familiesData);
      setAttributes(attrsData.content || attrsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFamilyAttributes = async (familyId: string) => {
    setLoadingAttributes(true);
    try {
      const attrs = await api.getFamilyAttributes(familyId);
      setFamilyAttributes(attrs);
    } catch (error) {
      console.error('Error loading family attributes:', error);
      toast.error('Erro ao carregar atributos');
    } finally {
      setLoadingAttributes(false);
    }
  };

  const handleCreate = () => {
    setEditingFamily(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      imageUrl: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (family: Family) => {
    setEditingFamily(family);
    setFormData({
      code: family.code,
      name: family.name,
      description: family.description || '',
      imageUrl: family.imageUrl || '',
      isActive: family.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Preencha código e nome da família');
      return;
    }

    setIsSaving(true);
    try {
      if (editingFamily) {
        await api.updateFamily(editingFamily.id, formData);
        toast.success('Família atualizada');
      } else {
        await api.createFamily(formData);
        toast.success('Família criada');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar família');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta família?')) {
      return;
    }

    try {
      await api.deleteFamily(id);
      toast.success('Família excluída');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir família');
    }
  };

  const handleToggleExpand = async (family: Family) => {
    if (expandedFamily === family.id) {
      setExpandedFamily(null);
      setFamilyAttributes([]);
    } else {
      setExpandedFamily(family.id);
      await loadFamilyAttributes(family.id);
    }
  };

  const handleAddAttribute = (family: Family) => {
    setSelectedFamily(family);
    setAttrFormData({
      attributeId: '',
      isRequired: false,
      weight: 1,
      position: familyAttributes.length,
      groupCode: '',
      defaultValue: '',
      placeholder: '',
      helpText: '',
    });
    setShowAttributeModal(true);
  };

  const handleSaveAttribute = async () => {
    if (!attrFormData.attributeId || !selectedFamily) {
      toast.error('Selecione um atributo');
      return;
    }

    setIsSaving(true);
    try {
      await api.addFamilyAttribute(selectedFamily.id, attrFormData);
      toast.success('Atributo adicionado');
      setShowAttributeModal(false);
      await loadFamilyAttributes(selectedFamily.id);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar atributo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAttribute = async (familyId: string, attributeId: string) => {
    if (!confirm('Remover este atributo da família?')) return;

    try {
      await api.removeFamilyAttribute(familyId, attributeId);
      toast.success('Atributo removido');
      await loadFamilyAttributes(familyId);
      loadData();
    } catch (error) {
      toast.error('Erro ao remover atributo');
    }
  };

  const handleToggleRequired = async (familyId: string, attr: FamilyAttribute) => {
    try {
      await api.updateFamilyAttribute(familyId, attr.attributeId, {
        isRequired: !attr.isRequired,
      });
      await loadFamilyAttributes(familyId);
    } catch (error) {
      toast.error('Erro ao atualizar atributo');
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
            Famílias de Produtos
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Agrupe produtos com atributos e estruturas similares
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Nova Família
        </button>
      </div>

      {/* Family Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              {editingFamily ? 'Editar Família' : 'Nova Família'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Código *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: eletronicos"
                    value={formData.code}
                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    disabled={!!editingFamily}
                  />
                </div>
                <div>
                  <label className="label">Nome *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: Eletrônicos"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  placeholder="Descrição da família"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">URL da Imagem</label>
                <input
                  type="url"
                  className="input w-full"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
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
                  Família ativa
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

      {/* Attribute Modal */}
      {showAttributeModal && selectedFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Adicionar Atributo à Família
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Atributo *</label>
                <select
                  className="input w-full"
                  value={attrFormData.attributeId}
                  onChange={e => setAttrFormData(prev => ({ ...prev, attributeId: e.target.value }))}
                >
                  <option value="">Selecione um atributo</option>
                  {attributes
                    .filter(a => !familyAttributes.find(fa => fa.attributeId === a.id))
                    .map(attr => (
                      <option key={attr.id} value={attr.id}>
                        {attr.name} ({attr.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={attrFormData.isRequired}
                    onChange={e => setAttrFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                    className="rounded border-dark-300"
                  />
                  <label htmlFor="isRequired" className="text-sm text-dark-700 dark:text-dark-300">
                    Obrigatório
                  </label>
                </div>
                <div>
                  <label className="label">Peso</label>
                  <input
                    type="number"
                    className="input w-full"
                    min={0}
                    max={100}
                    value={attrFormData.weight}
                    onChange={e => setAttrFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Grupo</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Ex: general, marketing"
                  value={attrFormData.groupCode}
                  onChange={e => setAttrFormData(prev => ({ ...prev, groupCode: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Valor Padrão</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Valor padrão para novos produtos"
                  value={attrFormData.defaultValue}
                  onChange={e => setAttrFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Texto de Ajuda</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Instruções para preenchimento"
                  value={attrFormData.helpText}
                  onChange={e => setAttrFormData(prev => ({ ...prev, helpText: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAttributeModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleSaveAttribute} disabled={isSaving} className="btn-primary">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Adicionar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Families List */}
      <div className="space-y-4">
        {families.length === 0 ? (
          <div className="card p-8 text-center">
            <Layers className="w-12 h-12 text-dark-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
              Nenhuma família criada
            </h3>
            <p className="text-dark-500 mb-4">
              Crie famílias para agrupar produtos com atributos similares
            </p>
            <button onClick={handleCreate} className="btn-primary">
              Criar Família
            </button>
          </div>
        ) : (
          families.map(family => {
            const isExpanded = expandedFamily === family.id;

            return (
              <div key={family.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {family.imageUrl ? (
                        <img
                          src={family.imageUrl}
                          alt={family.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                          <Layers className="w-6 h-6 text-primary-500" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-dark-900 dark:text-white">
                            {family.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              family.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400'
                            }`}
                          >
                            {family.isActive ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <p className="text-sm text-dark-500 mt-0.5">
                          <code className="bg-dark-100 dark:bg-dark-900 px-1.5 py-0.5 rounded text-xs">
                            {family.code}
                          </code>
                        </p>
                        {family.description && (
                          <p className="text-sm text-dark-400 mt-1">{family.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(family)}
                        className="p-2 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(family.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleToggleExpand(family)}
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
                        <strong>{family.productCount}</strong> produtos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tags size={16} className="text-dark-400" />
                      <span className="text-sm text-dark-600 dark:text-dark-300">
                        <strong>{family.attributeCount}</strong> atributos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded: Attributes */}
                {isExpanded && (
                  <div className="bg-dark-50 dark:bg-dark-900 p-4 border-t border-dark-100 dark:border-dark-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300">
                        Atributos da Família
                      </h4>
                      <button
                        onClick={() => handleAddAttribute(family)}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Adicionar
                      </button>
                    </div>

                    {loadingAttributes ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-dark-400" />
                      </div>
                    ) : familyAttributes.length === 0 ? (
                      <p className="text-sm text-dark-500 py-4 text-center">
                        Nenhum atributo configurado
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {familyAttributes.map(attr => (
                          <div
                            key={attr.id}
                            className="flex items-center justify-between bg-white dark:bg-dark-800 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical size={14} className="text-dark-300" />
                              <div>
                                <p className="text-sm font-medium text-dark-900 dark:text-white">
                                  {attr.attributeName}
                                </p>
                                <p className="text-xs text-dark-500">
                                  {attr.attributeCode}
                                  {attr.groupCode && ` • ${attr.groupCode}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleRequired(family.id, attr)}
                                className={`px-2 py-1 text-xs rounded-full ${
                                  attr.isRequired
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-dark-100 text-dark-500 dark:bg-dark-700'
                                }`}
                              >
                                {attr.isRequired ? 'Obrigatório' : 'Opcional'}
                              </button>
                              <span className="text-xs text-dark-400">
                                Peso: {attr.weight}
                              </span>
                              <button
                                onClick={() => handleRemoveAttribute(family.id, attr.attributeId)}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
