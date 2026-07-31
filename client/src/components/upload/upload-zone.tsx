import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, FileSpreadsheet, Info, AlertTriangle, Check, Download, Eye, Settings } from "lucide-react";
import * as XLSX from 'xlsx';

export default function UploadZone() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const downloadTemplate = () => {
    window.open('/api/upload/demo-template', '_blank');
    toast({
      title: "Download iniciado",
      description: "O template de exemplo está sendo baixado.",
    });
  };

  const generateCategoriesTemplate = () => {
    const categoriesData = [
      {
        id: "5",
        nome: "Iluminação", 
        descricao: "Produtos de iluminação LED e tradicionais"
      },
      {
        id: "6",
        nome: "Automação",
        descricao: "Produtos para automação residencial e comercial"
      },
      {
        id: "7", 
        nome: "Segurança",
        descricao: "Sistemas de segurança e monitoramento"
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(categoriesData);
    
    // Add column widths
    ws['!cols'] = [
      { wch: 5 },   // id
      { wch: 20 },  // nome
      { wch: 50 }   // descricao
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Categorias");
    XLSX.writeFile(wb, 'template_categorias.xlsx');
    
    toast({
      title: "Template baixado",
      description: "Template de categorias baixado com sucesso.",
    });
  };

  const generateClientsTemplate = () => {
    const clientsData = [
      {
        id: "3",
        nome: "Vellore",
        email: "contato@vellore.com.br",
        telefone: "(11) 1234-5678",
        status: "active"
      },
      {
        id: "4", 
        nome: "Bartofil",
        email: "vendas@bartofil.com.br",
        telefone: "(11) 9876-5432",
        status: "active"
      },
      {
        id: "5",
        nome: "Concorrente A",
        email: "info@concorrente-a.com",
        telefone: "(11) 5555-5555", 
        status: "active"
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(clientsData);
    
    // Add column widths
    ws['!cols'] = [
      { wch: 5 },   // id
      { wch: 20 },  // nome
      { wch: 30 },  // email
      { wch: 15 },  // telefone
      { wch: 10 }   // status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, 'template_clientes.xlsx');
    
    toast({
      title: "Template baixado",
      description: "Template de clientes baixado com sucesso.",
    });
  };

  const { data: uploadHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/upload/history"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      setIsProcessing(true);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      try {
        const response = await apiRequest("POST", "/api/upload/excel", formData);
        const result = await response.json();
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setTimeout(() => {
          setIsProcessing(false);
          setUploadProgress(0);
        }, 1000);

        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setIsProcessing(false);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/upload/history"] });
      toast({
        title: "Upload processado",
        description: `${data.recordsSuccess} registros processados com sucesso.`,
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
        title: "Erro no upload",
        description: "Erro ao processar arquivo Excel.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "Concluído", variant: "default" as const, color: "text-success" };
      case "completed_with_errors":
        return { label: "Concluído com Erros", variant: "secondary" as const, color: "text-warning" };
      case "failed":
        return { label: "Falhou", variant: "destructive" as const, color: "text-danger" };
      default:
        return { label: "Processando", variant: "outline" as const, color: "text-info" };
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Upload de Planilha Excel</h2>

      {/* Upload Zone */}
      <Card className="mb-6">
        <CardContent className="p-8">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? "border-primary-orange bg-primary-orange bg-opacity-5"
                : "border-gray-300 hover:border-primary-orange"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="w-16 h-16 bg-primary-orange bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CloudUpload className="h-8 w-8 text-primary-orange" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Faça upload da sua planilha
            </h3>
            <p className="text-text-secondary mb-4">
              Arraste e solte seu arquivo Excel aqui ou clique para selecionar
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-orange hover:bg-primary-orange-dark text-white"
              disabled={uploadMutation.isPending}
            >
              Escolher Arquivo
            </Button>
            <p className="text-sm text-text-secondary mt-3">
              Formatos aceitos: .xlsx, .xls (máx. 10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-orange bg-opacity-10 rounded-full flex items-center justify-center">
                <Settings className="h-6 w-6 text-primary-orange animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary">
                  Processando planilha...
                </h3>
                <p className="text-text-secondary">Validando dados e atualizando preços</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-text-secondary mt-2">
                Processando... {Math.round(uploadProgress)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Download and Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success bg-opacity-10 rounded-full flex items-center justify-center">
                <Download className="h-5 w-5 text-success" />
              </div>
              <span>Templates Disponíveis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Baixe templates com dados reais do sistema incluindo IDs para facilitar importação e vinculação.
              </p>
              
              <div className="space-y-2">
                <Button 
                  onClick={downloadTemplate}
                  className="w-full bg-success hover:bg-green-600 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Template Produtos com Exemplos
                </Button>
                
                <Button 
                  onClick={generateCategoriesTemplate}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Template Categorias
                </Button>
                
                <Button 
                  onClick={generateClientsTemplate}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Template Clientes
                </Button>
              </div>
              
              <div className="text-xs text-text-secondary bg-gray-50 p-3 rounded">
                <strong>Todos os templates incluem:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Coluna ID para fácil identificação</li>
                  <li>Dados reais do sistema atual</li>
                  <li>Formatação correta para cada campo</li>
                  <li>Exemplos de vinculação entre entidades</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-info bg-opacity-10 rounded-full flex items-center justify-center">
                <Info className="h-5 w-5 text-info" />
              </div>
              <span>Formato da Planilha</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong>Colunas obrigatórias:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>nome - Nome do produto</li>
                <li>sku - Código único do produto</li>
              </ul>
              <p className="mt-3"><strong>Colunas opcionais:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>categoria_id - ID da categoria (use template de categorias)</li>
                <li>cliente_id - ID do cliente (use template de clientes)</li>
                <li>preco - Preço do produto</li>
                <li>descricao - Descrição detalhada</li>
                <li>fabricante - Marca/fabricante</li>
                <li>imagem_url - Link da imagem</li>
                <li>link_origem - URL original</li>
                <li>is_master - Produto principal (sim/não)</li>
                <li>is_competitor - É concorrente (sim/não)</li>
                <li>master_product_id - ID do produto principal</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning bg-opacity-10 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <span>Dicas Importantes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-text-secondary">
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Use a primeira linha para os cabeçalhos</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Preços devem usar ponto para decimais (ex: 1299.99)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Datas no formato DD/MM/AAAA</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Evite células vazias nas colunas obrigatórias</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Máximo de 10.000 linhas por arquivo</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-orange"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadHistory?.map((upload: any) => {
                    const statusInfo = formatStatus(upload.status);
                    return (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <FileSpreadsheet className="h-5 w-5 text-success" />
                            <span className="font-medium text-text-primary">
                              {upload.filename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {new Date(upload.createdAt).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {upload.recordsProcessed} produtos
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
