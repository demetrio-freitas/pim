import { NextRequest, NextResponse } from 'next/server';

const AI_API_URL = process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages';
const AI_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;

interface TagSuggestion {
  tag: string;
  relevance: number;
  category?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, description, category } = body;

    if (!productName) {
      return NextResponse.json(
        { error: 'Nome do produto é obrigatório' },
        { status: 400 }
      );
    }

    const contextParts: string[] = [];
    contextParts.push(`Nome do produto: ${productName}`);
    if (description) contextParts.push(`Descrição: ${description}`);
    if (category) contextParts.push(`Categoria: ${category}`);

    const prompt = `Você é um especialista em e-commerce e SEO para produtos.

Analise o seguinte produto e sugira tags relevantes para melhorar a descoberta e organização:

${contextParts.join('\n')}

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem explicações, apenas o JSON):
{
  "tags": [
    {
      "tag": "tag-exemplo",
      "relevance": 95,
      "category": "tipo"
    }
  ]
}

Regras:
1. Retorne entre 8 e 15 tags, ordenadas por relevância (maior primeiro)
2. Cada tag deve ser em português, lowercase, sem acentos, usando hífens para separar palavras
3. A relevance deve ser um número entre 0 e 100
4. A category deve ser uma das seguintes: "tipo", "material", "uso", "caracteristica", "publico", "ocasiao", "estilo"
5. Inclua tags para:
   - Tipo/categoria do produto
   - Material ou composição
   - Uso ou finalidade
   - Características principais
   - Público-alvo (quando aplicável)
   - Ocasião de uso (quando aplicável)
   - Estilo ou tendência
6. Evite tags muito genéricas como "produto", "item", "bom"
7. Priorize tags que ajudem na busca e filtragem

IMPORTANTE: Retorne APENAS o JSON, sem nenhum texto adicional.`;

    // If no API key configured, return mock suggestions
    if (!AI_API_KEY) {
      const mockTags = generateMockTags(productName, description);
      return NextResponse.json({ tags: mockTags });
    }

    // Call Anthropic API
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      // Fallback to mock suggestions
      const mockTags = generateMockTags(productName, description);
      return NextResponse.json({ tags: mockTags });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    try {
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      }
    } catch (parseError) {
      console.error('Error parsing tags response:', parseError);
    }

    // Fallback to mock suggestions if parsing fails
    const mockTags = generateMockTags(productName, description);
    return NextResponse.json({ tags: mockTags });

  } catch (error) {
    console.error('Error suggesting tags:', error);
    return NextResponse.json(
      { error: 'Erro ao sugerir tags. Tente novamente.' },
      { status: 500 }
    );
  }
}

function generateMockTags(productName: string, description?: string): TagSuggestion[] {
  const name = (productName || '').toLowerCase();
  const desc = (description || '').toLowerCase();
  const combined = `${name} ${desc}`;

  const tags: TagSuggestion[] = [];

  // Iluminação
  if (combined.includes('lâmpada') || combined.includes('lampada') || combined.includes('led') || combined.includes('luminária') || combined.includes('luminaria')) {
    tags.push(
      { tag: 'iluminacao', relevance: 95, category: 'tipo' },
      { tag: 'led', relevance: 90, category: 'tipo' },
      { tag: 'economia-energia', relevance: 85, category: 'caracteristica' },
      { tag: 'decoracao', relevance: 80, category: 'uso' },
      { tag: 'casa', relevance: 75, category: 'uso' },
      { tag: 'luz-branca', relevance: 70, category: 'caracteristica' },
      { tag: 'sustentavel', relevance: 65, category: 'caracteristica' },
      { tag: 'ambiente-interno', relevance: 60, category: 'uso' }
    );
  }

  // Eletrônicos
  if (combined.includes('celular') || combined.includes('smartphone') || combined.includes('telefone')) {
    tags.push(
      { tag: 'smartphone', relevance: 95, category: 'tipo' },
      { tag: 'eletronico', relevance: 90, category: 'tipo' },
      { tag: 'tecnologia', relevance: 85, category: 'tipo' },
      { tag: 'mobile', relevance: 80, category: 'caracteristica' },
      { tag: 'comunicacao', relevance: 75, category: 'uso' },
      { tag: 'portatil', relevance: 70, category: 'caracteristica' }
    );
  }

  // Roupas
  if (combined.includes('camisa') || combined.includes('camiseta') || combined.includes('blusa') || combined.includes('roupa')) {
    tags.push(
      { tag: 'vestuario', relevance: 95, category: 'tipo' },
      { tag: 'moda', relevance: 90, category: 'tipo' },
      { tag: 'casual', relevance: 85, category: 'estilo' },
      { tag: 'algodao', relevance: 80, category: 'material' },
      { tag: 'confortavel', relevance: 75, category: 'caracteristica' },
      { tag: 'dia-a-dia', relevance: 70, category: 'ocasiao' }
    );
  }

  // Calçados
  if (combined.includes('sapato') || combined.includes('tênis') || combined.includes('tenis') || combined.includes('sandália') || combined.includes('sandalia')) {
    tags.push(
      { tag: 'calcado', relevance: 95, category: 'tipo' },
      { tag: 'conforto', relevance: 90, category: 'caracteristica' },
      { tag: 'moda', relevance: 85, category: 'tipo' },
      { tag: 'esportivo', relevance: 80, category: 'estilo' },
      { tag: 'casual', relevance: 75, category: 'estilo' },
      { tag: 'dia-a-dia', relevance: 70, category: 'ocasiao' }
    );
  }

  // Default tags if no specific category matched
  if (tags.length === 0) {
    const words = name.split(/\s+/).filter(w => w.length > 3);
    words.forEach((word, index) => {
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (cleanWord.length > 2) {
        tags.push({
          tag: cleanWord,
          relevance: 80 - (index * 5),
          category: 'tipo'
        });
      }
    });

    // Add some generic useful tags
    tags.push(
      { tag: 'novo', relevance: 60, category: 'caracteristica' },
      { tag: 'qualidade', relevance: 55, category: 'caracteristica' },
      { tag: 'pronta-entrega', relevance: 50, category: 'caracteristica' }
    );
  }

  return tags.slice(0, 12);
}
