import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key não configurada");
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

interface PriceComparisonData {
  product: any;
  prices: Array<any>;
  bestPrice: any;
  savings: number;
}

export async function generatePricingStrategy(
  priceData: PriceComparisonData[],
  customPrompt?: string
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key não configurada");
  }

  const context = `
Você é um especialista em estratégia de precificação e análise competitiva. 
Analise os dados de comparação de preços fornecidos e gere recomendações estratégicas para a empresa Vellore.

Dados dos produtos para análise:
${JSON.stringify(priceData, null, 2)}

${customPrompt ? `Contexto adicional: ${customPrompt}` : ''}

Forneça uma análise detalhada incluindo:
1. Estratégia geral recomendada
2. Recomendações específicas por produto
3. Insights de mercado
4. Avaliação de riscos
5. Oportunidades identificadas

Responda em JSON seguindo exatamente esta estrutura:
{
  "overallStrategy": "string com estratégia geral",
  "confidence": número entre 0-100,
  "riskLevel": "low" | "medium" | "high",
  "marketInsights": ["insight1", "insight2", ...],
  "recommendations": [
    {
      "productId": número,
      "productName": "string",
      "currentPrice": número,
      "recommendedPrice": número,
      "strategy": "aggressive" | "competitive" | "premium" | "maintain",
      "confidence": número 0-100,
      "reasoning": "explicação da recomendação",
      "expectedImpact": {
        "salesIncrease": número percentual,
        "marginImpact": número percentual,
        "competitiveAdvantage": "descrição"
      },
      "risks": ["risco1", "risco2", ...],
      "opportunities": ["oportunidade1", "oportunidade2", ...]
    }
  ]
}
`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "Você é um especialista em estratégia de precificação. Responda sempre em JSON válido conforme a estrutura solicitada."
        },
        {
          role: "user",
          content: context
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and ensure proper structure
    return {
      overallStrategy: analysis.overallStrategy || "Análise não disponível",
      confidence: Math.min(Math.max(analysis.confidence || 75, 0), 100),
      riskLevel: ["low", "medium", "high"].includes(analysis.riskLevel) ? analysis.riskLevel : "medium",
      marketInsights: Array.isArray(analysis.marketInsights) ? analysis.marketInsights : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations.map((rec: any) => ({
        productId: rec.productId || 0,
        productName: rec.productName || "Produto sem nome",
        currentPrice: parseFloat(rec.currentPrice) || 0,
        recommendedPrice: parseFloat(rec.recommendedPrice) || 0,
        strategy: ["aggressive", "competitive", "premium", "maintain"].includes(rec.strategy) ? rec.strategy : "maintain",
        confidence: Math.min(Math.max(rec.confidence || 70, 0), 100),
        reasoning: rec.reasoning || "Análise em andamento",
        expectedImpact: {
          salesIncrease: parseFloat(rec.expectedImpact?.salesIncrease) || 0,
          marginImpact: parseFloat(rec.expectedImpact?.marginImpact) || 0,
          competitiveAdvantage: rec.expectedImpact?.competitiveAdvantage || "Impacto a ser determinado"
        },
        risks: Array.isArray(rec.risks) ? rec.risks : [],
        opportunities: Array.isArray(rec.opportunities) ? rec.opportunities : []
      })) : []
    };
  } catch (error) {
    console.error("Erro na análise de IA:", error);
    throw new Error("Falha na geração da estratégia de precificação");
  }
}

export async function generateBenchmarkAnalysis(priceData: PriceComparisonData[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const context = `
Analise os dados de comparação de preços e gere um benchmark competitivo detalhado:

${JSON.stringify(priceData, null, 2)}

Forneça análise em JSON:
{
  "overallRanking": número 1-10,
  "totalCompetitors": número,
  "categories": {
    "pricing": {"score": 0-100, "rank": número, "total": número},
    "availability": {"score": 0-100, "rank": número, "total": número},
    "competitiveness": {"score": 0-100, "rank": número, "total": número}
  },
  "topPerformers": [{"product": objeto, "score": 0-100, "advantages": ["vantagem1"]}],
  "improvementAreas": [{"product": objeto, "issues": ["issue1"], "recommendations": ["rec1"]}]
}
`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "Analise dados de benchmark e responda em JSON válido."
        },
        {
          role: "user",
          content: context
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Erro no benchmark de IA:", error);
    return null;
  }
}