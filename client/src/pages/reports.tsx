import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Types for dashboard stats
interface DashboardStats {
  totalProducts: number;
  activeClients: number;
  averageSavings: number;
  todayUpdates: number;
}

// Types for reports history
interface ReportHistory {
  id: number;
  reportType: string;
  reportTitle: string;
  generatedBy: string;
  generatedAt: string;
  parameters: any;
  recordCount: number;
  fileFormat: string;
  filePath?: string;
}
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Download,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw
} from "lucide-react";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [downloadFormat, setDownloadFormat] = useState<"json" | "excel">("json");

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

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const dashboardStats: DashboardStats = stats || {
    totalProducts: 0,
    activeClients: 0,
    averageSavings: 0,
    todayUpdates: 0
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  const reportTypes = [
    {
      id: "price-comparison",
      title: "Relatório de Comparação de Preços",
      description: "Análise detalhada dos preços por produto e cliente",
      icon: BarChart3,
      type: "financial",
      status: "available"
    },
    {
      id: "savings-analysis",
      title: "Análise de Economia",
      description: "Relatório de economia gerada nas comparações",
      icon: DollarSign,
      type: "financial",
      status: "available"
    },
    {
      id: "client-performance",
      title: "Performance por Cliente",
      description: "Desempenho e competitividade por cliente",
      icon: Users,
      type: "client",
      status: "available"
    },
    {
      id: "product-trends",
      title: "Tendências de Produtos",
      description: "Análise de tendências e variações de preços",
      icon: TrendingUp,
      type: "product",
      status: "available"
    },
    {
      id: "category-analysis",
      title: "Análise por Categoria",
      description: "Relatório de desempenho por categoria de produto",
      icon: PieChart,
      type: "category",
      status: "available"
    },
    {
      id: "monthly-summary",
      title: "Resumo Mensal",
      description: "Relatório consolidado do mês atual",
      icon: Calendar,
      type: "summary",
      status: "available"
    }
  ];

  // Queries for reports history
  const { data: reportsHistory, refetch: refetchHistory } = useQuery<ReportHistory[]>({
    queryKey: ["/api/reports/history"],
    enabled: isAuthenticated,
  });

  // Mutation for generating reports
  const generateReportMutation = useMutation({
    mutationFn: async (data: { reportType: string; format: string }) => {
      if (data.format === 'excel') {
        // For Excel, we need to handle blob response
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to generate report');

        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `${data.reportType}-${new Date().toISOString().split('T')[0]}.xlsx`;

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true, filename };
      } else {
        // For JSON, also handle as blob for download
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to generate report');

        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `${data.reportType}-${new Date().toISOString().split('T')[0]}.json`;

        // Create blob and download for JSON
        const jsonData = await response.json();
        const jsonString = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true, filename, data: jsonData };
      }
    },
    onSuccess: (data) => {
      if (downloadFormat === 'excel') {
        toast({
          title: "Download concluído",
          description: `Arquivo ${data.filename} baixado com sucesso.`,
        });
      } else {
        toast({
          title: "Relatório gerado",
          description: "Relatório gerado com sucesso.",
        });
      }
      refetchHistory(); // Refresh reports history
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório. Tente novamente.",
        variant: "destructive",
      });
      console.error("Report generation error:", error);
    }
  });

  const generateReport = (reportId: string) => {
    toast({
      title: "Gerando relatório",
      description: "O relatório está sendo gerado...",
    });

    generateReportMutation.mutate({
      reportType: reportId,
      format: downloadFormat
    });
  };

  const downloadExistingReport = async (reportId: number, fileName: string) => {
    try {
      toast({
        title: "Fazendo download",
        description: "Preparando arquivo para download...",
      });

      const response = await fetch(`/api/reports/download/${reportId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Falha ao baixar relatório');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download concluído",
        description: `Arquivo ${fileName} baixado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Erro ao baixar o relatório. Tente novamente.",
        variant: "destructive",
      });
      console.error("Download error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Relatórios</h2>
              <div className="flex items-center space-x-3">
                <Select value={downloadFormat} onValueChange={(value: "json" | "excel") => setDownloadFormat(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => refetchHistory()}
                  className="border-gray-300 text-text-secondary hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-secondary text-sm mb-1">Total de Produtos</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {dashboardStats.totalProducts}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary-orange bg-opacity-10 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary-orange" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-secondary text-sm mb-1">Clientes Ativos</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {dashboardStats.activeClients}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-info bg-opacity-10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-info" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-secondary text-sm mb-1">Economia Média</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {dashboardStats.averageSavings}%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-success bg-opacity-10 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-secondary text-sm mb-1">Atualizações Hoje</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {dashboardStats.todayUpdates}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-warning bg-opacity-10 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportTypes.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-orange bg-opacity-10 rounded-full flex items-center justify-center">
                          <report.icon className="h-5 w-5 text-primary-orange" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{report.title}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            {report.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-text-secondary mb-4">{report.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={report.status === "available" ? "default" : "secondary"}
                        className={report.status === "available" ? "bg-success text-white" : ""}
                      >
                        {report.status === "available" ? "Disponível" : "Em breve"}
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => generateReport(report.id)}
                        disabled={report.status !== "available" || generateReportMutation.isPending}
                        className="bg-primary-orange hover:bg-primary-orange-dark text-white disabled:opacity-50"
                        data-testid={`button-generate-${report.id}`}
                      >
                        {generateReportMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        {generateReportMutation.isPending ? "Gerando..." : "Gerar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Reports */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Relatórios Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {reportsHistory && reportsHistory.length > 0 ? (
                  <div className="space-y-4">
                    {reportsHistory.map((report: any) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary-orange bg-opacity-10 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary-orange" />
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">
                              {report.reportTitle || reportTypes.find(r => r.id === report.reportType)?.title || report.reportType}
                            </p>
                            <p className="text-sm text-text-secondary">
                              Gerado por {report.generatedBy} em {new Date(report.generatedAt).toLocaleString('pt-BR')}
                            </p>
                            {report.recordCount && (
                              <p className="text-xs text-text-secondary">
                                {report.recordCount} registros • Formato: {report.fileFormat?.toUpperCase() || 'JSON'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {reportTypes.find(r => r.id === report.reportType)?.type || 'general'}
                          </Badge>
                          {report.filePath && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => downloadExistingReport(report.id, report.filePath)}
                              data-testid={`button-download-report-${report.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-text-secondary">Nenhum relatório gerado recentemente</p>
                    <p className="text-sm text-text-secondary mt-2">
                      Os relatórios gerados aparecerão aqui para download
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}