import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PriceData {
  product: any;
  prices: any[];
  bestPrice: any;
  savings: number;
  competitivePosition: 'leader' | 'follower' | 'premium';
  marketShare: number;
  trend: 'up' | 'down' | 'stable';
}

export default function RealTimePriceWidget() {
  const [isLive, setIsLive] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'savings' | 'position' | 'trend'>('savings');

  const { data: priceData = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/dashboard/best-prices"],
    refetchInterval: isLive ? 30000 : false, // Refresh every 30 seconds when live
  });

  const { data: benchmarkData = {} } = useQuery({
    queryKey: ["/api/analytics/benchmark"],
  });

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        refetch();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isLive, refetch]);

  const getCompetitiveStatus = (savings: number) => {
    if (savings > 10) return { status: 'leader', color: 'text-green-600', bg: 'bg-green-100' };
    if (savings > 0) return { status: 'competitive', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (savings < -10) return { status: 'premium', color: 'text-purple-600', bg: 'bg-purple-100' };
    return { status: 'follower', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <motion.div
                animate={isLive ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 2, repeat: isLive ? Infinity : 0, ease: "linear" }}
              >
                <RefreshCw className="h-5 w-5" />
              </motion.div>
              Comparação em Tempo Real
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant={isLive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className="flex items-center gap-2"
              >
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {isLive ? 'Ao Vivo' : 'Parado'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              variant={selectedMetric === 'savings' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedMetric('savings')}
            >
              Economia
            </Button>
            <Button 
              variant={selectedMetric === 'position' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedMetric('position')}
            >
              Posição
            </Button>
            <Button 
              variant={selectedMetric === 'trend' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedMetric('trend')}
            >
              Tendência
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {Array.isArray(priceData) && priceData.map((item: PriceData, index: number) => {
            const status = getCompetitiveStatus(item.savings);
            
            return (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{item.product.name}</CardTitle>
                          {item.product.isCompetitor === true && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium border border-red-200">
                              Concorrente
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                      </div>
                      <Badge className={`${status.bg} ${status.color} border-0`}>
                        {status.status === 'leader' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {status.status === 'premium' && <Target className="h-3 w-3 mr-1" />}
                        {status.status === 'follower' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {status.status === 'leader' ? 'Líder' : 
                         status.status === 'premium' ? 'Premium' : 'Seguidor'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Vellore Price */}
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-orange-800">Nosso Preço (Vellore)</p>
                        <p className="text-lg font-bold text-orange-900">
                          R$ {parseFloat(item.product.basePrice).toFixed(2)}
                        </p>
                      </div>
                      {getTrendIcon('stable')}
                    </div>

                    {/* Competitor Prices */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Concorrentes</p>
                      {Array.isArray(item.prices) && item.prices.slice(0, 3).map((price: any, idx: number) => (
                        <motion.div
                          key={price.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (index * 0.1) + (idx * 0.05) }}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="text-sm">{price.client?.name || 'Cliente'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">R$ {parseFloat(price.price).toFixed(2)}</span>
                            {idx === 0 && <Badge variant="secondary" className="text-xs">Melhor</Badge>}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Diferença</p>
                        <motion.p 
                          className={`text-lg font-bold ${item.savings > 0 ? 'text-green-600' : 'text-red-600'}`}
                          animate={{ scale: isLive ? [1, 1.05, 1] : 1 }}
                          transition={{ duration: 2, repeat: isLive ? Infinity : 0 }}
                        >
                          R$ {Math.abs(item.savings).toFixed(2)}
                        </motion.p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Status</p>
                        <p className={`text-lg font-bold ${item.savings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.savings > 0 ? 'Líder' : 'Seguidor'}
                        </p>
                      </div>
                    </div>

                    {/* Competition Intensity */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Intensidade Competitiva</span>
                        <span className="text-xs font-medium">
                          {Array.isArray(item.prices) && item.prices.length > 3 ? 'Alta' : item.prices.length > 1 ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                      <Progress 
                        value={Array.isArray(item.prices) ? Math.min((item.prices.length / 5) * 100, 100) : 0} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* No Data State */}
      {(!Array.isArray(priceData) || priceData.length === 0) && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aguardando dados de comparação
          </h3>
          <p className="text-gray-600">
            Cadastre produtos com grupos de comparação para ver análises em tempo real
          </p>
        </motion.div>
      )}
    </div>
  );
}