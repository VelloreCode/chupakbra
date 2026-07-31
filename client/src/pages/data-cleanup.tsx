import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  Sparkles,
  Package,
  DollarSign
} from "lucide-react";

interface DuplicateProduct {
  id: number;
  sku: string;
  name: string;
  duplicateCount: number;
  duplicateIds: number[];
}

interface OrphanedPrice {
  id: number;
  price: string;
  productId: number | null;
  clientId: number | null;
  productName?: string;
  clientName?: string;
}

interface DataCleanupStats {
  duplicateProducts: number;
  orphanedPrices: number;
  inconsistentPrices: number;
  emptyCategories: number;
}

export default function DataCleanup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<string[]>([]);

  // Buscar estatísticas de limpeza
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/admin/cleanup-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/cleanup-stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao buscar estatísticas");
      return response.json();
    }
  });

  // Buscar produtos duplicados
  const { data: duplicateProducts, refetch: refetchDuplicates } = useQuery({
    queryKey: ["/api/admin/duplicate-products"],
    queryFn: async () => {
      const response = await fetch("/api/admin/duplicate-products", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao buscar duplicatas");
      return response.json();
    }
  });

  // Buscar preços órfãos
  const { data: orphanedPrices, refetch: refetchOrphaned } = useQuery({
    queryKey: ["/api/admin/orphaned-prices"],
    queryFn: async () => {
      const response = await fetch("/api/admin/orphaned-prices", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao buscar preços órfãos");
      return response.json();
    }
  });

  // Mutation para limpeza automática
  const cleanupMutation = useMutation({
    mutationFn: async (type: string) => {
      return await apiRequest(`/api/admin/cleanup/${type}`, "POST");
    },
    onSuccess: (data, type) => {
      toast({
        title: "Limpeza concluída",
        description: `${type} limpo com sucesso`,
      });
      setCleanupResults(prev => [...prev, `${type}: ${data.cleaned} itens removidos`]);
      refetchStats();
      refetchDuplicates();
      refetchOrphaned();
    },
    onError: (error) => {
      toast({
        title: "Erro na limpeza",
        description: "Erro ao executar limpeza",
        variant: "destructive",
      });
    },
  });

  // Mutation para remoção individual
  const removeItemMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      return await apiRequest(`/api/admin/remove/${type}/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Item removido",
        description: "Item removido com sucesso",
      });
      refetchStats();
      refetchDuplicates();
      refetchOrphaned();
    },
  });

  const analyzeData = async () => {
    setIsAnalyzing(true);
    try {
      await refetchStats();
      await refetchDuplicates();
      await refetchOrphaned();
      toast({
        title: "Análise concluída",
        description: "Dados analisados com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro na análise",
        description: "Erro ao analisar dados",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cleanupAll = async () => {
    setCleanupResults([]);
    await cleanupMutation.mutateAsync("duplicate-products");
    await cleanupMutation.mutateAsync("orphaned-prices");
    await cleanupMutation.mutateAsync("empty-categories");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="ml-64">
        <main className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Limpeza de Dados
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Identifique e remova dados históricos redundantes
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={analyzeData}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Analisar Dados
              </Button>
              <Button
                onClick={cleanupAll}
                disabled={cleanupMutation.isPending || !stats}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Limpeza Automática
              </Button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Produtos Duplicados</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.duplicateProducts || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Preços Órfãos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.orphanedPrices || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Preços Inconsistentes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.inconsistentPrices || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Categorias Vazias</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.emptyCategories || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultados de limpeza */}
          {cleanupResults.length > 0 && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Limpeza concluída:</strong>
                <ul className="mt-2 space-y-1">
                  {cleanupResults.map((result, index) => (
                    <li key={index} className="text-sm">• {result}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs para diferentes tipos de limpeza */}
          <Tabs defaultValue="duplicates" className="space-y-4">
            <TabsList>
              <TabsTrigger value="duplicates">Produtos Duplicados</TabsTrigger>
              <TabsTrigger value="orphaned">Preços Órfãos</TabsTrigger>
              <TabsTrigger value="inconsistent">Dados Inconsistentes</TabsTrigger>
            </TabsList>

            <TabsContent value="duplicates">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Produtos Duplicados
                    <Button
                      size="sm"
                      onClick={() => cleanupMutation.mutate("duplicate-products")}
                      disabled={cleanupMutation.isPending}
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover Todos
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {duplicateProducts && duplicateProducts.length > 0 ? (
                    <div className="space-y-4">
                      {duplicateProducts.map((product: DuplicateProduct) => (
                        <div key={product.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{product.name}</h4>
                              <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                              <Badge variant="destructive" className="mt-1">
                                {product.duplicateCount} duplicatas
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeItemMutation.mutate({ type: "product", id: product.id })}
                              disabled={removeItemMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Nenhum produto duplicado encontrado</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orphaned">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Preços Órfãos
                    <Button
                      size="sm"
                      onClick={() => cleanupMutation.mutate("orphaned-prices")}
                      disabled={cleanupMutation.isPending}
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover Todos
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orphanedPrices && orphanedPrices.length > 0 ? (
                    <div className="space-y-4">
                      {orphanedPrices.map((price: OrphanedPrice) => (
                        <div key={price.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">R$ {price.price}</h4>
                              <p className="text-sm text-gray-600">
                                Produto: {price.productName || "Não encontrado"} | 
                                Cliente: {price.clientName || "Não encontrado"}
                              </p>
                              <Badge variant="destructive" className="mt-1">Órfão</Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeItemMutation.mutate({ type: "price", id: price.id })}
                              disabled={removeItemMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Nenhum preço órfão encontrado</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inconsistent">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Inconsistentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Esta seção identifica produtos com preços muito divergentes,
                        categorias vazias, e outros problemas de consistência de dados.
                      </AlertDescription>
                    </Alert>
                    
                    <Button
                      onClick={() => cleanupMutation.mutate("inconsistent-data")}
                      disabled={cleanupMutation.isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Corrigir Inconsistências
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}