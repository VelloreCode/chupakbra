import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Link as LinkIcon, 
  Check, 
  AlertCircle, 
  Bot, 
  Package, 
  Eye,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ExternalLink
} from "lucide-react";

const urlSchema = z.object({
  url: z.string().url("Por favor, insira uma URL válida"),
});

const productDetailsSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  basePrice: z.string().min(1, "Preço é obrigatório"),
  manufacturer: z.string().optional(),
  categoryId: z.number().optional(),
  clientId: z.number().optional(),
  isCompetitor: z.boolean().default(false),
  isMaster: z.boolean().default(false),
});

type UrlFormData = z.infer<typeof urlSchema>;
type ProductDetailsFormData = z.infer<typeof productDetailsSchema>;

interface ScrapingWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface ScrapedData {
  nome_produto?: string;
  marca?: string;
  valor_principal?: number;
  sku?: string;
  link_imagem?: string;
  description?: string;
}

export default function ScrapingWizard({ onComplete, onCancel }: ScrapingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const urlForm = useForm<UrlFormData>({
    resolver: zodResolver(urlSchema),
    defaultValues: { url: "" }
  });

  const productForm = useForm<ProductDetailsFormData>({
    resolver: zodResolver(productDetailsSchema),
    defaultValues: {
      name: "",
      basePrice: "",
      manufacturer: "",
      isCompetitor: false,
      isMaster: false,
    }
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const scrapeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", `/api/products/scrape-preview`, {
        url,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setScrapedData(data);
      setPreviewUrl(urlForm.getValues("url"));
      
      // Pre-fill the product form with scraped data
      productForm.setValue("name", data.nome_produto || "");
      productForm.setValue("basePrice", data.valor_principal?.toString() || "");
      productForm.setValue("manufacturer", data.marca || "");
      
      setCurrentStep(2);
      toast({
        title: "Dados extraídos com sucesso!",
        description: "Verifique e ajuste as informações antes de salvar.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao extrair dados",
        description: error.message || "Não foi possível extrair dados desta URL.",
        variant: "destructive",
      });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductDetailsFormData & { url: string; imageUrl?: string; description?: string; sku?: string }) => {
      const response = await apiRequest("POST", `/api/products/from-preview`, {
        ...data,
        sourceUrl: data.url,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto criado com sucesso!",
        description: "O produto foi adicionado e será monitorado automaticamente.",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message || "Não foi possível criar o produto.",
        variant: "destructive",
      });
    },
  });

  const onSubmitUrl = (data: UrlFormData) => {
    scrapeMutation.mutate(data.url);
  };

  const onSubmitProduct = (data: ProductDetailsFormData) => {
    if (!scrapedData) return;

    createProductMutation.mutate({
      ...data,
      url: previewUrl,
      imageUrl: scrapedData.link_imagem,
      description: scrapedData.description,
      sku: scrapedData.sku,
    });
  };

  const progressPercentage = currentStep === 1 ? 25 : currentStep === 2 ? 75 : 100;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 bg-primary-orange rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Assistente de Extração</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Use nossa IA para extrair automaticamente informações de produtos a partir de uma URL
        </p>
        
        {/* Progress Bar */}
        <div className="max-w-md mx-auto">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span className={currentStep >= 1 ? "text-primary-orange font-medium" : ""}>
              1. URL
            </span>
            <span className={currentStep >= 2 ? "text-primary-orange font-medium" : ""}>
              2. Verificar
            </span>
            <span className={currentStep >= 3 ? "text-primary-orange font-medium" : ""}>
              3. Salvar
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: URL Input */}
      {currentStep === 1 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary-orange" />
              Insira a URL do Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={urlForm.handleSubmit(onSubmitUrl)} className="space-y-4">
              <div>
                <Label htmlFor="url">URL do Produto</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="url"
                    placeholder="https://loja.com/produto-exemplo"
                    {...urlForm.register("url")}
                    className="flex-1"
                    disabled={scrapeMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    disabled={scrapeMutation.isPending}
                    className="bg-primary-orange hover:bg-primary-orange/90"
                  >
                    {scrapeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Extrair
                      </>
                    )}
                  </Button>
                </div>
                {urlForm.formState.errors.url && (
                  <p className="text-sm text-red-600 mt-1">
                    {urlForm.formState.errors.url.message}
                  </p>
                )}
              </div>

              {/* Supported Sites Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">IA Inteligente</h4>
                    <p className="text-sm text-blue-700">
                      Nossa IA extrai automaticamente: nome, preço, marca, imagem e descrição. 
                      Funciona com a maioria dos e-commerces brasileiros.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview and Edit */}
      {currentStep === 2 && scrapedData && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Preview Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary-orange" />
                Preview Extraído
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ExternalLink className="h-4 w-4" />
                <span className="truncate">{previewUrl}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {scrapedData.link_imagem && (
                <div className="aspect-square w-full max-w-48 mx-auto bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={scrapedData.link_imagem} 
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">NOME</Label>
                  <p className="font-medium">{scrapedData.nome_produto || "Não extraído"}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">PREÇO</Label>
                    <p className="font-medium text-primary-orange">
                      {scrapedData.valor_principal ? `R$ ${scrapedData.valor_principal}` : "Não extraído"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">MARCA</Label>
                    <p className="font-medium">{scrapedData.marca || "Não extraído"}</p>
                  </div>
                </div>

                {scrapedData.description && (
                  <div>
                    <Label className="text-xs text-gray-500">DESCRIÇÃO</Label>
                    <p className="text-sm text-gray-700 line-clamp-3">{scrapedData.description}</p>
                  </div>
                )}

                <Badge className="w-fit bg-green-100 text-green-800">
                  <Check className="h-3 w-3 mr-1" />
                  Dados extraídos com IA
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary-orange" />
                Detalhes do Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={productForm.handleSubmit(onSubmitProduct)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input
                    id="name"
                    {...productForm.register("name")}
                    className="mt-1"
                  />
                  {productForm.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {productForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="basePrice">Preço *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      {...productForm.register("basePrice")}
                      className="mt-1"
                    />
                    {productForm.formState.errors.basePrice && (
                      <p className="text-sm text-red-600 mt-1">
                        {productForm.formState.errors.basePrice.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="manufacturer">Marca</Label>
                    <Input
                      id="manufacturer"
                      {...productForm.register("manufacturer")}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={productForm.watch("categoryId")?.toString() || ""}
                      onValueChange={(value) => 
                        productForm.setValue("categoryId", value ? parseInt(value) : undefined)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(categories) && categories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cliente</Label>
                    <Select
                      value={productForm.watch("clientId")?.toString() || ""}
                      onValueChange={(value) => 
                        productForm.setValue("clientId", value ? parseInt(value) : undefined)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(clients) && clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isCompetitor"
                      checked={productForm.watch("isCompetitor")}
                      onCheckedChange={(checked) => 
                        productForm.setValue("isCompetitor", checked as boolean)
                      }
                    />
                    <Label htmlFor="isCompetitor" className="text-sm">
                      Este é um produto de concorrente
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isMaster"
                      checked={productForm.watch("isMaster")}
                      onCheckedChange={(checked) => 
                        productForm.setValue("isMaster", checked as boolean)
                      }
                    />
                    <Label htmlFor="isMaster" className="text-sm">
                      Este é um produto master (principal)
                    </Label>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    className="flex-1 bg-primary-orange hover:bg-primary-orange/90"
                  >
                    {createProductMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Criar Produto
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Button */}
      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}