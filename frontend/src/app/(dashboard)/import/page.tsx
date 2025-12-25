'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface ImportPreview {
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  mappingSuggestions: Record<string, string>;
}

interface ImportJob {
  id: string;
  originalName: string;
  status: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  skipCount: number;
  progress: number;
  createdAt: string;
  completedAt?: string;
}

const productFields = [
  { value: '', label: 'Ignorar este campo' },
  { value: 'sku', label: 'SKU *' },
  { value: 'name', label: 'Nome *' },
  { value: 'description', label: 'Descrição' },
  { value: 'shortDescription', label: 'Descrição Curta' },
  { value: 'price', label: 'Preço' },
  { value: 'costPrice', label: 'Preço de Custo' },
  { value: 'brand', label: 'Marca' },
  { value: 'manufacturer', label: 'Fabricante' },
  { value: 'weight', label: 'Peso' },
  { value: 'status', label: 'Status' },
  { value: 'metaTitle', label: 'Meta Título' },
  { value: 'metaDescription', label: 'Meta Descrição' },
  { value: 'metaKeywords', label: 'Palavras-chave' },
  { value: 'urlKey', label: 'URL Key' },
  { value: 'stockQuantity', label: 'Estoque' },
  { value: 'categories', label: 'Categorias' },
];

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'SKIP' | 'UPDATE' | 'ERROR'>('SKIP');
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadRecentJobs();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentJob && currentJob.status === 'PROCESSING') {
      interval = setInterval(() => refreshJobStatus(currentJob.id), 2000);
    }
    return () => clearInterval(interval);
  }, [currentJob]);

  const loadRecentJobs = async () => {
    try {
      const response = await api.getImportJobs({ size: 5 });
      setRecentJobs(response.content || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const refreshJobStatus = async (jobId: string) => {
    try {
      const job = await api.getImportJob(jobId);
      setCurrentJob(job);
      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        setStep('complete');
        loadRecentJobs();
      }
    } catch (error) {
      console.error('Error refreshing job:', error);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsPreviewLoading(true);

    try {
      const previewData = await api.previewImport(selectedFile);
      setPreview(previewData);
      setMappings(previewData.mappingSuggestions || {});
      setStep('mapping');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar arquivo');
      setFile(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleMappingChange = (header: string, field: string) => {
    setMappings(prev => ({
      ...prev,
      [header]: field,
    }));
  };

  const startImport = async () => {
    if (!file) return;

    const mappedFields = Object.values(mappings);
    if (!mappedFields.includes('sku') || !mappedFields.includes('name')) {
      toast.error('SKU e Nome são campos obrigatórios');
      return;
    }

    setIsLoading(true);
    setStep('processing');

    try {
      const job = await api.importProducts(file, mappings, duplicateStrategy);
      setCurrentJob(job);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao iniciar importação');
      setStep('mapping');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await api.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_importacao.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erro ao baixar template');
    }
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMappings({});
    setCurrentJob(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Importar Produtos
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Importe produtos a partir de arquivos CSV ou Excel
          </p>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary">
          <Download size={18} className="mr-2" />
          Baixar Template
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {['upload', 'mapping', 'processing', 'complete'].map((s, index) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step === s
                  ? 'bg-primary-500 text-white'
                  : ['upload', 'mapping', 'processing', 'complete'].indexOf(step) > index
                  ? 'bg-green-500 text-white'
                  : 'bg-dark-200 dark:bg-dark-700 text-dark-500'
              }`}
            >
              {index + 1}
            </div>
            {index < 3 && (
              <div
                className={`w-16 h-1 ${
                  ['upload', 'mapping', 'processing', 'complete'].indexOf(step) > index
                    ? 'bg-green-500'
                    : 'bg-dark-200 dark:bg-dark-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="card p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-dark-200 dark:border-dark-700 hover:border-primary-300'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleInputChange}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                  <p className="text-dark-600 dark:text-dark-300">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-dark-400 mx-auto mb-4" />
                  <p className="text-lg text-dark-600 dark:text-dark-300 mb-2">
                    Arraste um arquivo ou clique para selecionar
                  </p>
                  <p className="text-sm text-dark-400">
                    Suporta CSV, Excel (.xlsx, .xls)
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Recent Jobs */}
          {recentJobs.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
                Importações Recentes
              </h3>
              <div className="space-y-2">
                {recentJobs.map(job => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-dark-400" />
                      <div>
                        <p className="text-sm font-medium text-dark-900 dark:text-white">
                          {job.originalName}
                        </p>
                        <p className="text-xs text-dark-500">
                          {new Date(job.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <span className="text-green-600">{job.successCount}</span>
                        {' / '}
                        <span className="text-red-600">{job.errorCount}</span>
                        {' / '}
                        <span className="text-yellow-600">{job.skipCount}</span>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          job.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : job.status === 'FAILED'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : job.status === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {job.status === 'COMPLETED' ? 'Concluído' :
                         job.status === 'FAILED' ? 'Falhou' :
                         job.status === 'PROCESSING' ? 'Processando' : job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 'mapping' && preview && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
                Mapeamento de Campos
              </h3>
              <p className="text-sm text-dark-500">
                {preview.totalRows} linhas encontradas em {file?.name}
              </p>
            </div>
            <select
              value={duplicateStrategy}
              onChange={e => setDuplicateStrategy(e.target.value as any)}
              className="input w-48"
            >
              <option value="SKIP">Pular duplicados</option>
              <option value="UPDATE">Atualizar duplicados</option>
              <option value="ERROR">Erro em duplicados</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-600 dark:text-dark-300">
                    Campo do Arquivo
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-600 dark:text-dark-300">
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-600 dark:text-dark-300">
                    Campo do Produto
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-600 dark:text-dark-300">
                    Exemplo
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.headers.map(header => (
                  <tr
                    key={header}
                    className="border-b border-dark-100 dark:border-dark-800"
                  >
                    <td className="py-3 px-4 font-medium text-dark-900 dark:text-white">
                      {header}
                    </td>
                    <td className="py-3 px-4">
                      <ArrowRight size={16} className="text-dark-400" />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={mappings[header] || ''}
                        onChange={e => handleMappingChange(header, e.target.value)}
                        className="input w-full"
                      >
                        {productFields.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-500 max-w-xs truncate">
                      {preview.sampleRows[0]?.[header] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={resetImport} className="btn-secondary">
              Voltar
            </button>
            <button onClick={startImport} className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  Iniciar Importação
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && currentJob && (
        <div className="card p-8 text-center">
          <Loader2 className="w-16 h-16 text-primary-500 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">
            Importando Produtos...
          </h3>
          <p className="text-dark-500 mb-6">
            {currentJob.processedRows} de {currentJob.totalRows} linhas processadas
          </p>

          <div className="w-full bg-dark-200 dark:bg-dark-700 rounded-full h-4 mb-4">
            <div
              className="bg-primary-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${currentJob.progress}%` }}
            />
          </div>

          <div className="flex justify-center gap-8 text-sm">
            <div className="text-center">
              <span className="text-2xl font-bold text-green-600">{currentJob.successCount}</span>
              <p className="text-dark-500">Sucesso</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-red-600">{currentJob.errorCount}</span>
              <p className="text-dark-500">Erros</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-yellow-600">{currentJob.skipCount}</span>
              <p className="text-dark-500">Pulados</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && currentJob && (
        <div className="card p-8 text-center">
          {currentJob.status === 'COMPLETED' ? (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          )}

          <h3 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">
            {currentJob.status === 'COMPLETED' ? 'Importação Concluída!' : 'Importação Falhou'}
          </h3>

          <div className="flex justify-center gap-8 my-6">
            <div className="text-center">
              <span className="text-3xl font-bold text-green-600">{currentJob.successCount}</span>
              <p className="text-dark-500">Importados</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-bold text-red-600">{currentJob.errorCount}</span>
              <p className="text-dark-500">Erros</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-bold text-yellow-600">{currentJob.skipCount}</span>
              <p className="text-dark-500">Pulados</p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button onClick={resetImport} className="btn-primary">
              Nova Importação
            </button>
            <a href="/products" className="btn-secondary">
              Ver Produtos
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
