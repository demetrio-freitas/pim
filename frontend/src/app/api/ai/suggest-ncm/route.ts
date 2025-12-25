import { NextRequest, NextResponse } from 'next/server';

const AI_API_URL = process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages';
const AI_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;

interface NCMSuggestion {
  code: string;
  description: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, gtin } = body;

    if (!productName && !gtin) {
      return NextResponse.json(
        { error: 'Nome do produto ou GTIN é obrigatório' },
        { status: 400 }
      );
    }

    const contextParts: string[] = [];
    if (productName) contextParts.push(`Nome do produto: ${productName}`);
    if (gtin) contextParts.push(`GTIN/EAN: ${gtin}`);

    const prompt = `Você é um especialista em classificação fiscal brasileira (NCM - Nomenclatura Comum do Mercosul).

Analise o seguinte produto e sugira os códigos NCM mais apropriados:

${contextParts.join('\n')}

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem explicações, apenas o JSON):
{
  "suggestions": [
    {
      "code": "XXXX.XX.XX",
      "description": "Descrição completa da classificação NCM conforme tabela oficial",
      "confidence": 85
    }
  ]
}

Regras:
1. Retorne entre 3 e 5 sugestões, ordenadas por relevância (maior confidence primeiro)
2. O código NCM deve estar no formato XXXX.XX.XX (8 dígitos com pontos)
3. A description deve ser a descrição oficial da NCM, detalhada
4. O confidence deve ser um número entre 0 e 100 representando a certeza da sugestão
5. Considere a natureza do produto, materiais prováveis, uso e categoria
6. Se o GTIN for fornecido, use-o para refinar a busca
7. Priorize NCMs mais específicos sobre os genéricos

IMPORTANTE: Retorne APENAS o JSON, sem nenhum texto adicional.`;

    // If no API key configured, return mock suggestions
    if (!AI_API_KEY) {
      const mockSuggestions = generateMockSuggestions(productName);
      return NextResponse.json({ suggestions: mockSuggestions });
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
      const mockSuggestions = generateMockSuggestions(productName);
      return NextResponse.json({ suggestions: mockSuggestions });
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
      console.error('Error parsing NCM response:', parseError);
    }

    // Fallback to mock suggestions if parsing fails
    const mockSuggestions = generateMockSuggestions(productName);
    return NextResponse.json({ suggestions: mockSuggestions });

  } catch (error) {
    console.error('Error suggesting NCM:', error);
    return NextResponse.json(
      { error: 'Erro ao sugerir NCM. Tente novamente.' },
      { status: 500 }
    );
  }
}

