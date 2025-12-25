'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Palette,
  Ruler,
  Zap,
  Box,
  Tag,
} from 'lucide-react';

interface VariantAxis {
  id: string;
  code: string;
  name: string;
  description?: string;
  attributeId?: string;
  attributeCode?: string;
  attributeName?: string;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Attribute {
  id: string;
  code: string;
  name: string;
  type: string;
}

const axisIcons: Record<string, any> = {
  color: Palette,
  size: Ruler,
  voltage: Zap,
  default: Box,
};

const getAxisIcon = (code: string) => {
  const lowerCode = code.toLowerCase();
  if (lowerCode.includes('cor') || lowerCode.includes('color')) return Palette;
  if (lowerCode.includes('tamanho') || lowerCode.includes('size')) return Ruler;
  if (lowerCode.includes('volt') || lowerCode.includes('potencia')) return Zap;
  return Tag;
};

export default function VariantsPage() {
  const [axes, setAxes] = useState<VariantAxis[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAxis, setEditingAxis] = useState<VariantAxis | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    attributeId: '',
    position: 0,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [axesData, attrsData] = await Promise.all([
        api.getVariantAxes(),
        api.getAttributes(),
      ]);
      setAxes(axesData);
      setAttributes(attrsData.content || attrsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAxis(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      attributeId: '',
      position: axes.length,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (axis: VariantAxis) => {
    setEditingAxis(axis);
    setFormData({
      code: axis.code,
      name: axis.name,
      description: axis.description || '',
      attributeId: axis.attributeId || '',
      position: axis.position,
      isActive: axis.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Preencha código e nome do eixo');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSend = {
        ...formData,
        attributeId: formData.attributeId || undefined,
      };

      if (editingAxis) {
        await api.updateVariantAxis(editingAxis.id, dataToSend);
        toast.success('Eixo de variante atualizado');
      } else {
        await api.createVariantAxis(dataToSend as any);
        toast.success('Eixo de variante criado');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar eixo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este eixo de variante?')) {
      return;
    }

    try {
      await api.deleteVariantAxis(id);
      toast.success('Eixo de variante excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir eixo');
    }
  };

  const handleToggleActive = async (axis: VariantAxis) => {
    try {
      await api.updateVariantAxis(axis.id, { isActive: !axis.isActive });
      toast.success(`Eixo ${!axis.isActive ? 'ativado' : 'desativado'}`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar eixo');
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
            Eixos de Variantes
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Configure os eixos de variação para produtos (ex: Cor, Tamanho, Voltagem)
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Novo Eixo
        </button>
      </div>

      {/* Info Card */}
      <div className="card p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              O que são Eixos de Variantes?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Eixos de variantes definem as dimensões de variação de um produto configurável.
              Por exemplo, uma camiseta pode variar por <strong>Cor</strong> e <strong>Tamanho</strong>,
              enquanto um eletrodoméstico pode variar por <strong>Voltagem</strong>.
              Cada combinação de valores cria uma variante (SKU) única.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              {editingAxis ? 'Editar Eixo' : 'Novo Eixo de Variante'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Código *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: color"
                    value={formData.code}
                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    disabled={!!editingAxis}
                  />
                </div>
                <div>
                  <label className="label">Nome *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: Cor"
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
                  placeholder="Descrição do eixo de variação"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Atributo Associado</label>
                <select
                  className="input w-full"
                  value={formData.attributeId}
                  onChange={e => setFormData(prev => ({ ...prev, attributeId: e.target.value }))}
                >
                  <option value="">Nenhum (valores livres)</option>
                  {attributes
                    .filter(a => ['SELECT', 'MULTISELECT', 'TEXT'].includes(a.type))
                    .map(attr => (
                      <option key={attr.id} value={attr.id}>
                        {attr.name} ({attr.code}) - {attr.type}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-dark-500 mt-1">
                  Vincule a um atributo para usar seus valores como opções de variação
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Posição</label>
                  <input
                    type="number"
                    className="input w-full"
                    min={0}
                    value={formData.position}
                    onChange={e => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-dark-300"
                  />
                  <label htmlFor="isActive" className="text-sm text-dark-700 dark:text-dark-300">
                    Eixo ativo
                  </label>
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

      {/* Axes List */}
      <div className="space-y-4">
        {axes.length === 0 ? (
          <div className="card p-8 text-center">
            <Users className="w-12 h-12 text-dark-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-2">
              Nenhum eixo de variante criado
            </h3>
            <p className="text-dark-500 mb-4">
              Crie eixos como Cor, Tamanho ou Voltagem para criar variantes de produtos
            </p>
            <button onClick={handleCreate} className="btn-primary">
              Criar Eixo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {axes.map(axis => {
              const AxisIcon = getAxisIcon(axis.code);

              return (
                <div key={axis.id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                        <AxisIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-dark-900 dark:text-white">
                          {axis.name}
                        </h3>
                        <code className="text-xs bg-dark-100 dark:bg-dark-900 px-1.5 py-0.5 rounded">
                          {axis.code}
                        </code>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        axis.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400'
                      }`}
                    >
                      {axis.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {axis.description && (
                    <p className="text-sm text-dark-500 mb-3">{axis.description}</p>
                  )}

                  {axis.attributeId && (
                    <div className="text-xs text-dark-500 mb-3 flex items-center gap-1">
                      <Tag size={12} />
                      Vinculado a: <strong>{axis.attributeName || axis.attributeCode}</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-dark-100 dark:border-dark-700">
                    <span className="text-xs text-dark-400">Posição: {axis.position}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(axis)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          axis.isActive
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700'
                        }`}
                        title={axis.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {axis.isActive ? <Check size={16} /> : <X size={16} />}
                      </button>
                      <button
                        onClick={() => handleEdit(axis)}
                        className="p-1.5 text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(axis.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Usage Example */}
      {axes.length > 0 && (
        <div className="card p-4 mt-6">
          <h4 className="font-medium text-dark-900 dark:text-white mb-3">
            Como usar eixos de variantes
          </h4>
          <ol className="text-sm text-dark-600 dark:text-dark-400 space-y-2 list-decimal list-inside">
            <li>Acesse um produto e mude o tipo para <strong>Configurável</strong></li>
            <li>Selecione os eixos de variação (ex: Cor + Tamanho)</li>
            <li>Crie variantes com combinações dos valores (ex: Azul/P, Azul/M, Vermelho/P)</li>
            <li>Cada variante terá seu próprio SKU, preço e estoque</li>
          </ol>
        </div>
      )}
    </div>
  );
}
