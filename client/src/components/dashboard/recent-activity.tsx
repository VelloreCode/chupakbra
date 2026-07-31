import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceTooltip } from "@/components/ui/price-tooltip";
import { usePriceAnalysis } from "@/hooks/usePriceAnalysis";
import { RefreshCw, Package, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

interface RecentProduct {
  id: number;
  sku: string;
  name: string;
  basePrice: string;
  lastPriceUpdate: Date;
  client?: {
    name: string;
  };
}

export default function RecentActivity() {
  const { data: bestPrices, isLoading: bestPricesLoading } = useQuery({
    queryKey: ["/api/dashboard/best-prices"],
  });

  const { data: recentProducts, isLoading: recentProductsLoading } = useQuery<RecentProduct[]>({
    queryKey: ["/api/dashboard/recent-products"],
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Performing Products */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-text-primary flex items-center justify-between">
            <span>Produtos Maior Variação de Preços</span>
            <Link href="/comparison">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Ver comparação completa">
                <ExternalLink className="h-4 w-4 text-gray-500" />
              </button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bestPricesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-2 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="h-2 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-100 rounded-lg p-3 space-y-1">
                      <div className="h-2 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                      <div className="h-2 bg-gray-200 rounded w-14"></div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 space-y-1">
                      <div className="h-2 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                      <div className="h-2 bg-gray-200 rounded w-14"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : bestPrices && Array.isArray(bestPrices) && bestPrices.length > 0 ? bestPrices.slice(0, 5).map((item: any, index: number) => (
              <div key={item.product.id} className="group p-4 border border-gray-200 rounded-xl hover:border-primary-orange hover:shadow-lg transition-all duration-300 bg-white">
                {/* Header com produto e badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${item.product.imageUrl ? 'hidden' : 'flex'}`}>
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                      <div className="absolute -top-1 -right-1 bg-primary-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[150px]">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-gray-500 font-mono">
                        SKU: {item.product.sku}
                      </p>
                    </div>
                  </div>
                  
                  {/* Economia destacada */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-700">
                      R$ {item.priceVariation ? (parseFloat(item.worstPrice?.price || '0') - parseFloat(item.bestPrice?.price || '0')).toFixed(2) : item.savings.toFixed(2)}
                    </p>
                    <p className="text-xs text-orange-600 font-medium">
                      {item.priceVariation ? `${item.priceVariation.toFixed(1)}% variação` : `${((item.savings / parseFloat(item.product.basePrice)) * 100).toFixed(1)}% economia`}
                    </p>
                  </div>
                </div>

                {/* Comparação de preços lado a lado */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium text-green-700">Menor Preço</span>
                    </div>
                    <PriceTooltip
                      basePrice={parseFloat(item.bestPrice?.price || '0')}
                      variations={item.prices?.filter(p => p.id !== item.bestPrice?.id).map(p => ({
                        client: p.client?.name || 'N/A',
                        price: parseFloat(p.price),
                        percentage: ((parseFloat(p.price) - parseFloat(item.bestPrice?.price || '0')) / parseFloat(item.bestPrice?.price || '0')) * 100
                      })) || []}
                      productName={item.product?.name || 'Produto'}
                    >
                      <p className="font-bold text-green-700 text-sm cursor-help border-b border-dotted border-green-500">
                        R$ {parseFloat(item.bestPrice?.price || '0').toFixed(2)}
                      </p>
                    </PriceTooltip>
                    <p className="text-xs text-green-600 truncate">
                      {item.bestPrice?.client?.name || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-xs font-medium text-red-700">Maior Preço</span>
                    </div>
                    <PriceTooltip
                      basePrice={parseFloat(item.worstPrice?.price || '0')}
                      variations={item.prices?.map(p => ({
                        client: p.client?.name || 'N/A',
                        price: parseFloat(p.price),
                        percentage: ((parseFloat(p.price) - parseFloat(item.worstPrice?.price || '0')) / parseFloat(item.worstPrice?.price || '0')) * 100
                      })) || []}
                      productName={item.product?.name || 'Produto'}
                      marketPosition="high"
                    >
                      <p className="font-bold text-red-700 text-sm cursor-help border-b border-dotted border-red-500">
                        R$ {parseFloat(item.worstPrice?.price || '0').toFixed(2)}
                      </p>
                    </PriceTooltip>
                    <p className="text-xs text-red-600 truncate">
                      {item.worstPrice?.client?.name || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Nenhum produto com variação de preços encontrado</p>
                <p className="text-gray-400 text-sm mt-1">Adicione produtos com múltiplos fornecedores para ver comparações</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Recent Product Updates */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-text-primary">
            Produtos Atualizados Recentemente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentProductsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse p-4 border-l-4 border-gray-200 rounded-r-lg bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded w-32"></div>
                      <div className="h-2 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : recentProducts && Array.isArray(recentProducts) && recentProducts.length > 0 ? recentProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center space-x-4 p-4 border-l-4 border-primary-orange rounded-r-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary-orange bg-opacity-10 flex items-center justify-center flex-shrink-0">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${product.imageUrl ? 'hidden' : 'flex'}`}>
                    <Package className="h-6 w-6 text-primary-orange" />
                  </div>
                </div>
                
                {/* Informações do produto */}
                <div className="flex-1 min-w-0">
                  {/* Primeira linha: Nome do produto - Valor */}
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                      {product.name}
                    </h4>
                    <PriceTooltip
                      basePrice={parseFloat(product.basePrice)}
                      variations={[
                        { client: "Concorrente A", price: parseFloat(product.basePrice) * 1.1, percentage: 10 },
                        { client: "Concorrente B", price: parseFloat(product.basePrice) * 0.95, percentage: -5 }
                      ]}
                      productName={product.name}
                      averagePrice={parseFloat(product.basePrice) * 1.02}
                      marketPosition="competitive"
                    >
                      <p className="font-bold text-primary-orange text-sm ml-2 cursor-help border-b border-dotted border-orange-400">
                        R$ {parseFloat(product.basePrice).toFixed(2)}
                      </p>
                    </PriceTooltip>
                  </div>
                  
                  {/* Segunda linha: Categoria - Cliente */}
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                    <span className="font-mono text-gray-500">
                      {product.sku}
                    </span>
                    <span>•</span>
                    <span className="truncate">
                      {product.client ? product.client.name : 'Sem cliente'}
                    </span>
                  </div>
                  
                  {/* Terceira linha: Data de atualização */}
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(product.lastPriceUpdate), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-text-secondary">
                <p>Nenhuma atualização recente encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
