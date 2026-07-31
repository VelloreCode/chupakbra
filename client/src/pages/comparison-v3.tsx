import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, TrendingDown, Package, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Filter, X } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import PriceComparisonCard from "@/components/comparison/price-comparison-card";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function ComparisonV3() {
  const { user, isAuthenticated } = useAuth();
  const permissions = { canAccessComparison: isAuthenticated };
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Search, filters and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  // Initialize with localStorage value or default to "all"
  const [selectedClient, setSelectedClient] = useState<string>(() => {
    try {
      return localStorage.getItem('priceComparison_selectedClient') || "all";
    } catch {
      return "all";
    }
  });

  // Save to localStorage whenever selectedClient changes
  useEffect(() => {
    try {
      localStorage.setItem('priceComparison_selectedClient', selectedClient);
// Client filter saved to localStorage
    } catch (error) {
      console.warn('[COMPARISON] Failed to save client filter to localStorage:', error);
    }
  }, [selectedClient]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Query products - masters with specific client comparison when client filter is active
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["/api/products", "master-products-filtered", { 
      clientFilter: selectedClient,
      limit: 5000 
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '5000',
        isMaster: 'true'
      });
      
      // If client filter is selected, add it to get only masters with that client's competitors
      if (selectedClient !== "all") {
        params.append('hasCompetitorFromClient', selectedClient);
      }
      
      const response = await fetch(`/api/products?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes cache
  });

  // Query clients for displaying client names
  const { data: clientsData } = useQuery({
    queryKey: ["/api/clients"],
    staleTime: 300000, // 5 minutes
  });

  // Query categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 300000, // 5 minutes
  });

  // Extract unique brands from products
  const uniqueBrands = useMemo(() => {
    if (!productsData?.products) return [];
    const brands = productsData.products
      .map((product: any) => product.manufacturer || product.brand)
      .filter((brand: any) => brand && brand.trim() !== '')
      .filter((brand: any, index: number, self: any[]) => self.indexOf(brand) === index);
    return brands.sort();
  }, [productsData]);

  // Filter products with two conditions
  const filteredProducts = useMemo(() => {
    if (!productsData?.products) return [];
    
    let filtered = productsData.products || [];
    
    console.log("V3 - Products from API:", filtered.length);
    console.log("V3 - Total in DB (for reference):", productsData?.total);
    
    // Products are already filtered by backend based on client selection
    // No additional filtering needed here for client logic
    if (selectedClient === "all") {
      console.log("V3 - Showing all MASTER products:", filtered.length);
    } else {
      console.log("V3 - Showing MASTER products with", selectedClient, "competitors:", filtered.length);
    }
    
    // Apply search filter (ID, name, SKU, match group)
    if (searchTerm) {
      filtered = filtered.filter((product: any) => 
        product.id.toString().includes(searchTerm) ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.matchGroup && product.matchGroup.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply brand filter
    if (selectedBrand !== "all") {
      filtered = filtered.filter((product: any) => 
        product.manufacturer === selectedBrand || product.brand === selectedBrand
      );
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((product: any) => 
        product.categoryName === selectedCategory || product.categoryId?.toString() === selectedCategory
      );
    }
    
    return filtered;
  }, [productsData, searchTerm, selectedBrand, selectedCategory, selectedClient, clientsData]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleBrandChange = (value: string) => {
    setSelectedBrand(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleClientChange = (value: string) => {
    setSelectedClient(value);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedBrand("all");
    setSelectedCategory("all");
    setSelectedClient("all");
    setCurrentPage(1);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleRefresh = () => {
    queryClient.clear(); // Clear all cache
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
          {/* Header V3 */}
          <div className="rounded-lg bg-card text-card-foreground w-full mb-6 border-0 shadow-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Comparação de Preços</h1>
                    <p className="opacity-90">
                      Produtos Master disponíveis para comparação
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total de Produtos</p>
                    <p className="text-xl font-bold">{productsData?.products?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Com Match Groups</p>
                    <p className="text-xl font-bold">{filteredProducts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Após Busca</p>
                    <p className="text-xl font-bold">{searchTerm ? filteredProducts.length : filteredProducts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span>Buscar e Filtrar Produtos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
                {/* Search Input */}
                <div className="lg:col-span-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por ID, nome, SKU ou grupo de match..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Brand Filter */}
                <div>
                  <Select value={selectedBrand} onValueChange={handleBrandChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as marcas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as marcas</SelectItem>
                      {uniqueBrands.map((brand: string) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categoriesData && Array.isArray(categoriesData) ? categoriesData.map((category: any) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>

                {/* Client Filter */}
                <div>
                  <Select value={selectedClient} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clientsData && Array.isArray(clientsData) ? clientsData.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  
                  {(searchTerm || selectedBrand !== "all" || selectedCategory !== "all" || selectedClient !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-gray-600 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>

                {/* Active Filters */}
                <div className="flex gap-2">
                  {searchTerm && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Busca: "{searchTerm}"
                      <button 
                        onClick={() => handleSearchChange("")}
                        className="ml-1 text-xs hover:bg-gray-200 rounded px-1"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedBrand !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Marca: {selectedBrand}
                      <button 
                        onClick={() => handleBrandChange("all")}
                        className="ml-1 text-xs hover:bg-gray-200 rounded px-1"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Categoria: {selectedCategory}
                      <button 
                        onClick={() => handleCategoryChange("all")}
                        className="ml-1 text-xs hover:bg-gray-200 rounded px-1"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedClient !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Cliente: {clientsData && Array.isArray(clientsData) 
                        ? clientsData.find((c: any) => c.id.toString() === selectedClient)?.name || selectedClient
                        : selectedClient}
                      <button 
                        onClick={() => handleClientChange("all")}
                        className="ml-1 text-xs hover:bg-gray-200 rounded px-1"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <span>Produtos com Match Groups</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {filteredProducts.length} produtos encontrados
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
                    Nenhum Produto Encontrado
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm 
                      ? `Nenhum produto encontrado para "${searchTerm}"`
                      : "Nenhum produto com grupo de comparação encontrado"
                    }
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Total de produtos na API: {productsData?.products?.length || 0}
                  </p>
                  {searchTerm && (
                    <Button onClick={() => setSearchTerm("")} variant="outline">
                      Limpar Busca
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Pagination Info */}
                  <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Mostrando {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} produtos
                      {searchTerm && <span className="ml-2 text-blue-600">para "{searchTerm}"</span>}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Página {currentPage} de {totalPages}
                    </div>
                  </div>



                  {/* Products Grid */}
                  <div className="grid gap-4 mb-6">
                    {currentProducts.map((product: any) => {
                      const clientName = clientsData && Array.isArray(clientsData) 
                        ? clientsData.find((c: any) => c.id === product.clientId)?.name || `ID: ${product.clientId}`
                        : `ID: ${product.clientId}`;
                      
                      return (
                    <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                      {/* Header with product name and price */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Product Thumbnail */}
                          <div className="flex-shrink-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-16 h-16 bg-gray-400 rounded-lg flex items-center justify-center ${product.imageUrl ? 'hidden' : 'flex'}`}
                              style={{ display: product.imageUrl ? 'none' : 'flex' }}
                            >
                              <Package className="h-8 w-8 text-white" />
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-2">{product.name}</h3>
                            <div className="flex flex-wrap gap-2 text-sm mb-2">
                              <Badge variant="outline" className="text-xs">SKU: {product.sku}</Badge>
                              <Badge variant={product.isMaster ? "default" : "secondary"} className="text-xs">
                                {product.isMaster ? 'Master' : 'Competitor'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            R$ {parseFloat(product.basePrice || '0').toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Key Information Row */}
                      <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg mb-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</p>
                          <p className="font-semibold text-gray-900">{clientName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Marca</p>
                          <p className="font-semibold text-gray-900">{product.manufacturer || product.brand || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Grupo Match</p>
                          <p className="font-semibold text-blue-600">{product.matchGroup || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {/* Product Actions */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              console.log("CLIQUE DETECTADO! Produto:", product.id);
                              console.log("Event:", e);
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/price-comparison?product=${product.id}`;
                            }}
                            className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            style={{ zIndex: 9999, position: 'relative' }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Comparação
                          </button>
                        </div>
                      </div>
                    </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t">
                      {/* First Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="p-2"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>

                      {/* Previous Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNumber}
                              variant={currentPage === pageNumber ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(pageNumber)}
                              className="w-10 h-10 p-0"
                            >
                              {pageNumber}
                            </Button>
                          );
                        })}
                      </div>

                      {/* Next Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      {/* Last Page */}
                      <Button
                        variant="outline"  
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>

                      {/* Jump to Page Input */}
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-sm text-gray-600">Ir para:</span>
                        <Input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= totalPages) {
                              goToPage(page);
                            }
                          }}
                          className="w-16 h-8 text-center text-sm"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}