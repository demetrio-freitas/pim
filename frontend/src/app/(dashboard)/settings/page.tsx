'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import {
  Settings,
  User,
  Lock,
  Globe,
  Bell,
  Database,
  Shield,
  Save,
  Loader2,
  Check,
  Building,
  Palette,
  Boxes,
  Radio,
  Layers,
  Users,
  ShieldCheck,
  Key,
  Webhook,
  ShoppingBag,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'modules', label: 'Módulos', icon: Settings },
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'security', label: 'Segurança', icon: Lock },
  { id: 'localization', label: 'Localização', icon: Globe },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'system', label: 'Sistema', icon: Database },
];

// Configuration modules
const configModules = [
  {
    id: 'products',
    name: 'Produtos',
    description: 'Campos obrigatórios e validações de produtos',
    href: '/settings/products',
    icon: Boxes,
    color: 'bg-blue-500'
  },
  {
    id: 'channels',
    name: 'Canais',
    description: 'Canais de venda e distribuição',
    href: '/settings/channels',
    icon: Radio,
    color: 'bg-green-500'
  },
  {
    id: 'families',
    name: 'Famílias',
    description: 'Famílias de produtos e atributos',
    href: '/settings/families',
    icon: Layers,
    color: 'bg-purple-500'
  },
  {
    id: 'variants',
    name: 'Variantes',
    description: 'Eixos de variação de produtos',
    href: '/settings/variants',
    icon: Users,
    color: 'bg-orange-500'
  },
  {
    id: 'quality',
    name: 'Qualidade',
    description: 'Regras de qualidade de dados',
    href: '/settings/quality',
    icon: ShieldCheck,
    color: 'bg-teal-500'
  },
  {
    id: 'api-keys',
    name: 'API Keys',
    description: 'Chaves de acesso à API',
    href: '/settings/api-keys',
    icon: Key,
    color: 'bg-yellow-500'
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Integrações e notificações automáticas',
    href: '/settings/webhooks',
    icon: Webhook,
    color: 'bg-pink-500'
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Integração com lojas Shopify',
    href: '/settings/shopify',
    icon: ShoppingBag,
    color: 'bg-emerald-500'
  },
  {
    id: 'ai',
    name: 'Inteligência Artificial',
    description: 'Configurações de IA e automação',
    href: '/settings/ai',
    icon: Sparkles,
    color: 'bg-indigo-500'
  },
];

const timezones = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (GMT+9)' },
];

