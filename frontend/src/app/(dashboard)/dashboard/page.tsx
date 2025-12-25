'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatNumber, getStatusColor, getStatusLabel, formatCurrency, formatBytes } from '@/lib/utils';
import {
  Boxes,
  FolderTree,
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive,
  PackageX,
  ImageOff,
  TrendingUp,
  Package,
  HardDrive,
  Image as ImageIcon,
  Tag,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { CompletenessChart, CategoryChart, ActivityTimeline, StatCard, TrendCard, QuickActions } from '@/components/charts';

interface AdvancedStats {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  archivedProducts: number;
  totalCategories: number;
  totalAttributes: number;
  totalMedia: number;
  storageUsed: number;
  averageCompleteness: number;
  incompleteProducts: number;
  completenessDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  productsByCategory: Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    action: string;
    entityName: string | null;
    userName: string | null;
    createdAt: string;
  }>;
  trends: {
    newProductsThisWeek: number;
    newProductsLastWeek: number;
    productGrowth: number;
  };
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['product-statistics'],
    queryFn: () => api.getProductStatistics(),
  });

  const { data: advancedStats, isLoading: isLoadingAdvanced } = useQuery<AdvancedStats>({
    queryKey: ['advanced-dashboard-stats'],
    queryFn: () => api.getAdvancedDashboardStats(),
  });

  const { data: incompleteProducts } = useQuery({
    queryKey: ['incomplete-products'],
    queryFn: () => api.getIncompleteProducts(80, { size: 5 }),
  });

  const { data: recentProducts } = useQuery({
    queryKey: ['recent-products'],
    queryFn: () => api.getRecentProductsList(5),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header - Simplificado no mobile */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-dark-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1 hidden sm:block">
            Visão geral do seu catálogo de produtos
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-dark-500">
          <Activity className="w-4 h-4" />
          Atualizado em tempo real
        </div>
      </div>

      {/* KPI Cards - Row 1: 2 colunas no mobile, 4 no desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Total de Produtos"
          value={stats?.total || 0}
          icon={Boxes}
          color="bg-blue-500"
          href="/products"
        />
        <StatCard
          title="Publicados"
          value={stats?.published || 0}
          icon={CheckCircle}
          color="bg-green-500"
          href="/products?status=PUBLISHED"
        />
        <StatCard
          title="Revisão"
          value={stats?.pendingReview || 0}
          icon={Clock}
          color="bg-yellow-500"
          href="/products?status=PENDING_REVIEW"
        />
        <StatCard
          title="Rascunhos"
          value={stats?.draft || 0}
          icon={Archive}
          color="bg-gray-500"
          href="/products?status=DRAFT"
        />
      </div>

      {/* Quick Actions - Escondido no mobile para simplificar */}
      <div className="hidden lg:block">
        <QuickActions />
      </div>

      {/* Mobile Quick Access - Links rápidos simplificados para mobile */}
      <div className="lg:hidden">
        <div className="card p-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/products/new"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-primary-500 text-white rounded-lg text-sm font-medium"
            >
              <Package className="w-4 h-4" />
              Novo Produto
            </Link>
            <Link
              href="/products"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-200 rounded-lg text-sm font-medium"
            >
              <Boxes className="w-4 h-4" />
              Ver Todos
            </Link>
          </div>
        </div>
      </div>

      {/* Trend Cards - 2 colunas no mobile, simplificado */}
      {advancedStats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Novos Produtos - Visível em todos */}
          <div className="card p-3 lg:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs lg:text-sm text-dark-500 dark:text-dark-400">Novos</span>
              <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-primary-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl lg:text-2xl font-bold text-dark-900 dark:text-white">
                {advancedStats.trends.newProductsThisWeek}
              </span>
              <span className="text-xs text-dark-400">esta semana</span>
            </div>
          </div>

          {/* Completude Média */}
          <div className="card p-3 lg:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs lg:text-sm text-dark-500 dark:text-dark-400">Completude</span>
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl lg:text-2xl font-bold text-dark-900 dark:text-white">
                {Math.round(advancedStats.averageCompleteness)}%
              </span>
            </div>
            <div className="h-1.5 lg:h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${advancedStats.averageCompleteness}%` }}
              />
            </div>
          </div>

          {/* Armazenamento - Escondido no mobile muito pequeno */}
          <div className="card p-3 lg:p-4 hidden sm:block lg:col-span-1 col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs lg:text-sm text-dark-500 dark:text-dark-400">Armazenamento</span>
              <HardDrive className="w-4 h-4 lg:w-5 lg:h-5 text-cyan-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl lg:text-2xl font-bold text-dark-900 dark:text-white">
                {formatBytes(advancedStats.storageUsed)}
              </span>
            </div>
            <p className="text-xs text-dark-400 mt-1">
              {advancedStats.totalMedia} arquivos
            </p>
          </div>
        </div>
      )}

      {/* Alert Cards - 2x2 grid no mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Link
          href="/products?lowStock=true"
          className="card p-3 lg:p-4 hover:shadow-md transition-shadow border-l-4 border-orange-500"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <PackageX className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg lg:text-xl font-bold text-dark-900 dark:text-white">
                {formatNumber(stats?.lowStock || 0)}
              </p>
              <p className="text-xs text-dark-500">Estoque Baixo</p>
            </div>
          </div>
        </Link>

        <Link
          href="/products?noImages=true"
          className="card p-3 lg:p-4 hover:shadow-md transition-shadow border-l-4 border-red-500"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <ImageOff className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg lg:text-xl font-bold text-dark-900 dark:text-white">
                {formatNumber(stats?.noImages || 0)}
              </p>
              <p className="text-xs text-dark-500">Sem Imagens</p>
            </div>
          </div>
        </Link>

        <Link
          href="/categories"
          className="card p-3 lg:p-4 hover:shadow-md transition-shadow border-l-4 border-purple-500"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <FolderTree className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg lg:text-xl font-bold text-dark-900 dark:text-white">
                {formatNumber(advancedStats?.totalCategories || 0)}
              </p>
              <p className="text-xs text-dark-500">Categorias</p>
            </div>
          </div>
        </Link>

        <Link
          href="/attributes"
          className="card p-3 lg:p-4 hover:shadow-md transition-shadow border-l-4 border-amber-500"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Tag className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg lg:text-xl font-bold text-dark-900 dark:text-white">
                {formatNumber(advancedStats?.totalAttributes || 0)}
              </p>
              <p className="text-xs text-dark-500">Atributos</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Row - Escondidos no mobile, muito complexos */}
      {advancedStats && (
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completeness Distribution */}
          <div className="card">
            <div className="p-4 border-b border-dark-100 dark:border-dark-800">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
                  Distribuição de Completude
                </h2>
              </div>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
                Qualidade dos dados dos produtos
              </p>
            </div>
            <div className="p-4">
              <CompletenessChart data={advancedStats.completenessDistribution} />
            </div>
          </div>

          {/* Products by Category */}
          <div className="card">
            <div className="p-4 border-b border-dark-100 dark:border-dark-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
                  Produtos por Categoria
                </h2>
              </div>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
                Top 10 categorias com mais produtos
              </p>
            </div>
            <div className="p-4">
              <CategoryChart data={advancedStats.productsByCategory} />
            </div>
          </div>
        </div>
      )}

      {/* Content Grid - Uma coluna no mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent Products - Prioridade no mobile */}
        <div className="card order-1">
          <div className="p-3 lg:p-4 border-b border-dark-100 dark:border-dark-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500" />
                <h2 className="text-base lg:text-lg font-semibold text-dark-900 dark:text-white">
                  Produtos Recentes
                </h2>
              </div>
              <Link
                href="/products"
                className="text-xs lg:text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-dark-100 dark:divide-dark-800">
            {recentProducts?.length > 0 ? (
              recentProducts.slice(0, 4).map((product: any) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-3 p-3 lg:p-4 hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors"
                >
                  {product.mainImageUrl ? (
                    <img
                      src={product.mainImageUrl}
                      alt={product.name}
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-dark-100 dark:bg-dark-800 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-dark-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-900 dark:text-white truncate text-sm lg:text-base">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400">{product.sku}</p>
                      <span className={`text-xs badge ${getStatusColor(product.status)} hidden sm:inline-flex`}>
                        {getStatusLabel(product.status)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="font-medium text-dark-900 dark:text-white text-sm">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-dark-500 dark:text-dark-400">
                <Package className="w-10 h-10 mx-auto mb-2 text-dark-300" />
                <p className="text-sm">Nenhum produto cadastrado ainda</p>
              </div>
            )}
          </div>
        </div>

        {/* Incomplete Products - Segundo no mobile */}
        <div className="card order-2">
          <div className="p-3 lg:p-4 border-b border-dark-100 dark:border-dark-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-500" />
                <h2 className="text-base lg:text-lg font-semibold text-dark-900 dark:text-white">
                  Incompletos
                </h2>
              </div>
              <Link
                href="/products?incomplete=true"
                className="text-xs lg:text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-dark-100 dark:divide-dark-800">
            {incompleteProducts?.content?.length > 0 ? (
              incompleteProducts.content.slice(0, 4).map((product: any) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center justify-between p-3 lg:p-4 hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-dark-900 dark:text-white truncate text-sm lg:text-base">{product.name}</p>
                    <p className="text-xs lg:text-sm text-dark-500 dark:text-dark-400">{product.sku}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-16 lg:w-24 h-1.5 lg:h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${product.completenessScore}%` }}
                      />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-dark-600 dark:text-dark-300 w-8 text-right">
                      {product.completenessScore}%
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-dark-500 dark:text-dark-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Todos os produtos estão completos!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity - Escondido no mobile para simplificar */}
        {advancedStats && advancedStats.recentActivity.length > 0 && (
          <div className="card hidden lg:block lg:col-span-2 order-3">
            <div className="p-4 border-b border-dark-100 dark:border-dark-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
                  Atividade Recente
                </h2>
              </div>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
                Últimas alterações no catálogo
              </p>
            </div>
            <div className="p-4">
              <ActivityTimeline activities={advancedStats.recentActivity} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
