import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertTriangle,
  Clock,
  Copy,
  Download,
  Play,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";

type SupplierKey = "tambasa" | "bartofil";

interface SyncRun {
  id: number;
  supplier: string;
  status: string;
  trigger: string;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string | null;
  categoriesProcessed: number | null;
  productsSeen: number | null;
  productsMatched: number | null;
  pricesUpdated: number | null;
  productsSkipped: number | null;
  unmatchedCodes: { total: number; sample: string[] } | null;
  errorDetails: Array<{ code: string; message: string; category?: string }> | null;
}

interface SupplierInfo {
  key: SupplierKey;
  displayName: string;
  website: string;
  credentialsConfigured: boolean;
  /** Qual variável está faltando/inválida. Nunca contém valor de segredo. */
  credentialsIssue: string | null;
  categoriesTotal: number;
  categoriesEnabled: number;
  lastRun: SyncRun | null;
  /** Última execução REAL (ignora simulações) — base do aviso de atraso. */
  lastRealRunAt: string | null;
  syncEnabled: boolean;
  hoursSinceLastRun: number | null;
  /** Calculado no servidor: a rotina deveria ter rodado e não rodou. */
  syncStale: boolean;
  staleAfterHours: number;
}

interface SupplierCategory {
  id: number;
  supplier: string;
  externalId: string;
  label: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastProductCount: number | null;
}