const locales = [
  { value: 'pt_BR', label: 'Português (Brasil)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'es_ES', label: 'Español' },
];

const currencies = [
  { value: 'BRL', label: 'Real (R$)', symbol: 'R$' },
  { value: 'USD', label: 'Dólar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('modules');
  const [saved, setSaved] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // Localization form
  const [localizationForm, setLocalizationForm] = useState({
    locale: user?.locale || 'pt_BR',
    timezone: user?.timezone || 'America/Sao_Paulo',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
  });

  // Notifications form
  const [notificationsForm, setNotificationsForm] = useState({
    emailNotifications: true,
    productUpdates: true,
    importExportAlerts: true,
    weeklyReports: false,
  });

  // System settings
  const [systemForm, setSystemForm] = useState({
    companyName: 'Minha Empresa',
    defaultProductStatus: 'DRAFT',
    autoSave: true,
    autoSaveInterval: 30,
    maxUploadSize: 50,
    enableVersioning: true,
  });

  const profileMutation = useMutation({
    mutationFn: (data: typeof profileForm) => api.updateProfile(data),
    onSuccess: (data) => {
      setUser(data);
      showSaved();
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSaved();
    },
    onError: () => {
      setPasswordError('Senha atual incorreta');
    },
  });

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleLocalizationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save localization settings
    showSaved();
  };

  const handleNotificationsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showSaved();
  };

  const handleSystemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showSaved();
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-dark-900 dark:text-white">Configurações</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1 hidden sm:block">
            Gerencie as configurações do sistema
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg">
            <Check className="w-4 h-4" />
            <span className="text-xs lg:text-sm font-medium">Salvo!</span>
          </div>
        )}
      </div>

      {/* Mobile Tabs - Horizontal scroll */}
      <div className="lg:hidden overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop Sidebar Tabs */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-dark-600 hover:bg-dark-50 dark:text-dark-400 dark:hover:bg-dark-800'
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Modules Tab */}
          {activeTab === 'modules' && (
            <div className="space-y-4 lg:space-y-6">
              <div className="card p-4 lg:p-6">
                <div className="pb-4 border-b border-dark-100 dark:border-dark-800">
                  <h2 className="text-base lg:text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Módulos
                  </h2>
                  <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400 mt-1">
                    Configurações específicas de cada módulo
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {configModules.map((module) => (
                  <Link
                    key={module.id}
                    href={module.href}
                    className="card p-3 lg:p-4 hover:shadow-lg transition-all duration-200 group hover:border-primary-300 dark:hover:border-primary-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 lg:p-3 rounded-lg lg:rounded-xl text-white flex-shrink-0', module.color)}>
                        <module.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm lg:text-base text-dark-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {module.name}
                          </h3>
                          <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-dark-400 group-hover:text-primary-500 transition-all flex-shrink-0" />
                        </div>
                        <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400 mt-0.5 lg:mt-1 line-clamp-2">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="card p-4 lg:p-6 space-y-4 lg:space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 pb-4 lg:pb-6 border-b border-dark-100 dark:border-dark-800">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 lg:w-10 lg:h-10 text-primary-600" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-base lg:text-lg font-semibold text-dark-900 dark:text-white">
                    {user?.fullName || 'Usuário'}
                  </h2>
                  <p className="text-sm text-dark-500 dark:text-dark-400">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs rounded">
                    {user?.roles?.[0] || 'ADMIN'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Nome</label>
                  <input type="text" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Sobrenome</label>
                  <input type="text" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">E-mail</label>
                  <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="input" disabled />
                  <p className="text-xs text-dark-400 mt-1">O e-mail não pode ser alterado</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={profileMutation.isPending} className="btn-primary w-full sm:w-auto">
                  {profileMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="card p-4 lg:p-6 space-y-4 lg:space-y-6">
              <div className="pb-4 border-b border-dark-100 dark:border-dark-800">
                <h2 className="text-base lg:text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Alterar Senha
                </h2>
                <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400 mt-1">
                  Mantenha sua conta segura
                </p>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Senha Atual
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={passwordMutation.isPending} className="btn-primary w-full sm:w-auto">
                  {passwordMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  Alterar Senha
                </button>
              </div>
            </form>
          )}

          {/* Localization Tab */}
          {activeTab === 'localization' && (
            <form onSubmit={handleLocalizationSubmit} className="card p-4 lg:p-6 space-y-4 lg:space-y-6">
              <div className="pb-4 border-b border-dark-100 dark:border-dark-800">
                <h2 className="text-base lg:text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Localização
                </h2>
                <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400 mt-1">
                  Idioma, fuso e moeda
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Idioma
                  </label>
                  <select
                    value={localizationForm.locale}
                    onChange={(e) => setLocalizationForm({ ...localizationForm, locale: e.target.value })}
                    className="input"
                  >
                    {locales.map((locale) => (
                      <option key={locale.value} value={locale.value}>
                        {locale.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Fuso Horário
                  </label>
                  <select
                    value={localizationForm.timezone}
                    onChange={(e) => setLocalizationForm({ ...localizationForm, timezone: e.target.value })}
                    className="input"
                  >
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Moeda Padrão
                  </label>
                  <select
                    value={localizationForm.currency}
                    onChange={(e) => setLocalizationForm({ ...localizationForm, currency: e.target.value })}
                    className="input"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Formato de Data
                  </label>
                  <select
                    value={localizationForm.dateFormat}
                    onChange={(e) => setLocalizationForm({ ...localizationForm, dateFormat: e.target.value })}
                    className="input"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </button>
              </div>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleNotificationsSubmit} className="card p-4 lg:p-6 space-y-4 lg:space-y-6">
              <div className="pb-4 border-b border-dark-100 dark:border-dark-800">
                <h2 className="text-base lg:text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificações
                </h2>
                <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400 mt-1">
                  Preferências de notificação
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Notificações por E-mail', desc: 'Receber notificações importantes por e-mail' },
                  { key: 'productUpdates', label: 'Atualizações de Produtos', desc: 'Ser notificado quando produtos forem alterados' },
                  { key: 'importExportAlerts', label: 'Alertas de Import/Export', desc: 'Notificações sobre importações e exportações' },
                  { key: 'weeklyReports', label: 'Relatórios Semanais', desc: 'Receber resumo semanal por e-mail' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-4 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800"
                  >
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-dark-500">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationsForm[item.key as keyof typeof notificationsForm]}
                      onChange={(e) => setNotificationsForm({ ...notificationsForm, [item.key]: e.target.checked })}
                      className="w-5 h-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                ))}
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </button>
              </div>
            </form>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <form onSubmit={handleSystemSubmit} className="card p-4 lg:p-6 space-y-4 lg:space-y-6">
              <div className="pb-4 border-b border-dark-100 dark:border-dark-800">
                <h2 className="text-base lg:text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Sistema
                </h2>
                <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400 mt-1">
                  Configurações gerais do PIM
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={systemForm.companyName}
                    onChange={(e) => setSystemForm({ ...systemForm, companyName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Status Padrão de Produtos
                  </label>
                  <select
                    value={systemForm.defaultProductStatus}
                    onChange={(e) => setSystemForm({ ...systemForm, defaultProductStatus: e.target.value })}
                    className="input"
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="PENDING_REVIEW">Aguardando Revisão</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Tamanho Máximo de Upload (MB)
                  </label>
                  <input
                    type="number"
                    value={systemForm.maxUploadSize}
                    onChange={(e) => setSystemForm({ ...systemForm, maxUploadSize: parseInt(e.target.value) })}
                    className="input"
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <label className="flex items-center justify-between p-4 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800">
                  <div>
                    <p className="font-medium text-dark-900 dark:text-white">Salvamento Automático</p>
                    <p className="text-sm text-dark-500">Salvar alterações automaticamente</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemForm.autoSave}
                    onChange={(e) => setSystemForm({ ...systemForm, autoSave: e.target.checked })}
                    className="w-5 h-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-dark-200 dark:border-dark-700 rounded-lg cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800">
                  <div>
                    <p className="font-medium text-dark-900 dark:text-white">Versionamento de Produtos</p>
                    <p className="text-sm text-dark-500">Manter histórico de alterações</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemForm.enableVersioning}
                    onChange={(e) => setSystemForm({ ...systemForm, enableVersioning: e.target.checked })}
                    className="w-5 h-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