function generateMockSuggestions(productName: string): NCMSuggestion[] {
  // Basic keyword matching for common product types
  const name = (productName || '').toLowerCase();

  // Lâmpadas
  if (name.includes('lâmpada') || name.includes('lampada') || name.includes('led') || name.includes('luminária')) {
    return [
      {
        code: '8539.21.10',
        description: 'Máquinas, aparelhos e materiais elétricos, e suas partes; aparelhos de gravação ou de reprodução de som, aparelhos de gravação ou de reprodução de imagens e de som em televisão, e suas partes e acessórios. Lâmpadas e tubos elétricos de incandescência ou de descarga, incluindo os artigos denominados "faróis e projetores, em unidades seladas" e as lâmpadas e tubos de raios ultravioleta ou infravermelhos; lâmpadas de arco; fontes de luz de diodos emissores de - Outras lâmpadas e tubos de incandescência, exceto de raios ultravioleta ou infravermelhos: -- Halógenos, de tungstênio (volfrâmio) Para uma tensão inferior ou igual a 15 V',
        confidence: 84
      },
      {
        code: '8539.22.00',
        description: 'Máquinas, aparelhos e materiais elétricos, e suas partes; aparelhos de gravação ou de reprodução de som, aparelhos de gravação ou de reprodução de imagens e de som em televisão, e suas partes e acessórios. Lâmpadas e tubos elétricos de incandescência ou de descarga, incluindo os artigos denominados "faróis e projetores, em unidades seladas" e as lâmpadas e tubos de raios ultravioleta ou infravermelhos; lâmpadas de arco; fontes de luz de diodos emissores de - Outras lâmpadas e tubos de incandescência, exceto de raios ultravioleta ou infravermelhos: -- Outros, de potência não superior a 200 W e uma tensão superior a 100 V',
        confidence: 84
      },
      {
        code: '8539.21.90',
        description: 'Máquinas, aparelhos e materiais elétricos, e suas partes; aparelhos de gravação ou de reprodução de som, aparelhos de gravação ou de reprodução de imagens e de som em televisão, e suas partes e acessórios. Lâmpadas e tubos elétricos de incandescência ou de descarga - Outras lâmpadas e tubos de incandescência, exceto de raios ultravioleta ou infravermelhos - Outros',
        confidence: 84
      },
      {
        code: '8539.50.00',
        description: 'Lâmpadas e tubos de diodos emissores de luz (LED)',
        confidence: 80
      }
    ];
  }

  // Eletrônicos
  if (name.includes('celular') || name.includes('smartphone') || name.includes('telefone')) {
    return [
      {
        code: '8517.12.31',
        description: 'Telefones para redes celulares e para outras redes sem fio - De radiotelefonia',
        confidence: 92
      },
      {
        code: '8517.12.39',
        description: 'Outros telefones para redes celulares',
        confidence: 85
      },
      {
        code: '8517.12.90',
        description: 'Outros aparelhos para transmissão ou recepção de voz, imagens ou outros dados',
        confidence: 70
      }
    ];
  }

  // Roupas/Vestuário
  if (name.includes('camisa') || name.includes('camiseta') || name.includes('blusa')) {
    return [
      {
        code: '6109.10.00',
        description: 'T-shirts e camisetas interiores, de malha - De algodão',
        confidence: 88
      },
      {
        code: '6105.10.00',
        description: 'Camisas de malha, de uso masculino - De algodão',
        confidence: 82
      },
      {
        code: '6106.10.00',
        description: 'Camisas e blusas de malha, de uso feminino - De algodão',
        confidence: 80
      }
    ];
  }

  // Calçados
  if (name.includes('sapato') || name.includes('tênis') || name.includes('sandália') || name.includes('calçado')) {
    return [
      {
        code: '6403.99.90',
        description: 'Calçados com sola exterior de borracha, plástico, couro natural ou reconstituído e parte superior de couro natural - Outros',
        confidence: 85
      },
      {
        code: '6404.11.00',
        description: 'Calçados para esporte; calçados para tênis, basquetebol, ginástica, treino e semelhantes',
        confidence: 82
      },
      {
        code: '6402.99.90',
        description: 'Outros calçados com sola exterior e parte superior de borracha ou plástico',
        confidence: 75
      }
    ];
  }

  // Alimentos
  if (name.includes('arroz') || name.includes('feijão') || name.includes('açúcar') || name.includes('alimento')) {
    return [
      {
        code: '1006.30.21',
        description: 'Arroz semibranqueado ou branqueado, parboilizado, polido ou brunido',
        confidence: 88
      },
      {
        code: '0713.33.19',
        description: 'Feijão comum (Phaseolus vulgaris) - Outros',
        confidence: 85
      },
      {
        code: '1701.99.00',
        description: 'Outros açúcares de cana ou de beterraba',
        confidence: 80
      }
    ];
  }

  // Default - produtos genéricos
  return [
    {
      code: '9999.00.00',
      description: 'Produto não classificado - Por favor, forneça mais detalhes sobre o produto para uma classificação mais precisa',
      confidence: 20
    },
    {
      code: '8479.89.99',
      description: 'Outras máquinas e aparelhos mecânicos com função própria, não especificados nem compreendidos noutras posições',
      confidence: 15
    },
    {
      code: '3926.90.90',
      description: 'Outras obras de plástico e obras de outras matérias das posições 39.01 a 39.14',
      confidence: 10
    }
  ];
}
