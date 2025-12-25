'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Folder,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: category, isLoading, error } = useQuery({
    queryKey: ['category', params.id],
    queryFn: () => api.getCategory(params.id as string),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCategory(params.id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-tree'] });
      router.push('/categories');
    },
  });

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      setIsDeleting(true);
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !category) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/categories"
            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              {category.name}
            </h1>
            <p className="text-dark-500 dark:text-dark-400 mt-1 font-mono">
              {category.code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/categories/new?parent=${params.id}`}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Subcategoria
          </Link>
          <Link href={`/categories/${params.id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-secondary text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Informações
          </h2>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-dark-500 dark:text-dark-400">Status</span>
              <p className={cn(
                'font-medium',
                category.isActive ? 'text-green-600' : 'text-red-600'
              )}>
                {category.isActive ? 'Ativa' : 'Inativa'}
              </p>
            </div>
            <div>
              <span className="text-sm text-dark-500 dark:text-dark-400">Nível</span>
              <p className="text-dark-900 dark:text-white">{category.level}</p>
            </div>
            <div>
              <span className="text-sm text-dark-500 dark:text-dark-400">Posição</span>
              <p className="text-dark-900 dark:text-white">{category.position}</p>
            </div>
            {category.description && (
              <div>
                <span className="text-sm text-dark-500 dark:text-dark-400">Descrição</span>
                <p className="text-dark-700 dark:text-dark-300">{category.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
              Subcategorias
            </h2>
            <Link
              href={`/categories/new?parent=${params.id}`}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Adicionar
            </Link>
          </div>
          {category.children && category.children.length > 0 ? (
            <div className="space-y-2">
              {category.children.map((child: any) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-dark-50 dark:hover:bg-dark-800 rounded-lg"
                >
                  <Folder className="w-5 h-5 text-dark-400" />
                  <div className="flex-1">
                    <p className="font-medium text-dark-900 dark:text-white">
                      {child.name}
                    </p>
                    <p className="text-xs text-dark-400 font-mono">{child.code}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-dark-400 italic text-center py-4">
              Nenhuma subcategoria
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
