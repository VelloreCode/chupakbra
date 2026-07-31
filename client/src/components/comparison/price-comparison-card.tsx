import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceTooltip } from "@/components/ui/price-tooltip";
import { usePriceAnalysis } from "@/hooks/usePriceAnalysis";
import { TrendingDown, TrendingUp, Package, Eye, Target, BarChart3, Store, DollarSign, Activity, AlertCircle } from "lucide-react";
import ProductMatchModal from "./product-match-modal";
import type { Product, Price, Client } from "@shared/schema";

interface PriceComparisonCardProps {
  product: Product;
  prices: Array<Price & { client: Client }>;
  bestPrice: Price & { client: Client };
  savings: number;
}

export default function PriceComparisonCard({
  product,
  prices,
  bestPrice,
  savings
}: PriceComparisonCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'vellore' | 'clients'>('vellore');
  const basePrice = parseFloat(product.basePrice);

  // Separate client and competitor prices based on client name (fallback approach)
  const clientPrices = prices.filter(p => {
    // Check client name for compatibility
    return !p.client.name.toLowerCase().includes('concorrent') && !p.client.name.toLowerCase().includes('competitor');
  });
  
  const competitorPrices = prices.filter(p => {
    // Check client name for compatibility
    return p.client.name.toLowerCase().includes('concorrent') || p.client.name.toLowerCase().includes('competitor');
  });

  // VS Nossa Loja calculations
  const ourValue = basePrice;
  const minClientPrice = clientPrices.length > 0 ? Math.min(...clientPrices.map(p => parseFloat(p.price))) : null;
  const minCompetitorPrice = competitorPrices.length > 0 ? Math.min(...competitorPrices.map(p => parseFloat(p.price))) : null;
  
  // Find the actual price objects for detailed info
  const minClientPriceObj = clientPrices.find(p => parseFloat(p.price) === minClientPrice);
  const minCompetitorPriceObj = competitorPrices.find(p => parseFloat(p.price) === minCompetitorPrice);
  
  const clientVsCompetitorVariation = minClientPrice && minCompetitorPrice 
    ? ((minClientPrice - minCompetitorPrice) / minCompetitorPrice * 100)
    : null;

  // Entre Clientes calculations
  const maxClientPrice = clientPrices.length > 0 ? Math.max(...clientPrices.map(p => parseFloat(p.price))) : null;
  const clientPriceVariation = minClientPrice && maxClientPrice 
    ? ((maxClientPrice - minClientPrice) / minClientPrice * 100)
    : null;

  // Price analysis for tooltips
  const priceAnalysis = usePriceAnalysis(basePrice, prices.map((p, index) => ({ 
    id: p.id,
    client: { id: p.client.id, name: p.client.name }, 
    price: p.price, // Keep as string as required by the interface
    percentage: 0 
  })));

  return (
    <>
      <Card className="w-full mb-6 border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
        <CardHeader className="relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                              <svg class="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20 6h-2.18l-1.41-1.41c-.19-.19-.44-.29-.71-.29H8.31c-.27 0-.52.1-.71.29L6.18 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                              </svg>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <Package className="h-8 w-8 text-gray-400" />
                  )}
                </div>
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {product.name}
                </CardTitle>
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500">
                    SKU: {product.sku}
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                    R$ {basePrice.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="bg-[#00ab3a] text-[#ffffff] border-[#00ab3a] hover:bg-[#00ab3a]/90 dark:bg-[#00ab3a] dark:text-[#ffffff] dark:border-[#00ab3a] dark:hover:bg-[#00ab3a]/90"
              >
                <Eye className="h-4 w-4 mr-2" />
                <span className="font-medium">Análise Completa</span>
              </Button>
            </div>
          </div>
          
          {/* Toggle de Modo de Comparação */}
          <div className="flex mt-6 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-600 shadow-sm">
            <button
              onClick={() => setComparisonMode('vellore')}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                comparisonMode === 'vellore'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Target className="h-4 w-4" />
                <span>vs Nossa Loja</span>
              </div>
            </button>
            <button
              onClick={() => setComparisonMode('clients')}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                comparisonMode === 'clients'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Entre Clientes</span>
              </div>
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {comparisonMode === 'vellore' ? (
            /* Slide 1: VS Nossa Loja */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {/* Card 1: Nosso Valor */}
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">Nosso Valor</p>
                <PriceTooltip
                  productName={product.name}
                  basePrice={ourValue}
                  variations={priceAnalysis.variations}
                >
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 cursor-help">
                    R$ {ourValue.toFixed(2)}
                  </p>
                </PriceTooltip>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Vellore</p>
                {product.manufacturer && (
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 font-normal opacity-80">
                    {product.manufacturer}
                  </p>
                )}
              </div>

              {/* Card 2: Menor Valor Clientes */}
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl shadow-lg border-2 border-green-200 dark:border-green-700">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Menor Valor Clientes</p>
                {minClientPrice ? (
                  <>
                    <PriceTooltip
                      productName={product.name}
                      basePrice={minClientPrice}
                      variations={priceAnalysis.variations}
                    >
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100 cursor-help">
                        R$ {minClientPrice.toFixed(2)}
                      </p>
                    </PriceTooltip>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                      {minClientPriceObj?.client.name}
                    </p>

                  </>
                ) : (
                  <p className="text-sm text-gray-500">Sem dados</p>
                )}
              </div>

              {/* Card 3: Menor Valor Concorrentes */}
              <div className="relative text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-xl shadow-lg border-2 border-orange-200 dark:border-orange-700">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
                {/* Badge Concorrente */}
                {minCompetitorPriceObj && (minCompetitorPriceObj.client.name.toLowerCase().includes('concorrent') || minCompetitorPriceObj.client.name.toLowerCase().includes('competitor')) && (
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-red-500 text-white text-xs">
                      Concorrente
                    </Badge>
                  </div>
                )}
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">Menor Valor Concorrentes</p>
                {minCompetitorPrice ? (
                  <>
                    <PriceTooltip
                      productName={product.name}
                      basePrice={minCompetitorPrice}
                      variations={priceAnalysis.variations}
                    >
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 cursor-help">
                        R$ {minCompetitorPrice.toFixed(2)}
                      </p>
                    </PriceTooltip>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                      {minCompetitorPriceObj?.client.name}
                    </p>

                  </>
                ) : (
                  <p className="text-sm text-gray-500">Sem dados</p>
                )}
              </div>

              {/* Card 4: Variação Cliente vs Concorrente */}
              <div className={`text-center p-6 rounded-xl shadow-lg border-2 ${
                minClientPrice && minCompetitorPrice
                  ? minCompetitorPrice < minClientPrice
                    ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 border-red-200 dark:border-red-700'
                    : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-green-200 dark:border-green-700'
                  : 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-purple-200 dark:border-purple-700'
              }`}>
                <div className="flex items-center justify-center mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    minClientPrice && minCompetitorPrice
                      ? minCompetitorPrice < minClientPrice
                        ? 'bg-red-500'
                        : 'bg-green-500'
                      : 'bg-purple-500'
                  }`}>
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                </div>
                {/* Competitive Status */}
                {minClientPrice && minCompetitorPrice ? (
                  <>
                    {minCompetitorPrice < minClientPrice ? (
                      <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">
                        Estamos Perdendo
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-2">
                        Estamos Ganhando
                      </p>
                    )}
                    
                    {/* Price Values */}
                    <div className="mb-2 text-xs text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Cliente: R$ {minClientPrice.toFixed(2)} | Concorrente: R$ {minCompetitorPrice.toFixed(2)}
                      </p>
                    </div>
                    
                    {/* Percentage Variation */}
                    <p className={`text-2xl font-bold ${
                      minCompetitorPrice < minClientPrice
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}>
                      {clientVsCompetitorVariation && clientVsCompetitorVariation > 0 ? '+' : ''}{clientVsCompetitorVariation?.toFixed(1)}%
                    </p>
                    
                    {/* Monetary Variation */}
                    <p className={`text-sm font-medium ${
                      minCompetitorPrice < minClientPrice
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      R$ {Math.abs(minClientPrice - minCompetitorPrice).toFixed(2)} de diferença
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">Variação Cliente vs Concorrente</p>
                    <p className="text-sm text-gray-500">Sem comparação</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Slide 2: Entre Clientes */
            clientPrices.length > 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Card 1: Menor Valor Clientes */}
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl shadow-lg border-2 border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Menor Valor</p>
                  <PriceTooltip
                    productName={product.name}
                    basePrice={minClientPrice!}
                    variations={priceAnalysis.variations}
                  >
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100 mb-1 cursor-help">
                      R$ {minClientPrice?.toFixed(2)}
                    </p>
                  </PriceTooltip>
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                    {clientPrices.find(p => parseFloat(p.price) === minClientPrice)?.client.name}
                  </p>

                </div>

                {/* Card 2: Maior Valor Clientes */}
                <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-xl shadow-lg border-2 border-red-200 dark:border-red-700">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Maior Valor</p>
                  <PriceTooltip
                    productName={product.name}
                    basePrice={maxClientPrice!}
                    variations={priceAnalysis.variations}
                  >
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100 mb-1 cursor-help">
                      R$ {maxClientPrice?.toFixed(2)}
                    </p>
                  </PriceTooltip>
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                    {clientPrices.find(p => parseFloat(p.price) === maxClientPrice)?.client.name}
                  </p>

                </div>

                {/* Card 3: Variação entre Menor e Maior */}
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">Variação</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                    {clientPriceVariation?.toFixed(1)}%
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    R$ {(maxClientPrice! - minClientPrice!).toFixed(2)} de diferença
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Dados insuficientes para comparação entre clientes</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
      <ProductMatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
        matchingPrices={prices}
      />
    </>
  );
}