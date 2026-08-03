import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Download } from "lucide-react";
import BulkPriceUpdate from "@/components/bulk-price-update";
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProductTable from "@/components/products/product-table";
import ProductForm from "@/components/products/product-form";
import Sidebar from "@/components/layout/sidebar";
import type { Product, Category, Client, Competitor } from "@shared/schema";

export default function Products() {
  const { permissions } = useUserRole();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    clientId: "",
    manufacturer: "",
    sourceType: "",
    status: "",
    limit: 50,
    offset: 0,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: manufacturers = [] } = useQuery<string[]>({
    queryKey: ["/api/products/manufacturers"],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: competitors = [] } = useQuery({
    queryKey: ["/api/competitors"],
  });

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleExportProducts = async () => {
    try {
      // Build query parameters from current filters
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
      if (filters.clientId) queryParams.append('clientId', filters.clientId);
      if (filters.manufacturer) queryParams.append('manufacturer', filters.manufacturer);
      if (filters.sourceType) queryParams.append('sourceType', filters.sourceType);
      if (filters.status) queryParams.append('status', filters.status);
      queryParams.append('limit', '10000'); // Export all filtered results
      
      const response = await fetch(`/api/products/export?${queryParams.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to export products: ${errorData.message || 'Unknown error'}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting products:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gerenciar Produtos</h1>
              <p className="text-gray-600 mt-1">Gerencie seu catálogo de produtos</p>
            </div>
            <div className="flex gap-2">
              <BulkPriceUpdate />
              <Button 
                onClick={handleExportProducts}
                variant="outline"
                className="border-primary-orange text-primary-orange hover:bg-primary-orange hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
              <Button onClick={handleAddProduct} className="bg-primary-orange hover:bg-primary-orange/90">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Produto
              </Button>
            </div>
          </div>



          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <Input
                  placeholder="Buscar produtos..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, offset: 0 })}
                  className="focus:ring-2 focus:ring-primary-orange"
                />
                <Select 
                  value={filters.categoryId || "all"} 
                  onValueChange={(value) => setFilters({ ...filters, categoryId: value === "all" ? "" : value, offset: 0 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories?.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={filters.clientId || "all"} 
                  onValueChange={(value) => setFilters({ ...filters, clientId: value === "all" ? "" : value, offset: 0 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients?.map((client: Client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.manufacturer || "all"}
                  onValueChange={(value) => setFilters({ ...filters, manufacturer: value === "all" ? "" : value, offset: 0 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as marcas</SelectItem>
                    {manufacturers.map((marca) => (
                      <SelectItem key={marca} value={marca}>
                        {marca}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.sourceType || "all"}
                  onValueChange={(value) => setFilters({ ...filters, sourceType: value === "all" ? "" : value, offset: 0 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {/* Valores casam com o filtro do backend em storage.getProducts */}
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="database">Base de dados</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value, offset: 0 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => setFilters({ ...filters, offset: 0 })}
                  variant="outline"
                  className="border-primary-orange text-primary-orange hover:bg-primary-orange hover:text-white"
                >
                  Aplicar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <ProductTable 
              filters={filters}
              onEditProduct={handleEditProduct}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Modal para edição/criação de produto */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <ProductForm
                product={editingProduct}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
