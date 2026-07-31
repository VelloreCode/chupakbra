import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingDown, TrendingUp, Minus, ExternalLink, Zap, Trophy, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompetitorPrice {
  id: number;
  name: string;
  basePrice: string;
  sourceUrl: string;
  sku: string;
}

interface MasterProductComparison {
  id: number;
  name: string;
  basePrice: string;
  imageUrl: string;
  sourceUrl: string;
  sku: string;
  competitors: CompetitorPrice[];
  bestPrice?: CompetitorPrice;
  worstPrice?: CompetitorPrice;
  savings?: number;
}

interface PriceComparisonWidgetProps {
  className?: string;
  maxProducts?: number;
}

export default function PriceComparisonWidget({ className = "", maxProducts = 6 }: PriceComparisonWidgetProps) {
  const [selectedProduct, setSelectedProduct] = useState<MasterProductComparison | null>(null);

  const { data: comparisons, isLoading } = useQuery({
    queryKey: ["/api/products/masters-with-competitors"],
    select: (data: MasterProductComparison[]) => {
      return data
        .filter(master => master.competitors.length > 0)
        .map(master => {
          const allPrices = [
            { ...master, id: master.id, name: master.name, basePrice: master.basePrice, sourceUrl: master.sourceUrl, sku: master.sku },
            ...master.competitors
          ];
          
          const sortedPrices = allPrices.sort((a, b) => parseFloat(a.basePrice) - parseFloat(b.basePrice));
          const bestPrice = sortedPrices[0];
          const worstPrice = sortedPrices[sortedPrices.length - 1];
          const savings = parseFloat(worstPrice.basePrice) - parseFloat(bestPrice.basePrice);

          return {
            ...master,
            bestPrice,
            worstPrice,
            savings
          };
        })
        .slice(0, maxProducts);
    }
  });

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const getPriceStatus = (product: MasterProductComparison) => {
    if (!product.bestPrice || !product.worstPrice) return null;
    
    const masterPrice = parseFloat(product.basePrice);
    const bestPrice = parseFloat(product.bestPrice.basePrice);
    
    if (masterPrice === bestPrice) {
      return { type: 'best', icon: Trophy, color: 'text-green-600 bg-green-100', label: 'Melhor Preço' };
    } else {
      const difference = masterPrice - bestPrice;
      const percentage = (difference / bestPrice) * 100;
      return { 
        type: 'higher', 
        icon: TrendingUp, 
        color: 'text-red-600 bg-red-100', 
        label: `+${percentage.toFixed(1)}%` 
      };
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Comparação de Preços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparisons?.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Comparação de Preços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma comparação disponível
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Cadastre produtos com concorrentes para ver comparações de preços.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Comparação Rápida de Preços
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map((product) => {
            const status = getPriceStatus(product);
            const StatusIcon = status?.icon || Minus;

            return (
              <Card key={product.id} className="border hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 mb-2">
                        {product.name}
                      </h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Seu preço:</span>
                          <span className="font-medium">{formatPrice(product.basePrice)}</span>
                        </div>
                        
                        {product.bestPrice && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Melhor:</span>
                            <span className="font-medium text-green-600">{formatPrice(product.bestPrice.basePrice)}</span>
                          </div>
                        )}
                        
                        {status && (
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-full ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {status.label}
                            </Badge>
                          </div>
                        )}
                        
                        {product.savings && product.savings > 0 && (
                          <div className="text-xs text-green-600">
                            Economia: {formatPrice(product.savings)}
                          </div>
                        )}
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={() => setSelectedProduct(product)}
                          >
                            Ver Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded-lg"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <div>
                                <h3 className="font-medium">{product.name}</h3>
                                <p className="text-sm text-gray-600">Comparação detalhada de preços</p>
                              </div>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4 py-4">
                            <div className="grid gap-3">
                              {/* Master Product */}
                              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-500 rounded-lg">
                                    <Trophy className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-sm">Seu Produto (Master)</h5>
                                    <p className="text-xs text-gray-600">{product.sku}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">{formatPrice(product.basePrice)}</p>
                                  <a 
                                    href={product.sourceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    Ver fonte <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>

                              {/* Competitors */}
                              {product.competitors
                                .sort((a, b) => parseFloat(a.basePrice) - parseFloat(b.basePrice))
                                .map((competitor, index) => {
                                  const isLowest = parseFloat(competitor.basePrice) === parseFloat(product.bestPrice?.basePrice || "0");
                                  
                                  return (
                                    <div key={competitor.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                                      isLowest ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-gray-50 dark:bg-gray-800'
                                    }`}>
                                      <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${
                                          isLowest ? 'bg-green-500' : 'bg-gray-400'
                                        }`}>
                                          <span className="text-white font-bold text-xs">{index + 1}</span>
                                        </div>
                                        <div>
                                          <h5 className="font-medium text-sm">{competitor.name}</h5>
                                          <p className="text-xs text-gray-600">{competitor.sku}</p>
                                          {isLowest && (
                                            <Badge variant="outline" className="mt-1 text-xs bg-green-100 text-green-800">
                                              Melhor Preço
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className={`font-bold text-lg ${
                                          isLowest ? 'text-green-600' : ''
                                        }`}>
                                          {formatPrice(competitor.basePrice)}
                                        </p>
                                        <a 
                                          href={competitor.sourceUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          Ver fonte <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {/* Summary */}
                            {product.bestPrice && product.worstPrice && (
                              <div className="border-t pt-4">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <p className="text-sm text-gray-600">Menor Preço</p>
                                    <p className="font-bold text-green-600">{formatPrice(product.bestPrice.basePrice)}</p>
                                    <p className="text-xs text-gray-500">{product.bestPrice.name}</p>
                                  </div>
                                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <p className="text-sm text-gray-600">Maior Preço</p>
                                    <p className="font-bold text-red-600">{formatPrice(product.worstPrice.basePrice)}</p>
                                    <p className="text-xs text-gray-500">{product.worstPrice.name}</p>
                                  </div>
                                </div>
                                {product.savings && product.savings > 0 && (
                                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                    <p className="text-sm text-gray-600">Potencial de Economia</p>
                                    <p className="font-bold text-blue-600 text-lg">{formatPrice(product.savings)}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}