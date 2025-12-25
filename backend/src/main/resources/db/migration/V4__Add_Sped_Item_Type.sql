-- =====================================================
-- V4: Adiciona campo Tipo do Item SPED aos produtos
-- =====================================================
-- Campo obrigatório para geração de arquivos SPED Fiscal e NF-e
-- Classificação conforme Tabela 4.3.1 do Guia Prático EFD ICMS/IPI
-- =====================================================

-- Adiciona coluna sped_item_type na tabela products
ALTER TABLE products
ADD COLUMN sped_item_type VARCHAR(30);

-- Adiciona índice para consultas filtradas por tipo SPED
CREATE INDEX idx_products_sped_item_type ON products(sped_item_type);

-- Comentário explicativo na coluna
COMMENT ON COLUMN products.sped_item_type IS 'Tipo do Item SPED conforme Tabela 4.3.1 EFD ICMS/IPI: MERCADORIA_REVENDA(00), MATERIA_PRIMA(01), EMBALAGEM(02), PRODUTO_EM_PROCESSO(03), PRODUTO_ACABADO(04), SUBPRODUTO(05), PRODUTO_INTERMEDIARIO(06), MATERIAL_USO_CONSUMO(07), ATIVO_IMOBILIZADO(08), SERVICOS(09), OUTROS_INSUMOS(10), OUTRAS(99)';

-- Define valores padrão para produtos existentes baseado no tipo do produto
-- Produtos virtuais recebem tipo SERVICOS (09)
UPDATE products
SET sped_item_type = 'SERVICOS'
WHERE type = 'VIRTUAL' AND sped_item_type IS NULL;

-- Produtos físicos recebem tipo MERCADORIA_REVENDA (00) como padrão
UPDATE products
SET sped_item_type = 'MERCADORIA_REVENDA'
WHERE type != 'VIRTUAL' AND sped_item_type IS NULL;
