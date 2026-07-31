import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, Image, Tag, Building, Link } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type Product, type InsertProduct } from "@shared/schema";

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      sku: product?.sku || "",
      name: product?.name || "",
      description: product?.description || "",
      manufacturer: product?.manufacturer || "",
      categoryId: product?.categoryId || undefined,
      clientId: product?.clientId || undefined,
      competitorId: product?.competitorId || undefined,
      isCompetitor: product?.isCompetitor || false,
      sourceType: (product?.sourceType as "client" | "competitor") || "client",
      basePrice: product?.basePrice || "",
      imageUrl: product?.imageUrl || "",
      sourceUrl: product?.sourceUrl || "",
      status: product?.status || "active",
      matchGroup: product?.matchGroup || "",
      brandSku: product?.brandSku || "",
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

  const categoryList = categories || [];
  const clientList = clients || [];
  const competitorList = competitors || [];

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onSuccess();
      toast({
        title: "Produto criado",
        description: "Produto criado com sucesso.",
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
        description: "Erro ao criar produto.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onSuccess();
      
      // Check if price update was scheduled
      if (data?.priceUpdateScheduled) {
        toast({
          title: "Produto atualizado",
          description: "Produto atualizado com sucesso. O preço será atualizado automaticamente com a nova URL.",
          duration: 5000,
        });
      } else {
        toast({
          title: "Produto atualizado",
          description: "Produto atualizado com sucesso.",
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
        title: "Erro",
        description: "Erro ao atualizar produto.",
        variant: "destructive",
      });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async (id: number) => {
      const formData = form.getValues();
      const response = await apiRequest("PUT", `/api/products/${id}`, { 
        ...formData,
        forceUpdatePrice: true 
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Preço atualizado",
        description: "O preço está sendo atualizado automaticamente.",
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar preço.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProduct) => {
    console.log('Form data being submitted:', data);
    
    // Ensure proper cleanup based on isCompetitor flag
    const cleanedData = { ...data };
    
    // Set sourceType based on isCompetitor checkbox
    if (cleanedData.isCompetitor) {
      cleanedData.sourceType = 'competitor';
      // Manter clientId mesmo se for concorrente
    } else {
      cleanedData.sourceType = 'client';
    }
    
    // Sempre limpar competitorId já que não há mais select de concorrente
    cleanedData.competitorId = undefined;
    
    // Ensure categoryId is properly handled
    if (!cleanedData.categoryId) {
      cleanedData.categoryId = undefined;
    }
    
    console.log('Cleaned data:', cleanedData);
    
    if (product) {
      updateMutation.mutate({ id: product.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleUpdatePrice = () => {
    if (product?.id) {
      updatePriceMutation.mutate(product.id);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary-orange" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">SKU *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Código único do produto" 
                        {...field} 
                        className="focus:ring-2 focus:ring-primary-orange"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome completo do produto" 
                        {...field}
                        className="focus:ring-2 focus:ring-primary-orange"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição detalhada do produto"
                      className="min-h-[80px] focus:ring-2 focus:ring-primary-orange resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Brand and Category Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-primary-orange" />
              Marca e Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Marca/Fabricante</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Samsung, Apple, etc." 
                        {...field} 
                        value={field.value || ""} 
                        className="focus:ring-2 focus:ring-primary-orange"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Categoria</FormLabel>
                    <Select 
                      value={field.value?.toString() || ""} 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    >
                      <FormControl>
                        <SelectTrigger className="focus:ring-2 focus:ring-primary-orange">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(categoryList) && categoryList.length > 0 ? (
                          categoryList.map((category: any) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-category" disabled>
                            Nenhuma categoria disponível
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isCompetitor"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-orange-200 bg-orange-50 p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary-orange data-[state=checked]:border-primary-orange"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium text-orange-800">
                      É produto de concorrente?
                    </FormLabel>
                    <p className="text-xs text-orange-600">
                      Marque esta opção se este produto pertence a um concorrente
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Pricing and Client Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary-orange" />
              Preço e Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Preço Base</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        className="focus:ring-2 focus:ring-primary-orange"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Cliente</FormLabel>
                    <Select 
                      value={field.value?.toString() || ""} 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    >
                      <FormControl>
                        <SelectTrigger className="focus:ring-2 focus:ring-primary-orange">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(clientList) && clientList.length > 0 ? (
                          clientList.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-client" disabled>
                            Nenhum cliente disponível
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Status</FormLabel>
                  <Select value={field.value || "active"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="focus:ring-2 focus:ring-primary-orange">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Ativo
                        </div>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Inativo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Images and Additional Info Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Image className="h-5 w-5 text-primary-orange" />
              Imagens e Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">URL da Imagem</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://exemplo.com/imagem.jpg" 
                        {...field}
                        value={field.value || ""}
                        className="focus:ring-2 focus:ring-primary-orange"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sourceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Link className="h-4 w-4 text-primary-orange" />
                      URL do Produto
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="https://loja.com/produto" 
                          {...field}
                          value={field.value || ""}
                          className="focus:ring-2 focus:ring-primary-orange"
                        />
                      </FormControl>
                      {product && field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleUpdatePrice}
                          disabled={updatePriceMutation.isPending}
                          className="shrink-0 text-primary-orange border-primary-orange hover:bg-primary-orange hover:text-white"
                        >
                          {updatePriceMutation.isPending ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              Atualizando...
                            </div>
                          ) : (
                            "Atualizar Preço"
                          )}
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brandSku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">SKU da Marca</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="SKU do produto da sua marca" 
                        {...field}
                        value={field.value || ""}
                        className="focus:ring-2 focus:ring-primary-orange"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="matchGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Grupo de Match</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ex: pilha-aa, smartphone-samsung" 
                        {...field}
                        value={field.value || ""}
                        className="focus:ring-2 focus:ring-primary-orange"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="min-w-[100px]"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-primary-orange hover:bg-primary-orange/90 min-w-[100px]"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </div>
            ) : (
              product ? "Atualizar" : "Criar"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
