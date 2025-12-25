'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Check,
  Loader2,
  Filter,
  Package,
} from 'lucide-react';

interface ExportField {
  value: string;
  label: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PENDING_REVIEW', label: 'Pendente' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'ARCHIVED', label: 'Arquivado' },
];

export default function ExportPage() {
  const [format, setFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<ExportField[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fieldsData, categoriesData] = await Promise.all([
        api.getExportFields(),
        api.getCategories(),
      ]);

      setAvailableFields(fieldsData);
      setSelectedFields(fieldsData.map((f: ExportField) => f.value));
      setCategories(categoriesData.content || categoriesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(availableFields.map(f => f.value));
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Selecione pelo menos um campo para exportar');
      return;
    }

    setIsExporting(true);

    try {
      const blob = await api.exportProducts({
        format,
        fields: selectedFields,
        status: status || undefined,
        categoryId: categoryId || undefined,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Exportação concluída!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar produtos');
    } finally {
      setIsExporting(false);
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
          Exportar Produtos
        </h1>
        <p className="text-dark-500 dark:text-dark-400 mt-1">
          Exporte seus produtos para CSV ou Excel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Filters */}
        <div className="lg:col-span-1 space-y-6">
          {/* Format Selection */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-dark-900 dark:text-white mb-3">
              Formato
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('XLSX')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  format === 'XLSX'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                }`}
              >
                <FileSpreadsheet size={20} />
                <span className="font-medium">Excel</span>
              </button>
              <button
                onClick={() => setFormat('CSV')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  format === 'CSV'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                }`}
              >
                <FileText size={20} />
                <span className="font-medium">CSV</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-dark-900 dark:text-white mb-3 flex items-center gap-2">
              <Filter size={16} />
              Filtros
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="input w-full"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Categoria</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting || selectedFields.length === 0}
            className="btn-primary w-full py-3"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Exportar {format}
              </>
            )}
          </button>
        </div>

        {/* Right Column - Field Selection */}
        <div className="lg:col-span-2">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Package size={16} />
                Campos para Exportar
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllFields}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Selecionar todos
                </button>
                <span className="text-dark-300">|</span>
                <button
                  onClick={deselectAllFields}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableFields.map(field => (
                <button
                  key={field.value}
                  onClick={() => toggleField(field.value)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                    selectedFields.includes(field.value)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center ${
                      selectedFields.includes(field.value)
                        ? 'bg-primary-500 text-white'
                        : 'border border-dark-300 dark:border-dark-600'
                    }`}
                  >
                    {selectedFields.includes(field.value) && <Check size={14} />}
                  </div>
                  <span className="text-sm text-dark-700 dark:text-dark-300">
                    {field.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-dark-200 dark:border-dark-700">
              <p className="text-sm text-dark-500">
                {selectedFields.length} de {availableFields.length} campos selecionados
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
              Dicas de Exportação
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Excel (.xlsx) é ideal para edição e reimportação</li>
              <li>• CSV é melhor para integração com outros sistemas</li>
              <li>• Use filtros para exportar apenas os produtos necessários</li>
              <li>• Campos como "Categorias" são exportados separados por ";"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
