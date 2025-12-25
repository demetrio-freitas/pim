import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError, AuthResponse, ErrorCode } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Error message translations (Portuguese)
const errorMessages: Record<string, string> = {
  RESOURCE_NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_FAILED: 'Dados inválidos',
  INVALID_REQUEST: 'Requisição inválida',
  ACCESS_DENIED: 'Acesso negado',
  AUTHENTICATION_FAILED: 'Falha na autenticação',
  INTERNAL_ERROR: 'Erro interno do servidor',
  FILE_TOO_LARGE: 'Arquivo muito grande',
  PRODUCT_NOT_FOUND: 'Produto não encontrado',
  CATEGORY_NOT_FOUND: 'Categoria não encontrada',
  ATTRIBUTE_NOT_FOUND: 'Atributo não encontrado',
  SKU_ALREADY_EXISTS: 'SKU já existe',
  CODE_ALREADY_EXISTS: 'Código já existe',
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  TOKEN_EXPIRED: 'Sessão expirada',
  ACCOUNT_DISABLED: 'Conta desativada',
  INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes',
  PASSWORD_MISMATCH: 'Senha incorreta',
  IMPORT_FAILED: 'Falha na importação',
  EXPORT_FAILED: 'Falha na exportação',
};

export function getLocalizedErrorMessage(errorCode: ErrorCode): string {
  return errorMessages[errorCode] || 'Ocorreu um erro inesperado';
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && this.refreshToken && originalRequest) {
          try {
            const response = await this.refreshAccessToken();
            this.setTokens(response.accessToken, response.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
            return this.client(originalRequest);
          } catch {
            this.clearTokens();
            window.location.href = '/login';
          }
        }

        const responseData = error.response?.data as Partial<ApiError> | undefined;
        const errorCode = responseData?.errorCode || 'INTERNAL_ERROR';

        const apiError: ApiError = {
          message: responseData?.message || getLocalizedErrorMessage(errorCode),
          status: error.response?.status || 500,
          error: responseData?.error || 'Error',
          errorCode: errorCode,
          timestamp: responseData?.timestamp,
          details: responseData?.details,
          traceId: responseData?.traceId,
          // Legacy support
          errors: responseData?.errors,
        };

        return Promise.reject(apiError);
      }
    );
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
    }
  }

  loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  private async refreshAccessToken(): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth/refresh`, {
      refreshToken: this.refreshToken,
    });
    return response.data;
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', { email, password });
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data;
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: { firstName?: string; lastName?: string; locale?: string; timezone?: string }) {
    const response = await this.client.put('/auth/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  }

  logout() {
    this.clearTokens();
  }

  // Products
  async getProducts(params?: { page?: number; size?: number; status?: string; categoryId?: string; search?: string; type?: string; sortBy?: string; sortDirection?: string }) {
    const response = await this.client.get('/products', { params });
    return response.data;
  }

  async advancedSearch(params: {
    query?: string;
    categoryId?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    type?: string;
    hasImages?: boolean;
    minStock?: number;
    maxStock?: number;
    minCompleteness?: number;
    maxCompleteness?: number;
    tags?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
  }) {
    const response = await this.client.get('/products/search/advanced', { params });
    return response.data;
  }

  async getSearchSuggestions(query: string, limit: number = 8) {
    const response = await this.client.get('/products/search/suggestions', {
      params: { query, limit },
    });
    return response.data;
  }

  async getProduct(id: string) {
    const response = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async getProductBySku(sku: string) {
    const response = await this.client.get(`/products/sku/${sku}`);
    return response.data;
  }

  async createProduct(data: any) {
    const response = await this.client.post('/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: any) {
    const response = await this.client.put(`/products/${id}`, data);
    return response.data;
  }

  async updateProductStatus(id: string, status: string) {
    const response = await this.client.patch(`/products/${id}/status`, { status });
    return response.data;
  }

  async deleteProduct(id: string) {
    await this.client.delete(`/products/${id}`);
  }

  async duplicateProduct(id: string, options?: { newSku?: string; newName?: string; copyImages?: boolean }) {
    const response = await this.client.post(`/products/${id}/duplicate`, options || {});
    return response.data;
  }

  async getProductStatistics() {
    const response = await this.client.get('/products/statistics');
    return response.data;
  }

  async getIncompleteProducts(threshold: number = 80, params?: { page?: number; size?: number }) {
    const response = await this.client.get('/products/incomplete', { params: { threshold, ...params } });
    return response.data;
  }

  async getRecentProductsList(limit: number = 5) {
    const response = await this.client.get('/products/recent', { params: { limit } });
    return response.data;
  }

  async getLowStockProducts(threshold: number = 10, params?: { page?: number; size?: number }) {
    const response = await this.client.get('/products/low-stock', { params: { threshold, ...params } });
    return response.data;
  }

  async getNoImagesProducts(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/products/no-images', { params });
    return response.data;
  }

  // Categories
  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data;
  }

  async getCategoryTree() {
    const response = await this.client.get('/categories/tree');
    return response.data;
  }

  async getCategory(id: string) {
    const response = await this.client.get(`/categories/${id}`);
    return response.data;
  }

  async createCategory(data: any) {
    const response = await this.client.post('/categories', data);
    return response.data;
  }

  async createChildCategory(parentId: string, data: any) {
    const response = await this.client.post(`/categories/${parentId}/children`, data);
    return response.data;
  }

  async updateCategory(id: string, data: any) {
    const response = await this.client.put(`/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string) {
    await this.client.delete(`/categories/${id}`);
  }

  // Attributes
  async getAttributes() {
    const response = await this.client.get('/attributes');
    return response.data;
  }

  async getAttribute(id: string) {
    const response = await this.client.get(`/attributes/${id}`);
    return response.data;
  }

  async createAttribute(data: any) {
    const response = await this.client.post('/attributes', data);
    return response.data;
  }

  async updateAttribute(id: string, data: any) {
    const response = await this.client.put(`/attributes/${id}`, data);
    return response.data;
  }

  async deleteAttribute(id: string) {
    await this.client.delete(`/attributes/${id}`);
  }

  // Attribute Groups
  async getAttributeGroups() {
    const response = await this.client.get('/attribute-groups');
    return response.data;
  }

  // Media Library
  async getMediaLibrary(params?: { page?: number; size?: number; type?: string; folder?: string; search?: string }) {
    const response = await this.client.get('/media', { params });
    return response.data;
  }

  async getMediaById(id: string) {
    const response = await this.client.get(`/media/${id}`);
    return response.data;
  }

  async uploadMediaToLibrary(file: File, folder?: string, tags?: string[]) {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    if (tags) formData.append('tags', tags.join(','));
    const response = await this.client.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async uploadMultipleMedia(files: File[], folder?: string) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (folder) formData.append('folder', folder);
    const response = await this.client.post('/media/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async updateMedia(id: string, data: { tags?: string[]; folder?: string; alt?: string }) {
    const response = await this.client.put(`/media/${id}`, data);
    return response.data;
  }

  async deleteMediaFromLibrary(id: string) {
    await this.client.delete(`/media/${id}`);
  }

  async getMediaFolders() {
    const response = await this.client.get('/media/folders');
    return response.data;
  }

  async getStorageStats() {
    const response = await this.client.get('/media/storage/stats');
    return response.data;
  }

  // Product Media
  async uploadProductMedia(productId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post(`/products/${productId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async addMediaToProduct(productId: string, mediaId: string) {
    const response = await this.client.post(`/products/${productId}/media/${mediaId}`);
    return response.data;
  }

  async removeMediaFromProduct(productId: string, mediaId: string) {
    await this.client.delete(`/products/${productId}/media/${mediaId}`);
  }

  async setMainProductImage(productId: string, mediaId: string) {
    const response = await this.client.patch(`/products/${productId}/media/${mediaId}/main`);
    return response.data;
  }

  async reorderProductMedia(productId: string, mediaIds: string[]) {
    const response = await this.client.patch(`/products/${productId}/media/reorder`, { mediaIds });
    return response.data;
  }

  async addProductMediaFromUrl(productId: string, url: string) {
    const response = await this.client.post(`/products/${productId}/media/from-url`, { url });
    return response.data;
  }

  async addProductExternalUrl(productId: string, url: string, alt?: string) {
    const response = await this.client.post(`/products/${productId}/media/external`, { url, alt });
    return response.data;
  }

  async getProductMedia(productId: string) {
    const response = await this.client.get(`/products/${productId}/media`);
    return response.data;
  }

  // Dashboard
  async getDashboardStats() {
    const response = await this.client.get('/dashboard/stats');
    return response.data;
  }

  // Completeness
  async getCompletenessRules(categoryId?: string) {
    const response = await this.client.get('/completeness/rules', { params: { categoryId } });
    return response.data;
  }

  async getAllCompletenessRules() {
    const response = await this.client.get('/completeness/rules/all');
    return response.data;
  }

  async createCompletenessRule(data: any) {
    const response = await this.client.post('/completeness/rules', data);
    return response.data;
  }

  async updateCompletenessRule(id: string, data: any) {
    const response = await this.client.put(`/completeness/rules/${id}`, data);
    return response.data;
  }

  async deleteCompletenessRule(id: string) {
    await this.client.delete(`/completeness/rules/${id}`);
  }

  async getProductCompleteness(productId: string) {
    const response = await this.client.get(`/completeness/products/${productId}`);
    return response.data;
  }

  async initializeCompletenessRules() {
    const response = await this.client.post('/completeness/initialize');
    return response.data;
  }

  // Workflow
  async createWorkflowRequest(data: any) {
    const response = await this.client.post('/workflow/requests', data);
    return response.data;
  }

  async getPendingWorkflowRequests(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/workflow/requests/pending', { params });
    return response.data;
  }

  async getMyWorkflowRequests(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/workflow/requests/my', { params });
    return response.data;
  }

  async getWorkflowRequest(id: string) {
    const response = await this.client.get(`/workflow/requests/${id}`);
    return response.data;
  }

  async reviewWorkflowRequest(id: string, data: { approved: boolean; comment?: string }) {
    const response = await this.client.post(`/workflow/requests/${id}/review`, data);
    return response.data;
  }

  async cancelWorkflowRequest(id: string) {
    const response = await this.client.post(`/workflow/requests/${id}/cancel`);
    return response.data;
  }

  async getPendingWorkflowCount() {
    const response = await this.client.get('/workflow/requests/pending/count');
    return response.data;
  }

  // Notifications
  async getNotifications(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/workflow/notifications', { params });
    return response.data;
  }

  async getUnreadNotifications() {
    const response = await this.client.get('/workflow/notifications/unread');
    return response.data;
  }

  async getUnreadNotificationCount() {
    const response = await this.client.get('/workflow/notifications/unread/count');
    return response.data;
  }

  async markNotificationAsRead(id: string) {
    const response = await this.client.patch(`/workflow/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.post('/workflow/notifications/read-all');
    return response.data;
  }

  // Locales (i18n)
  async getLocales() {
    const response = await this.client.get('/locales');
    return response.data;
  }

  async getActiveLocales() {
    const response = await this.client.get('/locales/active');
    return response.data;
  }

  async getDefaultLocale() {
    const response = await this.client.get('/locales/default');
    return response.data;
  }

  async createLocale(data: any) {
    const response = await this.client.post('/locales', data);
    return response.data;
  }

  async updateLocale(id: string, data: any) {
    const response = await this.client.put(`/locales/${id}`, data);
    return response.data;
  }

  async deleteLocale(id: string) {
    await this.client.delete(`/locales/${id}`);
  }

  async initializeLocales() {
    const response = await this.client.post('/locales/initialize');
    return response.data;
  }

  // Product Translations
  async getProductTranslations(productId: string) {
    const response = await this.client.get(`/products/${productId}/translations`);
    return response.data;
  }

  async getProductTranslation(productId: string, localeCode: string) {
    const response = await this.client.get(`/products/${productId}/translations/${localeCode}`);
    return response.data;
  }

  async saveProductTranslation(productId: string, localeCode: string, data: any) {
    const response = await this.client.put(`/products/${productId}/translations/${localeCode}`, data);
    return response.data;
  }

  async saveAllProductTranslations(productId: string, translations: any[]) {
    const response = await this.client.put(`/products/${productId}/translations`, translations);
    return response.data;
  }

  async deleteProductTranslation(productId: string, localeCode: string) {
    await this.client.delete(`/products/${productId}/translations/${localeCode}`);
  }

  // Audit Logs
  async getAuditLogs(params?: {
    page?: number;
    size?: number;
    entityType?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/audit', { params });
    return response.data;
  }

  async getRecentAuditLogs(days: number = 7, params?: { page?: number; size?: number }) {
    const response = await this.client.get('/audit/recent', { params: { days, ...params } });
    return response.data;
  }

  async getEntityHistory(entityType: string, entityId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/audit/entity/${entityType}/${entityId}`, { params });
    return response.data;
  }

  async getProductHistory(productId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/products/${productId}/history`, { params });
    return response.data;
  }

  async getUserAuditLogs(userId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/audit/user/${userId}`, { params });
    return response.data;
  }

  async getAuditStats(days: number = 30) {
    const response = await this.client.get('/audit/stats', { params: { days } });
    return response.data;
  }

  // Bulk Operations
  async bulkUpdateProducts(productIds: string[], updates: any) {
    const response = await this.client.post('/products/bulk/update', { productIds, updates });
    return response.data;
  }

  async bulkDeleteProducts(productIds: string[]) {
    const response = await this.client.post('/products/bulk/delete', { productIds });
    return response.data;
  }

  async bulkPublishProducts(productIds: string[]) {
    const response = await this.client.post('/products/bulk/publish', { productIds });
    return response.data;
  }

  async bulkUnpublishProducts(productIds: string[]) {
    const response = await this.client.post('/products/bulk/unpublish', { productIds });
    return response.data;
  }

  // Advanced Dashboard
  async getAdvancedDashboardStats() {
    const response = await this.client.get('/dashboard/stats/advanced');
    return response.data;
  }

  async getRecentProducts(limit: number = 10) {
    const response = await this.client.get('/dashboard/recent-products', { params: { limit } });
    return response.data;
  }

  async getProductsByStatus() {
    const response = await this.client.get('/dashboard/products-by-status');
    return response.data;
  }

  // Import/Export
  async previewImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post('/data-transfer/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async importProducts(file: File, mappings: Record<string, string>, duplicateStrategy: string = 'SKIP') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mappings', JSON.stringify(mappings));
    formData.append('duplicateStrategy', duplicateStrategy);
    const response = await this.client.post('/data-transfer/import/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getImportJobs(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/data-transfer/import/jobs', { params });
    return response.data;
  }

  async getImportJob(jobId: string) {
    const response = await this.client.get(`/data-transfer/import/jobs/${jobId}`);
    return response.data;
  }

  async cancelImportJob(jobId: string) {
    const response = await this.client.post(`/data-transfer/import/jobs/${jobId}/cancel`);
    return response.data;
  }

  async downloadImportTemplate() {
    const response = await this.client.get('/data-transfer/import/template', {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportProducts(options: {
    format?: 'CSV' | 'XLSX';
    fields?: string[];
    status?: string;
    categoryId?: string;
    productIds?: string[];
  }) {
    const response = await this.client.post('/data-transfer/export/products', options, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getExportFields() {
    const response = await this.client.get('/data-transfer/export/fields');
    return response.data;
  }

  // API Keys
  async getApiKeys(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/integration/api-keys', { params });
    return response.data;
  }

  async getApiKey(id: string) {
    const response = await this.client.get(`/integration/api-keys/${id}`);
    return response.data;
  }

  async createApiKey(data: {
    name: string;
    description?: string;
    permissions: string[];
    allowedIps?: string[];
    rateLimit?: number;
    expiresAt?: string;
  }) {
    const response = await this.client.post('/integration/api-keys', data);
    return response.data;
  }

  async updateApiKey(id: string, data: any) {
    const response = await this.client.put(`/integration/api-keys/${id}`, data);
    return response.data;
  }

  async revokeApiKey(id: string) {
    const response = await this.client.post(`/integration/api-keys/${id}/revoke`);
    return response.data;
  }

  async deleteApiKey(id: string) {
    await this.client.delete(`/integration/api-keys/${id}`);
  }

  async getApiKeyPermissions() {
    const response = await this.client.get('/integration/api-keys/permissions');
    return response.data;
  }

  // Webhooks
  async getWebhooks(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/integration/webhooks', { params });
    return response.data;
  }

  async getWebhook(id: string) {
    const response = await this.client.get(`/integration/webhooks/${id}`);
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    url: string;
    description?: string;
    events: string[];
    secretKey?: string;
    retryCount?: number;
    customHeaders?: Record<string, string>;
  }) {
    const response = await this.client.post('/integration/webhooks', data);
    return response.data;
  }

  async updateWebhook(id: string, data: any) {
    const response = await this.client.put(`/integration/webhooks/${id}`, data);
    return response.data;
  }

  async deleteWebhook(id: string) {
    await this.client.delete(`/integration/webhooks/${id}`);
  }

  async testWebhook(id: string) {
    const response = await this.client.post(`/integration/webhooks/${id}/test`);
    return response.data;
  }

  async getWebhookLogs(id: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/integration/webhooks/${id}/logs`, { params });
    return response.data;
  }

  async getWebhookEvents() {
    const response = await this.client.get('/integration/webhooks/events');
    return response.data;
  }

  // Channels
  async getChannels() {
    const response = await this.client.get('/channels');
    return response.data;
  }

  async getActiveChannels() {
    const response = await this.client.get('/channels/active');
    return response.data;
  }

  async getChannel(id: string) {
    const response = await this.client.get(`/channels/${id}`);
    return response.data;
  }

  async createChannel(data: {
    code: string;
    name: string;
    description?: string;
    type: string;
    currency?: string;
    locale?: string;
    url?: string;
    color?: string;
    requiredAttributes?: string[];
    allowedCategoryIds?: string[];
    position?: number;
  }) {
    const response = await this.client.post('/channels', data);
    return response.data;
  }

  async updateChannel(id: string, data: any) {
    const response = await this.client.put(`/channels/${id}`, data);
    return response.data;
  }

  async deleteChannel(id: string) {
    await this.client.delete(`/channels/${id}`);
  }

  async getChannelTypes() {
    const response = await this.client.get('/channels/types');
    return response.data;
  }

  async getChannelStats() {
    const response = await this.client.get('/channels/stats');
    return response.data;
  }

  async getChannelStatsById(channelId: string) {
    const response = await this.client.get(`/channels/${channelId}/stats`);
    return response.data;
  }

  // Product-Channel operations
  async getProductChannels(productId: string) {
    const response = await this.client.get(`/channels/product/${productId}`);
    return response.data;
  }

  async getChannelProducts(channelId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/channels/${channelId}/products`, { params });
    return response.data;
  }

  async assignProductToChannel(productId: string, channelId: string, data?: { enabled?: boolean; channelValues?: Record<string, any> }) {
    const response = await this.client.post(`/channels/product/${productId}/assign`, {
      channelId,
      enabled: data?.enabled ?? true,
      channelValues: data?.channelValues,
    });
    return response.data;
  }

  async removeProductFromChannel(productId: string, channelId: string) {
    await this.client.delete(`/channels/product/${productId}/channel/${channelId}`);
  }

  async publishToChannel(productId: string, channelId: string) {
    const response = await this.client.post(`/channels/product/${productId}/channel/${channelId}/publish`);
    return response.data;
  }

  async unpublishFromChannel(productId: string, channelId: string) {
    const response = await this.client.post(`/channels/product/${productId}/channel/${channelId}/unpublish`);
    return response.data;
  }

  async bulkPublishToChannel(channelId: string, productIds: string[]) {
    const response = await this.client.post(`/channels/${channelId}/bulk-publish`, { productIds });
    return response.data;
  }

  async validateProductForChannel(productId: string, channelId: string) {
    const response = await this.client.get(`/channels/product/${productId}/channel/${channelId}/validate`);
    return response.data;
  }

  // Variant Axes
  async getVariantAxes() {
    const response = await this.client.get('/variants/axes');
    return response.data;
  }

  async getActiveVariantAxes() {
    const response = await this.client.get('/variants/axes/active');
    return response.data;
  }

  async createVariantAxis(data: {
    code: string;
    name: string;
    description?: string;
    attributeId: string;
    position?: number;
    isActive?: boolean;
  }) {
    const response = await this.client.post('/variants/axes', data);
    return response.data;
  }

  async updateVariantAxis(id: string, data: any) {
    const response = await this.client.put(`/variants/axes/${id}`, data);
    return response.data;
  }

  async deleteVariantAxis(id: string) {
    await this.client.delete(`/variants/axes/${id}`);
  }

  // Product Variants
  async getVariantConfig(productId: string) {
    const response = await this.client.get(`/variants/product/${productId}`);
    return response.data;
  }

  async configureVariants(productId: string, axisIds: string[], skuPattern?: string) {
    const response = await this.client.post(`/variants/product/${productId}/configure`, {
      axisIds,
      skuPattern,
    });
    return response.data;
  }

  async getProductVariants(productId: string) {
    const response = await this.client.get(`/variants/product/${productId}/variants`);
    return response.data;
  }

  async createVariant(productId: string, data: {
    sku?: string;
    name?: string;
    axisValues: Record<string, string>;
    price?: number;
    stockQuantity?: number;
  }) {
    const response = await this.client.post(`/variants/product/${productId}/variants`, data);
    return response.data;
  }

  async updateVariant(variantId: string, data: any) {
    const response = await this.client.put(`/variants/variant/${variantId}`, data);
    return response.data;
  }

  async deleteVariant(variantId: string) {
    await this.client.delete(`/variants/variant/${variantId}`);
  }

  async getVariantMatrix(productId: string) {
    const response = await this.client.get(`/variants/product/${productId}/matrix`);
    return response.data;
  }

  async bulkCreateVariants(productId: string, combinations: Record<string, string>[]) {
    const response = await this.client.post(`/variants/product/${productId}/bulk-create`, {
      combinations,
    });
    return response.data;
  }

  // Product Families
  async getFamilies() {
    const response = await this.client.get('/families');
    return response.data;
  }

  async getActiveFamilies() {
    const response = await this.client.get('/families/active');
    return response.data;
  }

  async getFamily(id: string) {
    const response = await this.client.get(`/families/${id}`);
    return response.data;
  }

  async getFamilyDetail(id: string) {
    const response = await this.client.get(`/families/${id}/detail`);
    return response.data;
  }

  async createFamily(data: {
    code: string;
    name: string;
    description?: string;
    imageUrl?: string;
    isActive?: boolean;
  }) {
    const response = await this.client.post('/families', data);
    return response.data;
  }

  async updateFamily(id: string, data: any) {
    const response = await this.client.put(`/families/${id}`, data);
    return response.data;
  }

  async deleteFamily(id: string) {
    await this.client.delete(`/families/${id}`);
  }

  async getFamilyAttributes(familyId: string) {
    const response = await this.client.get(`/families/${familyId}/attributes`);
    return response.data;
  }

  async addFamilyAttribute(familyId: string, data: {
    attributeId: string;
    isRequired?: boolean;
    weight?: number;
    position?: number;
    groupCode?: string;
    defaultValue?: string;
    placeholder?: string;
    helpText?: string;
  }) {
    const response = await this.client.post(`/families/${familyId}/attributes`, data);
    return response.data;
  }

  async updateFamilyAttribute(familyId: string, attributeId: string, data: any) {
    const response = await this.client.put(`/families/${familyId}/attributes/${attributeId}`, data);
    return response.data;
  }

  async removeFamilyAttribute(familyId: string, attributeId: string) {
    await this.client.delete(`/families/${familyId}/attributes/${attributeId}`);
  }

  async setFamilyAttributes(familyId: string, attributes: any[]) {
    const response = await this.client.put(`/families/${familyId}/attributes/bulk`, { attributes });
    return response.data;
  }

  async setFamilyChannelRequirement(familyId: string, data: {
    channelId: string;
    requiredAttributeIds?: string[];
    minCompletenessScore?: number;
  }) {
    const response = await this.client.post(`/families/${familyId}/channel-requirements`, data);
    return response.data;
  }

  // Data Quality Rules
  async getQualityRules() {
    const response = await this.client.get('/quality/rules');
    return response.data;
  }

  async getActiveQualityRules() {
    const response = await this.client.get('/quality/rules/active');
    return response.data;
  }

  async getQualityRule(id: string) {
    const response = await this.client.get(`/quality/rules/${id}`);
    return response.data;
  }

  async createQualityRule(data: {
    code: string;
    name: string;
    description?: string;
    type: string;
    severity?: string;
    attributeId?: string;
    categoryId?: string;
    familyId?: string;
    channelId?: string;
    parameters?: Record<string, any>;
    errorMessage?: string;
    isActive?: boolean;
    position?: number;
  }) {
    const response = await this.client.post('/quality/rules', data);
    return response.data;
  }

  async updateQualityRule(id: string, data: any) {
    const response = await this.client.put(`/quality/rules/${id}`, data);
    return response.data;
  }

  async deleteQualityRule(id: string) {
    await this.client.delete(`/quality/rules/${id}`);
  }

  async toggleQualityRule(id: string) {
    const response = await this.client.post(`/quality/rules/${id}/toggle`);
    return response.data;
  }

  async getQualityRuleTypes() {
    const response = await this.client.get('/quality/rule-types');
    return response.data;
  }

  async getQualitySeverities() {
    const response = await this.client.get('/quality/severities');
    return response.data;
  }

  // Quality Validation
  async validateProductQuality(productId: string) {
    const response = await this.client.get(`/quality/validate/product/${productId}`);
    return response.data;
  }

  async validateProductsQuality(productIds: string[]) {
    const response = await this.client.post('/quality/validate/products', { productIds });
    return response.data;
  }

  async validateAllProductsQuality(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/quality/validate/all', { params });
    return response.data;
  }

  async getProductQualityHistory(productId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/quality/history/product/${productId}`, { params });
    return response.data;
  }

  async getQualityDashboard() {
    const response = await this.client.get('/quality/dashboard');
    return response.data;
  }

  // Shopify Integration
  async getShopifyStores(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/shopify/stores', { params });
    return response.data;
  }

  async getShopifyStore(id: string) {
    const response = await this.client.get(`/shopify/stores/${id}`);
    return response.data;
  }

  async createShopifyStore(data: {
    name: string;
    shopDomain: string;
    accessToken: string;
    description?: string;
    apiVersion?: string;
    syncProducts?: boolean;
    syncInventory?: boolean;
    syncPrices?: boolean;
    syncImages?: boolean;
    syncDirection?: string;
    autoSyncEnabled?: boolean;
    syncIntervalMinutes?: number;
    defaultProductType?: string;
    defaultVendor?: string;
  }) {
    const response = await this.client.post('/shopify/stores', data);
    return response.data;
  }

  async updateShopifyStore(id: string, data: any) {
    const response = await this.client.put(`/shopify/stores/${id}`, data);
    return response.data;
  }

  async deleteShopifyStore(id: string) {
    await this.client.delete(`/shopify/stores/${id}`);
  }

  async testShopifyConnection(id: string) {
    const response = await this.client.post(`/shopify/stores/${id}/test`);
    return response.data;
  }

  async syncShopifyProducts(storeId: string, data?: { productIds?: string[]; force?: boolean }) {
    const response = await this.client.post(`/shopify/stores/${storeId}/sync`, data);
    return response.data;
  }

  async syncSingleProductToShopify(storeId: string, productId: string) {
    const response = await this.client.post(`/shopify/stores/${storeId}/sync/products/${productId}`);
    return response.data;
  }

  async getShopifySyncLogs(storeId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/shopify/stores/${storeId}/logs`, { params });
    return response.data;
  }

  async getShopifyProductMappings(storeId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/shopify/stores/${storeId}/mappings`, { params });
    return response.data;
  }

  async unlinkShopifyProduct(storeId: string, productId: string) {
    await this.client.delete(`/shopify/stores/${storeId}/mappings/products/${productId}`);
  }

  // Mercado Livre Integration
  async getMercadoLivreAccounts(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/mercadolivre/accounts', { params });
    return response.data;
  }

  async getMercadoLivreAccount(id: string) {
    const response = await this.client.get(`/mercadolivre/accounts/${id}`);
    return response.data;
  }

  async createMercadoLivreAccount(data: {
    name: string;
    mlUserId: string;
    mlNickname?: string;
    mlEmail?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    siteId?: string;
    description?: string;
    syncProducts?: boolean;
    syncStock?: boolean;
    syncPrices?: boolean;
    syncOrders?: boolean;
    autoSyncEnabled?: boolean;
    syncIntervalMinutes?: number;
    defaultListingType?: string;
    defaultWarranty?: string;
    defaultCondition?: string;
    defaultShippingMode?: string;
    freeShippingEnabled?: boolean;
  }) {
    const response = await this.client.post('/mercadolivre/accounts', data);
    return response.data;
  }

  async updateMercadoLivreAccount(id: string, data: any) {
    const response = await this.client.put(`/mercadolivre/accounts/${id}`, data);
    return response.data;
  }

  async deleteMercadoLivreAccount(id: string) {
    await this.client.delete(`/mercadolivre/accounts/${id}`);
  }

  async testMercadoLivreConnection(id: string) {
    const response = await this.client.post(`/mercadolivre/accounts/${id}/test`);
    return response.data;
  }

  async syncMercadoLivreProducts(accountId: string, data?: { productIds?: string[]; createNew?: boolean }) {
    const response = await this.client.post(`/mercadolivre/accounts/${accountId}/sync`, data);
    return response.data;
  }

  async syncSingleProductToMercadoLivre(accountId: string, productId: string) {
    const response = await this.client.post(`/mercadolivre/accounts/${accountId}/sync/products/${productId}`);
    return response.data;
  }

  async getMercadoLivreProductMappings(accountId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/mercadolivre/accounts/${accountId}/mappings`, { params });
    return response.data;
  }

  async unlinkMercadoLivreProduct(accountId: string, productId: string) {
    await this.client.delete(`/mercadolivre/accounts/${accountId}/mappings/products/${productId}`);
  }

  async pauseMercadoLivreProduct(accountId: string, productId: string) {
    await this.client.post(`/mercadolivre/accounts/${accountId}/mappings/products/${productId}/pause`);
  }

  async reactivateMercadoLivreProduct(accountId: string, productId: string) {
    await this.client.post(`/mercadolivre/accounts/${accountId}/mappings/products/${productId}/reactivate`);
  }

  async getMercadoLivreCategories(siteId: string = 'MLB') {
    const response = await this.client.get('/mercadolivre/categories', { params: { siteId } });
    return response.data;
  }

  async getMercadoLivreCategoryAttributes(categoryId: string) {
    const response = await this.client.get(`/mercadolivre/categories/${categoryId}/attributes`);
    return response.data;
  }

  // Amazon Integration
  async getAmazonAccounts(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/amazon/accounts', { params });
    return response.data;
  }

  async getAmazonAccount(id: string) {
    const response = await this.client.get(`/amazon/accounts/${id}`);
    return response.data;
  }

  async createAmazonAccount(data: {
    name: string;
    sellerId: string;
    marketplaceId?: string;
    marketplaceName?: string;
    refreshToken: string;
    lwaClientId?: string;
    lwaClientSecret?: string;
    description?: string;
    syncProducts?: boolean;
    syncInventory?: boolean;
    syncPrices?: boolean;
    syncOrders?: boolean;
    autoSyncEnabled?: boolean;
    syncIntervalMinutes?: number;
    defaultFulfillmentChannel?: string;
    defaultCondition?: string;
    defaultProductType?: string;
  }) {
    const response = await this.client.post('/amazon/accounts', data);
    return response.data;
  }

  async updateAmazonAccount(id: string, data: any) {
    const response = await this.client.put(`/amazon/accounts/${id}`, data);
    return response.data;
  }

  async deleteAmazonAccount(id: string) {
    await this.client.delete(`/amazon/accounts/${id}`);
  }

  async testAmazonConnection(id: string) {
    const response = await this.client.post(`/amazon/accounts/${id}/test`);
    return response.data;
  }

  async getAmazonAccountStats(id: string) {
    const response = await this.client.get(`/amazon/accounts/${id}/stats`);
    return response.data;
  }

  async syncAmazonProducts(accountId: string, data?: { productIds?: string[]; createNew?: boolean }) {
    const response = await this.client.post(`/amazon/accounts/${accountId}/sync`, data);
    return response.data;
  }

  async syncSingleProductToAmazon(accountId: string, productId: string) {
    const response = await this.client.post(`/amazon/accounts/${accountId}/sync/products/${productId}`);
    return response.data;
  }

  async getAmazonProductMappings(accountId: string, params?: { page?: number; size?: number }) {
    const response = await this.client.get(`/amazon/accounts/${accountId}/mappings`, { params });
    return response.data;
  }

  async unlinkAmazonProduct(accountId: string, productId: string) {
    await this.client.delete(`/amazon/accounts/${accountId}/mappings/products/${productId}`);
  }

  async deactivateAmazonProduct(accountId: string, productId: string) {
    await this.client.post(`/amazon/accounts/${accountId}/mappings/products/${productId}/deactivate`);
  }

  async reactivateAmazonProduct(accountId: string, productId: string) {
    await this.client.post(`/amazon/accounts/${accountId}/mappings/products/${productId}/reactivate`);
  }

  async getAmazonMarketplaces() {
    const response = await this.client.get('/amazon/marketplaces');
    return response.data;
  }

  // Marketplace Channel Validation
  async validateProductForAllMarketplaces(productId: string) {
    const response = await this.client.get(`/channel-validation/product/${productId}`);
    return response.data;
  }

  async validateProductForMarketplace(productId: string, channelCode: string) {
    const response = await this.client.get(`/channel-validation/product/${productId}/channel/${channelCode}`);
    return response.data;
  }

  async getAvailableMarketplaceChannels() {
    const response = await this.client.get('/channel-validation/channels');
    return response.data;
  }

  async bulkValidateForMarketplace(channelCode: string, productIds: string[]) {
    const response = await this.client.post(`/channel-validation/bulk/channel/${channelCode}`, { productIds });
    return response.data;
  }

  // AI Services
  async generateDescription(data: {
    productId?: string;
    productName: string;
    productSku?: string;
    brand?: string;
    category?: string;
    attributes?: Record<string, string>;
    keywords?: string[];
    tone?: string;
    length?: string;
    includeFeatures?: boolean;
    includeBenefits?: boolean;
    targetAudience?: string;
    language?: string;
  }) {
    const response = await this.client.post('/ai/generate/description', data);
    return response.data;
  }

  async generateSEO(data: {
    productId?: string;
    productName: string;
    description?: string;
    brand?: string;
    category?: string;
    keywords?: string[];
    language?: string;
  }) {
    const response = await this.client.post('/ai/generate/seo', data);
    return response.data;
  }

  async generateMarketplaceContent(data: {
    productId?: string;
    productName: string;
    description?: string;
    brand?: string;
    category?: string;
    price?: number;
    marketplace: string;
    language?: string;
  }) {
    const response = await this.client.post('/ai/generate/marketplace', data);
    return response.data;
  }

  async translateContent(data: {
    productId?: string;
    content: Record<string, string>;
    sourceLanguage?: string;
    targetLanguage: string;
  }) {
    const response = await this.client.post('/ai/translate', data);
    return response.data;
  }

  async enrichProduct(data: {
    productId?: string;
    productName: string;
    description?: string;
    brand?: string;
    existingAttributes?: Record<string, string>;
  }) {
    const response = await this.client.post('/ai/enrich', data);
    return response.data;
  }

  // AI Providers
  async getAIProviders(params?: { page?: number; size?: number }) {
    const response = await this.client.get('/ai/providers', { params });
    return response.data;
  }

  async getActiveAIProviders() {
    const response = await this.client.get('/ai/providers/active');
    return response.data;
  }

  async getAIProvider(id: string) {
    const response = await this.client.get(`/ai/providers/${id}`);
    return response.data;
  }

  async createAIProvider(data: {
    name: string;
    type: string;
    apiKey: string;
    apiEndpoint?: string;
    defaultModel?: string;
    maxTokens?: number;
    temperature?: number;
    monthlyBudget?: number;
    isDefault?: boolean;
  }) {
    const response = await this.client.post('/ai/providers', data);
    return response.data;
  }

  async updateAIProvider(id: string, data: any) {
    const response = await this.client.put(`/ai/providers/${id}`, data);
    return response.data;
  }

  async deleteAIProvider(id: string) {
    await this.client.delete(`/ai/providers/${id}`);
  }

  async testAIProvider(id: string) {
    const response = await this.client.post(`/ai/providers/${id}/test`);
    return response.data;
  }

  async getAIProviderTypes() {
    const response = await this.client.get('/ai/providers/types');
    return response.data;
  }

  // AI Usage
  async getAIUsageStats(days: number = 30) {
    const response = await this.client.get('/ai/usage/stats', { params: { days } });
    return response.data;
  }

  // AI Prompts
  async getAIPrompts() {
    const response = await this.client.get('/ai/prompts');
    return response.data;
  }

  async getAIPromptsByCategory(category: string) {
    const response = await this.client.get(`/ai/prompts/category/${category}`);
    return response.data;
  }

  async createAIPrompt(data: {
    code: string;
    name: string;
    description?: string;
    category: string;
    systemPrompt: string;
    userPromptTemplate: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    const response = await this.client.post('/ai/prompts', data);
    return response.data;
  }

  async updateAIPrompt(id: string, data: any) {
    const response = await this.client.put(`/ai/prompts/${id}`, data);
    return response.data;
  }

  async deleteAIPrompt(id: string) {
    await this.client.delete(`/ai/prompts/${id}`);
  }

  async initializeAIPrompts() {
    const response = await this.client.post('/ai/prompts/initialize');
    return response.data;
  }

  // AI Actions
  async getAIActions() {
    const response = await this.client.get('/ai/actions');
    return response.data;
  }

  // ==================== PRODUCT TYPES ====================

  // Get product type info with related data
  async getProductTypeInfo(productId: string) {
    const response = await this.client.get(`/products/${productId}/type-info`);
    return response.data;
  }

  // Convert product type
  async convertProductType(productId: string, targetType: string) {
    const response = await this.client.post(`/products/${productId}/convert-type`, { targetType });
    return response.data;
  }

  // Bundle Components
  async getBundleComponents(bundleId: string) {
    const response = await this.client.get(`/products/${bundleId}/bundle-components`);
    return response.data;
  }

  async addBundleComponent(bundleId: string, data: {
    componentId: string;
    quantity?: number;
    position?: number;
    specialPrice?: number;
  }) {
    const response = await this.client.post(`/products/${bundleId}/bundle-components`, data);
    return response.data;
  }

  async updateBundleComponent(componentId: string, data: {
    quantity?: number;
    position?: number;
    specialPrice?: number;
  }) {
    const response = await this.client.put(`/products/bundle-components/${componentId}`, data);
    return response.data;
  }

  async removeBundleComponent(componentId: string) {
    await this.client.delete(`/products/bundle-components/${componentId}`);
  }

  async setBundleComponents(bundleId: string, components: Array<{
    componentId: string;
    quantity?: number;
    position?: number;
    specialPrice?: number;
  }>) {
    const response = await this.client.put(`/products/${bundleId}/bundle-components`, { components });
    return response.data;
  }

  // Grouped Products
  async getGroupedItems(parentId: string) {
    const response = await this.client.get(`/products/${parentId}/grouped-items`);
    return response.data;
  }

  async addGroupedItem(parentId: string, data: {
    childId: string;
    defaultQuantity?: number;
    minQuantity?: number;
    maxQuantity?: number;
    position?: number;
  }) {
    const response = await this.client.post(`/products/${parentId}/grouped-items`, data);
    return response.data;
  }

  async updateGroupedItem(itemId: string, data: {
    defaultQuantity?: number;
    minQuantity?: number;
    maxQuantity?: number;
    position?: number;
  }) {
    const response = await this.client.put(`/products/grouped-items/${itemId}`, data);
    return response.data;
  }

  async removeGroupedItem(itemId: string) {
    await this.client.delete(`/products/grouped-items/${itemId}`);
  }

  async setGroupedItems(parentId: string, items: Array<{
    childId: string;
    defaultQuantity?: number;
    minQuantity?: number;
    maxQuantity?: number;
    position?: number;
  }>) {
    const response = await this.client.put(`/products/${parentId}/grouped-items`, { items });
    return response.data;
  }

  // Stock Operations
  async validateStock(productId: string, quantity: number) {
    const response = await this.client.get(`/products/${productId}/stock/validate`, { params: { quantity } });
    return response.data;
  }

  async decrementStock(productId: string, quantity: number) {
    const response = await this.client.post(`/products/${productId}/stock/decrement`, { quantity });
    return response.data;
  }

  async getBundlePrice(bundleId: string) {
    const response = await this.client.get(`/products/${bundleId}/bundle-price`);
    return response.data;
  }

  async getProductUsage(productId: string) {
    const response = await this.client.get(`/products/${productId}/usage`);
    return response.data;
  }

  // ==================== SPED FISCAL ====================

  /**
   * Retorna todos os tipos de item SPED disponíveis
   */
  async getSpedItemTypes() {
    const response = await this.client.get('/sped/item-types');
    return response.data;
  }

  /**
   * Retorna um tipo de item SPED pelo código
   */
  async getSpedItemTypeByCode(code: string) {
    const response = await this.client.get(`/sped/item-types/by-code/${code}`);
    return response.data;
  }

  /**
   * Retorna um tipo de item SPED pelo valor do enum
   */
  async getSpedItemType(value: string) {
    const response = await this.client.get(`/sped/item-types/${value}`);
    return response.data;
  }

  /**
   * Retorna o tipo SPED padrão para produtos físicos
   */
  async getDefaultSpedItemTypeForPhysical() {
    const response = await this.client.get('/sped/item-types/default/physical');
    return response.data;
  }

  /**
   * Retorna o tipo SPED padrão para produtos virtuais/serviços
   */
  async getDefaultSpedItemTypeForVirtual() {
    const response = await this.client.get('/sped/item-types/default/virtual');
    return response.data;
  }
}

export const api = new ApiClient();
