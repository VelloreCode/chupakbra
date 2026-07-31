import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertApiKeySchema, type ApiKey, type InsertApiKey } from "@shared/schema";
import { 
  Rocket, 
  Shield, 
  Zap, 
  Download, 
  Key, 
  Plus, 
  Copy, 
  Edit, 
  Trash2,
  Code 
} from "lucide-react";
import { z } from "zod";

const apiKeyFormSchema = insertApiKeySchema.pick({ name: true });

export default function ApiDocs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const form = useForm<z.infer<typeof apiKeyFormSchema>>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Você precisa fazer login para acessar esta página.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery({
    queryKey: ["/api/api-keys"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof apiKeyFormSchema>) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setNewApiKey(data.key);
      setDialogOpen(false);
      form.reset();
      toast({
        title: "API Key criada",
        description: "API Key criada com sucesso. Copie e guarde em local seguro.",
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
        title: "Erro",
        description: "Erro ao criar API Key.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key excluída",
        description: "API Key excluída com sucesso.",
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
        title: "Erro",
        description: "Erro ao excluir API Key.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof apiKeyFormSchema>) => {
    createMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Texto copiado para a área de transferência.",
    });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">API & Documentação</h2>
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-gray-300 text-text-secondary hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Docs
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary-orange hover:bg-primary-orange-dark text-white">
                      <Key className="h-4 w-4 mr-2" />
                      Gerar API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova API Key</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome da API Key</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Sistema Principal" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            className="bg-primary-orange hover:bg-primary-orange-dark text-white"
                            disabled={createMutation.isPending}
                          >
                            {createMutation.isPending ? "Gerando..." : "Gerar API Key"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* New API Key Display */}
            {newApiKey && (
              <Card className="mb-6 border-success bg-success bg-opacity-5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-success mb-2">
                        Nova API Key Criada
                      </h3>
                      <p className="text-text-secondary mb-4">
                        Copie e guarde esta chave em local seguro. Ela não será exibida novamente.
                      </p>
                      <code className="bg-white border rounded px-3 py-2 text-sm block">
                        {newApiKey}
                      </code>
                    </div>
                    <Button 
                      onClick={() => copyToClipboard(newApiKey)}
                      className="bg-success hover:bg-green-600 text-white"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setNewApiKey(null)}
                  >
                    Fechar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* API Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-primary-orange bg-opacity-10 rounded-full flex items-center justify-center">
                      <Rocket className="h-5 w-5 text-primary-orange" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">API REST</h3>
                  </div>
                  <p className="text-text-secondary mb-4">
                    API RESTful completa com autenticação JWT e documentação OpenAPI/Swagger.
                  </p>
                  <div className="text-sm">
                    <p className="text-text-secondary">Base URL:</p>
                    <code className="bg-gray-100 px-2 py-1 rounded text-primary-orange text-xs">
                      {window.location.origin}/api
                    </code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-info bg-opacity-10 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-info" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">Autenticação</h3>
                  </div>
                  <p className="text-text-secondary mb-4">
                    Autenticação segura via JWT tokens com rate limiting e controle de acesso.
                  </p>
                  <div className="text-sm">
                    <p className="text-text-secondary">Método:</p>
                    <code className="bg-gray-100 px-2 py-1 rounded text-info text-xs">
                      Bearer Token
                    </code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-success bg-opacity-10 rounded-full flex items-center justify-center">
                      <Zap className="h-5 w-5 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">Rate Limiting</h3>
                  </div>
                  <p className="text-text-secondary mb-4">
                    Controle de taxa de requisições para garantir performance e disponibilidade.
                  </p>
                  <div className="text-sm">
                    <p className="text-text-secondary">Limite:</p>
                    <code className="bg-gray-100 px-2 py-1 rounded text-success text-xs">
                      1000 req/hora
                    </code>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* API Endpoints */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="h-5 w-5 mr-2" />
                  Endpoints Principais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Products Endpoints */}
                  <div>
                    <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                      <div className="w-2 h-2 bg-primary-orange rounded-full mr-2"></div>
                      Produtos
                    </h4>
                    <div className="space-y-3">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-success text-white">GET</Badge>
                            <code className="text-text-primary">/api/products</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Lista produtos com filtros avançados: sku, sourceType, isCompetitor, isMaster, manufacturer, priceMin/Max, dates, sortBy, sortOrder
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-success text-white">GET</Badge>
                            <code className="text-text-primary">/api/products/:id</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/{id}')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Busca um produto específico por ID
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-info text-white">POST</Badge>
                            <code className="text-text-primary">/api/products</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Cria um novo produto
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-warning text-white">PUT</Badge>
                            <code className="text-text-primary">/api/products/:id</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/{id}')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Atualiza um produto existente por ID
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-orange-500 text-white">PATCH</Badge>
                            <code className="text-text-primary">/api/products/:id</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/{id}')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Atualização parcial de um produto
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="destructive">DELETE</Badge>
                            <code className="text-text-primary">/api/products/:id</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/{id}')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Remove um produto por ID
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-info text-white">POST</Badge>
                            <code className="text-text-primary">/api/products/bulk</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/bulk')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Criação em lote de produtos
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="destructive">DELETE</Badge>
                            <code className="text-text-primary">/api/products/bulk</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/bulk')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Remoção em lote de produtos
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-info text-white">POST</Badge>
                            <code className="text-text-primary">/api/products/scrape-preview</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/scrape-preview')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Extrai dados de produto via URL para preview
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-success text-white">GET</Badge>
                            <code className="text-text-primary">/api/products/masters-with-competitors</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/masters-with-competitors')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Lista produtos master com seus concorrentes
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Categories Endpoints */}
                  <div>
                    <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      Categorias
                    </h4>
                    <div className="space-y-3">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-success text-white">GET</Badge>
                            <code className="text-text-primary">/api/categories</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/categories')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Lista todas as categorias
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-info text-white">POST</Badge>
                            <code className="text-text-primary">/api/categories</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/categories')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Cria uma nova categoria
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-warning text-white">PUT</Badge>
                            <code className="text-text-primary">/api/categories/:id</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/categories/{id}')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Atualiza uma categoria por ID
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="destructive">DELETE</Badge>
                            <code className="text-text-primary">/api/categories/:id</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/categories/{id}')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Remove uma categoria por ID
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clients Endpoints */}
                  <div>
                    <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Clientes
                    </h4>
                    <div className="space-y-3">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-success text-white">GET</Badge>
                            <code className="text-text-primary">/api/clients</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/clients')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Lista todos os clientes
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-info text-white">POST</Badge>
                            <code className="text-text-primary">/api/clients</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/clients')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Cria um novo cliente
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-warning text-white">PUT</Badge>
                            <code className="text-text-primary">/api/clients/:id</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/clients/{id}')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Atualiza um cliente por ID
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Competitors Endpoints */}
                  <div>
                    <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Concorrentes
                    </h4>
                    <div className="space-y-3">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-success text-white">GET</Badge>
                            <code className="text-text-primary">/api/competitors</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/competitors')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Lista todos os concorrentes
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-info text-white">POST</Badge>
                            <code className="text-text-primary">/api/competitors</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/competitors')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Cria um novo concorrente
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-warning text-white">PUT</Badge>
                            <code className="text-text-primary">/api/competitors/:id</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/competitors/{id}')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Atualiza um concorrente por ID
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price Monitoring Endpoints */}
                  <div>
                    <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                      <div className="w-2 h-2 bg-warning rounded-full mr-2"></div>
                      Monitoramento
                    </h4>
                    <div className="space-y-3">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-success text-white">GET</Badge>
                            <code className="text-text-primary">/api/products/monitoring-history</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/monitoring-history')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Histórico de monitoramento de preços
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default" className="bg-info text-white">POST</Badge>
                            <code className="text-text-primary">/api/products/update-prices</code>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard('/api/products/update-prices')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-text-secondary text-sm">
                          Executa atualização de preços via scraping
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Keys Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gerenciar API Keys</CardTitle>
                  <Button 
                    onClick={() => setDialogOpen(true)}
                    className="bg-primary-orange hover:bg-primary-orange-dark text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeysLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-orange"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead>Último Uso</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys?.map((apiKey: ApiKey) => (
                        <TableRow key={apiKey.id}>
                          <TableCell className="font-medium">{apiKey.name}</TableCell>
                          <TableCell>
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm text-text-secondary">
                              {apiKey.keyHash.substring(0, 12)}...****
                            </code>
                          </TableCell>
                          <TableCell>
                            {apiKey.createdAt ? new Date(apiKey.createdAt).toLocaleDateString('pt-BR') : "-"}
                          </TableCell>
                          <TableCell>
                            {apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString('pt-BR') : "Nunca"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                              {apiKey.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(apiKey.keyHash)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(apiKey.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
