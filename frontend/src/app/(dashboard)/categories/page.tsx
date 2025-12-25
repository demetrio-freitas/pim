'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import { CategoryTreeNode, ApiError } from '@/types';
import {
  Plus,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Edit,
  Trash2,
  Loader2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function CategoryTreeItem({
  category,
  level = 0,
  onDelete,
  deletingId,
}: {
  category: CategoryTreeNode;
  level?: number;
  onDelete: (category: CategoryTreeNode) => void;
  deletingId: string | null;
}) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = category.children && category.children.length > 0;
  const isDeleting = deletingId === category.id;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3 hover:bg-dark-50 dark:hover:bg-dark-800 rounded-lg group',
          !category.isActive && 'opacity-50'
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'p-0.5 rounded hover:bg-dark-200 dark:hover:bg-dark-700',
            !hasChildren && 'invisible'
          )}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-dark-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-dark-500" />
          )}
        </button>

        {expanded && hasChildren ? (
          <FolderOpen className="w-5 h-5 text-primary-500" />
        ) : (
          <Folder className="w-5 h-5 text-dark-400" />
        )}

        <Link
          href={`/categories/${category.id}`}
          className="flex-1 text-dark-900 dark:text-white hover:text-primary-600 font-medium"
        >
          {category.name}
        </Link>

        {/* Product Count Badge */}
        {category.productCount !== undefined && category.productCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium">
            <Package className="w-3 h-3" />
            {category.productCount}
          </span>
        )}

        <span className="text-xs text-dark-400 font-mono">{category.code}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/categories/${category.id}/edit`}
            className="p-1.5 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
          >
            <Edit className="w-3.5 h-3.5 text-dark-500" />
          </Link>
          <button
            onClick={() => onDelete(category)}
            disabled={isDeleting}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            )}
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              level={level + 1}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: tree, isLoading } = useQuery({
    queryKey: ['category-tree'],
    queryFn: () => api.getCategoryTree(),
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => api.deleteCategory(categoryId),
    onSuccess: () => {
      showSuccess('Categoria excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['category-tree'] });
    },
    onError: (error: ApiError) => {
      showError(error);
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleDelete = (category: CategoryTreeNode) => {
    const hasChildren = category.children && category.children.length > 0;
    const message = hasChildren
      ? `A categoria "${category.name}" possui subcategorias. Deseja excluí-la e todas as suas subcategorias?`
      : `Deseja realmente excluir a categoria "${category.name}"?`;

    if (confirm(message)) {
      setDeletingId(category.id);
      deleteMutation.mutate(category.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Categorias</h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Organize seus produtos em categorias hierárquicas
          </p>
        </div>
        <Link href="/categories/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Link>
      </div>

      {/* Tree */}
      <div className="card">
        <div className="p-4 border-b border-dark-100 dark:border-dark-800">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-dark-500" />
            <h2 className="font-semibold text-dark-900 dark:text-white">
              Árvore de Categorias
            </h2>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : tree && tree.length > 0 ? (
            <div className="space-y-1">
              {tree.map((category: CategoryTreeNode) => (
                <CategoryTreeItem
                  key={category.id}
                  category={category}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-dark-500 dark:text-dark-400">
              <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma categoria encontrada</p>
              <Link
                href="/categories/new"
                className="text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block"
              >
                Criar primeira categoria
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