interface SyncState {
  running: boolean;
  supplier: SupplierKey | null;
  current: { supplier: string; category: string; page: number } | null;
  counters: {
    seen: number;
    matched: number;
    updated: number;
    unchanged: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{ code: string; message: string; category?: string }>;
}

function formatDateTime(value: string | null): string {
  if (!value) return "nunca";
  return new Date(value).toLocaleString("pt-BR");
}

/** "há 3 dias" comunica atraso melhor que uma data que o leitor tem que subtrair. */
function formatAge(hours: number | null): string {
  if (hours === null) return "nunca executou";
  if (hours < 1) return "há menos de 1 hora";
  if (hours < 24) return `há ${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    success: { label: "sucesso", className: "bg-green-100 text-green-800" },
    partial: { label: "parcial", className: "bg-yellow-100 text-yellow-800" },
    failed: { label: "falhou", className: "bg-red-100 text-red-800" },
    running: { label: "rodando", className: "bg-blue-100 text-blue-800" },
  };
  const entry = map[status] ?? { label: status, className: "bg-gray-100 text-gray-800" };
  return <Badge className={entry.className}>{entry.label}</Badge>;
}

export default function Suppliers() {
  const { isLoading } = useAuth();
  const { permissions } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dryRun, setDryRun] = useState(false);
  const [search, setSearch] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: suppliers = [] } = useQuery<SupplierInfo[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: syncState } = useQuery<SyncState>({
    queryKey: ["/api/suppliers/sync-status"],
    // Enquanto roda, acompanha de perto; parado, não fica batendo à toa.
    refetchInterval: (query) => (query.state.data?.running ? 3000 : false),
  });

  const running = syncState?.running ?? false;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/suppliers/sync-status"] });
  };

  const handleDiscover = async (key: SupplierKey) => {
    setBusy(`discover:${key}`);
    try {
      const response = await apiRequest("POST", `/api/suppliers/${key}/categories/discover`);
      const result = await response.json();
      toast({
        title: "Categorias atualizadas",
        description: `${result.discovered} encontradas, ${result.created} novas.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${key}/categories`] });
      invalidateAll();
    } catch (error) {
      toast({
        title: "Falha ao descobrir categorias",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async (key: SupplierKey) => {
    setBusy(`sync:${key}`);
    try {
      await apiRequest("POST", "/api/suppliers/sync", { suppliers: [key], dryRun });
      toast({
        title: dryRun ? "Simulação iniciada" : "Sincronização iniciada",
        description: dryRun
          ? "Nenhum preço será gravado — é só para conferir o casamento de SKU."
          : "Acompanhe o progresso abaixo.",
      });
      invalidateAll();
    } catch (error) {
      toast({
        title: "Não foi possível iniciar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleToggleCategory = async (key: SupplierKey, id: number, enabled: boolean) => {
    try {
      await apiRequest("PATCH", `/api/suppliers/categories/${id}`, { enabled });
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${key}/categories`] });
      invalidateAll();
    } catch (error) {
      toast({
        title: "Falha ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  if (!permissions?.canAccessProductsUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <div className="ml-64">
          <main className="p-6">
            <Card className="border-red-200 bg-red-50 dark:bg-red-900">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">
                  Acesso Negado
                </h2>
                <p className="text-red-700 dark:text-red-300">
                  Você não tem permissão para acessar a área de fornecedores.
                </p>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Fornecedores
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Extração automática de preços dos portais Tambasa e Bartofil. Marque as
              categorias que devem ser monitoradas — a sincronização atualiza apenas
              produtos já cadastrados.
            </p>
          </div>

          {running && syncState && (
            <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Sincronização em andamento
                </CardTitle>
                <CardDescription>
                  {syncState.current
                    ? `${syncState.current.supplier} — ${syncState.current.category} (página ${syncState.current.page})`
                    : "iniciando..."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={undefined} className="mb-4" />
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                  <Counter label="Vistos" value={syncState.counters.seen} />
                  <Counter label="Casados" value={syncState.counters.matched} />
                  <Counter label="Atualizados" value={syncState.counters.updated} />
                  <Counter label="Sem mudança" value={syncState.counters.unchanged} />
                  <Counter label="Pulados" value={syncState.counters.skipped} />
                  <Counter label="Erros" value={syncState.counters.errors} />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3 mb-6">
            <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
            <Label htmlFor="dry-run" className="cursor-pointer">
              Modo simulação — percorre os portais e mostra o resultado sem gravar preço
            </Label>
          </div>

          <div className="space-y-6">
            {suppliers.map((supplier) => (
              <SupplierCard
                key={supplier.key}
                supplier={supplier}
                dryRun={dryRun}
                running={running}
                busy={busy}
                search={search[supplier.key] ?? ""}
                onSearch={(value) =>
                  setSearch((prev) => ({ ...prev, [supplier.key]: value }))
                }
                onDiscover={() => handleDiscover(supplier.key)}
                onSync={() => handleSync(supplier.key)}
                onToggleCategory={(id, enabled) =>
                  handleToggleCategory(supplier.key, id, enabled)
                }
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

interface SupplierCardProps {
  supplier: SupplierInfo;
  dryRun: boolean;
  running: boolean;
  busy: string | null;
  search: string;
  onSearch: (value: string) => void;
  onDiscover: () => void;
  onSync: () => void;
  onToggleCategory: (id: number, enabled: boolean) => void;
}

function SupplierCard({
  supplier,
  dryRun,
  running,
  busy,
  search,
  onSearch,
  onDiscover,
  onSync,
  onToggleCategory,
}: SupplierCardProps) {
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<SupplierCategory[]>({
    queryKey: [`/api/suppliers/${supplier.key}/categories`],
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter(
      (cat) =>
        cat.label.toLowerCase().includes(term) ||
        cat.externalId.toLowerCase().includes(term),
    );
  }, [categories, search]);

  const lastRun = supplier.lastRun;
  const unmatched = lastRun?.unmatchedCodes;

  const copyUnmatched = async () => {
    if (!unmatched?.sample?.length) return;
    await navigator.clipboard.writeText(unmatched.sample.join("\n"));
    toast({ title: "Códigos copiados", description: `${unmatched.sample.length} código(s).` });
  };

  return (
    <Card className={supplier.syncStale ? "border-red-400 dark:border-red-700" : undefined}>
      {supplier.syncStale && (
        <div
          className="flex items-start gap-3 rounded-t-lg border-b border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
          role="alert"
        >
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <strong className="block">Sincronização atrasada</strong>
            {supplier.lastRealRunAt
              ? `A última execução foi ${formatAge(supplier.hoursSinceLastRun)} — o esperado é uma por dia. A rotina automática pode não estar rodando.`
              : "Esta rotina nunca foi executada de verdade, embora existam categorias marcadas para monitorar. Simulações não contam."}
            <span className="mt-1 block text-xs opacity-80">
              Verifique os logs do servidor e se o container ficou de pé no horário agendado.
              Enquanto isso, o botão abaixo dispara a sincronização manualmente.
            </span>
          </div>
        </div>
      )}
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              {supplier.displayName}
              {supplier.credentialsConfigured ? (
                <Badge className="bg-green-100 text-green-800">credenciais OK</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">credenciais ausentes</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {supplier.categoriesEnabled} de {supplier.categoriesTotal} categorias
              monitoradas · última sincronização:{" "}
              {formatDateTime(supplier.lastRealRunAt)}
              {supplier.lastRealRunAt && ` (${formatAge(supplier.hoursSinceLastRun)})`}
              {!supplier.syncEnabled && (
                <span className="mt-1 block text-amber-700 dark:text-amber-400">
                  Rotina automática desligada neste ambiente (SUPPLIER_SYNC_ENABLED=false) —
                  só roda pelo botão.
                </span>
              )}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={onDiscover}
              disabled={!supplier.credentialsConfigured || busy !== null || running}
            >
              <Download className="w-4 h-4 mr-2" />
              {busy === `discover:${supplier.key}` ? "Buscando..." : "Descobrir categorias"}
            </Button>
            <Button
              onClick={onSync}
              disabled={
                !supplier.credentialsConfigured ||
                busy !== null ||
                running ||
                supplier.categoriesEnabled === 0
              }
            >
              <Play className="w-4 h-4 mr-2" />
              {dryRun ? "Simular" : "Sincronizar agora"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!supplier.credentialsConfigured && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100">
            <strong className="block">Credenciais não configuradas</strong>
            {supplier.credentialsIssue && (
              <code className="mt-1 block break-words text-xs">{supplier.credentialsIssue}</code>
            )}
            <span className="mt-1 block">
              Cadastre nas variáveis de ambiente (<code>.env</code> local ou painel do Dokploy)
              e reinicie o servidor — alterar variável não tem efeito sem novo deploy.
            </span>
          </div>
        )}

        {categories.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Nenhuma categoria cadastrada ainda. Clique em "Descobrir categorias" para
            buscar a árvore no portal.
          </p>
        ) : (
          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Filtrar categorias..."
                value={search}
                onChange={(event) => onSearch(event.target.value)}
              />
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
              {filtered.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Checkbox
                    checked={cat.enabled}
                    onCheckedChange={(checked) => onToggleCategory(cat.id, checked === true)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{cat.label}</span>
                    <span className="block text-xs text-gray-500 truncate">
                      {cat.externalId}
                    </span>
                  </span>
                  {(cat.lastProductCount ?? 0) > 0 && (
                    <Badge variant="secondary">{cat.lastProductCount} prod.</Badge>
                  )}
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="p-3 text-sm text-gray-500">Nenhuma categoria encontrada.</p>
              )}
            </div>
          </div>
        )}

        {lastRun && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">Última execução</h3>
              {statusBadge(lastRun.status)}
              {lastRun.dryRun && <Badge variant="outline">simulação</Badge>}
              <span className="text-xs text-gray-500">
                {formatDateTime(lastRun.startedAt)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <Counter label="Categorias" value={lastRun.categoriesProcessed ?? 0} />
              <Counter label="Vistos" value={lastRun.productsSeen ?? 0} />
              <Counter label="Casados" value={lastRun.productsMatched ?? 0} />
              <Counter label="Atualizados" value={lastRun.pricesUpdated ?? 0} />
              <Counter label="Pulados" value={lastRun.productsSkipped ?? 0} />
            </div>

            {unmatched && unmatched.total > 0 && (
              <div className="rounded-md border p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {unmatched.total} código(s) sem produto cadastrado
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyUnmatched}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar amostra
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  A sincronização não cria produtos. Para incluí-los, use o upload de
                  planilha.
                </p>
                <code className="block text-xs text-gray-600 dark:text-gray-400 break-all">
                  {unmatched.sample.slice(0, 20).join(", ")}
                  {unmatched.sample.length > 20 ? "..." : ""}
                </code>
              </div>
            )}

            {lastRun.errorDetails && lastRun.errorDetails.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950 p-3">
                <span className="text-sm font-medium text-red-900 dark:text-red-100">
                  {lastRun.errorDetails.length} erro(s)
                </span>
                <ul className="mt-2 space-y-1">
                  {lastRun.errorDetails.slice(0, 10).map((error, index) => (
                    <li key={index} className="text-xs text-red-800 dark:text-red-200">
                      <span className="font-mono">{error.code}</span>
                      {error.category ? ` [${error.category}]` : ""} — {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
