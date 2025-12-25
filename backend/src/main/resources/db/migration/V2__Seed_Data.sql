-- Default Permissions
INSERT INTO permissions (id, name, description, module) VALUES
-- Products
('11111111-1111-1111-1111-111111111101', 'products.view', 'View products', 'products'),
('11111111-1111-1111-1111-111111111102', 'products.create', 'Create products', 'products'),
('11111111-1111-1111-1111-111111111103', 'products.edit', 'Edit products', 'products'),
('11111111-1111-1111-1111-111111111104', 'products.delete', 'Delete products', 'products'),
('11111111-1111-1111-1111-111111111105', 'products.export', 'Export products', 'products'),
('11111111-1111-1111-1111-111111111106', 'products.import', 'Import products', 'products'),

-- Categories
('11111111-1111-1111-1111-111111111201', 'categories.view', 'View categories', 'categories'),
('11111111-1111-1111-1111-111111111202', 'categories.create', 'Create categories', 'categories'),
('11111111-1111-1111-1111-111111111203', 'categories.edit', 'Edit categories', 'categories'),
('11111111-1111-1111-1111-111111111204', 'categories.delete', 'Delete categories', 'categories'),

-- Attributes
('11111111-1111-1111-1111-111111111301', 'attributes.view', 'View attributes', 'attributes'),
('11111111-1111-1111-1111-111111111302', 'attributes.create', 'Create attributes', 'attributes'),
('11111111-1111-1111-1111-111111111303', 'attributes.edit', 'Edit attributes', 'attributes'),
('11111111-1111-1111-1111-111111111304', 'attributes.delete', 'Delete attributes', 'attributes'),

-- Media
('11111111-1111-1111-1111-111111111401', 'media.view', 'View media', 'media'),
('11111111-1111-1111-1111-111111111402', 'media.upload', 'Upload media', 'media'),
('11111111-1111-1111-1111-111111111403', 'media.delete', 'Delete media', 'media'),

-- Users
('11111111-1111-1111-1111-111111111501', 'users.view', 'View users', 'users'),
('11111111-1111-1111-1111-111111111502', 'users.create', 'Create users', 'users'),
('11111111-1111-1111-1111-111111111503', 'users.edit', 'Edit users', 'users'),
('11111111-1111-1111-1111-111111111504', 'users.delete', 'Delete users', 'users'),

-- Settings
('11111111-1111-1111-1111-111111111601', 'settings.view', 'View settings', 'settings'),
('11111111-1111-1111-1111-111111111602', 'settings.edit', 'Edit settings', 'settings');

-- Default Roles
INSERT INTO roles (id, name, description) VALUES
('22222222-2222-2222-2222-222222222201', 'ADMIN', 'Administrator with full access'),
('22222222-2222-2222-2222-222222222202', 'MANAGER', 'Product manager with limited admin access'),
('22222222-2222-2222-2222-222222222203', 'EDITOR', 'Content editor'),
('22222222-2222-2222-2222-222222222204', 'VIEWER', 'Read-only access');

-- Admin Role Permissions (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222201', id FROM permissions;

-- Manager Role Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111103'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111104'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111105'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111106'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111201'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111202'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111203'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111301'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111222302'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111401'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111402');

-- Editor Role Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101'),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102'),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103'),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111201'),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111301'),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111401'),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111402');

-- Viewer Role Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111101'),
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111201'),
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111301'),
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111401');

-- Default Admin User (password: admin123)
INSERT INTO users (id, email, password, first_name, last_name, is_active) VALUES
('33333333-3333-3333-3333-333333333301', 'admin@pim.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1wDJA5B2LsK3.Q5cvyjqOc1VbmS1vq6', 'Admin', 'PIM', true);

INSERT INTO user_roles (user_id, role_id) VALUES
('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201');

-- Default Attribute Groups
INSERT INTO attribute_groups (id, code, name, description, position) VALUES
('44444444-4444-4444-4444-444444444401', 'general', 'Geral', 'Informações gerais do produto', 0),
('44444444-4444-4444-4444-444444444402', 'marketing', 'Marketing', 'Informações de marketing', 1),
('44444444-4444-4444-4444-444444444403', 'seo', 'SEO', 'Otimização para mecanismos de busca', 2),
('44444444-4444-4444-4444-444444444404', 'technical', 'Técnico', 'Especificações técnicas', 3),
('44444444-4444-4444-4444-444444444405', 'media', 'Mídia', 'Imagens e vídeos', 4);

-- Default Categories
INSERT INTO categories (id, code, name, description, position, level, path, is_active) VALUES
('55555555-5555-5555-5555-555555555501', 'root', 'Catálogo Principal', 'Categoria raiz', 0, 0, '55555555-5555-5555-5555-555555555501', true);
