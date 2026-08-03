import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Clock, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Globe, Navigation, Users, History, ArrowUp, Search, Filter, Check, ChevronsUpDown, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonitoringHistoryItem {
  id: number;
  productId: number;
  priceOld: string | null;
  priceNew: string;
  dateChecked: string;
  source: string;
  product: {
    id: number;
    name: string;
    sku: string;
    sourceUrl: string;
  };
}

export default function PriceMonitoring() {
  const { isAuthenticated, isLoading } = useAuth();
  const { permissions } = useUserRole();
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: monitoringHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/products/monitoring-history", selectedProduct],
    queryFn: async () => {
      const url = selectedProduct && selectedProduct !== "all"
        ? `/api/products/monitoring-history?productId=${selectedProduct}`
        : "/api/products/monitoring-history";
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring history');
      }
      return response.json();
    },
    enabled: isAuthenticated && permissions?.canAccessMonitoring,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    enabled: isAuthenticated && permissions?.canAccessMonitoring,
    queryFn: async () => {
      const response = await fetch('/api/products', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      return data?.products || [];
    }
  });

  // Get master products with competitors for comparison
  //
  // competitor-brands: a Comparação Master confronta o produto Foxlux/Famastil
  // da Vellore com equivalentes de OUTRAS marcas. Produto da mesma marca em
  // outro vendedor não é concorrente e sai desta tela — ele aparece na
  // Comparação de Preço.
  const { data: masterProductsWithCompetitors } = useQuery({
    queryKey: ["/api/products/masters-with-competitors", "competitor-brands"],
    enabled: isAuthenticated && permissions?.canAccessMonitoring,
    queryFn: async () => {
      const response = await fetch('/api/products/masters-with-competitors?brandScope=competitor-brands', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch master products');
      }
      return response.json();
    }
  });

  // Get categories for filtering
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated && permissions?.canAccessMonitoring,
  });

  // Get clients for filtering
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated && permissions?.canAccessMonitoring,
  });

  const urlProducts = Array.isArray(products) ? products.filter((p: any) => p.sourceUrl) : [];
  
  // Extract unique brands from products
  const uniqueBrands = useMemo(() => {
    if (!urlProducts || !Array.isArray(urlProducts) || urlProducts.length === 0) return [];
    const brands = urlProducts
      .map((product: any) => product?.manufacturer || product?.brand)
      .filter((brand: string) => brand && brand.trim() !== '')
      .filter((brand: string, index: number, arr: string[]) => arr.indexOf(brand) === index)
      .sort();
    return brands;
  }, [urlProducts]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    if (!urlProducts || !Array.isArray(urlProducts) || urlProducts.length === 0) return [];
    
    return urlProducts.filter((product: any) => {
      if (!product) return false;
      
      const matchesSearch = !searchTerm || 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = !selectedCategory || selectedCategory === "all" || 
        product.categoryId?.toString() === selectedCategory;
      
      const matchesBrand = !selectedBrand || selectedBrand === "all" || 
        product.manufacturer === selectedBrand || product.brand === selectedBrand;
      
      const matchesClient = !selectedClient || selectedClient === "all" || 
        product.clientId?.toString() === selectedClient;
      
      const matchesSpecificProduct = selectedProduct === "all" || 
        product.id?.toString() === selectedProduct;
      
      return matchesSearch && matchesCategory && matchesBrand && matchesClient && matchesSpecificProduct;
    });
  }, [urlProducts, searchTerm, selectedCategory, selectedBrand, selectedClient, selectedProduct]);

  // Filter monitoring history based on filtered products
  const filteredMonitoringHistory = useMemo(() => {
    if (!monitoringHistory || !Array.isArray(monitoringHistory) || monitoringHistory.length === 0) return [];
    
    if (selectedProduct === "all" && !searchTerm && !selectedCategory && !selectedBrand && !selectedClient) {
      return monitoringHistory;
    }
    
    const filteredProductIds = filteredProducts.map(p => p?.id).filter(id => id !== undefined);
    return monitoringHistory.filter((item: MonitoringHistoryItem) => 
      item && item.productId && filteredProductIds.includes(item.productId)
    );
  }, [monitoringHistory, filteredProducts, selectedProduct, searchTerm, selectedCategory, selectedBrand, selectedClient]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedClient("");
    setSelectedBrand("");
    setSelectedProduct("all");
  };
  
  const getPriceChangeIcon = (oldPrice: string | null, newPrice: string) => {
    if (!oldPrice) return <Minus className="h-4 w-4 text-gray-500" />;
    
    const old = parseFloat(oldPrice);
    const current = parseFloat(newPrice);
    
    if (current > old) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (current < old) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getPriceChangeColor = (oldPrice: string | null, newPrice: string) => {
    if (!oldPrice) return "text-gray-600";
    
    const old = parseFloat(oldPrice);
    const current = parseFloat(newPrice);
    
    if (current > old) return "text-red-600";
    if (current < old) return "text-green-600";
    return "text-gray-600";
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  // Early returns after all hooks
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  if (!permissions?.canAccessMonitoring) {
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Monitoramento de Preços
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Acompanhe o histórico de alterações de preços dos produtos monitorados por URL
            </p>
          </div>

          {/* Navigation Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Navegação Rápida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => scrollToSection('master-comparison')}
                  className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20"
                >
                  <Users className="h-4 w-4" />
                  Comparação Master vs Concorrentes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => scrollToSection('monitoring-history')}
                  className="flex items-center gap-2 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20"
                >
                  <History className="h-4 w-4" />
                  Histórico de Monitoramento
                </Button>
              </div>
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                💡 Use os botões acima para navegar rapidamente entre as seções da página
              </div>
            </CardContent>
          </Card>

          {/* Filter Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search and main filters */}
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
                          className="w-full justify-between border-gray-300 dark:border-gray-600"
                        >
                          {selectedCategory && selectedCategory !== "all"
                            ? categories?.find((category: any) => category.id.toString() === selectedCategory)?.name
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

                  {/* Brand Filter */}
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

                  {/* Client Filter */}
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
                            ? clients?.find((client: any) => client.id.toString() === selectedClient)?.name
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

                

                {/* Active filters and clear button */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {filteredProducts?.length || 0} produtos encontrados
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
                        {Array.isArray(clients) && clients.find((c: any) => c.id.toString() === selectedClient)?.name}
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
                    {selectedProduct && selectedProduct !== "all" && (
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                        {urlProducts.find((p: any) => p?.id?.toString() === selectedProduct)?.name || 'Produto'}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2 hover:bg-indigo-200"
                          onClick={() => setSelectedProduct("all")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="text-sm"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Produtos Monitorados
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {filteredProducts.length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Verificações Hoje
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Array.isArray(filteredMonitoringHistory) ? filteredMonitoringHistory.filter((item: MonitoringHistoryItem) => {
                        const today = new Date().toDateString();
                        return new Date(item.dateChecked).toDateString() === today;
                      }).length : 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Alterações de Preço
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Array.isArray(filteredMonitoringHistory) ? filteredMonitoringHistory.filter((item: MonitoringHistoryItem) => {
                        return item.priceOld && parseFloat(item.priceOld) !== parseFloat(item.priceNew);
                      }).length : 0}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Master vs Competitor Comparison */}
          {masterProductsWithCompetitors && masterProductsWithCompetitors.length > 0 && (
            <div id="master-comparison" className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Comparação Master vs Concorrentes
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {masterProductsWithCompetitors.map((masterProduct: any) => (
                  <Card key={masterProduct.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {masterProduct.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {masterProduct.sku}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Master Product */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-start gap-4">
                            <img
                              src={masterProduct.imageUrl || 'https://www.grupoconserpaenger.com.br/wp-content/uploads/elementor/thumbs/produto-sem-imagem-qnyfrogx05j5kps5v27lx6c73dq0vgnm9mk6wyj4vk.jpg'}
                              alt={masterProduct.name}
                              className="w-16 h-16 rounded-lg object-cover shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://www.grupoconserpaenger.com.br/wp-content/uploads/elementor/thumbs/produto-sem-imagem-qnyfrogx05j5kps5v27lx6c73dq0vgnm9mk6wyj4vk.jpg';
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  Master
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                                {masterProduct.name}
                              </h4>
                              <div className="mb-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span>SKU: {masterProduct.sku}</span>
                                  <span className="text-gray-400">|</span>
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Cliente: {masterProduct.clientName || 'N/A'}
                                  </span>
                                  <span className="text-gray-400">|</span>
                                  <span>Marca: {masterProduct.manufacturer || 'N/A'}</span>
                                  <span className="text-gray-400">|</span>
                                  <span>Fonte: {masterProduct.sourceUrl ? (
                                    <a
                                      href={masterProduct.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >Acessar Site</a>
                                  ) : 'N/A'}</span>
                                </div>
                              </div>

                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-blue-600">
                                {formatPrice(masterProduct.basePrice)}
                              </p>
                              <p className="text-xs text-gray-500">Preço principal</p>
                            </div>
                          </div>
                        </div>

                        {/* Competitor Products */}
                        {masterProduct.competitors?.map((competitor: any) => {
                          const masterPrice = parseFloat(masterProduct.basePrice);
                          const competitorPrice = parseFloat(competitor.basePrice);
                          const difference = competitorPrice - masterPrice;
                          const isLower = difference < 0;
                          const isHigher = difference > 0;
                          
                          return (
                            <div key={competitor.id} className={`p-4 rounded-lg border-l-4 ${
                              isLower ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 
                              isHigher ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 
                              'bg-gray-50 dark:bg-gray-800 border-gray-400'
                            }`}>
                              <div className="flex items-start gap-4">
                                <img
                                  src={competitor.imageUrl || 'https://www.grupoconserpaenger.com.br/wp-content/uploads/elementor/thumbs/produto-sem-imagem-qnyfrogx05j5kps5v27lx6c73dq0vgnm9mk6wyj4vk.jpg'}
                                  alt={competitor.name}
                                  className="w-16 h-16 rounded-lg object-cover shadow-sm"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://www.grupoconserpaenger.com.br/wp-content/uploads/elementor/thumbs/produto-sem-imagem-qnyfrogx05j5kps5v27lx6c73dq0vgnm9mk6wyj4vk.jpg';
                                  }}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={isLower ? "destructive" : isHigher ? "default" : "secondary"}>
                                      Concorrente
                                    </Badge>
                                    {isLower && (
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        Melhor preço
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                                    {competitor.name}
                                  </h4>
                                  <div className="mb-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <span>SKU: {competitor.sku}</span>
                                      <span className="text-gray-400">|</span>
                                      <span className="text-blue-600 dark:text-blue-400">
                                        Cliente: {competitor.clientName || 'N/A'}
                                      </span>
                                      <span className="text-gray-400">|</span>
                                      <span>Marca: {competitor.manufacturer || 'N/A'}</span>
                                      <span className="text-gray-400">|</span>
                                      <span>Fonte: {competitor.sourceUrl ? (
                                        <a
                                          href={competitor.sourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          link
                                        </a>
                                      ) : 'N/A'}</span>
                                    </div>
                                  </div>

                                </div>
                                <div className="text-right">
                                  <p className={`text-xl font-bold ${
                                    isLower ? 'text-green-600' : isHigher ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {formatPrice(competitor.basePrice)}
                                  </p>
                                  <div className="flex items-center justify-end gap-1 mt-1">
                                    {isLower && <TrendingDown className="h-4 w-4 text-green-600" />}
                                    {isHigher && <TrendingUp className="h-4 w-4 text-red-600" />}
                                    {!isLower && !isHigher && <Minus className="h-4 w-4 text-gray-600" />}
                                    <p className={`text-sm font-medium ${
                                      isLower ? 'text-green-600' : isHigher ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      {difference >= 0 ? '+' : ''}{formatPrice(Math.abs(difference).toString())}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {isLower ? 'Economia' : isHigher ? 'Mais caro' : 'Mesmo preço'}
                                  </p>
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
            </div>
          )}

          {/* Monitoring History */}
          <Card id="monitoring-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Monitoramento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : Array.isArray(filteredMonitoringHistory) && filteredMonitoringHistory.length > 0 ? (
                <div className="space-y-4">
                  {filteredMonitoringHistory.map((item: MonitoringHistoryItem) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                          {getPriceChangeIcon(item.priceOld, item.priceNew)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {item.product.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            SKU: {item.product.sku}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {item.priceOld ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {formatPrice(item.priceOld)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className={`font-medium ${getPriceChangeColor(item.priceOld, item.priceNew)}`}>
                                {formatPrice(item.priceNew)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatPrice(item.priceNew)}
                            </span>
                          )}
                          <p className="text-xs text-gray-500">
                            {format(new Date(item.dateChecked), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>

                        <Badge variant={item.source === "url_monitoring_error" ? "destructive" : "secondary"}>
                          {item.source === "url_monitoring_error" ? "Erro" : "Monitoramento"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum histórico encontrado
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    O monitoramento automático será executado diariamente às 7h da manhã.
                  </p>
                  {filteredProducts.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-md mx-auto">
                      <p className="text-blue-800 dark:text-blue-200 text-sm mb-2">
                        {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} com URL cadastrado{filteredProducts.length !== 1 ? 's' : ''}:
                      </p>
                      <div className="text-left space-y-1">
                        {filteredProducts.slice(0, 3).map((product: any) => (
                          <p key={product?.id} className="text-xs text-blue-700 dark:text-blue-300">
                            • {product?.name} (SKU: {product?.sku})
                          </p>
                        ))}
                        {filteredProducts.length > 3 && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ... e mais {filteredProducts.length - 3} produto{filteredProducts.length - 3 !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Floating Scroll to Top Button */}
      {showScrollToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full shadow-lg bg-primary-orange hover:bg-primary-orange-dark transition-all duration-300 z-50"
          size="icon"
        >
          <ArrowUp className="h-5 w-5 text-white" />
        </Button>
      )}
    </div>
  );
}