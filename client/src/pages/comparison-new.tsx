import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, RefreshCw, TrendingDown, TrendingUp, Users, Check, ChevronsUpDown, X, ShoppingCart, DollarSign, Package, AlertTriangle } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import PriceComparisonCard from "@/components/comparison/price-comparison-card";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function ComparisonNew() {
  const { user, isAuthenticated } = useAuth();
  const permissions = { canAccessComparison: isAuthenticated };
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();

  // URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const activeProductId = urlParams.get('product');
  const isProductView = !!activeProductId;

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  // Data queries
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    enabled: !isProductView,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !isProductView,
  });

  // Main products query - using products endpoint with high limit
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["/api/products", { limit: 500, search: searchTerm }],
    enabled: !isProductView,
  });

  // Specific product comparison for product view
  const { data: specificComparison, isLoading: specificLoading } = useQuery({
    queryKey: ["/api/products", activeProductId, "comparison"],
    enabled: isProductView,
  });

  // Process products data
  const products = useMemo(() => {
    if (isProductView) {
      return specificComparison ? [specificComparison] : [];
    }
    
    if (!productsData || !productsData.products) return [];
    
    // Return all products from API - filtering will be done in filteredProducts
    return productsData.products;
  }, [productsData, specificComparison, isProductView]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((product: any) => {
      // First check if it's a Vellore master product with match group
      const isVelloreMaster = product.isMaster === true && 
        product.matchGroup && 
        product.matchGroup.trim() !== '';
      
      if (!isVelloreMaster) return false;
      
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || selectedCategory === "all" || 
        product.categoryId?.toString() === selectedCategory;
      
      const matchesBrand = !selectedBrand || selectedBrand === "all" || 
        product.manufacturer === selectedBrand;
      
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [products, searchTerm, selectedCategory, selectedBrand]);

  // Extract unique brands
  const uniqueBrands = useMemo(() => {
    if (!products) return [];
    const brands = products
      .map((product: any) => product.manufacturer)
      .filter((brand: string) => brand && brand.trim() !== '')
      .filter((brand: string, index: number, arr: string[]) => arr.indexOf(brand) === index)
      .sort();
    return brands;
  }, [products]);

  const handleRefresh = () => {
    if (isProductView) {
      queryClient.invalidateQueries({ queryKey: ["/api/products", activeProductId, "comparison"] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedClient("all");
  };

  const hasActiveFilters = searchTerm || (selectedCategory && selectedCategory !== "all") || 
    (selectedBrand && selectedBrand !== "all") || (selectedClient && selectedClient !== "all");

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
          {/* Header */}
          <div className="rounded-lg bg-card text-card-foreground w-full mb-6 border-0 shadow-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <div className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Comparação de Preços</h1>
                  <p className="opacity-90">
                    Compare preços entre fornecedores e encontre as melhores oportunidades
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          {!isProductView && (
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
                  {/* Search and filters row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="md:col-span-2 lg:col-span-2">
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
                    
                    {/* Category Filter */}
                    <div>
                      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={categoryOpen}
                            className="w-full justify-between"
                          >
                            {selectedCategory && selectedCategory !== "all" && categories
                              ? categories.find((cat: any) => cat.id.toString() === selectedCategory)?.name || "Categoria"
                              : "Categoria"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar categoria..." />
                            <CommandList>
                              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all"
                                  onSelect={() => {
                                    setSelectedCategory("all")
                                    setCategoryOpen(false)
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedCategory === "all" ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  Todas as categorias
                                </CommandItem>
                                {categories && Array.isArray(categories) && categories.map((category: any) => (
                                  <CommandItem
                                    key={category.id}
                                    value={category.name}
                                    onSelect={() => {
                                      setSelectedCategory(category.id.toString())
                                      setCategoryOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selectedCategory === category.id.toString() ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {category.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Brand Filter */}
                    <div>
                      <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={brandOpen}
                            className="w-full justify-between"
                          >
                            {selectedBrand && selectedBrand !== "all" ? selectedBrand : "Marca"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar marca..." />
                            <CommandList>
                              <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all"
                                  onSelect={() => {
                                    setSelectedBrand("all")
                                    setBrandOpen(false)
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedBrand === "all" ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  Todas as marcas
                                </CommandItem>
                                {uniqueBrands.map((brand: string) => (
                                  <CommandItem
                                    key={brand}
                                    value={brand}
                                    onSelect={() => {
                                      setSelectedBrand(brand)
                                      setBrandOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selectedBrand === brand ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {brand}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-center">
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Limpar todos
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Active filters display */}
                  {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2">
                      {searchTerm && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Busca: "{searchTerm}"
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setSearchTerm("")}
                          />
                        </Badge>
                      )}
                      {selectedCategory && selectedCategory !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Categoria: {categories && categories.find ? categories.find((c: any) => c.id.toString() === selectedCategory)?.name : ''}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setSelectedCategory("all")}
                          />
                        </Badge>
                      )}
                      {selectedBrand && selectedBrand !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Marca: {selectedBrand}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setSelectedBrand("all")}
                          />
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <span>Produtos Encontrados</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {filteredProducts.length} produtos Vellore com comparação disponível
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {productsLoading || specificLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
                  ))}
                </div>
              ) : productsError ? (
                <div className="text-center text-red-600 py-8">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4" />
                  <p>Erro ao carregar produtos. Tente novamente.</p>
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
                    Não encontramos produtos que correspondam aos critérios de busca.
                  </p>
                  {hasActiveFilters && (
                    <Button onClick={clearFilters} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredProducts.map((product: any) => (
                    <PriceComparisonCard
                      key={product.id}
                      product={product}
                      productId={product.id}
                      isDetailed={isProductView}
                    />
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