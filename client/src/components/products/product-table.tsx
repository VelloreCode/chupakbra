import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit, BarChart3, Trash2, Plus, Search, Copy } from "lucide-react";
import ProductForm from "@/components/products/product-form";
import type { Product, Category, Client, PriceHistory } from "@shared/schema";

interface ProductTableProps {
  filters?: {
    search: string;
    categoryId: string;
    clientId: string;
    manufacturer: string;
    sourceType: string;
    status: string;
    limit: number;
    offset: number;
  };
  onEditProduct?: (product: Product) => void;
  onFiltersChange?: (filters: any) => void;
}

export default function ProductTable({ filters, onEditProduct, onFiltersChange }: ProductTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions } = useUserRole();
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: productsResult, isLoading } = useQuery({
    queryKey: ["/api/products", filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters?.search) searchParams.append("search", filters.search);
      if (filters?.categoryId) searchParams.append("categoryId", filters.categoryId);
      if (filters?.clientId) searchParams.append("clientId", filters.clientId);
      if (filters?.manufacturer) searchParams.append("manufacturer", filters.manufacturer);
      if (filters?.sourceType) searchParams.append("sourceType", filters.sourceType);
      if (filters?.status) searchParams.append("status", filters.status);
      searchParams.append("limit", (filters?.limit || 50).toString());
      searchParams.append("offset", (filters?.offset || 0).toString());

      const response = await fetch(`/api/products?${searchParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: competitors } = useQuery({
    queryKey: ["/api/competitors"],
  });

  // Query para historico do produto selecionado
  const { data: productHistory } = useQuery({
    queryKey: ["/api/products", historyProduct?.id, "history"],
    queryFn: async () => {
      if (!historyProduct?.id) return null;
      const response = await fetch(`/api/products/${historyProduct.id}/history`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!historyProduct?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto excluído",
        description: "Produto excluído com sucesso.",
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
        description: "Erro ao excluir produto.",
        variant: "destructive",
      });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (product: Product) => {
      const cloneData = {
        name: `${product.name} (Cópia)`,
        description: product.description,
        sku: `${product.sku}-COPY-${Date.now()}`,
        categoryId: product.categoryId,
        clientId: product.clientId,
        basePrice: product.basePrice,
        imageUrl: product.imageUrl,
        status: product.status,
        matchGroup: product.matchGroup,
        brandSku: product.brandSku,
      };
      await apiRequest("POST", "/api/products", cloneData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto clonado",
        description: "Produto clonado com sucesso.",
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
        description: "Erro ao clonar produto. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (product: Product) => {
    if (onEditProduct) {
      onEditProduct(product);
    } else {
      setEditingProduct(product);
      setDialogOpen(true);
    }
  };

  const handleNew = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const applyFilters = () => {
    setFilters({ ...filters, offset: 0 });
  };

  const products = productsResult?.products || [];
  const total = productsResult?.total || 0;

  return (
    <div>
      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      ID
                    </TableHead>
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      Categoria
                    </TableHead>
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      Produto
                    </TableHead>
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      Marca
                    </TableHead>
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      Cliente
                    </TableHead>
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      Preço Base
                    </TableHead>
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      Tipo
                    </TableHead>
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      Última Atualização
                    </TableHead>
                    <TableHead className="text-left py-4 px-6 font-semibold text-text-primary">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: Product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="py-4 px-6 font-mono text-sm text-gray-500">
                        {product.id}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-text-secondary">
                        {categories?.find((c: any) => c.id === product.categoryId)?.name || "N/A"}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center space-x-4">
                          <img
                            src={product.imageUrl || 'https://www.grupoconserpaenger.com.br/wp-content/uploads/elementor/thumbs/produto-sem-imagem-qnyfrogx05j5kps5v27lx6c73dq0vgnm9mk6wyj4vk.jpg'}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">{product.name}</p>
                              {product.isCompetitor === true && (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium border border-red-200">
                                  Concorrente
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary">{product.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-text-secondary">
                        {product.manufacturer || "N/A"}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-text-secondary">
                        {clients?.find((c: any) => c.id === product.clientId)?.name || "N/A"}
                      </TableCell>
                      <TableCell className="py-4 px-6 font-semibold text-text-primary">
                        R$ {parseFloat(product.basePrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.sourceUrl 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {product.sourceUrl ? 'URL' : 'Base de dados'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-text-secondary">
                        {product.updatedAt ? 
                          `${new Date(product.updatedAt).toLocaleDateString('pt-BR')} às ${new Date(product.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
                          : 'Sem atualizações'}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          {permissions.canEditProducts && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="text-primary-orange hover:text-primary-orange-dark"
                              title="Editar produto"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canCreateProducts && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cloneMutation.mutate(product)}
                              disabled={cloneMutation.isPending}
                              className="text-green-600 hover:text-green-700"
                              title="Clonar produto"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setHistoryProduct(product);
                              setShowHistory(true);
                            }}
                            className="text-info hover:text-blue-700"
                            title="Ver histórico"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          {permissions.canDeleteProducts && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(product.id)}
                              disabled={deleteMutation.isPending}
                              className="text-danger hover:text-red-700"
                              title="Excluir produto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              Mostrando {filters.offset + 1}-{Math.min(filters.offset + filters.limit, total)} de {total} produtos
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                disabled={filters.offset === 0}
                onClick={() => onFiltersChange && onFiltersChange({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={filters.offset + filters.limit >= total}
                onClick={() => onFiltersChange && onFiltersChange({ ...filters, offset: filters.offset + filters.limit })}
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Product History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <img
                src={historyProduct?.imageUrl || `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50`}
                alt={historyProduct?.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <h3 className="text-xl font-bold text-text-primary">{historyProduct?.name}</h3>
                <p className="text-text-secondary">SKU: {historyProduct?.sku}</p>
                <p className="text-sm text-text-secondary">
                  Cadastrado em: {historyProduct?.createdAt ? 
                    `${new Date(historyProduct.createdAt).toLocaleDateString('pt-BR')} às ${new Date(historyProduct.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Data não disponível'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-text-primary">Histórico de Preços</h4>
              
              {productHistory?.length > 0 ? (
                <div className="space-y-3">
                  {productHistory.map((entry: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">
                              {entry.client?.name || 'Cliente desconhecido'}
                            </span>
                            <span className="text-sm text-text-secondary">
                              {entry.createdAt ? 
                                `${new Date(entry.createdAt).toLocaleDateString('pt-BR')} às ${new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
                                : 'Data não disponível'
                              }
                            </span>
                            {entry.changeReason && (
                              <span className="text-xs text-blue-600 mt-1">
                                {entry.changeReason}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col items-end">
                            {entry.oldPrice && (
                              <div className="text-sm text-gray-500 line-through">
                                R$ {parseFloat(entry.oldPrice).toFixed(2)}
                              </div>
                            )}
                            <span className="text-lg font-bold text-text-primary">
                              R$ {parseFloat(entry.newPrice || '0').toFixed(2)}
                            </span>
                            {entry.oldPrice && (
                              <div className="text-xs text-gray-600">
                                {parseFloat(entry.newPrice) > parseFloat(entry.oldPrice) ? '↗' : '↘'} 
                                {(((parseFloat(entry.newPrice) - parseFloat(entry.oldPrice)) / parseFloat(entry.oldPrice)) * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum histórico de preços encontrado para este produto.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
