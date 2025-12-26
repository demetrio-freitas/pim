'use client';

import { useState } from 'react';
import {
  Cloud,
  Download,
  Key,
  Mail,
  Zap,
  Monitor,
  Smartphone,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Shield,
  Users,
  Eye,
  HardDrive,
  Wifi,
  Settings,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VirtualProductData,
  VirtualCategory,
  DeliveryMethod,
  LicenseType,
  VirtualStockType,
  ValidityType,
  VIRTUAL_CATEGORY_LABELS,
  VIRTUAL_CATEGORY_DESCRIPTIONS,
  DELIVERY_METHOD_LABELS,
  LICENSE_TYPE_LABELS,
  VIRTUAL_STOCK_TYPE_LABELS,
} from '@/types';

interface VirtualProductManagerProps {
  data: VirtualProductData;
  onChange: (data: VirtualProductData) => void;
  isLoading?: boolean;
}

// Icons for categories
const CATEGORY_ICONS: Record<VirtualCategory, React.ReactNode> = {
  digital_content: <FileText className="w-5 h-5" />,
  course: <Monitor className="w-5 h-5" />,
  software: <HardDrive className="w-5 h-5" />,
  service: <Users className="w-5 h-5" />,
  subscription: <RefreshCw className="w-5 h-5" />,
  warranty: <Shield className="w-5 h-5" />,
  voucher: <Package className="w-5 h-5" />,
};

// Icons for delivery methods
const DELIVERY_ICONS: Record<DeliveryMethod, React.ReactNode> = {
  direct_download: <Download className="w-5 h-5" />,
  platform_access: <Cloud className="w-5 h-5" />,
  activation_code: <Key className="w-5 h-5" />,
  email_instructions: <Mail className="w-5 h-5" />,
  immediate_access: <Zap className="w-5 h-5" />,
};

// Default virtual product data
export const defaultVirtualProductData: VirtualProductData = {
  category: 'digital_content',
  delivery: {
    method: 'direct_download',
    downloadLimit: 5,
    linkExpirationHours: 48,
  },
  license: {
    type: 'personal',
    allowTransfer: false,
  },
  validity: {
    hasExpiration: false,
    sendExpirationAlert: false,
    allowRenewal: false,
  },
  stock: {
    type: 'unlimited',
    allowBackorder: false,
  },
};

