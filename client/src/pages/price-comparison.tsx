import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, TrendingDown, TrendingUp, Trophy, Target, ExternalLink, Filter, ArrowDown, ArrowUp, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


export default function PriceComparison() {
  const { isAuthenticated, isLoading } = useAuth();
  const { permissions } = useUserRole();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  // Initialize state and localStorage
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with localStorage value on component mount
  useEffect(() => {
    try {
      const savedClient = localStorage.getItem('priceComparison_selectedClient');
      if (savedClient && savedClient !== "all") {
        setSelectedClient(savedClient);
      }
    } catch (error) {
      console.warn('Failed to load client filter from localStorage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage whenever selectedClient changes (after initialization)
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('priceComparison_selectedClient', selectedClient);
      } catch (error) {
        console.warn('Failed to save client filter to localStorage:', error);
      }
    }
  }, [selectedClient, isInitialized]);
  const [location] = useLocation();
  
  // Get product ID from URL parameter
  const productId = useMemo(() => {
    console.log("Wouter location:", location);
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('product');
    console.log("Window location search:", window.location.search);
    console.log("Extracted product ID:", id);
    return id;
  }, [location]);

  // Query clients for displaying client names
  const { data: clientsData } = useQuery({
    queryKey: ["/api/clients"],
    staleTime: 300000, // 5 minutes
  });

  const { data: comparisons, isLoading: comparisonsLoading, error: comparisonsError } = useQuery({
    queryKey: productId ? ["/api/products/masters-with-competitors", productId, selectedClient] : ["/api/products/masters-with-competitors", selectedClient],
    queryFn: ({ queryKey }) => {
      let url = productId ? `/api/products/masters-with-competitors?masterId=${productId}` : "/api/products/masters-with-competitors";
      
      // Add client filter for competitors if selected
      if (selectedClient !== "all") {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}competitorClientId=${selectedClient}`;
      }
      
      return fetch(url, { credentials: 'include' }).then(res => res.json());
    },
    enabled: isAuthenticated && isInitialized,
    staleTime: productId ? 10 * 60 * 1000 : 3 * 60 * 1000, // 10 minutes for specific product, 3 for all
    gcTime: productId ? 30 * 60 * 1000 : 10 * 60 * 1000, // 30 minutes for specific product, 10 for all
    select: (data: any[]) => {
      console.log("Processing data with productId:", productId);
      
      // Determine which products to process
      let filteredData;
      if (productId) {
        console.log("Filtering for product ID:", productId);
        console.log("All available products:", data.map(m => ({ id: m.id, name: m.name, competitors: m.competitors.length })));
        const specificProduct = data.find(master => master.id.toString() === productId);
        console.log("Found specific product:", specificProduct ? specificProduct.name : 'Not found');
        filteredData = specificProduct ? [specificProduct] : [];
        console.log("Filtered result:", filteredData.length, "products");
      } else {
        // For general view, only show products with competitors
        filteredData = data.filter(master => master.competitors.length > 0);
      }
      
      return filteredData
        .map(master => {
          const allPrices = [
            { 
              ...master, 
              id: master.id, 
              name: master.name, 
              basePrice: master.basePrice, 
              sourceUrl: master.sourceUrl, 
              sku: master.sku,
              manufacturer: master.manufacturer,
              matchGroup: master.matchGroup,
              clientName: master.clientName,
              isMaster: true
            },
            ...master.competitors.map((comp: any) => ({ ...comp, isMaster: false }))
          ];
          
          const sortedPrices = allPrices.sort((a, b) => parseFloat(a.basePrice) - parseFloat(b.basePrice));
          const bestPrice = sortedPrices[0];
          const worstPrice = sortedPrices[sortedPrices.length - 1];
          const masterPrice = parseFloat(master.basePrice);
          const bestPriceValue = parseFloat(bestPrice.basePrice);
          
          // Lógica de diferença: se master é o melhor preço, usar o segundo melhor
          let differencePrice = bestPriceValue;
          if (bestPrice.isMaster) {
            // Master é o melhor preço, usar o segundo melhor
            differencePrice = sortedPrices.length > 1 ? parseFloat(sortedPrices[1].basePrice) : masterPrice;
          }
          const priceDifference = masterPrice - differencePrice;
          
          // Cálculos para concorrentes apenas (excluindo master)
          const competitorPrices = master.competitors.map((c: any) => parseFloat(c.basePrice));
          const minCompetitorPrice = competitorPrices.length > 0 ? Math.min(...competitorPrices) : 0;
          const maxCompetitorPrice = competitorPrices.length > 0 ? Math.max(...competitorPrices) : 0;
          
          const savings = parseFloat(worstPrice.basePrice) - parseFloat(bestPrice.basePrice);
          const isCompetitive = masterPrice <= bestPriceValue * 1.05; // Within 5% of best price

          return {
            ...master,
            allPrices: sortedPrices,
            bestPrice,
            worstPrice,
            savings,
            priceDifference,
            minCompetitorPrice,
            maxCompetitorPrice,
            isCompetitive,
            competitiveAdvantage: masterPrice === bestPriceValue ? 'best' : 
                                 masterPrice < bestPriceValue * 1.1 ? 'good' : 'poor'
          };
        });
    }
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  if (!permissions.canAccessComparison) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <div className="ml-64">
          <main className="p-6">
            <Card className="border-red-200 bg-red-50 dark:bg-red-900">
              <CardContent className="p-8">
                <div className="text-center">
                  <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
                    Acesso Negado
                  </h2>
                  <p className="text-red-600 dark:text-red-300">
                    Você não tem permissão para acessar a página de comparação de preços.
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numPrice);
  };

  // Error state
  if (comparisonsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <div className="ml-64">
          <main className="p-6">
            <Card className="border-red-200 bg-red-50 dark:bg-red-900">
              <CardContent className="p-8">
                <div className="text-center">
                  <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
                    Erro ao Carregar Dados
                  </h2>
                  <p className="text-red-600 dark:text-red-300 mb-4">
                    Não foi possível carregar as comparações de preços.
                  </p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-100"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const filteredComparisons = comparisons || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="ml-64">
        <main className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Comparação de Preços
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {productId ? 'Análise detalhada do produto selecionado' : 'Análise competitiva de produtos com concorrentes'}
                </p>
              </div>
              
              {/* Client Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar concorrentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os concorrentes</SelectItem>
                    {(clientsData || []).filter((client: any) => !client.isMaster).map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          {!productId && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {filteredComparisons.length}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Produtos com Concorrentes
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {filteredComparisons.filter(p => p.competitiveAdvantage === 'best').length}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Com Melhor Preço
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {filteredComparisons.filter(p => p.competitiveAdvantage === 'poor').length}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Não Competitivos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Comparisons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Análise Detalhada ({filteredComparisons.length} produtos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredComparisons.length > 0 ? (
                <div className="space-y-6">
                  {filteredComparisons.map((product: any) => (
                    <Card key={product.id} className="border-2">
                      <CardContent className="p-6">
                        {/* Product Header with Thumbnail */}
                        <div className="mb-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg border-2 border-gray-200 shadow-sm flex items-center justify-center">
                                  <Package className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                  {product.name}
                                </h3>
                                <Badge variant={product.competitiveAdvantage === 'best' ? 'default' : 
                                             product.competitiveAdvantage === 'good' ? 'secondary' : 'destructive'}>
                                  {product.competitiveAdvantage === 'best' ? 'Melhor Preço' :
                                   product.competitiveAdvantage === 'good' ? 'Competitivo' : 'Não Competitivo'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">SKU: {product.sku}</p>
                            </div>
                          </div>

                          {/* Price Analysis Cards */}
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* Seu Preço */}
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">MEU</span>
                                </div>
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Seu preço</span>
                              </div>
                              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                                {formatPrice(product.basePrice)}
                              </p>
                            </div>

                            {/* Melhor Preço */}
                            {product.bestPrice && (
                              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Trophy className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Melhor preço</span>
                                </div>
                                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                                  {formatPrice(product.bestPrice.basePrice)}
                                </p>
                              </div>
                            )}

                            {/* Diferença */}
                            <div className={`bg-gradient-to-br p-4 rounded-lg border ${
                              product.priceDifference > 0 
                                ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200' 
                                : 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                {product.priceDifference > 0 ? (
                                  <TrendingUp className="w-5 h-5 text-red-600" />
                                ) : (
                                  <TrendingDown className="w-5 h-5 text-green-600" />
                                )}
                                <span className={`text-sm font-medium ${
                                  product.priceDifference > 0 
                                    ? 'text-red-700 dark:text-red-300' 
                                    : 'text-green-700 dark:text-green-300'
                                }`}>
                                  Diferença
                                </span>
                              </div>
                              <p className={`text-2xl font-bold ${
                                product.priceDifference > 0 
                                  ? 'text-red-800 dark:text-red-200' 
                                  : 'text-green-800 dark:text-green-200'
                              }`}>
                                {product.priceDifference > 0 ? '+' : ''}{formatPrice(Math.abs(product.priceDifference))}
                              </p>
                            </div>

                            {/* Menor Concorrente */}
                            {product.minCompetitorPrice > 0 && (
                              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <ArrowDown className="w-5 h-5 text-emerald-600" />
                                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Menor concorrente</span>
                                </div>
                                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                                  {formatPrice(product.minCompetitorPrice)}
                                </p>
                              </div>
                            )}

                            {/* Maior Concorrente */}
                            {product.maxCompetitorPrice > 0 && (
                              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <ArrowUp className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Maior concorrente</span>
                                </div>
                                <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                                  {formatPrice(product.maxCompetitorPrice)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price Comparison Table */}
                        <div className="grid gap-3">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Comparação com {product.competitors.length} concorrente{product.competitors.length !== 1 ? 's' : ''}:
                          </h4>
                          
                          {/* Master Product Row */}
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-shrink-0">
                                    {product.imageUrl ? (
                                      <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-12 h-12 object-cover rounded-lg border border-blue-300"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <Trophy className="h-6 w-6 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h5 className="font-medium">Seu Produto (Master)</h5>
                                    <p className="text-sm text-gray-600">{product.sku}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-xl">{formatPrice(product.basePrice)}</p>
                                <a 
                                  href={product.sourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 justify-end"
                                >
                                  Ver fonte <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                            
                            {/* Additional Product Info */}
                            <div className="grid grid-cols-4 gap-4 pt-3 border-t border-blue-200">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID Produto</p>
                                <p className="font-semibold text-gray-900">#{product.id}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</p>
                                <p className="font-semibold text-gray-900">{product.clientName || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Marca</p>
                                <p className="font-semibold text-gray-900">{product.manufacturer || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Grupo Match</p>
                                <p className="font-semibold text-blue-600">{product.matchGroup || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Competitors */}
                          {product.competitors.map((competitor: any, index: number) => {
                            const difference = parseFloat(competitor.basePrice) - parseFloat(product.basePrice);
                            return (
                              <div key={competitor.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0">
                                        {competitor.imageUrl ? (
                                          <img
                                            src={competitor.imageUrl}
                                            alt={competitor.name}
                                            className="w-12 h-12 object-cover rounded-lg border border-gray-300"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">#{index + 1}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <h5 className="font-medium">{competitor.name}</h5>
                                        <p className="text-sm text-gray-600">{competitor.sku}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-xl">{formatPrice(competitor.basePrice)}</p>
                                    <div className="flex items-center gap-2 justify-end">
                                      {difference !== 0 && (
                                        <span className={`text-sm flex items-center gap-1 ${
                                          difference > 0 ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                          {difference > 0 ? (
                                            <TrendingUp className="h-3 w-3" />
                                          ) : (
                                            <TrendingDown className="h-3 w-3" />
                                          )}
                                          {Math.abs(difference) > 0 ? formatPrice(Math.abs(difference)) : ''}
                                        </span>
                                      )}
                                      <a 
                                        href={competitor.sourceUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        Ver fonte <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Additional Competitor Info */}
                                <div className="grid grid-cols-4 gap-4 pt-3 border-t border-gray-200">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID Produto</p>
                                    <p className="font-semibold text-gray-900">#{competitor.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</p>
                                    <p className="font-semibold text-gray-900">{competitor.clientName || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Marca</p>
                                    <p className="font-semibold text-gray-900">{competitor.manufacturer || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Grupo Match</p>
                                    <p className="font-semibold text-blue-600">{competitor.matchGroup || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhuma comparação encontrada
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Cadastre produtos com concorrentes para ver comparações detalhadas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}