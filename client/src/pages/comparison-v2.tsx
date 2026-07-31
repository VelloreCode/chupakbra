import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, TrendingDown, Package, AlertTriangle } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import PriceComparisonCard from "@/components/comparison/price-comparison-card";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function ComparisonV2() {
  const { user, isAuthenticated } = useAuth();
  const permissions = { canAccessComparison: isAuthenticated };
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();

  // URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const activeProductId = urlParams.get('product');
  const isProductView = !!activeProductId;

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Debug states
  const [debugInfo, setDebugInfo] = useState<any>({});

  // Main products query - filter for Vellore products only (clientId=3)
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["/api/products", { limit: 1000, clientId: 3, search: searchTerm }],
    enabled: !isProductView,
  });

  // Debug effect to track data
  useEffect(() => {
    const debug = {
      timestamp: new Date().toISOString(),
      productsData: productsData ? {
        hasProducts: !!productsData.products,
        productsLength: productsData.products?.length || 0,
        firstProductSample: productsData.products?.[0] || null,
        cortadorProduct: productsData.products?.find((p: any) => 
          p.name.toLowerCase().includes('cortador')
        ) || null
      } : null,
      searchTerm,
      isProductView,
      activeProductId
    };
    setDebugInfo(debug);
    console.log("ComparisonV2 Debug:", debug);
  }, [productsData, searchTerm, isProductView, activeProductId]);

  // Process products - NO FILTERING HERE, just return raw data
  const allProducts = useMemo(() => {
    if (isProductView) return [];
    if (!productsData?.products) return [];
    
    console.log("Processing products:", {
      totalProducts: productsData.products.length,
      sampleProduct: productsData.products[0]
    });
    
    return productsData.products;
  }, [productsData, isProductView]);

  // Filter products based on search ONLY
  const filteredProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      console.log("No products to filter");
      return [];
    }
    
    // Step 1: Filter by Vellore master products with match groups
    const velloreMasters = allProducts.filter((product: any) => {
      const isVellore = product.clientId === 3; // Vellore has clientId 3
      const isMaster = product.isMaster === true;
      const hasMatchGroup = product.matchGroup && product.matchGroup.trim() !== '';
      
      const result = isVellore && isMaster && hasMatchGroup;
      
      if (product.name.toLowerCase().includes('cortador')) {
        console.log("Cortador product check:", {
          name: product.name,
          clientId: product.clientId,
          isMaster: product.isMaster,
          matchGroup: product.matchGroup,
          isVellore,
          result
        });
      }
      
      return result;
    });
    
    console.log("After Vellore master filter:", {
      total: velloreMasters.length,
      hasCortador: velloreMasters.some((p: any) => p.name.toLowerCase().includes('cortador'))
    });
    
    // Step 2: Apply search filter
    const searchFiltered = velloreMasters.filter((product: any) => {
      if (!searchTerm) return true;
      
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (product.name.toLowerCase().includes('cortador') && searchTerm.toLowerCase().includes('cortador')) {
        console.log("Search filter for cortador:", {
          name: product.name,
          searchTerm,
          matchesSearch
        });
      }
      
      return matchesSearch;
    });
    
    console.log("Final filtered products:", {
      total: searchFiltered.length,
      searchTerm,
      hasCortador: searchFiltered.some((p: any) => p.name.toLowerCase().includes('cortador'))
    });
    
    return searchFiltered;
  }, [allProducts, searchTerm]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  if (!permissions.canAccessComparison) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <div className="ml-64">
          <main className="p-6">
            <Card className="border-red-200 bg-red-50 dark:bg-red-900">
              <CardContent className="p-8">
                <div className="text-center">
                  <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-red-800 mb-2">Acesso Negado</h2>
                  <p className="text-red-600">
                    Você não tem permissão para acessar a comparação de preços.
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="ml-64">
        <main className="p-6">
          {/* Header with Version */}
          <div className="rounded-lg bg-card text-card-foreground w-full mb-6 border-0 shadow-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Comparação de Preços V2</h1>
                    <p className="opacity-90">
                      Compare preços entre fornecedores e encontre as melhores oportunidades
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Debug Mode
                </Badge>
              </div>
            </div>
          </div>

          {/* Debug Info Card */}
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Debug Information V2</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Total API Products:</span><br/>
                  {debugInfo.productsData?.productsLength || 0}
                </div>
                <div>
                  <span className="font-semibold">Filtered Products:</span><br/>
                  {filteredProducts.length}
                </div>
                <div>
                  <span className="font-semibold">Search Term:</span><br/>
                  "{searchTerm}"
                </div>
                <div>
                  <span className="font-semibold">Has Cortador:</span><br/>
                  {debugInfo.productsData?.cortadorProduct ? 'Yes' : 'No'}
                </div>
              </div>
              {debugInfo.productsData?.cortadorProduct && (
                <div className="mt-4 p-3 bg-green-100 rounded">
                  <strong>Cortador Product Found:</strong>
                  <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(debugInfo.productsData.cortadorProduct, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  <span>Buscar Produtos Vellore</span>
                  <Badge variant="secondary">{filteredProducts.length} produtos</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="border-blue-300 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar por nome ou SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => setSearchTerm("cortador")}
                      className="w-full"
                    >
                      Testar "cortador"
                    </Button>
                  </div>
                </div>

                {searchTerm && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Busca: "{searchTerm}"
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="ml-1 text-xs hover:bg-gray-200 rounded px-1"
                      >
                        ×
                      </button>
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <span>Produtos Encontrados V2</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {filteredProducts.length} produtos Vellore com comparação disponível
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {productsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
                  ))}
                </div>
              ) : productsError ? (
                <div className="text-center text-red-600 py-8">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4" />
                  <p>Erro ao carregar produtos: {productsError.toString()}</p>
                  <Button onClick={handleRefresh} className="mt-4">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Nenhum Produto Encontrado V2
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Total de produtos da API: {debugInfo.productsData?.productsLength || 0}
                  </p>
                  <p className="text-gray-500 mb-4">
                    Produtos após filtro Vellore Master: {allProducts.length}
                  </p>
                  {searchTerm && (
                    <Button onClick={() => setSearchTerm("")} variant="outline">
                      Limpar Busca
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredProducts.map((product: any) => (
                    <div key={product.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <Badge variant="outline">ID: {product.id}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div><span className="font-semibold">SKU:</span> {product.sku}</div>
                        <div><span className="font-semibold">Match Group:</span> {product.matchGroup}</div>
                        <div><span className="font-semibold">Is Master:</span> {product.isMaster ? 'Sim' : 'Não'}</div>
                        <div><span className="font-semibold">Client ID:</span> {product.clientId}</div>
                      </div>
                      <div className="mt-3">
                        <PriceComparisonCard
                          product={product}
                          productId={product.id}
                          isDetailed={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}