export function VirtualProductManager({
  data,
  onChange,
  isLoading = false,
}: VirtualProductManagerProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    delivery: true,
    license: true,
    validity: false,
    stock: false,
    requirements: false,
    limits: false,
    support: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateData = (updates: Partial<VirtualProductData>) => {
    onChange({ ...data, ...updates });
  };

  // Section Header Component
  const SectionHeader = ({
    id,
    icon,
    title,
    subtitle,
    required = false,
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    required?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-dark-50 dark:bg-dark-900 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-primary-600 dark:text-primary-400">{icon}</span>
        <div className="text-left">
          <h4 className="font-medium text-dark-900 dark:text-white">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h4>
          {subtitle && <p className="text-sm text-dark-500">{subtitle}</p>}
        </div>
      </div>
      {expandedSections[id] ? (
        <ChevronUp className="w-5 h-5 text-dark-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-dark-400" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Cloud className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-purple-800 dark:text-purple-200">
              Produto Virtual
            </h4>
            <p className="mt-1 text-sm text-purple-700 dark:text-purple-300">
              Configure as opções de entrega digital, licenciamento e acesso para seu produto virtual.
            </p>
          </div>
        </div>
      </div>

      {/* Category Section */}
      <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
        <SectionHeader
          id="category"
          icon={<Package className="w-5 h-5" />}
          title="Categoria do Produto"
          subtitle="Selecione o tipo de produto virtual"
          required
        />
        {expandedSections.category && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(VIRTUAL_CATEGORY_LABELS) as VirtualCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => updateData({ category: cat })}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                    data.category === cat
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300 dark:hover:border-dark-600'
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 mt-0.5',
                      data.category === cat ? 'text-primary-600' : 'text-dark-400'
                    )}
                  >
                    {CATEGORY_ICONS[cat]}
                  </span>
                  <div>
                    <p
                      className={cn(
                        'font-medium',
                        data.category === cat
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-dark-900 dark:text-white'
                      )}
                    >
                      {VIRTUAL_CATEGORY_LABELS[cat]}
                    </p>
                    <p className="text-xs text-dark-500 mt-0.5">
                      {VIRTUAL_CATEGORY_DESCRIPTIONS[cat]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delivery Method Section */}
      <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
        <SectionHeader
          id="delivery"
          icon={<Download className="w-5 h-5" />}
          title="Método de Entrega"
          subtitle="Como o cliente receberá o produto"
          required
        />
        {expandedSections.delivery && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700 space-y-4">
            {/* Method Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(DELIVERY_METHOD_LABELS) as DeliveryMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() =>
                    updateData({
                      delivery: { ...data.delivery, method },
                    })
                  }
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                    data.delivery.method === method
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                  )}
                >
                  <span
                    className={cn(
                      data.delivery.method === method ? 'text-primary-600' : 'text-dark-400'
                    )}
                  >
                    {DELIVERY_ICONS[method]}
                  </span>
                  <span
                    className={cn(
                      'font-medium',
                      data.delivery.method === method
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-dark-900 dark:text-white'
                    )}
                  >
                    {DELIVERY_METHOD_LABELS[method]}
                  </span>
                </button>
              ))}
            </div>

            {/* Method-specific fields */}
            {data.delivery.method === 'direct_download' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    URL do Arquivo
                  </label>
                  <input
                    type="url"
                    value={data.delivery.fileUrl || ''}
                    onChange={(e) =>
                      updateData({
                        delivery: { ...data.delivery, fileUrl: e.target.value },
                      })
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                      Limite Downloads
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={data.delivery.downloadLimit || ''}
                      onChange={(e) =>
                        updateData({
                          delivery: {
                            ...data.delivery,
                            downloadLimit: parseInt(e.target.value) || undefined,
                          },
                        })
                      }
                      placeholder="5"
                      className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                      Expiração Link (h)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={data.delivery.linkExpirationHours || ''}
                      onChange={(e) =>
                        updateData({
                          delivery: {
                            ...data.delivery,
                            linkExpirationHours: parseInt(e.target.value) || undefined,
                          },
                        })
                      }
                      placeholder="48"
                      className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {data.delivery.method === 'platform_access' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    URL da Plataforma
                  </label>
                  <input
                    type="url"
                    value={data.delivery.platformUrl || ''}
                    onChange={(e) =>
                      updateData({
                        delivery: { ...data.delivery, platformUrl: e.target.value },
                      })
                    }
                    placeholder="https://app.exemplo.com"
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.delivery.autoCreateAccount || false}
                      onChange={(e) =>
                        updateData({
                          delivery: { ...data.delivery, autoCreateAccount: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded border-dark-300"
                    />
                    <span className="text-sm text-dark-700 dark:text-dark-300">
                      Criar conta automaticamente
                    </span>
                  </label>
                </div>
              </div>
            )}

            {data.delivery.method === 'activation_code' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Formato do Código
                  </label>
                  <input
                    type="text"
                    value={data.delivery.codeFormat || ''}
                    onChange={(e) =>
                      updateData({
                        delivery: { ...data.delivery, codeFormat: e.target.value },
                      })
                    }
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.delivery.autoGenerateCode || false}
                      onChange={(e) =>
                        updateData({
                          delivery: { ...data.delivery, autoGenerateCode: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded border-dark-300"
                    />
                    <span className="text-sm text-dark-700 dark:text-dark-300">
                      Gerar código automaticamente
                    </span>
                  </label>
                </div>
              </div>
            )}

            {data.delivery.method === 'email_instructions' && (
              <div className="mt-4 p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Template de E-mail
                  </label>
                  <textarea
                    value={data.delivery.emailTemplate || ''}
                    onChange={(e) =>
                      updateData({
                        delivery: { ...data.delivery, emailTemplate: e.target.value },
                      })
                    }
                    placeholder="Olá {nome}, aqui estão as instruções para acessar seu produto..."
                    rows={4}
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                  />
                  <p className="mt-1 text-xs text-dark-500">
                    Use {'{nome}'}, {'{email}'}, {'{produto}'} como variáveis
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* License Section */}
      <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
        <SectionHeader
          id="license"
          icon={<Key className="w-5 h-5" />}
          title="Licenciamento"
          subtitle="Tipo de licença e restrições de uso"
          required
        />
        {expandedSections.license && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700 space-y-4">
            {/* License Type */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Tipo de Licença
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(LICENSE_TYPE_LABELS) as LicenseType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      updateData({
                        license: { ...data.license, type },
                      })
                    }
                    className={cn(
                      'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                      data.license.type === type
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-dark-200 dark:border-dark-700 hover:border-dark-300 text-dark-700 dark:text-dark-300'
                    )}
                  >
                    {LICENSE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* License Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  <Monitor className="w-4 h-4 inline mr-1" />
                  Máx. Dispositivos
                </label>
                <input
                  type="number"
                  min="1"
                  value={data.license.maxDevices || ''}
                  onChange={(e) =>
                    updateData({
                      license: {
                        ...data.license,
                        maxDevices: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                  placeholder="Ilimitado"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  <Users className="w-4 h-4 inline mr-1" />
                  Acessos Simultâneos
                </label>
                <input
                  type="number"
                  min="1"
                  value={data.license.maxConcurrentAccess || ''}
                  onChange={(e) =>
                    updateData({
                      license: {
                        ...data.license,
                        maxConcurrentAccess: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                  placeholder="Ilimitado"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  <Eye className="w-4 h-4 inline mr-1" />
                  Máx. Visualizações
                </label>
                <input
                  type="number"
                  min="1"
                  value={data.license.maxViews || ''}
                  onChange={(e) =>
                    updateData({
                      license: {
                        ...data.license,
                        maxViews: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                  placeholder="Ilimitado"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
            </div>

            {/* Transfer Options */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.license.allowTransfer}
                  onChange={(e) =>
                    updateData({
                      license: { ...data.license, allowTransfer: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded border-dark-300"
                />
                <span className="text-sm text-dark-700 dark:text-dark-300">
                  Permitir transferência de licença
                </span>
              </label>

              {data.license.allowTransfer && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-dark-700 dark:text-dark-300">
                    Taxa de transferência: R$
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.license.transferFee || ''}
                    onChange={(e) =>
                      updateData({
                        license: {
                          ...data.license,
                          transferFee: parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="0.00"
                    className="w-24 px-2 py-1 border border-dark-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Terms of Use */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Termos de Uso
              </label>
              <textarea
                value={data.license.termsOfUse || ''}
                onChange={(e) =>
                  updateData({
                    license: { ...data.license, termsOfUse: e.target.value },
                  })
                }
                placeholder="Descreva os termos e condições de uso da licença..."
                rows={3}
                className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Validity Section */}
      <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
        <SectionHeader
          id="validity"
          icon={<Clock className="w-5 h-5" />}
          title="Validade"
          subtitle="Configurações de expiração e renovação"
        />
        {expandedSections.validity && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700 space-y-4">
            {/* Has Expiration */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.validity.hasExpiration}
                onChange={(e) =>
                  updateData({
                    validity: {
                      ...data.validity,
                      hasExpiration: e.target.checked,
                      type: e.target.checked ? 'days' : undefined,
                    },
                  })
                }
                className="w-4 h-4 text-primary-600 rounded border-dark-300"
              />
              <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                Produto tem validade/expiração
              </span>
            </label>

            {data.validity.hasExpiration && (
              <>
                {/* Expiration Type */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                      Tipo de Validade
                    </label>
                    <select
                      value={data.validity.type || 'days'}
                      onChange={(e) =>
                        updateData({
                          validity: {
                            ...data.validity,
                            type: e.target.value as ValidityType,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                    >
                      <option value="days">Dias após a compra</option>
                      <option value="date">Data específica</option>
                    </select>
                  </div>

                  {data.validity.type === 'days' && (
                    <div>
                      <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                        Dias de Validade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={data.validity.validityDays || ''}
                        onChange={(e) =>
                          updateData({
                            validity: {
                              ...data.validity,
                              validityDays: parseInt(e.target.value) || undefined,
                            },
                          })
                        }
                        placeholder="30"
                        className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                      />
                    </div>
                  )}

                  {data.validity.type === 'date' && (
                    <div>
                      <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                        Data de Expiração
                      </label>
                      <input
                        type="date"
                        value={data.validity.expirationDate || ''}
                        onChange={(e) =>
                          updateData({
                            validity: {
                              ...data.validity,
                              expirationDate: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                      />
                    </div>
                  )}
                </div>

                {/* Alerts */}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.validity.sendExpirationAlert}
                      onChange={(e) =>
                        updateData({
                          validity: {
                            ...data.validity,
                            sendExpirationAlert: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded border-dark-300"
                    />
                    <span className="text-sm text-dark-700 dark:text-dark-300">
                      <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                      Enviar alerta antes de expirar
                    </span>
                  </label>

                  {data.validity.sendExpirationAlert && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={data.validity.alertDaysBefore || ''}
                        onChange={(e) =>
                          updateData({
                            validity: {
                              ...data.validity,
                              alertDaysBefore: parseInt(e.target.value) || undefined,
                            },
                          })
                        }
                        placeholder="7"
                        className="w-16 px-2 py-1 border border-dark-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800 text-sm"
                      />
                      <span className="text-sm text-dark-500">dias antes</span>
                    </div>
                  )}
                </div>

                {/* Renewal */}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.validity.allowRenewal}
                      onChange={(e) =>
                        updateData({
                          validity: { ...data.validity, allowRenewal: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded border-dark-300"
                    />
                    <span className="text-sm text-dark-700 dark:text-dark-300">
                      <RefreshCw className="w-4 h-4 inline mr-1 text-green-500" />
                      Permitir renovação
                    </span>
                  </label>

                  {data.validity.allowRenewal && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-dark-500">Desconto:</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={data.validity.renewalDiscount || ''}
                          onChange={(e) =>
                            updateData({
                              validity: {
                                ...data.validity,
                                renewalDiscount: parseInt(e.target.value) || undefined,
                              },
                            })
                          }
                          placeholder="0"
                          className="w-16 px-2 py-1 border border-dark-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800 text-sm"
                        />
                        <span className="text-sm text-dark-500">%</span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.validity.autoRenewal || false}
                          onChange={(e) =>
                            updateData({
                              validity: { ...data.validity, autoRenewal: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-primary-600 rounded border-dark-300"
                        />
                        <span className="text-sm text-dark-700 dark:text-dark-300">
                          Renovação automática
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stock Section */}
      <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
        <SectionHeader
          id="stock"
          icon={<Package className="w-5 h-5" />}
          title="Gestão de Estoque"
          subtitle="Controle de disponibilidade do produto virtual"
        />
        {expandedSections.stock && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700 space-y-4">
            {/* Stock Type */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Tipo de Controle
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(VIRTUAL_STOCK_TYPE_LABELS) as VirtualStockType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      updateData({
                        stock: { ...data.stock, type },
                      })
                    }
                    className={cn(
                      'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left',
                      data.stock.type === type
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-dark-200 dark:border-dark-700 hover:border-dark-300 text-dark-700 dark:text-dark-300'
                    )}
                  >
                    {VIRTUAL_STOCK_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Options for limited types */}
            {(data.stock.type === 'licensed' || data.stock.type === 'slots') && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Quantidade Disponível
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.stock.quantity || ''}
                    onChange={(e) =>
                      updateData({
                        stock: {
                          ...data.stock,
                          quantity: parseInt(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="100"
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Alerta Estoque Baixo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.stock.lowStockAlert || ''}
                    onChange={(e) =>
                      updateData({
                        stock: {
                          ...data.stock,
                          lowStockAlert: parseInt(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="10"
                    className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                  />
                </div>
              </div>
            )}

            {/* Backorder */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.stock.allowBackorder}
                  onChange={(e) =>
                    updateData({
                      stock: { ...data.stock, allowBackorder: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded border-dark-300"
                />
                <span className="text-sm text-dark-700 dark:text-dark-300">
                  Permitir venda sem estoque (backorder)
                </span>
              </label>

              {data.stock.allowBackorder && (
                <input
                  type="text"
                  value={data.stock.backorderText || ''}
                  onChange={(e) =>
                    updateData({
                      stock: { ...data.stock, backorderText: e.target.value },
                    })
                  }
                  placeholder="Disponível em breve..."
                  className="flex-1 min-w-48 px-3 py-1 border border-dark-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800 text-sm"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* System Requirements Section */}
      <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
        <SectionHeader
          id="requirements"
          icon={<Settings className="w-5 h-5" />}
          title="Requisitos do Sistema"
          subtitle="Especificações técnicas (opcional)"
        />
        {expandedSections.requirements && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700 space-y-4">
            {/* Operating Systems */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Sistemas Operacionais Compatíveis
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'windows', label: 'Windows', icon: <Monitor className="w-4 h-4" /> },
                  { key: 'macos', label: 'macOS', icon: <Monitor className="w-4 h-4" /> },
                  { key: 'linux', label: 'Linux', icon: <Monitor className="w-4 h-4" /> },
                  { key: 'android', label: 'Android', icon: <Smartphone className="w-4 h-4" /> },
                  { key: 'ios', label: 'iOS', icon: <Smartphone className="w-4 h-4" /> },
                ].map(({ key, label, icon }) => (
                  <label
                    key={key}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all',
                      data.requirements?.operatingSystems?.[
                        key as keyof typeof data.requirements.operatingSystems
                      ]
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={
                        data.requirements?.operatingSystems?.[
                          key as keyof typeof data.requirements.operatingSystems
                        ] || false
                      }
                      onChange={(e) =>
                        updateData({
                          requirements: {
                            ...data.requirements,
                            operatingSystems: {
                              windows: false,
                              macos: false,
                              linux: false,
                              android: false,
                              ios: false,
                              ...data.requirements?.operatingSystems,
                              [key]: e.target.checked,
                            },
                            internetRequired: data.requirements?.internetRequired || false,
                          },
                        })
                      }
                      className="sr-only"
                    />
                    {icon}
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Other Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Requisitos Mínimos
                </label>
                <textarea
                  value={data.requirements?.minimumRequirements || ''}
                  onChange={(e) =>
                    updateData({
                      requirements: {
                        ...data.requirements,
                        operatingSystems: data.requirements?.operatingSystems || {
                          windows: false,
                          macos: false,
                          linux: false,
                          android: false,
                          ios: false,
                        },
                        internetRequired: data.requirements?.internetRequired || false,
                        minimumRequirements: e.target.value,
                      },
                    })
                  }
                  placeholder="RAM: 4GB, Processador: Intel Core i3..."
                  rows={3}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Compatibilidade
                </label>
                <textarea
                  value={data.requirements?.compatibility || ''}
                  onChange={(e) =>
                    updateData({
                      requirements: {
                        ...data.requirements,
                        operatingSystems: data.requirements?.operatingSystems || {
                          windows: false,
                          macos: false,
                          linux: false,
                          android: false,
                          ios: false,
                        },
                        internetRequired: data.requirements?.internetRequired || false,
                        compatibility: e.target.value,
                      },
                    })
                  }
                  placeholder="Compatível com versões 10, 11, 12..."
                  rows={3}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
            </div>

            {/* Internet Required */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.requirements?.internetRequired || false}
                onChange={(e) =>
                  updateData({
                    requirements: {
                      ...data.requirements,
                      operatingSystems: data.requirements?.operatingSystems || {
                        windows: false,
                        macos: false,
                        linux: false,
                        android: false,
                        ios: false,
                      },
                      internetRequired: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-primary-600 rounded border-dark-300"
              />
              <span className="text-sm text-dark-700 dark:text-dark-300">
                <Wifi className="w-4 h-4 inline mr-1" />
                Requer conexão com internet
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Support Info Section */}
      <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
        <SectionHeader
          id="support"
          icon={<HelpCircle className="w-5 h-5" />}
          title="Informações de Suporte"
          subtitle="Canais de atendimento ao cliente"
        />
        {expandedSections.support && (
          <div className="p-4 border-t border-dark-200 dark:border-dark-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  E-mail de Suporte
                </label>
                <input
                  type="email"
                  value={data.supportInfo?.email || ''}
                  onChange={(e) =>
                    updateData({
                      supportInfo: { ...data.supportInfo, email: e.target.value },
                    })
                  }
                  placeholder="suporte@empresa.com"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={data.supportInfo?.phone || ''}
                  onChange={(e) =>
                    updateData({
                      supportInfo: { ...data.supportInfo, phone: e.target.value },
                    })
                  }
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  URL Base de Conhecimento
                </label>
                <input
                  type="url"
                  value={data.supportInfo?.url || ''}
                  onChange={(e) =>
                    updateData({
                      supportInfo: { ...data.supportInfo, url: e.target.value },
                    })
                  }
                  placeholder="https://suporte.empresa.com"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Horário de Atendimento
                </label>
                <input
                  type="text"
                  value={data.supportInfo?.hours || ''}
                  onChange={(e) =>
                    updateData({
                      supportInfo: { ...data.supportInfo, hours: e.target.value },
                    })
                  }
                  placeholder="Seg-Sex: 9h às 18h"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Instruções de Acesso
              </label>
              <textarea
                value={data.instructions || ''}
                onChange={(e) => updateData({ instructions: e.target.value })}
                placeholder="Instruções detalhadas de como acessar/usar o produto após a compra..."
                rows={4}
                className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-dark-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-dark-600 dark:text-dark-400">
            <strong className="text-dark-800 dark:text-dark-200">Resumo:</strong>{' '}
            {VIRTUAL_CATEGORY_LABELS[data.category]} • Entrega via{' '}
            {DELIVERY_METHOD_LABELS[data.delivery.method]} • Licença{' '}
            {LICENSE_TYPE_LABELS[data.license.type]} • Estoque{' '}
            {VIRTUAL_STOCK_TYPE_LABELS[data.stock.type]}
            {data.validity.hasExpiration && ' • Com validade'}
          </div>
        </div>
      </div>
    </div>
  );
}
