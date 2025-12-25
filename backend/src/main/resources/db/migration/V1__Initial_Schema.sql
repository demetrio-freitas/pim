-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    locale VARCHAR(10) DEFAULT 'pt_BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    avatar VARCHAR(500),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50) NOT NULL
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    position INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    path VARCHAR(1000) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    url_key VARCHAR(255) UNIQUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    image VARCHAR(500),
    locale VARCHAR(10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_path ON categories(path);
CREATE INDEX idx_categories_active ON categories(is_active);

-- Attribute Groups
CREATE TABLE attribute_groups (
    id UUID PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Attributes
CREATE TABLE attributes (
    id UUID PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    group_id UUID REFERENCES attribute_groups(id) ON DELETE SET NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_unique BOOLEAN NOT NULL DEFAULT FALSE,
    is_filterable BOOLEAN NOT NULL DEFAULT FALSE,
    is_searchable BOOLEAN NOT NULL DEFAULT FALSE,
    is_localizable BOOLEAN NOT NULL DEFAULT FALSE,
    is_scopable BOOLEAN NOT NULL DEFAULT FALSE,
    use_in_grid BOOLEAN NOT NULL DEFAULT TRUE,
    position INTEGER NOT NULL DEFAULT 0,
    validation_rules TEXT,
    default_value VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attributes_group ON attributes(group_id);
CREATE INDEX idx_attributes_type ON attributes(type);

-- Attribute Options
CREATE TABLE attribute_options (
    id UUID PRIMARY KEY,
    attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(attribute_id, code)
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description TEXT,
    price DECIMAL(19,4),
    cost_price DECIMAL(19,4),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    type VARCHAR(50) NOT NULL DEFAULT 'SIMPLE',
    parent_id UUID REFERENCES products(id) ON DELETE CASCADE,
    weight DECIMAL(19,4) NOT NULL DEFAULT 0,
    brand VARCHAR(255),
    manufacturer VARCHAR(255),
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords VARCHAR(500),
    url_key VARCHAR(255) UNIQUE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    completeness_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_parent ON products(parent_id);
CREATE INDEX idx_products_completeness ON products(completeness_score);

-- Product Categories (M2M)
CREATE TABLE product_categories (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_product_categories_product ON product_categories(product_id);
CREATE INDEX idx_product_categories_category ON product_categories(category_id);

-- Product Attributes (EAV)
CREATE TABLE product_attributes (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    text_value TEXT,
    number_value DOUBLE PRECISION,
    boolean_value BOOLEAN,
    json_value TEXT,
    locale VARCHAR(10),
    channel VARCHAR(50)
);

CREATE INDEX idx_product_attributes_product ON product_attributes(product_id);
CREATE INDEX idx_product_attributes_attribute ON product_attributes(attribute_id);
CREATE INDEX idx_product_attributes_locale ON product_attributes(locale);

-- Product Media
CREATE TABLE product_media (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'IMAGE',
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    path VARCHAR(500) NOT NULL,
    url VARCHAR(500),
    alt VARCHAR(255),
    title VARCHAR(255),
    position INTEGER NOT NULL DEFAULT 0,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    locale VARCHAR(10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_media_product ON product_media(product_id);
CREATE INDEX idx_product_media_type ON product_media(type);
