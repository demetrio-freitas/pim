'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Image as ImageIcon,
  FileVideo,
  FileText,
  Folder,
  Grid,
  List,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Download,
  Eye,
  X,
  Check,
  HardDrive,
  Loader2,
  ChevronRight,
  FolderPlus,
  Tags,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
  tags: string[];
  folder: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
  documentCount: number;
}

const mediaTypes = [
  { value: '', label: 'Todos os tipos' },
  { value: 'IMAGE', label: 'Imagens' },
  { value: 'VIDEO', label: 'Vídeos' },
  { value: 'DOCUMENT', label: 'Documentos' },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string) {
  switch (type) {
    case 'IMAGE':
      return ImageIcon;
    case 'VIDEO':
      return FileVideo;
    case 'DOCUMENT':
      return FileText;
    default:
      return FileText;
  }
}

export default function MediaPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Queries
  const { data: mediaData, isLoading } = useQuery({
    queryKey: ['media', { search, type: typeFilter, folder: selectedFolder }],
    queryFn: () => api.getMediaLibrary({ search, type: typeFilter || undefined, folder: selectedFolder || undefined }),
  });

  const { data: folders } = useQuery({
    queryKey: ['media-folders'],
    queryFn: () => api.getMediaFolders(),
  });

  const { data: storageStats } = useQuery({
    queryKey: ['storage-stats'],
    queryFn: () => api.getStorageStats(),
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const result = await api.uploadMediaToLibrary(files[i], selectedFolder || undefined);
        results.push(result);
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
      setShowUploadModal(false);
      setUploadProgress(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMediaFromLibrary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
      setSelectedItems([]);
    },
  });

  // Handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      uploadMutation.mutate(files);
    }
  }, [uploadMutation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadMutation.mutate(files);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (confirm(`Deseja excluir ${selectedItems.length} item(s)?`)) {
      selectedItems.forEach(id => deleteMutation.mutate(id));
    }
  };

  const media: MediaItem[] = mediaData?.content || mediaData || [];
  const stats: StorageStats = storageStats || { totalFiles: 0, totalSize: 0, imageCount: 0, videoCount: 0, documentCount: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Biblioteca de Mídia
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Gerencie imagens, vídeos e documentos do seu catálogo
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </button>
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <HardDrive className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Armazenamento</p>
              <p className="text-lg font-semibold text-dark-900 dark:text-white">
                {formatFileSize(stats.totalSize)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Grid className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Total de Arquivos</p>
              <p className="text-lg font-semibold text-dark-900 dark:text-white">
                {stats.totalFiles}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ImageIcon className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Imagens</p>
              <p className="text-lg font-semibold text-dark-900 dark:text-white">
                {stats.imageCount}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileVideo className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Vídeos</p>
              <p className="text-lg font-semibold text-dark-900 dark:text-white">
                {stats.videoCount}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Documentos</p>
              <p className="text-lg font-semibold text-dark-900 dark:text-white">
                {stats.documentCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Sidebar - Folders */}
        <div className="w-64 flex-shrink-0">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-dark-900 dark:text-white">Pastas</h3>
              <button className="p-1 hover:bg-dark-100 dark:hover:bg-dark-800 rounded">
                <FolderPlus className="w-4 h-4 text-dark-500" />
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                  selectedFolder === null
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'hover:bg-dark-100 dark:hover:bg-dark-800'
                )}
              >
                <Folder className="w-4 h-4" />
                <span className="text-sm">Todos os arquivos</span>
              </button>
              {(folders || []).map((folder: string) => (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedFolder === folder
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'hover:bg-dark-100 dark:hover:bg-dark-800'
                  )}
                >
                  <Folder className="w-4 h-4" />
                  <span className="text-sm">{folder}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar arquivos..."
                  className="input pl-10"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input w-40"
              >
                {mediaTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 border-l border-dark-200 dark:border-dark-700 pl-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded-lg',
                    viewMode === 'grid'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                      : 'hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500'
                  )}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-lg',
                    viewMode === 'list'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                      : 'hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500'
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-200 dark:border-dark-700">
                <span className="text-sm text-dark-600 dark:text-dark-400">
                  {selectedItems.length} selecionado(s)
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
                <button
                  onClick={() => setSelectedItems([])}
                  className="text-sm text-dark-500 hover:text-dark-700"
                >
                  Limpar seleção
                </button>
              </div>
            )}
          </div>

          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'min-h-[400px] rounded-xl transition-colors',
              dragActive
                ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-dashed border-primary-500'
                : ''
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : media.length === 0 ? (
              <div className="card p-12 text-center">
                <Upload className="w-12 h-12 mx-auto text-dark-400 mb-4" />
                <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">
                  Nenhum arquivo encontrado
                </h3>
                <p className="text-dark-500 dark:text-dark-400 mb-4">
                  Arraste arquivos aqui ou clique para fazer upload
                </p>
                <label className="btn-primary cursor-pointer inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  Selecionar Arquivos
                </label>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {media.map((item) => {
                  const Icon = getFileIcon(item.type);
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'card group relative overflow-hidden cursor-pointer transition-all',
                        isSelected && 'ring-2 ring-primary-500'
                      )}
                      onClick={() => toggleSelection(item.id)}
                      onDoubleClick={() => setPreviewItem(item)}
                    >
                      <div className="aspect-square bg-dark-100 dark:bg-dark-800 relative">
                        {item.type === 'IMAGE' ? (
                          <img
                            src={item.url}
                            alt={item.originalName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-12 h-12 text-dark-400" />
                          </div>
                        )}
                        <div className={cn(
                          'absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity',
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}>
                          <div className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                            isSelected
                              ? 'bg-primary-500 border-primary-500'
                              : 'border-white'
                          )}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-dark-900 dark:text-white truncate">
                          {item.originalName}
                        </p>
                        <p className="text-xs text-dark-500">
                          {formatFileSize(item.size)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card divide-y divide-dark-100 dark:divide-dark-800">
                {media.map((item) => {
                  const Icon = getFileIcon(item.type);
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-4 p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 cursor-pointer',
                        isSelected && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                      onClick={() => toggleSelection(item.id)}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-dark-300 dark:border-dark-600'
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="w-12 h-12 bg-dark-100 dark:bg-dark-800 rounded overflow-hidden flex-shrink-0">
                        {item.type === 'IMAGE' ? (
                          <img
                            src={item.url}
                            alt={item.originalName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-6 h-6 text-dark-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark-900 dark:text-white truncate">
                          {item.originalName}
                        </p>
                        <p className="text-sm text-dark-500">
                          {item.folder || 'Sem pasta'} • {formatFileSize(item.size)}
                          {item.width && item.height && ` • ${item.width}x${item.height}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.tags?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tags className="w-4 h-4 text-dark-400" />
                            <span className="text-sm text-dark-500">{item.tags.length}</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem(item);
                          }}
                          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded"
                        >
                          <Eye className="w-4 h-4 text-dark-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.url, '_blank');
                          }}
                          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded"
                        >
                          <Download className="w-4 h-4 text-dark-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-900 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-dark-900 dark:text-white">
                Upload de Arquivos
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadMutation.isPending ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary-500 mb-4" />
                <p className="text-dark-600 dark:text-dark-400">
                  Fazendo upload... {Math.round(uploadProgress)}%
                </p>
                <div className="w-full bg-dark-200 dark:bg-dark-700 rounded-full h-2 mt-4">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 text-center transition-colors',
                  dragActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-dark-200 dark:border-dark-700'
                )}
              >
                <Upload className="w-12 h-12 mx-auto text-dark-400 mb-4" />
                <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">
                  Arraste arquivos aqui
                </h3>
                <p className="text-dark-500 dark:text-dark-400 mb-4">
                  ou clique para selecionar
                </p>
                <label className="btn-primary cursor-pointer inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  Selecionar Arquivos
                </label>
                <p className="text-xs text-dark-400 mt-4">
                  Formatos: JPEG, PNG, GIF, MP4, PDF, DOC, XLS (máx. 50MB)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href={previewItem.url}
              download
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setPreviewItem(null)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-4xl max-h-[80vh] overflow-auto">
            {previewItem.type === 'IMAGE' ? (
              <img
                src={previewItem.url}
                alt={previewItem.originalName}
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : previewItem.type === 'VIDEO' ? (
              <video
                src={previewItem.url}
                controls
                className="max-w-full max-h-[80vh]"
              />
            ) : (
              <div className="bg-white dark:bg-dark-900 rounded-xl p-8 text-center">
                <FileText className="w-16 h-16 mx-auto text-dark-400 mb-4" />
                <p className="text-lg font-medium text-dark-900 dark:text-white">
                  {previewItem.originalName}
                </p>
                <p className="text-dark-500 mt-2">
                  {formatFileSize(previewItem.size)}
                </p>
                <a
                  href={previewItem.url}
                  download
                  className="btn-primary mt-4 inline-block"
                >
                  <Download className="w-4 h-4 mr-2 inline" />
                  Download
                </a>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm">
            {previewItem.originalName} • {formatFileSize(previewItem.size)}
            {previewItem.width && previewItem.height && ` • ${previewItem.width}x${previewItem.height}px`}
          </div>
        </div>
      )}
    </div>
  );
}
