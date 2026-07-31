import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Award,
  Zap,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";

interface BenchmarkData {
  overallRanking: number;
  totalCompetitors: number;
  categories: {
    pricing: { score: number; rank: number; total: number };
    availability: { score: number; rank: number; total: number };
    competitiveness: { score: number; rank: number; total: number };
  };
  topPerformers: Array<{
    product: any;
    score: number;
    advantages: string[];
  }>;
  improvementAreas: Array<{
    product: any;
    issues: string[];
    recommendations: string[];
  }>;
}

export default function BenchmarkWidget() {
  const { data: benchmarkData, isLoading } = useQuery({
    queryKey: ["/api/analytics/benchmark"],
  });

  const { data: priceData = [] } = useQuery({
    queryKey: ["/api/dashboard/best-prices"],
  });

  // Calculate benchmark metrics from price data
  const calculateBenchmark = () => {
    if (!Array.isArray(priceData) || !priceData.length) return null;

    const totalProducts = priceData.length;
    const leaderCount = priceData.filter((item: any) => item.savings > 0).length;
    const followerCount = priceData.filter((item: any) => item.savings < 0).length;
    const competitiveCount = totalProducts - leaderCount - followerCount;

    const overallScore = Math.round((leaderCount / totalProducts) * 100);
    const pricingScore = Math.round(((leaderCount + competitiveCount) / totalProducts) * 100);
    const competitivenessScore = Math.round((competitiveCount / totalProducts) * 100);

    return {
      overallScore,
      pricingScore,
      competitivenessScore,
      leaderCount,
      followerCount,
      competitiveCount,
      totalProducts
    };
  };

  const benchmark = calculateBenchmark();

  const getBenchmarkLevel = (score: number) => {
    if (score >= 80) return { level: 'Excelente', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 60) return { level: 'Bom', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 40) return { level: 'Regular', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { level: 'Precisa Melhorar', color: 'text-red-600', bg: 'bg-red-100' };
  };

  if (isLoading || !benchmark) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallLevel = getBenchmarkLevel(benchmark.overallScore);
  const pricingLevel = getBenchmarkLevel(benchmark.pricingScore);
  const competitivenessLevel = getBenchmarkLevel(benchmark.competitivenessScore);

  return (
    <div className="space-y-6">
      {/* Overall Benchmark Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-500" />
            Benchmark Automático
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="w-32 h-32 mx-auto relative">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <motion.path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2"
                    strokeDasharray={`${benchmark.overallScore}, 100`}
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${benchmark.overallScore}, 100` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{benchmark.overallScore}</div>
                    <div className="text-xs text-gray-600">Score</div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <div>
              <Badge className={`${overallLevel.bg} ${overallLevel.color} border-0`}>
                {overallLevel.level}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                Baseado em {benchmark.totalProducts} produtos analisados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Precificação</p>
                  <Badge className={`${pricingLevel.bg} ${pricingLevel.color} border-0 text-xs`}>
                    {pricingLevel.level}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Score</span>
                  <span className="font-medium">{benchmark.pricingScore}%</span>
                </div>
                <Progress value={benchmark.pricingScore} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Competitividade</p>
                  <Badge className={`${competitivenessLevel.bg} ${competitivenessLevel.color} border-0 text-xs`}>
                    {competitivenessLevel.level}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Score</span>
                  <span className="font-medium">{benchmark.competitivenessScore}%</span>
                </div>
                <Progress value={benchmark.competitivenessScore} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Posição Geral</p>
                  <p className="text-xs text-gray-600">
                    {benchmark.leaderCount} líderes de {benchmark.totalProducts}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">Líderes: {benchmark.leaderCount}</span>
                  <span className="text-orange-600">Competitivos: {benchmark.competitiveCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-600">Seguidores: {benchmark.followerCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análise Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Top Performers */}
            {benchmark.leaderCount > 0 && (
              <div>
                <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Produtos Líderes ({benchmark.leaderCount})
                </h4>
                <p className="text-sm text-gray-600">
                  Estes produtos estão com preços mais competitivos que a concorrência.
                </p>
              </div>
            )}

            {/* Areas for Improvement */}
            {benchmark.followerCount > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Oportunidades de Melhoria ({benchmark.followerCount})
                </h4>
                <p className="text-sm text-gray-600">
                  Estes produtos podem ter seus preços otimizados para melhor competitividade.
                </p>
              </div>
            )}

            {/* Competitive Products */}
            {benchmark.competitiveCount > 0 && (
              <div>
                <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Produtos Competitivos ({benchmark.competitiveCount})
                </h4>
                <p className="text-sm text-gray-600">
                  Estes produtos estão bem posicionados no mercado.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}