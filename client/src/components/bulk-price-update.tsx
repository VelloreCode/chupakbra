import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Package } from "lucide-react";

interface BulkUpdateSettings {
  delayBetweenUpdates: number;
  maxConcurrentUpdates: number;
  filters: {
    categoryId?: number;
    clientId?: number;
    manufacturer?: string;
    search?: string;
  };
}

interface BulkUpdateStatus {
  queueStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  isProcessing: boolean;
  totalPending: number;
  totalCompleted: number;
  totalFailed: number;
  recentBulkJobs: Array<{
    id: string;
    url: string;
    productId: number;
    batchInfo?: {
      current: number;
      total: number;
      type: string;
    };
  }>;
}

export default function BulkPriceUpdate() {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [settings, setSettings] = useState<BulkUpdateSettings>({
    delayBetweenUpdates: 2000,
    maxConcurrentUpdates: 3,
    filters: {}
  });
  const [updateResult, setUpdateResult] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get categories and clients for filters
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Get update status
  const { data: status, refetch: refetchStatus } = useQuery<BulkUpdateStatus>({
    queryKey: ['/api/products/bulk-update-status'],
    refetchInterval: isUpdating ? 2000 : false, // Poll every 2 seconds during update
    enabled: isUpdating || open,
  });

  const handleStartUpdate = async () => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      
      const response = await fetch('/api/products/bulk-update-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Falha ao iniciar atualização em massa');
      }

      const result = await response.json();
      setUpdateResult(result);

      toast({
        title: "Atualização iniciada",
        description: `${result.queued} produtos adicionados à fila de atualização`,
      });

      // Start polling for status
      refetchStatus();

    } catch (error) {
      console.error('Error starting bulk update:', error);
      toast({
        title: "Erro",
        description: "Falha ao iniciar atualização em massa",
        variant: "destructive",
      });
      setIsUpdating(false);
    }
  };

  const handleStopUpdate = () => {
    setIsUpdating(false);
    setUpdateResult(null);
    toast({
      title: "Atualização interrompida",
      description: "O monitoramento da atualização foi interrompido",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const isCurrentlyProcessing = status?.isProcessing || false;
  const totalJobs = updateResult?.total || 0;
  const completedJobs = status?.totalCompleted || 0;
  const failedJobs = status?.totalFailed || 0;
  const progressPercentage = totalJobs > 0 ? ((completedJobs + failedJobs) / totalJobs) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar Preços em Massa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Atualização Geral de Preços por URL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Card */}
          {(isUpdating || status?.isProcessing) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status da Atualização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {updateResult && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Progresso:</span>
                    <span>{completedJobs + failedJobs} / {totalJobs} produtos</span>
                  </div>
                )}
                
                <Progress value={progressPercentage} className="w-full" />
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {status?.totalCompleted || 0} Sucesso
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      {status?.totalFailed || 0} Falhas
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <AlertCircle className="h-3 w-3 text-blue-500" />
                      {status?.totalPending || 0} Pendentes
                    </Badge>
                  </div>
                  
                  {isCurrentlyProcessing && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Processando...
                    </div>
                  )}
                </div>

                {updateResult && (
                  <div className="text-xs text-muted-foreground">
                    Duração estimada: ~{updateResult.estimatedDuration} minutos
                    <br />
                    Delay entre atualizações: {settings.delayBetweenUpdates}ms
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configurações de Rate Limiting</CardTitle>
              <CardDescription>
                Configure os parâmetros para evitar bloqueio de IP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delay">Delay entre atualizações (ms)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min="1000"
                    max="10000"
                    step="500"
                    value={settings.delayBetweenUpdates}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      delayBetweenUpdates: parseInt(e.target.value) || 2000
                    }))}
                    placeholder="2000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 2-5 segundos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concurrent">Máx. atualizações simultâneas</Label>
                  <Input
                    id="concurrent"
                    type="number"
                    min="1"
                    max="5"
                    value={settings.maxConcurrentUpdates}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxConcurrentUpdates: parseInt(e.target.value) || 3
                    }))}
                    placeholder="3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 1-3
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Filtros (Opcional)</CardTitle>
              <CardDescription>
                Deixe em branco para atualizar todos os produtos com URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={settings.filters.categoryId?.toString() || ""}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        categoryId: value && value !== "all" ? parseInt(value) : undefined
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente/Fornecedor</Label>
                  <Select
                    value={settings.filters.clientId?.toString() || ""}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        clientId: value && value !== "all" ? parseInt(value) : undefined
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Buscar por nome/SKU</Label>
                <Input
                  id="search"
                  type="text"
                  value={settings.filters.search || ""}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      search: e.target.value || undefined
                    }
                  }))}
                  placeholder="Digite parte do nome ou SKU"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Fabricante</Label>
                <Input
                  id="manufacturer"
                  type="text"
                  value={settings.filters.manufacturer || ""}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      manufacturer: e.target.value || undefined
                    }
                  }))}
                  placeholder="Nome do fabricante"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            
            <div className="flex gap-2">
              {isUpdating && (
                <Button variant="outline" onClick={handleStopUpdate}>
                  Parar Monitoramento
                </Button>
              )}
              
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/products/clear-queue', {
                      method: 'POST',
                      credentials: 'include'
                    });
                    if (response.ok) {
                      // Force refresh status
                      await queryClient.invalidateQueries({ queryKey: ['/api/products/bulk-update-status'] });
                    }
                  } catch (error) {
                    console.error('Failed to clear queue:', error);
                  }
                }}
                className="gap-1"
              >
                🛑 Limpar Fila
              </Button>
              
              <Button
                onClick={handleStartUpdate}
                disabled={isUpdating || isCurrentlyProcessing}
                className="gap-2"
              >
                {isUpdating || isCurrentlyProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Iniciar Atualização
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}