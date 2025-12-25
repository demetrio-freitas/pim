import { NextRequest, NextResponse } from 'next/server';

const AI_API_URL = process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages';
const AI_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;

interface SEOSuggestion {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  urlKey: string;
  tips: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, description, category, brand, currentSeo } = body;

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
    if (brand) contextParts.push(`Marca: ${brand}`);

    if (currentSeo) {
      contextParts.push('\nSEO atual (para referência):');
      if (currentSeo.metaTitle) contextParts.push(`Meta Title atual: ${currentSeo.metaTitle}`);
      if (currentSeo.metaDescription) contextParts.push(`Meta Description atual: ${currentSeo.metaDescription}`);
      if (currentSeo.urlKey) contextParts.push(`URL Key atual: ${currentSeo.urlKey}`);
    }

    const prompt = `Você é um especialista em SEO para e-commerce brasileiro.

Analise o seguinte produto e gere sugestões otimizadas para SEO:

${contextParts.join('\n')}

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem explicações, apenas o JSON):
{
  "metaTitle": "Título otimizado para SEO (máx 60 caracteres)",
  "metaDescription": "Descrição otimizada para SEO (máx 160 caracteres)",
  "metaKeywords": "palavra-chave1, palavra-chave2, palavra-chave3",
  "urlKey": "url-amigavel-do-produto",
  "tips": [
    "Dica de melhoria 1",
    "Dica de melhoria 2"
  ]
}

Regras:
1. metaTitle: máximo 60 caracteres, incluir nome do produto e marca (se houver), usar palavras-chave relevantes
2. metaDescription: máximo 160 caracteres, ser persuasivo, incluir call-to-action, destacar benefícios
3. metaKeywords: 5-8 palavras-chave separadas por vírgula, em português, relevantes para busca
4. urlKey: URL amigável em lowercase, sem acentos, palavras separadas por hífen, sem caracteres especiais
5. tips: 2-4 dicas práticas para melhorar o SEO do produto
6. Considere as melhores práticas de SEO para e-commerce brasileiro
7. Priorize palavras-chave com alto volume de busca
8. Use linguagem persuasiva e orientada para conversão

IMPORTANTE: Retorne APENAS o JSON, sem nenhum texto adicional.`;

    // If no API key configured, return mock suggestions
    if (!AI_API_KEY) {
      const mockSeo = generateMockSeo(productName, description, brand);
      return NextResponse.json(mockSeo);
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
      const mockSeo = generateMockSeo(productName, description, brand);
      return NextResponse.json(mockSeo);
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
      console.error('Error parsing SEO response:', parseError);
    }

    // Fallback to mock suggestions if parsing fails
    const mockSeo = generateMockSeo(productName, description, brand);
    return NextResponse.json(mockSeo);

  } catch (error) {
    console.error('Error optimizing SEO:', error);
    return NextResponse.json(
      { error: 'Erro ao otimizar SEO. Tente novamente.' },
      { status: 500 }
    );
  }
}

function generateMockSeo(productName: string, description?: string, brand?: string): SEOSuggestion {
  const name = productName || 'Produto';
  const brandText = brand ? ` ${brand}` : '';

  // Generate URL key
  const urlKey = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .substring(0, 50);

  // Generate meta title (max 60 chars)
  let metaTitle = `${name}${brandText}`;
  if (metaTitle.length > 60) {
    metaTitle = metaTitle.substring(0, 57) + '...';
  }
  if (metaTitle.length < 50) {
    metaTitle += ' | Compre Agora';
    if (metaTitle.length > 60) {
      metaTitle = metaTitle.substring(0, 60);
    }
  }

  // Generate meta description (max 160 chars)
  let metaDescription = description
    ? description.substring(0, 120)
    : `Compre ${name}${brandText} com os melhores preços`;

  if (metaDescription.length < 140) {
    metaDescription += '. Entrega rápida e segura. Confira!';
  }
  if (metaDescription.length > 160) {
    metaDescription = metaDescription.substring(0, 157) + '...';
  }

  // Generate keywords
  const keywords: string[] = [];
  const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  keywords.push(...words.slice(0, 3));
  if (brand) keywords.push(brand.toLowerCase());
  keywords.push('comprar', 'preco', 'oferta');

  return {
    metaTitle,
    metaDescription,
    metaKeywords: keywords.slice(0, 8).join(', '),
    urlKey,
    tips: [
      'Adicione imagens de alta qualidade com texto alternativo descritivo',
      'Inclua avaliações de clientes para aumentar a confiança',
      'Use palavras-chave naturalmente na descrição do produto',
      'Mantenha URLs curtas e descritivas'
    ]
  };
}
