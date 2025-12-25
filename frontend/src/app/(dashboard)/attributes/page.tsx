'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Tag,
  Edit,
  Trash2,
  Check,
  X,
  Filter,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';

const attributeTypeLabels: Record<string, string> = {
  TEXT: 'Texto',
  TEXTAREA: 'Área de Texto',
  NUMBER: 'Número',
  DECIMAL: 'Decimal',
  BOOLEAN: 'Sim/Não',
  DATE: 'Data',
  DATETIME: 'Data e Hora',
  SELECT: 'Seleção',
  MULTISELECT: 'Seleção Múltipla',
  IMAGE: 'Imagem',
  FILE: 'Arquivo',
  PRICE: 'Preço',
  COLOR: 'Cor',
  URL: 'URL',
};

export default function AttributesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: attributes, isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => api.getAttributes(),
  });

  const { data: groups } = useQuery({
    queryKey: ['attribute-groups'],
    queryFn: () => api.getAttributeGroups(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAttribute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o atributo "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredAttributes = attributes?.filter((attr: any) =>
    attr.name.toLowerCase().includes(search.toLowerCase()) ||
    attr.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Atributos</h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Gerencie os atributos dos produtos
          </p>
        </div>
        <Link href="/attributes/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Novo Atributo
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Buscar atributos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Groups Summary */}
      {groups && groups.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {groups.map((group: any) => (
            <div key={group.id} className="card p-4">
              <p className="text-sm text-dark-500 dark:text-dark-400">{group.name}</p>
              <p className="text-2xl font-bold text-dark-900 dark:text-white">
                {group.attributeCount}
              </p>
              <p className="text-xs text-dark-400">atributos</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-50 dark:bg-dark-800">
              <tr>
                <th className="table-header">Atributo</th>
                <th className="table-header">Código</th>
                <th className="table-header">Tipo</th>
                <th className="table-header text-center">Obrigatório</th>
                <th className="table-header text-center">Filtrável</th>
                <th className="table-header text-center">Pesquisável</th>
                <th className="table-header text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredAttributes && filteredAttributes.length > 0 ? (
                filteredAttributes.map((attr: any) => (
                  <tr key={attr.id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <Tag className="w-5 h-5 text-dark-400" />
                        <span className="font-medium text-dark-900 dark:text-white">
                          {attr.name}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-sm text-dark-500">
                      {attr.code}
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-1 bg-dark-100 dark:bg-dark-800 rounded text-sm">
                        {attributeTypeLabels[attr.type] || attr.type}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      {attr.isRequired ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-dark-300 mx-auto" />
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {attr.isFilterable ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-dark-300 mx-auto" />
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {attr.isSearchable ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-dark-300 mx-auto" />
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/attributes/${attr.id}/edit`}
                          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-dark-500" />
                        </Link>
                        <button
                          onClick={() => handleDelete(attr.id, attr.name)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Tag className="w-12 h-12 mx-auto mb-3 text-dark-300" />
                    <p className="text-dark-500 dark:text-dark-400">
                      Nenhum atributo encontrado
                    </p>
                    <Link
                      href="/attributes/new"
                      className="text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block"
                    >
                      Criar primeiro atributo
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
