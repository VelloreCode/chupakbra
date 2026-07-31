import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import PriceComparisonCard from "@/components/comparison/price-comparison-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Search, Filter, Zap, TrendingUp, AlertTriangle, Package, RefreshCw, X, Activity, Target, BarChart3, Info, Check, ChevronsUpDown, ShoppingCart, Star, ArrowUpDown, ExternalLink } from "lucide-react";

export default function Comparison() {
  const { permissions } = useUserRole();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

  // Get product ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const activeProductId = urlParams.get('product');
  const isProductView = !!activeProductId;

  // Load all products only when NOT viewing a specific product
  const { data: allBestPrices, isLoading: isLoadingAll, error: errorAll } = useQuery({
    queryKey: ["/api/dashboard/best-prices", { limit: 200 }],
    enabled: !isProductView, // Only load when NOT viewing specific product
    staleTime: 2 * 60 * 1000, // 2 minutes for comparison page
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchOnMount: false, // Don't refetch immediately on mount for this page
  });

  // Load specific product comparison when viewing a single product
  const { data: specificProductComparison, isLoading: isLoadingSpecific, error: errorSpecific } = useQuery({
    queryKey: ["/api/products", activeProductId, "comparison"],
    enabled: !!activeProductId, // Only load when viewing specific product
    staleTime: 2 * 60 * 1000,
    gcTime: 8 * 60 * 1000,

  });

  // Transform specific product data to match the expected format
  const specificBestPrices = specificProductComparison ? [specificProductComparison] : [];

  // Use the appropriate data source based on view mode
  const bestPrices = isProductView ? specificBestPrices : allBestPrices;
  const isLoading = isProductView ? isLoadingSpecific : isLoadingAll;
  const error = isProductView ? errorSpecific : errorAll;
  


  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    enabled: !isProductView, // Only load when NOT viewing specific product
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !isProductView, // Only load when NOT viewing specific product
  });

  // Get recent products (filtered for Vellore with match groups) - only when NOT viewing specific product
  const { data: recentProducts } = useQuery({
    queryKey: ["/api/dashboard/recent-products"],
    enabled: !isProductView, // Only load recent products when NOT viewing specific product
  });

  // Extract unique brands from products
  const uniqueBrands = useMemo(() => {
    if (!allBestPrices || !Array.isArray(allBestPrices)) return [];
    const brands = allBestPrices
      .map((comparison: any) => comparison.product.manufacturer)
      .filter((brand: string) => brand && brand.trim() !== '')
      .filter((brand: string, index: number, arr: string[]) => arr.indexOf(brand) === index)
      .sort();
    return brands;
  }, [allBestPrices]);



  // Get matching products for the selected product
  const { data: matchingProducts, isLoading: isLoadingMatching, error: matchingError } = useQuery({
    queryKey: ["/api/products", activeProductId, "match-group"],
    enabled: !!activeProductId,
  });



  // Filter products: use bestPrices data directly for search and filtering
  const filteredProducts = useMemo(() => {
    if (isProductView) return []; // Don't filter products when viewing specific product
    if (!allBestPrices || !Array.isArray(allBestPrices)) return [];
    
    return allBestPrices.filter((comparison: any) => {
      const product = comparison.product;
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || selectedCategory === "all" || 
        product.categoryId?.toString() === selectedCategory;
      
      const matchesBrand = !selectedBrand || selectedBrand === "all" || 
        product.manufacturer === selectedBrand;
      
      // Filter by client - check if this product has prices for the selected client
      let matchesClient = true;
      if (selectedClient && selectedClient !== "all") {
        if (comparison.prices && comparison.prices.length > 0) {
          matchesClient = comparison.prices.some((price: any) => 
            price.client.id.toString() === selectedClient
          );
        } else {
          matchesClient = false;
        }
      }
      
      return matchesSearch && matchesCategory && matchesBrand && matchesClient;
    }).map((comparison: any) => comparison.product); // Extract just the product data
  }, [isProductView, allBestPrices, searchTerm, selectedCategory, selectedBrand, selectedClient]);

  const handleRefresh = () => {
    if (isProductView) {
      // When viewing specific product, only refresh product-specific data
      queryClient.invalidateQueries({ queryKey: ["/api/products", activeProductId, "comparison"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", activeProductId, "match-group"] });
    } else {
      // When viewing all products, refresh general data
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/best-prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    }
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
                  <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">
                    Acesso Negado
                  </h2>
                  <p className="text-red-700 dark:text-red-300">
                    Você não tem permissão para acessar esta página.
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="ml-64">
        <main className="p-6">
          {/* Header Principal */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 gradient-primary rounded-xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Comparação de Preços
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Compare preços entre fornecedores e encontre as melhores oportunidades
                </p>
              </div>
            </div>
          </div>

          {/* Filtros e Busca - Show on both default and product view */}
          <Card className="mb-8 border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-t-xl">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Search className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {isProductView ? 'Filtros e Busca' : 'Buscar Produtos Vellore'}
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {isProductView ? 'Refine sua busca por produtos' : 'Encontre nossos produtos com comparação disponível'}
                      </p>
                    </div>
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
                  {/* Linha de busca e filtros */}
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
                    
                    {/* Filtro Categoria */}
                    <div>
                      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={categoryOpen}
                            className="w-full justify-between border-gray-300 dark:border-gray-600"
                          >
                            {selectedCategory && selectedCategory !== "all"
                              ? (Array.isArray(categories) ? categories.find((category: any) => category.id.toString() === selectedCategory)?.name : '')
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
                                      selectedCategory === "all" || !selectedCategory ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  Todas as categorias
                                </CommandItem>
                                {Array.isArray(categories) && categories.map((category: any) => (
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

                    {/* Filtro Marca */}
                    <div>
                      <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={brandOpen}
                            className="w-full justify-between border-gray-300 dark:border-gray-600"
                          >
                            {selectedBrand && selectedBrand !== "all"
                              ? selectedBrand
                              : "Marca"}
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
                                      selectedBrand === "all" || !selectedBrand ? "opacity-100" : "opacity-0"
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

                    {/* Filtro Cliente */}
                    <div>
                      <Popover open={clientOpen} onOpenChange={setClientOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientOpen}
                            className="w-full justify-between border-gray-300 dark:border-gray-600"
                          >
                            {selectedClient && selectedClient !== "all"
                              ? (Array.isArray(clients) ? clients.find((client: any) => client.id.toString() === selectedClient)?.name : '')
                              : "Cliente"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandList>
                              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all"
                                  onSelect={() => {
                                    setSelectedClient("all")
                                    setClientOpen(false)
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedClient === "all" || !selectedClient ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  Todos os clientes
                                </CommandItem>
                                {Array.isArray(clients) && clients.map((client: any) => (
                                  <CommandItem
                                    key={client.id}
                                    value={client.name}
                                    onSelect={() => {
                                      setSelectedClient(client.id.toString())
                                      setClientOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selectedClient === client.id.toString() ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {client.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  {/* Filtros ativos e resultados */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 flex-wrap">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isProductView 
                          ? specificProductComparison 
                            ? `1 produto específico: ${(specificProductComparison as any)?.product?.name || 'Produto'}`
                            : 'Carregando produto específico...'
                          : `${filteredProducts?.length || 0} produtos encontrados`
                        }
                      </span>
                      {searchTerm && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Busca: "{searchTerm}"
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2 hover:bg-blue-200"
                            onClick={() => setSearchTerm("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                      {selectedCategory && selectedCategory !== "all" && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {Array.isArray(categories) && categories.find((c: any) => c.id.toString() === selectedCategory)?.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2 hover:bg-green-200"
                            onClick={() => setSelectedCategory("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                      {selectedBrand && selectedBrand !== "all" && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {selectedBrand}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2 hover:bg-orange-200"
                            onClick={() => setSelectedBrand("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                      {selectedClient && selectedClient !== "all" && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {Array.isArray(clients) ? clients.find((c: any) => c.id.toString() === selectedClient)?.name : ''}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2 hover:bg-purple-200"
                            onClick={() => setSelectedClient("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                    </div>
                    {(searchTerm || (selectedCategory && selectedCategory !== "all") || (selectedBrand && selectedBrand !== "all") || (selectedClient && selectedClient !== "all")) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedCategory("");
                          setSelectedBrand("");
                          setSelectedClient("");
                        }}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Limpar todos
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Lista de Produtos Filtrados - Only show on default page */}
          {!isProductView && filteredProducts && filteredProducts.length > 0 && (
            <Card className="mb-8 border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-t-xl">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                      Produtos Encontrados
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {filteredProducts.length} produtos Vellore com comparação disponível
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product: any, index: number) => (
                    <div
                      key={product.id}
                      className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:border-blue-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          {/* Product Thumbnail with Image */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full gradient-primary flex items-center justify-center">
                                        <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M20 6h-2.18l-1.41-1.41c-.19-.19-.44-.29-.71-.29H8.31c-.27 0-.52.1-.71.29L6.18 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                        </svg>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full gradient-primary flex items-center justify-center">
                                <Package className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{index + 1}</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              SKU: {product.sku}
                            </Badge>
                            <Badge className="bg-green-500 text-white text-xs">
                              R$ {parseFloat(product.basePrice || '0').toFixed(2)}
                            </Badge>
                            {product.matchGroup && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                Match: {product.matchGroup}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Monitor Button */}
                        <button
                          onClick={() => window.location.href = `/comparison?product=${product.id}`}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <TrendingUp className="h-4 w-4" />
                          <span>Análise de Preços</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparações de Preços - Only show when a specific product is selected */}
          {isProductView && (
            <>
              {isLoading ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-12">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Carregando Comparações
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                          Buscando os melhores preços...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : error ? (
                <Card className="border-red-200 bg-red-50 dark:bg-red-900 dark:border-red-700">
                  <CardContent className="p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                        Erro ao Carregar Dados
                      </h3>
                      <p className="text-red-700 dark:text-red-300">
                        Não foi possível carregar as comparações de preço.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : bestPrices && Array.isArray(bestPrices) ? (
                <>
                  <Card className="border-0 shadow-lg mb-8">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-t-xl">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">
                            Comparação de Preços do Produto
                          </h3>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            Produto ID: {activeProductId}
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="w-full">
                        {bestPrices.length > 0 ? (
                          bestPrices.map((comparison: any, index: number) => {
                            // Safety check to ensure comparison has required data
                            if (!comparison || !comparison.product || !comparison.product.id) {
                              return null;
                            }
                            
                            // Show product information even if no prices available
                            if (!comparison.prices || comparison.prices.length === 0) {
                              return (
                                <div key={comparison.product.id} className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 mb-4">
                                  <div className="flex items-start space-x-4">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {comparison.product.name}
                                      </h3>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="font-medium text-gray-600 dark:text-gray-300">SKU:</span>
                                          <span className="ml-2 text-gray-900 dark:text-white">{comparison.product.sku}</span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-600 dark:text-gray-300">Fabricante:</span>
                                          <span className="ml-2 text-gray-900 dark:text-white">{comparison.product.manufacturer || 'N/A'}</span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-600 dark:text-gray-300">Preço Base:</span>
                                          <span className="ml-2 text-green-600 font-semibold">R$ {parseFloat(comparison.product.basePrice || '0').toFixed(2)}</span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-600 dark:text-gray-300">Grupo Match:</span>
                                          <span className="ml-2 text-gray-900 dark:text-white">{comparison.product.matchGroup || 'N/A'}</span>
                                        </div>
                                      </div>
                                      <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                          <strong>Informação:</strong> Este produto não possui preços de comparação cadastrados no momento. 
                                          Para visualizar comparações, adicione produtos concorrentes ou de outros fornecedores com o mesmo Match Group.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <PriceComparisonCard
                                key={comparison.product.id}
                                product={comparison.product}
                                prices={comparison.prices || []}
                                bestPrice={comparison.bestPrice}
                                savings={comparison.savings}
                              />
                            );
                          }).filter(Boolean)
                        ) : (
                          <div className="text-center p-8">
                            <p className="text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Matching Products List */}
                  {isLoadingMatching ? (
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-8">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Carregando produtos relacionados...
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : matchingProducts && Array.isArray(matchingProducts) && matchingProducts.length > 0 ? (
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-t-xl">
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <ShoppingCart className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                              Produtos Relacionados
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {matchingProducts.length} produtos com preços comparáveis
                            </p>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid gap-4">
                          {matchingProducts.map((item: any, index: number) => {
                            const product = item.product;
                            const prices = item.prices || [];
                            const bestPrice = item.bestPrice;
                            const worstPrice = prices.length > 0 ? prices[prices.length - 1] : null;
                            const category = Array.isArray(categories) ? categories.find((c: any) => c.id === product.categoryId) : null;
                            
                            return (
                              <div
                                key={product.id}
                                className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:border-blue-300"
                              >
                                <div className="flex items-center space-x-4 flex-1">
                                  {/* Product Thumbnail */}
                                  <div className="relative">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md">
                                      {product.imageUrl ? (
                                        <img 
                                          src={product.imageUrl} 
                                          alt={product.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = 'https://www.grupoconserpaenger.com.br/wp-content/uploads/elementor/thumbs/produto-sem-imagem-qnyfrogx05j5kps5v27lx6c73dq0vgnm9mk6wyj4vk.jpg';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
                                          <Package className="h-6 w-6 text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                    {/* Competitor Badge */}
                                    {product.isCompetitor && (
                                      <div className="absolute -top-1 -right-1">
                                        <Badge variant="destructive" className="text-xs px-2 py-0.5">
                                          Concorrente
                                        </Badge>
                                      </div>
                                    )}
                                  </div>

                                  {/* Product Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                          {product.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-sm text-gray-500 dark:text-gray-400">
                                            SKU: {product.sku}
                                          </span>
                                          {category && (
                                            <Badge variant="outline" className="text-xs">
                                              {category.name}
                                            </Badge>
                                          )}
                                        </div>
                                        {product.sourceUrl && (
                                          <a 
                                            href={product.sourceUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                          >
                                            Ver fonte <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Price Info */}
                                  <div className="text-right">
                                    {prices.length > 0 ? (
                                      <div className="space-y-1">
                                        {bestPrice && (
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                              <TrendingUp className="h-3 w-3 mr-1" />
                                              Melhor: R$ {parseFloat(bestPrice.price).toFixed(2)}
                                            </Badge>
                                          </div>
                                        )}
                                        {worstPrice && worstPrice !== bestPrice && (
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                                              <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                                              Maior: R$ {parseFloat(worstPrice.price).toFixed(2)}
                                            </Badge>
                                          </div>
                                        )}
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {prices.length} preço{prices.length > 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Sem preços
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Action Button */}
                                <div className="ml-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.location.href = `/comparison?product=${product.id}`}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Comparar
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </>
              ) : (
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardContent className="p-12">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        Nenhuma Comparação Disponível
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                        Este produto não possui comparações de preço disponíveis.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.href = '/comparison'}
                        className="flex items-center gap-2"
                      >
                        <Package className="h-4 w-4" />
                        Voltar à Lista de Produtos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Default view - Instructions when no product is selected */}
          {!isProductView && (
            <Card className="border-gray-200 dark:border-gray-700">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Target className="w-10 h-10 text-blue-600 dark:text-blue-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Selecione um Produto para Monitorar
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                    Use os filtros acima para encontrar um produto Vellore e clique em "Monitorar" para ver sua comparação de preços detalhada.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Sobre a comparação de preços
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Como funciona a comparação de preços
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                              <Target className="h-4 w-4 text-green-600" />
                              Objetivo
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300">
                              O sistema de comparação de preços permite monitorar e analisar os preços dos produtos Vellore 
                              em diferentes clientes/concorrentes, ajudando você a tomar decisões estratégicas de precificação.
                            </p>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-blue-600" />
                              Como Funciona
                            </h3>
                            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600 font-bold">1.</span>
                                <span>Os produtos são agrupados por <strong>Match Group</strong> - produtos similares ou equivalentes</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600 font-bold">2.</span>
                                <span>O sistema coleta preços de diferentes clientes para cada produto</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600 font-bold">3.</span>
                                <span>Calcula automaticamente o <strong>melhor preço</strong> e <strong>economia potencial</strong></span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600 font-bold">4.</span>
                                <span>Identifica oportunidades de ajuste de preços e posicionamento competitivo</span>
                              </li>
                            </ul>
                          </div>

                          <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-orange-600" />
                              Análise de Preços
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                <h4 className="font-medium text-green-800 dark:text-green-300">Melhor Preço</h4>
                                <p className="text-sm text-green-700 dark:text-green-400">
                                  Menor preço encontrado entre todos os clientes
                                </p>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                <h4 className="font-medium text-blue-800 dark:text-blue-300">Economia</h4>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                  Diferença entre o maior e menor preço encontrado
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                              <Filter className="h-4 w-4 text-purple-600" />
                              Funcionalidades
                            </h3>
                            <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                              <li>• Filtros por categoria e cliente</li>
                              <li>• Busca por nome ou SKU do produto</li>
                              <li>• Visualização detalhada por produto</li>
                              <li>• Histórico de variações de preço</li>
                              <li>• Análise de posicionamento competitivo</li>
                            </ul>
                          </div>

                          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                            <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">
                              💡 Dica Importante
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              Para aparecer na comparação, os produtos precisam ter o mesmo <strong>Match Group</strong> 
                              e preços cadastrados em pelo menos 2 clientes diferentes.
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}