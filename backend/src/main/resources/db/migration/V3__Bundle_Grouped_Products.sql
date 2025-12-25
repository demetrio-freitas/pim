-- V3__Bundle_Grouped_Products.sql
-- Add support for BUNDLE and GROUPED product types

-- Bundle components table
-- Stores the relationship between bundle products and their component products
CREATE TABLE bundle_components (
    id UUID PRIMARY KEY,
    bundle_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    position INT NOT NULL DEFAULT 0,
    special_price DECIMAL(19, 4),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bundle_id, component_id)
);

-- Indexes for bundle_components
CREATE INDEX idx_bundle_components_bundle_id ON bundle_components(bundle_id);
CREATE INDEX idx_bundle_components_component_id ON bundle_components(component_id);

-- Grouped product items table
-- Stores the relationship between grouped products and their child products
CREATE TABLE grouped_product_items (
    id UUID PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    default_quantity INT NOT NULL DEFAULT 1 CHECK (default_quantity > 0),
    min_quantity INT NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
    max_quantity INT,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (parent_id, child_id),
    CHECK (max_quantity IS NULL OR max_quantity >= min_quantity)
);

-- Indexes for grouped_product_items
CREATE INDEX idx_grouped_product_items_parent_id ON grouped_product_items(parent_id);
CREATE INDEX idx_grouped_product_items_child_id ON grouped_product_items(child_id);

-- Add comment descriptions for documentation
COMMENT ON TABLE bundle_components IS 'Components that make up a bundle product. When a bundle is purchased, all component stocks are decremented.';
COMMENT ON COLUMN bundle_components.quantity IS 'Number of this component included in one bundle unit';
COMMENT ON COLUMN bundle_components.special_price IS 'Optional override price for this component within the bundle';
COMMENT ON COLUMN bundle_components.position IS 'Display order within the bundle';

COMMENT ON TABLE grouped_product_items IS 'Products grouped together for display. Each can be added to cart separately.';
COMMENT ON COLUMN grouped_product_items.default_quantity IS 'Default quantity shown in the grouped product display';
COMMENT ON COLUMN grouped_product_items.min_quantity IS 'Minimum quantity that can be added to cart';
COMMENT ON COLUMN grouped_product_items.max_quantity IS 'Maximum quantity that can be added to cart (null = unlimited)';
COMMENT ON COLUMN grouped_product_items.position IS 'Display order within the grouped product';
