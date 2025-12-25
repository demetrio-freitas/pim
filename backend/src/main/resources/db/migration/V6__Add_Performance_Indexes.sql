-- Performance indexes for frequently queried columns
-- These indexes significantly improve query performance for common operations

-- Products table indexes
-- Index for status-based queries (very common for dashboard and filtering)
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Index for stock queries (low stock alerts, inventory management)
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);

-- Index for completeness score queries (quality reports)
CREATE INDEX IF NOT EXISTS idx_products_completeness ON products(completeness_score);

-- Index for created_at (recent products, sorting)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Index for parent_id (variant queries)
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON products(parent_id);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_products_status_type ON products(status, type);

-- Index for SKU lookups (already unique constraint, but explicit index helps)
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Index for name searches (partial match performance)
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(LOWER(name));

-- Categories table indexes
-- Index for parent lookup (tree building)
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Index for position (ordering)
CREATE INDEX IF NOT EXISTS idx_categories_position ON categories(position);

-- Index for active categories
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Index for code lookups
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);

-- Product-Category relationship (join table)
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);

-- Product Media indexes
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_is_main ON product_media(is_main);

-- Product Attributes indexes
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_attribute_id ON product_attributes(attribute_id);

-- Workflow requests indexes
CREATE INDEX IF NOT EXISTS idx_workflow_requests_status ON workflow_requests(status);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_requester_id ON workflow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_created_at ON workflow_requests(created_at DESC);

-- Workflow notifications indexes
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_user_id ON workflow_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_is_read ON workflow_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_created_at ON workflow_notifications(created_at DESC);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Shopify mappings indexes
CREATE INDEX IF NOT EXISTS idx_shopify_product_mappings_store_id ON shopify_product_mappings(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_mappings_product_id ON shopify_product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_store_id ON shopify_sync_logs(store_id);

-- Quality rules indexes
CREATE INDEX IF NOT EXISTS idx_quality_rules_category_id ON quality_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_quality_rules_is_active ON quality_rules(is_active);

-- Completeness rules indexes
CREATE INDEX IF NOT EXISTS idx_completeness_rules_category_id ON completeness_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_completeness_rules_is_active ON completeness_rules(is_active);

-- Variant axes indexes
CREATE INDEX IF NOT EXISTS idx_variant_axes_position ON variant_axes(position);

-- Comments explaining the purpose
COMMENT ON INDEX idx_products_status IS 'Optimizes status-based filtering and dashboard statistics';
COMMENT ON INDEX idx_products_stock_quantity IS 'Optimizes low stock queries and inventory reports';
COMMENT ON INDEX idx_categories_parent_id IS 'Optimizes category tree building queries';
