import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

interface PricingRecommendation {
  productId: number;
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  strategy: 'aggressive' | 'competitive' | 'premium' | 'maintain';
  confidence: number;
  reasoning: string;
  expectedImpact: {
    salesIncrease: number;
    marginImpact: number;
    competitiveAdvantage: string;
  };
  risks: string[];
  opportunities: string[];
}

interface AIAnalysis {
  recommendations: PricingRecommendation[];
  marketInsights: string[];
  overallStrategy: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

export default function AIPricingStrategy() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const { data: priceData = [] } = useQuery({
    queryKey: ["/api/dashboard/best-prices"],
  });

  const analyzeWithAI = useMutation({
    mutationFn: async (prompt?: string) => {
      const response = await apiRequest("/api/ai/pricing-analysis", {
        method: "POST",
        body: JSON.stringify({ 
          priceData,
          customPrompt: prompt 
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setIsAnalyzing(false);
    },
    onError: (error) => {
      console.error("AI Analysis error:", error);
      setIsAnalyzing(false);
    }
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    analyzeWithAI.mutate(customPrompt);
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'aggressive': return 'bg-red-100 text-red-700';
      case 'competitive': return 'bg-blue-100 text-blue-700';
      case 'premium': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'aggressive': return <TrendingUp className="h-4 w-4" />;
      case 'competitive': return <Target className="h-4 w-4" />;
      case 'premium': return <DollarSign className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-orange-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const hasValidPriceData = Array.isArray(priceData) && priceData.length > 0;

  return (
    <div className="space-y-6">
      {/* AI Analysis Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Estratégia de Precificação com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contexto Adicional (Opcional)
            </label>
            <Textarea
              placeholder="Ex: Estamos lançando uma campanha promocional, queremos aumentar market share, foco em margem, etc..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !hasValidPriceData}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isAnalyzing ? 'Analisando...' : 'Gerar Estratégia'}
            </Button>
            
            {!hasValidPriceData && (
              <p className="text-sm text-gray-500">
                Adicione produtos para análise de IA
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Overall Strategy Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Estratégia Recomendada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Nível de Confiança da IA</p>
                      <p className="text-sm text-gray-600">{analysis.confidence}% de confiança</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Nível de Risco</p>
                      <Badge className={`${getRiskColor(analysis.riskLevel)}`}>
                        {analysis.riskLevel === 'low' ? 'Baixo' : 
                         analysis.riskLevel === 'medium' ? 'Médio' : 'Alto'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Progress value={analysis.confidence} className="h-2" />
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-800">{analysis.overallStrategy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Insights */}
            {Array.isArray(analysis.marketInsights) && analysis.marketInsights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Insights de Mercado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.marketInsights.map((insight, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{insight}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product-Specific Recommendations */}
            {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {analysis.recommendations.map((rec, index) => (
                  <motion.div
                    key={rec.productId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{rec.productName}</CardTitle>
                          <Badge className={getStrategyColor(rec.strategy)}>
                            {getStrategyIcon(rec.strategy)}
                            <span className="ml-1 capitalize">{rec.strategy}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Price Recommendation */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600">Preço Atual</p>
                            <p className="text-lg font-bold">R$ {rec.currentPrice.toFixed(2)}</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-green-600">Recomendado</p>
                            <p className="text-lg font-bold text-green-700">
                              R$ {rec.recommendedPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Confidence */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Confiança</span>
                            <span>{rec.confidence}%</span>
                          </div>
                          <Progress value={rec.confidence} className="h-2" />
                        </div>

                        {/* Reasoning */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-800">{rec.reasoning}</p>
                        </div>

                        {/* Expected Impact */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Impacto Esperado:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-green-50 p-2 rounded">
                              <span className="text-green-600">Vendas: +{rec.expectedImpact.salesIncrease}%</span>
                            </div>
                            <div className="bg-blue-50 p-2 rounded">
                              <span className="text-blue-600">Margem: {rec.expectedImpact.marginImpact > 0 ? '+' : ''}{rec.expectedImpact.marginImpact}%</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {rec.expectedImpact.competitiveAdvantage}
                          </p>
                        </div>

                        {/* Risks & Opportunities */}
                        {(Array.isArray(rec.risks) && rec.risks.length > 0) || (Array.isArray(rec.opportunities) && rec.opportunities.length > 0) ? (
                          <div className="space-y-2">
                            {Array.isArray(rec.risks) && rec.risks.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-red-600 mb-1">Riscos:</p>
                                {rec.risks.map((risk, idx) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-red-600">{risk}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {Array.isArray(rec.opportunities) && rec.opportunities.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-green-600 mb-1">Oportunidades:</p>
                                {rec.opportunities.map((opp, idx) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-green-600">{opp}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Data State */}
      {!analysis && !isAnalyzing && hasValidPriceData && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Análise de IA Disponível
            </h3>
            <p className="text-gray-600 mb-4">
              Use nossa IA para gerar estratégias de precificação personalizadas baseadas nos dados dos seus concorrentes.
            </p>
            <Button onClick={handleAnalyze} className="flex items-center gap-2 mx-auto">
              <Sparkles className="h-4 w-4" />
              Começar Análise
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Price Data State */}
      {!hasValidPriceData && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Dados Necessários para Análise de IA
            </h3>
            <p className="text-gray-600 mb-4">
              Para gerar estratégias de precificação com IA, você precisa primeiro cadastrar produtos com grupos de comparação entre a Vellore e concorrentes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}