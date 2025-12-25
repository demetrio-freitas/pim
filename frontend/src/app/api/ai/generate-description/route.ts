import { NextRequest, NextResponse } from 'next/server';

// Use OpenAI-compatible API (works with many providers)
const AI_API_URL = process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages';
const AI_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;

type ToneType = 'professional' | 'casual' | 'technical';
type LengthType = 'short' | 'medium' | 'long';

const lengthGuide: Record<LengthType, string> = {
  short: '2-3 frases curtas e diretas',
  medium: '1 parágrafo de 4-6 frases bem estruturadas',
  long: '2-3 parágrafos detalhados com benefícios e características',
};

const toneGuide: Record<ToneType, string> = {
  professional: 'profissional, confiável e corporativo',
  casual: 'amigável, conversacional e acessível',
  technical: 'técnico, detalhado e especializado',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productName,
      productSpecs,
      brand,
      category,
      tone = 'professional',
      length = 'medium',
    } = body;

    if (!productName) {
      return NextResponse.json(
        { error: 'Nome do produto é obrigatório' },
        { status: 400 }
      );
    }

    // Build context
    const contextParts: string[] = [];
    if (brand) contextParts.push(`Marca: ${brand}`);
    if (category) contextParts.push(`Categoria: ${category}`);
    if (productSpecs) contextParts.push(`Especificações: ${productSpecs}`);

    const context = contextParts.length > 0 ? contextParts.join('\n') : '';

    const prompt = `Você é um especialista em e-commerce e copywriting brasileiro. Crie uma descrição de produto profissional, persuasiva e otimizada para SEO.

Produto: ${productName}
${context}

Requisitos:
- Tom: ${toneGuide[tone as ToneType] || toneGuide.professional}
- Tamanho: ${lengthGuide[length as LengthType] || lengthGuide.medium}
- Escreva em português brasileiro
- Destaque benefícios, não apenas características
- Use linguagem persuasiva mas honesta
- Inclua palavras-chave naturalmente para SEO
- Foque na proposta de valor para o cliente
- NÃO use emojis
- NÃO use bullet points ou listas
- Escreva em formato de texto corrido/parágrafos

Gere APENAS a descrição, sem introduções, títulos ou explicações adicionais.`;

    // If no API key configured, generate a placeholder description
    if (!AI_API_KEY) {
      // Generate a simple template-based description as fallback
      const fallbackDescription = generateFallbackDescription(productName, brand, category, tone, length);
      return NextResponse.json({ description: fallbackDescription });
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
        max_tokens: 1024,
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

      // Fallback to template-based description
      const fallbackDescription = generateFallbackDescription(productName, brand, category, tone, length);
      return NextResponse.json({ description: fallbackDescription });
    }

    const data = await response.json();
    const description = data.content?.[0]?.text || '';

    if (!description) {
      const fallbackDescription = generateFallbackDescription(productName, brand, category, tone, length);
      return NextResponse.json({ description: fallbackDescription });
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error generating description:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar descrição. Tente novamente.' },
      { status: 500 }
    );
  }
}

function generateFallbackDescription(
  productName: string,
  brand?: string,
  category?: string,
  tone: string = 'professional',
  length: string = 'medium'
): string {
  const brandText = brand ? ` da ${brand}` : '';
  const categoryText = category ? `, ideal para ${category}` : '';

  const templates: Record<string, Record<string, string>> = {
    professional: {
      short: `O ${productName}${brandText} oferece qualidade excepcional e desempenho superior${categoryText}. Uma escolha confiável para quem busca excelência.`,
      medium: `Apresentamos o ${productName}${brandText}, desenvolvido para atender às mais altas expectativas de qualidade${categoryText}. Este produto combina design sofisticado com funcionalidade premium, garantindo uma experiência superior. Com materiais de primeira linha e acabamento impecável, é a escolha perfeita para clientes exigentes que valorizam durabilidade e desempenho.`,
      long: `O ${productName}${brandText} representa o que há de melhor em sua categoria${categoryText}. Desenvolvido com tecnologia de ponta e materiais premium, este produto foi projetado para superar suas expectativas em todos os aspectos.\n\nCada detalhe foi cuidadosamente pensado para proporcionar uma experiência excepcional. Desde o design elegante até a funcionalidade avançada, tudo foi otimizado para entregar o máximo de valor. A qualidade superior dos materiais garante durabilidade e resistência ao longo do tempo.\n\nInvista em qualidade. Escolha o ${productName} e descubra a diferença que um produto premium faz no seu dia a dia.`,
    },
    casual: {
      short: `Conheça o ${productName}${brandText}! Perfeito para quem quer qualidade sem complicação${categoryText}. Você vai adorar!`,
      medium: `Olha só o que preparamos para você: o ${productName}${brandText}${categoryText}! É aquele tipo de produto que você usa e já quer recomendar para todo mundo. Prático, bonito e com uma qualidade que você percebe na primeira vez que usa. Não perca tempo, esse é daqueles que vale cada centavo!`,
      long: `Ei, já conhece o ${productName}${brandText}? Se não conhece, prepare-se para se surpreender${categoryText}! Este é daqueles produtos que a gente experimenta e pensa: "por que não descobri isso antes?"\n\nO legal é que além de funcionar super bem, ele tem um visual que combina com tudo. Dá para usar no dia a dia sem preocupação, porque a qualidade aguenta o tranco. E o melhor: sem precisar gastar uma fortuna!\n\nTá esperando o que? Adiciona no carrinho e vem experimentar você também. Tenho certeza que você não vai se arrepender!`,
    },
    technical: {
      short: `O ${productName}${brandText} apresenta especificações técnicas avançadas e construção de alta qualidade${categoryText}. Performance otimizada para máxima eficiência.`,
      medium: `O ${productName}${brandText} foi desenvolvido com base em especificações técnicas rigorosas${categoryText}. Sua construção utiliza materiais selecionados que garantem durabilidade e desempenho consistente. Os parâmetros de operação foram otimizados para entregar máxima eficiência, enquanto o design ergonômico facilita a utilização. Produto recomendado para aplicações que exigem precisão e confiabilidade.`,
      long: `Especificações técnicas do ${productName}${brandText}${categoryText}:\n\nEste produto foi projetado seguindo padrões rigorosos de engenharia e qualidade. A seleção de materiais priorizou características como resistência mecânica, durabilidade e estabilidade térmica. O processo de fabricação incorpora controles de qualidade em múltiplas etapas para garantir consistência dimensional e funcional.\n\nOs parâmetros de desempenho foram extensivamente testados em condições variadas, demonstrando resultados superiores aos produtos convencionais da mesma categoria. A configuração permite ajustes finos que atendem a diferentes requisitos operacionais.\n\nIndicado para usuários técnicos e profissionais que necessitam de equipamentos com especificações precisas e desempenho confiável em aplicações exigentes.`,
    },
  };

  return templates[tone]?.[length] || templates.professional.medium;
}
