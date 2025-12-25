'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const attributeTypes = [
  { value: 'TEXT', label: 'Texto' },
  { value: 'TEXTAREA', label: 'Área de Texto' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'BOOLEAN', label: 'Sim/Não' },
  { value: 'DATE', label: 'Data' },
  { value: 'DATETIME', label: 'Data e Hora' },
  { value: 'SELECT', label: 'Seleção' },
  { value: 'MULTISELECT', label: 'Seleção Múltipla' },
  { value: 'IMAGE', label: 'Imagem' },
  { value: 'FILE', label: 'Arquivo' },
  { value: 'PRICE', label: 'Preço' },
  { value: 'COLOR', label: 'Cor' },
  { value: 'URL', label: 'URL' },
];

export default function NewAttributePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'TEXT',
    isRequired: false,
    isUnique: false,
    isFilterable: false,
    isSearchable: false,
    isLocalizable: false,
    isScopable: false,
    useInGrid: true,
    defaultValue: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => api.createAttribute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      router.push('/attributes');
    },
    onError: (error: any) => {
      if (error.errors) {
        setErrors(error.errors);
      }
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/attributes"
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Novo Atributo
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Criar um novo atributo para produtos
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Informações Básicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Código *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className={`input ${errors.code ? 'border-red-500' : ''}`}
                placeholder="Ex: cor, tamanho, marca"
              />
              {errors.code && (
                <p className="text-sm text-red-500 mt-1">{errors.code}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Tipo *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input"
              >
                {attributeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Nome do atributo"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Descrição
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="input"
                placeholder="Descrição do atributo"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Valor Padrão
              </label>
              <input
                type="text"
                name="defaultValue"
                value={formData.defaultValue}
                onChange={handleChange}
                className="input"
                placeholder="Valor padrão (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Opções
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800">
              <input
                type="checkbox"
                name="isRequired"
                checked={formData.isRequired}
                onChange={handleChange}
                className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-dark-900 dark:text-white">Obrigatório</p>
                <p className="text-sm text-dark-500">Este campo deve ser preenchido</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800">
              <input
                type="checkbox"
                name="isUnique"
                checked={formData.isUnique}
                onChange={handleChange}
                className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-dark-900 dark:text-white">Único</p>
                <p className="text-sm text-dark-500">Valor não pode se repetir</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800">
              <input
                type="checkbox"
                name="isFilterable"
                checked={formData.isFilterable}
                onChange={handleChange}
                className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-dark-900 dark:text-white">Filtrável</p>
                <p className="text-sm text-dark-500">Pode ser usado como filtro</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800">
              <input
                type="checkbox"
                name="isSearchable"
                checked={formData.isSearchable}
                onChange={handleChange}
                className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-dark-900 dark:text-white">Pesquisável</p>
                <p className="text-sm text-dark-500">Incluído na busca de produtos</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800">
              <input
                type="checkbox"
                name="useInGrid"
                checked={formData.useInGrid}
                onChange={handleChange}
                className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-dark-900 dark:text-white">Exibir na Grid</p>
                <p className="text-sm text-dark-500">Mostrar na listagem de produtos</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800">
              <input
                type="checkbox"
                name="isLocalizable"
                checked={formData.isLocalizable}
                onChange={handleChange}
                className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-dark-900 dark:text-white">Localizável</p>
                <p className="text-sm text-dark-500">Valor varia por idioma</p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/attributes" className="btn-secondary">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Criar Atributo
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
