import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserRole } from "@/hooks/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Loader2, Globe, Star, Target, CheckCircle, AlertTriangle, Edit, Save, Settings, Trash2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ScrapingWizard from "@/components/wizard/scraping-wizard";
import { Label } from "@/components/ui/label";

interface ScrapedProduct {
  id?: number;
  name: string;
  manufacturer?: string;
  basePrice: string;
  imageUrl?: string;
  sourceUrl?: string;
  sku: string;
  description?: string;
  categoryId?: number;
}

interface ProductPreview {
  name: string;
  manufacturer?: string;
  basePrice: string;
  imageUrl?: string;
  sourceUrl: string;
  sku: string;
  description?: string;
}

interface MasterProduct {
  id: number;
  name: string;
  basePrice: string;
  imageUrl: string;
  sourceUrl: string;
  sku: string;
  competitors: Array<{
    id: number;
    name: string;
    basePrice: string;
    sourceUrl: string;
    sku: string;
  }>;
}

export default function ProductsUrl() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { permissions } = useUserRole();
  const queryClient = useQueryClient();

  
  // Master product state
  const [masterUrl, setMasterUrl] = useState("");
  const [masterProduct, setMasterProduct] = useState<ScrapedProduct | null>(null);
  const [productPreview, setProductPreview] = useState<ProductPreview | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Competitor URLs state
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [scrapedCompetitors, setScrapedCompetitors] = useState<ScrapedProduct[]>([]);
  
  // Management state
  const [selectedMaster, setSelectedMaster] = useState<MasterProduct | null>(null);
  const [competitorUrl, setCompetitorUrl] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated,
  });

  const { data: mastersWithCompetitors, isLoading: mastersLoading } = useQuery({
    queryKey: ["/api/products/masters-with-competitors"],
    enabled: isAuthenticated,
  });

  const deleteCompetitorMutation = useMutation({
    mutationFn: async (competitorId: number) => {
      const response = await apiRequest("DELETE", `/api/products/competitor/${competitorId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/masters-with-competitors"] });
      toast({
        title: "Sucesso",
        description: "Concorrente removido com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover concorrente",
        variant: "destructive",
      });
    },
  });

  const addCompetitorMutation = useMutation({
    mutationFn: async ({ masterProductId, newUrl }: { masterProductId: number; newUrl: string }) => {
      const response = await apiRequest("POST", "/api/products/add-competitor", { masterProductId, newUrl });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/masters-with-competitors"] });
      setCompetitorUrl("");
      toast({
        title: "Sucesso",
        description: "Novo concorrente adicionado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar concorrente",
        variant: "destructive",
      });
    },
  });

  const scrapePreviewMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/products/scrape-preview", { url });
      return response.json();
    },
    onSuccess: (data) => {
      setProductPreview(data);
      setIsEditing(false);
      toast({
        title: "Produto extraído",
        description: "Dados do produto foram extraídos. Revise e confirme o cadastro.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi deslogado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro ao extrair produto",
        description: error instanceof Error ? error.message : "Erro ao extrair dados da URL.",
        variant: "destructive",
      });
    },
  });

  const createMasterMutation = useMutation({
    mutationFn: async (productData: ScrapedProduct) => {
      const response = await apiRequest("POST", "/api/products/scrape-master", productData);
      return response.json();
    },
    onSuccess: (data) => {
      setMasterProduct(data);
      setProductPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto principal cadastrado",
        description: "Produto foi cadastrado com sucesso.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi deslogado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro ao extrair produto",
        description: error instanceof Error ? error.message : "Erro ao extrair dados da URL.",
        variant: "destructive",
      });
    },
  });

  const scrapeCompetitorsMutation = useMutation({
    mutationFn: async ({ urls, masterProductId }: { urls: string[]; masterProductId: number }) => {
      const validUrls = urls.filter(url => url.trim() !== "");
      const response = await apiRequest("POST", "/api/products/scrape-competitors", { 
        urls: validUrls, 
        masterProductId 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setScrapedCompetitors(data.products || []);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      const successCount = data.success || 0;
      const totalCount = data.total || 0;
      const errorCount = totalCount - successCount;
      
      if (errorCount > 0) {
        toast({
          title: "Concorrentes cadastrados com avisos",
          description: `${successCount} produtos cadastrados com sucesso. ${errorCount} falharam.`,
        });
      } else {
        toast({
          title: "Concorrentes cadastrados",
          description: `${successCount} produtos concorrentes cadastrados com sucesso!`,
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi deslogado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro ao cadastrar concorrentes",
        description: error instanceof Error ? error.message : "Erro ao extrair dados das URLs.",
        variant: "destructive",
      });
    },
  });

  const handleScrapeMaster = () => {
    if (!masterUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, insira a URL do produto principal.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(masterUrl)) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida.",
        variant: "destructive",
      });
      return;
    }

    scrapePreviewMutation.mutate(masterUrl);
  };

  const handleConfirmProduct = () => {
    if (!productPreview) return;

    createMasterMutation.mutate(productPreview as ScrapedProduct);
  };

  const handleEditProduct = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    toast({
      title: "Alterações salvas",
      description: "As alterações foram salvas localmente.",
    });
  };

  const handleScrapeCompetitors = () => {
    const validUrls = competitorUrls.filter(url => url.trim() !== "");
    
    if (validUrls.length === 0) {
      toast({
        title: "URLs obrigatórias",
        description: "Por favor, insira pelo menos uma URL de concorrente.",
        variant: "destructive",
      });
      return;
    }

    const invalidUrls = validUrls.filter(url => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      toast({
        title: "URLs inválidas",
        description: "Por favor, verifique se todas as URLs são válidas.",
        variant: "destructive",
      });
      return;
    }

    if (!masterProduct) {
      toast({
        title: "Produto principal necessário",
        description: "Por favor, cadastre o produto principal primeiro.",
        variant: "destructive",
      });
      return;
    }

    scrapeCompetitorsMutation.mutate({
      urls: validUrls,
      masterProductId: masterProduct.id
    });
  };

  const addCompetitorUrl = () => {
    setCompetitorUrls([...competitorUrls, ""]);
  };

  const removeCompetitorUrl = (index: number) => {
    if (competitorUrls.length > 1) {
      const newUrls = competitorUrls.filter((_, i) => i !== index);
      setCompetitorUrls(newUrls);
    }
  };

  const updateCompetitorUrl = (index: number, value: string) => {
    const newUrls = [...competitorUrls];
    newUrls[index] = value;
    setCompetitorUrls(newUrls);
  };

  const handleDeleteCompetitor = (competitorId: number) => {
    deleteCompetitorMutation.mutate(competitorId);
  };

  const handleAddCompetitor = (masterProductId: number) => {
    if (!competitorUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, insira a URL do concorrente.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(competitorUrl)) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida.",
        variant: "destructive",
      });
      return;
    }

    addCompetitorMutation.mutate({ masterProductId, newUrl: competitorUrl });
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  if (!permissions.canAccessProducts) {
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
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 gradient-primary rounded-xl shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Produtos URL
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Cadastre produtos usando URLs com extração automática de dados
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Master Product */}
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-t-xl">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    1. Cadastre seu Produto Principal
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Extraia dados do seu produto usando a URL da página
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    URL do Produto Principal
                  </label>
                  <Input
                    type="url"
                    placeholder="https://www.sualoja.com.br/produto-exemplo"
                    value={masterUrl}
                    onChange={(e) => setMasterUrl(e.target.value)}
                    disabled={scrapePreviewMutation.isPending || !!masterProduct}
                    className="mt-1"
                  />
                </div>
                
                {!productPreview && !masterProduct ? (
                  <Button
                    onClick={handleScrapeMaster}
                    disabled={scrapePreviewMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {scrapePreviewMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Extraindo Dados...
                      </>
                    ) : (
                      "Extrair Dados do Produto"
                    )}
                  </Button>
                ) : productPreview && !masterProduct ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Edit className="h-5 w-5 text-yellow-600" />
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                        Revisar Dados Extraídos
                      </h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            Nome do Produto
                          </label>
                          {isEditing ? (
                            <Input
                              value={productPreview.name}
                              onChange={(e) => setProductPreview({...productPreview, name: e.target.value})}
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                              {productPreview.name}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            Preço
                          </label>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={productPreview.basePrice}
                              onChange={(e) => setProductPreview({...productPreview, basePrice: e.target.value})}
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                              R$ {productPreview.basePrice}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            Marca
                          </label>
                          {isEditing ? (
                            <Input
                              value={productPreview.manufacturer || ""}
                              onChange={(e) => setProductPreview({...productPreview, manufacturer: e.target.value})}
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                              {productPreview.manufacturer || "Não informado"}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            SKU
                          </label>
                          {isEditing ? (
                            <Input
                              value={productPreview.sku}
                              onChange={(e) => setProductPreview({...productPreview, sku: e.target.value})}
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                              {productPreview.sku}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                          Categoria
                        </label>
                        {isEditing ? (
                          <Select
                            value={productPreview.categoryId?.toString() || ""}
                            onValueChange={(value) => setProductPreview({...productPreview, categoryId: value ? parseInt(value) : undefined})}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((category: any) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                            {categories?.find((c: any) => c.id === productPreview.categoryId)?.name || "Não selecionada"}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                          Descrição
                        </label>
                        {isEditing ? (
                          <Textarea
                            value={productPreview.description || ""}
                            onChange={(e) => setProductPreview({...productPreview, description: e.target.value})}
                            className="mt-1"
                            rows={3}
                          />
                        ) : (
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                            {productPreview.description || "Não informada"}
                          </p>
                        )}
                      </div>
                      
                      {productPreview.imageUrl && (
                        <div className="flex justify-center">
                          <img
                            src={productPreview.imageUrl}
                            alt={productPreview.name}
                            className="h-32 w-32 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      {isEditing ? (
                        <Button
                          onClick={handleSaveEdit}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Alterações
                        </Button>
                      ) : (
                        <Button
                          onClick={handleEditProduct}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      )}
                      
                      <Button
                        onClick={handleConfirmProduct}
                        disabled={createMasterMutation.isPending || isEditing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {createMasterMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Cadastrando...
                          </>
                        ) : (
                          "Confirmar Cadastro"
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          setProductPreview(null);
                          setMasterUrl("");
                          setIsEditing(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : masterProduct ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-800 dark:text-green-300">
                        Produto Principal Cadastrado
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          <strong>Nome:</strong> {masterProduct.name}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          <strong>SKU:</strong> {masterProduct.sku}
                        </p>
                        {masterProduct.manufacturer && (
                          <p className="text-sm text-green-700 dark:text-green-400">
                            {masterProduct.manufacturer}
                          </p>
                        )}
                        <p className="text-sm text-green-700 dark:text-green-400">
                          <strong>Preço:</strong> R$ {masterProduct.basePrice}
                        </p>
                      </div>
                      {masterProduct.imageUrl && (
                        <div className="flex justify-center">
                          <img
                            src={masterProduct.imageUrl}
                            alt={masterProduct.name}
                            className="h-20 w-20 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMasterProduct(null);
                        setMasterUrl("");
                        setScrapedCompetitors([]);
                      }}
                      className="mt-3"
                    >
                      Refazer Cadastro
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Competitors */}
          <Card className={`border-0 shadow-lg ${!masterProduct ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-t-xl">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">
                    2. Adicione os Concorrentes para Monitoramento
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {masterProduct ? "Extraia dados dos produtos concorrentes" : "Complete o cadastro do produto principal primeiro"}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {masterProduct && (
                <div className="space-y-4">
                  {competitorUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="url"
                          placeholder="URL do Concorrente"
                          value={url}
                          onChange={(e) => updateCompetitorUrl(index, e.target.value)}
                          disabled={scrapeCompetitorsMutation.isPending}
                        />
                      </div>
                      {competitorUrls.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeCompetitorUrl(index)}
                          disabled={scrapeCompetitorsMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={addCompetitorUrl}
                      disabled={scrapeCompetitorsMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar outro concorrente
                    </Button>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleScrapeCompetitors}
                    disabled={scrapeCompetitorsMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {scrapeCompetitorsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cadastrando Concorrentes...
                      </>
                    ) : (
                      "Cadastrar Concorrentes"
                    )}
                  </Button>

                  {scrapedCompetitors.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-800 dark:text-green-300">
                          Concorrentes Cadastrados
                        </h4>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {scrapedCompetitors.length} produtos
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {scrapedCompetitors.map((competitor, index) => (
                          <div key={competitor.id} className="text-sm text-green-700 dark:text-green-400">
                            <strong>{index + 1}.</strong> {competitor.name} - R$ {competitor.basePrice}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Manage Master Products and Competitors */}
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-t-xl">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                    3. Gerencie Seus Produtos e Concorrentes
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Visualize e gerencie os produtos cadastrados e seus concorrentes monitorados
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {mastersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : mastersWithCompetitors?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mastersWithCompetitors.map((master: MasterProduct) => (
                    <Card key={master.id} className="border-2 border-dashed border-gray-200 hover:border-green-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          {master.imageUrl && (
                            <img
                              src={master.imageUrl}
                              alt={master.name}
                              className="w-20 h-20 object-cover rounded-lg mb-3"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                            {master.name}
                          </h3>
                          <p className="text-lg font-bold text-green-600 mb-2">
                            R$ {parseFloat(master.basePrice || '0').toFixed(2).replace('.', ',')}
                          </p>
                          <Badge variant="secondary" className="mb-3">
                            {master.competitors.length} concorrente{master.competitors.length !== 1 ? 's' : ''}
                          </Badge>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setSelectedMaster(master)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Gerenciar Concorrentes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                  {master.imageUrl && (
                                    <img
                                      src={master.imageUrl}
                                      alt={master.name}
                                      className="w-12 h-12 object-cover rounded-lg"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div>
                                    <h3 className="font-medium">{master.name}</h3>
                                    <p className="text-sm text-gray-600">R$ {parseFloat(master.basePrice || '0').toFixed(2).replace('.', ',')}</p>
                                  </div>
                                </DialogTitle>
                              </DialogHeader>

                              <div className="space-y-6 py-4">
                                {/* Current Competitors */}
                                <div>
                                  <h4 className="font-medium mb-3">Concorrentes Atuais ({master.competitors.length})</h4>
                                  {master.competitors.length > 0 ? (
                                    <div className="space-y-3">
                                      {master.competitors.map((competitor) => (
                                        <div key={competitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div className="flex-1">
                                            <h5 className="font-medium text-sm">{competitor.name}</h5>
                                            <p className="text-sm text-gray-600">R$ {parseFloat(competitor.basePrice || '0').toFixed(2).replace('.', ',')}</p>
                                            <a 
                                              href={competitor.sourceUrl} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-600 hover:underline truncate block max-w-xs"
                                            >
                                              {competitor.sourceUrl}
                                            </a>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteCompetitor(competitor.id)}
                                            disabled={deleteCompetitorMutation.isPending}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-center py-4">
                                      Nenhum concorrente cadastrado ainda.
                                    </p>
                                  )}
                                </div>

                                {/* Add New Competitor */}
                                <div className="border-t pt-6">
                                  <h4 className="font-medium mb-3">Adicionar Novo Concorrente</h4>
                                  <div className="flex gap-3">
                                    <Input
                                      placeholder="Cole a URL do novo concorrente aqui..."
                                      value={competitorUrl}
                                      onChange={(e) => setCompetitorUrl(e.target.value)}
                                      className="flex-1"
                                    />
                                    <Button
                                      onClick={() => handleAddCompetitor(master.id)}
                                      disabled={!competitorUrl.trim() || addCompetitorMutation.isPending}
                                    >
                                      {addCompetitorMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <Plus className="h-4 w-4 mr-2" />
                                      )}
                                      Adicionar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum produto cadastrado ainda
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Use as seções acima para cadastrar seu primeiro produto via URL.
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