'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', params.id],
    queryFn: () => api.getCategory(params.id as string),
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        isActive: category.isActive ?? true,
      });
    }
  }, [category]);

  const mutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.updateCategory(params.id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category', params.id] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-tree'] });
      router.push(`/categories/${params.id}`);
    },
    onError: (error: any) => {
      if (error.errors) {
        setErrors(error.errors);
      }
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-500 dark:text-dark-400">Categoria não encontrada</p>
        <Link href="/categories" className="btn-primary mt-4 inline-block">
          Voltar para Categorias
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/categories/${params.id}`}
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Editar Categoria
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1 font-mono">
            {category.code}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Informações da Categoria
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Nome da categoria"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Descrição
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="input"
                placeholder="Descrição da categoria"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
              <label
                htmlFor="isActive"
                className="text-sm font-medium text-dark-700 dark:text-dark-300"
              >
                Categoria ativa
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href={`/categories/${params.id}`} className="btn-secondary">
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
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
