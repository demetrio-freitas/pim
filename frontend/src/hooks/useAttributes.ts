import { useState, useEffect, useCallback } from 'react';
import { TechnicalAttribute, AttributeValueInput } from '@/types';
import { getDefaultAttributesWithIds, generateAttributeId } from '@/data/defaultAttributes';

const STORAGE_KEY = 'pim_custom_attributes';

/**
 * Hook para gerenciar atributos técnicos do produto
 * Combina atributos padrão com atributos customizados salvos no localStorage
 * Futuramente pode ser integrado com API backend
 */
export function useAttributes() {
  const [availableAttributes, setAvailableAttributes] = useState<TechnicalAttribute[]>([]);
  const [customAttributes, setCustomAttributes] = useState<TechnicalAttribute[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar atributos padrão e customizados
  useEffect(() => {
    const loadAttributes = () => {
      try {
        // Carregar atributos padrão
        const defaultAttrs = getDefaultAttributesWithIds();

        // Carregar atributos customizados do localStorage
        const storedCustom = localStorage.getItem(STORAGE_KEY);
        const customAttrs: TechnicalAttribute[] = storedCustom
          ? JSON.parse(storedCustom)
          : [];

        setCustomAttributes(customAttrs);
        setAvailableAttributes([...defaultAttrs, ...customAttrs]);
      } catch (error) {
        console.error('Erro ao carregar atributos:', error);
        setAvailableAttributes(getDefaultAttributesWithIds());
      } finally {
        setLoading(false);
      }
    };

    loadAttributes();
  }, []);

  // Criar novo atributo customizado
  const createAttribute = useCallback(
    async (
      newAttribute: Omit<TechnicalAttribute, 'id' | 'createdAt'>
    ): Promise<TechnicalAttribute | null> => {
      try {
        const attribute: TechnicalAttribute = {
          ...newAttribute,
          id: generateAttributeId(),
          createdAt: new Date().toISOString(),
        };

        const updatedCustom = [...customAttributes, attribute];
        setCustomAttributes(updatedCustom);
        setAvailableAttributes((prev) => [...prev, attribute]);

        // Salvar no localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));

        return attribute;
      } catch (error) {
        console.error('Erro ao criar atributo:', error);
        return null;
      }
    },
    [customAttributes]
  );

  // Atualizar atributo customizado
  const updateAttribute = useCallback(
    async (
      attributeId: string,
      updates: Partial<TechnicalAttribute>
    ): Promise<TechnicalAttribute | null> => {
      try {
        // Só permite atualizar atributos customizados
        if (!attributeId.startsWith('attr_')) {
          console.warn('Não é possível editar atributos padrão');
          return null;
        }

        const updatedCustom = customAttributes.map((attr) =>
          attr.id === attributeId ? { ...attr, ...updates } : attr
        );
        setCustomAttributes(updatedCustom);

        setAvailableAttributes((prev) =>
          prev.map((attr) =>
            attr.id === attributeId ? { ...attr, ...updates } : attr
          )
        );

        // Salvar no localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));

        return updatedCustom.find((a) => a.id === attributeId) || null;
      } catch (error) {
        console.error('Erro ao atualizar atributo:', error);
        return null;
      }
    },
    [customAttributes]
  );

  // Remover atributo customizado
  const deleteAttribute = useCallback(
    async (attributeId: string): Promise<boolean> => {
      try {
        // Só permite remover atributos customizados
        if (!attributeId.startsWith('attr_')) {
          console.warn('Não é possível remover atributos padrão');
          return false;
        }

        const updatedCustom = customAttributes.filter(
          (attr) => attr.id !== attributeId
        );
        setCustomAttributes(updatedCustom);

        setAvailableAttributes((prev) =>
          prev.filter((attr) => attr.id !== attributeId)
        );

        // Salvar no localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));

        return true;
      } catch (error) {
        console.error('Erro ao remover atributo:', error);
        return false;
      }
    },
    [customAttributes]
  );

  // Buscar atributo por ID
  const getAttributeById = useCallback(
    (attributeId: string): TechnicalAttribute | undefined => {
      return availableAttributes.find((attr) => attr.id === attributeId);
    },
    [availableAttributes]
  );

  // Buscar atributos por categoria
  const getAttributesByCategory = useCallback(
    (category: string): TechnicalAttribute[] => {
      return availableAttributes.filter((attr) => attr.category === category);
    },
    [availableAttributes]
  );

  // Verificar se é atributo customizado (editável)
  const isCustomAttribute = useCallback((attributeId: string): boolean => {
    return attributeId.startsWith('attr_');
  }, []);

  // Recarregar atributos
  const refetch = useCallback(() => {
    setLoading(true);
    const defaultAttrs = getDefaultAttributesWithIds();
    const storedCustom = localStorage.getItem(STORAGE_KEY);
    const customAttrs: TechnicalAttribute[] = storedCustom
      ? JSON.parse(storedCustom)
      : [];

    setCustomAttributes(customAttrs);
    setAvailableAttributes([...defaultAttrs, ...customAttrs]);
    setLoading(false);
  }, []);

  return {
    availableAttributes,
    customAttributes,
    loading,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    getAttributeById,
    getAttributesByCategory,
    isCustomAttribute,
    refetch,
  };
}

/**
 * Hook para gerenciar valores de atributos de um produto específico
 */
export function useProductAttributes(productId?: string) {
  const [attributeValues, setAttributeValues] = useState<AttributeValueInput[]>([]);
  const [loading, setLoading] = useState(false);

  const PRODUCT_ATTRS_KEY = `pim_product_attributes_${productId}`;

  // Carregar valores salvos para o produto
  useEffect(() => {
    if (!productId) return;

    setLoading(true);
    try {
      const stored = localStorage.getItem(PRODUCT_ATTRS_KEY);
      if (stored) {
        setAttributeValues(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar atributos do produto:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, PRODUCT_ATTRS_KEY]);

  // Adicionar valor de atributo
  const addAttributeValue = useCallback(
    (attributeId: string, value: string | number | boolean | string[] = '') => {
      const existing = attributeValues.find((av) => av.attributeId === attributeId);
      if (existing) return;

      const newValue: AttributeValueInput = { attributeId, value };
      const updated = [...attributeValues, newValue];
      setAttributeValues(updated);

      if (productId) {
        localStorage.setItem(PRODUCT_ATTRS_KEY, JSON.stringify(updated));
      }
    },
    [attributeValues, productId, PRODUCT_ATTRS_KEY]
  );

  // Atualizar valor de atributo
  const updateAttributeValue = useCallback(
    (attributeId: string, value: string | number | boolean | string[]) => {
      const updated = attributeValues.map((av) =>
        av.attributeId === attributeId ? { ...av, value } : av
      );
      setAttributeValues(updated);

      if (productId) {
        localStorage.setItem(PRODUCT_ATTRS_KEY, JSON.stringify(updated));
      }
    },
    [attributeValues, productId, PRODUCT_ATTRS_KEY]
  );

  // Remover valor de atributo
  const removeAttributeValue = useCallback(
    (attributeId: string) => {
      const updated = attributeValues.filter((av) => av.attributeId !== attributeId);
      setAttributeValues(updated);

      if (productId) {
        localStorage.setItem(PRODUCT_ATTRS_KEY, JSON.stringify(updated));
      }
    },
    [attributeValues, productId, PRODUCT_ATTRS_KEY]
  );

  // Definir todos os valores de uma vez
  const setAllValues = useCallback(
    (values: AttributeValueInput[]) => {
      setAttributeValues(values);

      if (productId) {
        localStorage.setItem(PRODUCT_ATTRS_KEY, JSON.stringify(values));
      }
    },
    [productId, PRODUCT_ATTRS_KEY]
  );

  // Obter valor de um atributo específico
  const getValue = useCallback(
    (attributeId: string): string | number | boolean | string[] | undefined => {
      return attributeValues.find((av) => av.attributeId === attributeId)?.value;
    },
    [attributeValues]
  );

  return {
    attributeValues,
    loading,
    addAttributeValue,
    updateAttributeValue,
    removeAttributeValue,
    setAllValues,
    getValue,
  };
}
