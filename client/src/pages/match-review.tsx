import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Check, Link2, RefreshCw, X } from "lucide-react";

interface Produto {
  id: number;
  sku: string;
  name: string;
  manufacturer: string | null;
  basePrice: string;
  ean: string | null;
}

interface Candidato {
  id: number;
  score: number;
  status: string;
  master: Produto;
  candidate: Produto;
  evidence: {
    motivo?: string;
    similaridadeNome?: number;
    eanIgual?: boolean;
    marcaIgual?: boolean | null;
    dimensoes?: boolean | null;
    potencia?: boolean | null;
    voltagem?: boolean | null;
    kelvin?: boolean | null;
    quantidade?: boolean | null;
    bloqueios?: string[];
  } | null;
}

function corDoScore(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 65) return "bg-yellow-100 text-yellow-800";
  return "bg-orange-100 text-orange-800";
}

/** Só mostra atributo que o motor conseguiu comparar; null = sem dado. */
function Atributos({ e }: { e: Candidato["evidence"] }) {
  if (!e) return null;
  const itens: Array<[string, boolean | null | undefined]> = [
    ["dimensão", e.dimensoes],
    ["potência", e.potencia],
    ["voltagem", e.voltagem],
    ["temp. cor", e.kelvin],
    ["quantidade", e.quantidade],
    ["marca", e.marcaIgual],
  ];
  const comDado = itens.filter(([, v]) => v !== null && v !== undefined);
  if (comDado.length === 0) return <span className="text-xs text-gray-500">sem atributo comparável</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {comDado.map(([nome, ok]) => (
        <span
          key={nome}
          className={`rounded px-1.5 py-0.5 text-xs ${
            ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {ok ? "✓" : "✗"} {nome}
        </span>
      ))}
    </div>
  );
}

export default function MatchReview() {
  const { isLoading } = useAuth();
  const { permissions } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gerando, setGerando] = useState(false);

  const { data: candidatos = [], isLoading: carregando } = useQuery<Candidato[]>({
    queryKey: ["/api/matching/candidates"],
  });

  const decidir = async (id: number, status: "approved" | "rejected") => {
    try {
      await apiRequest("PATCH", `/api/matching/candidates/${id}`, { status });
      toast({
        title: status === "approved" ? "Correspondência aprovada" : "Correspondência rejeitada",
        description:
          status === "approved"
            ? "Os produtos foram vinculados."
            : "O par não voltará a aparecer nas próximas gerações.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/candidates"] });
    } catch (error) {
      toast({
        title: "Falha ao registrar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const gerar = async () => {
    setGerando(true);
    try {
      await apiRequest("POST", "/api/matching/generate", {});
      toast({
        title: "Geração iniciada",
        description: "A varredura leva alguns minutos. Atualize a página para ver os novos candidatos.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível iniciar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  if (!permissions?.canAccessProductsUrl) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <main className="p-6">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-900">Acesso Negado</h2>
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
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Revisão de Correspondências
              </h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
                Pares sugeridos pelo motor de match. Nada é vinculado automaticamente — aprovar
                liga os produtos; rejeitar tira o par da fila para sempre. Atributo técnico
                divergente (dimensão, potência, voltagem) já foi descartado antes de chegar aqui.
              </p>
            </div>
            <Button onClick={gerar} disabled={gerando} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${gerando ? "animate-spin" : ""}`} />
              {gerando ? "Iniciando..." : "Gerar candidatos"}
            </Button>
          </div>

          {carregando ? (
            <p className="text-gray-600">Carregando...</p>
          ) : candidatos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-600 dark:text-gray-400">
                Nenhum candidato pendente. Use "Gerar candidatos" para o motor varrer a base.
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {candidatos.length} par(es) aguardando decisão, ordenados por confiança.
              </p>
              <div className="space-y-3">
                {candidatos.map((c) => (
                  <Card key={c.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className={corDoScore(c.score)}>confiança {c.score}</Badge>
                        {c.evidence?.eanIgual && <Badge className="bg-blue-100 text-blue-800">EAN idêntico</Badge>}
                        <CardDescription className="m-0">{c.evidence?.motivo}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded border p-3">
                          <div className="text-xs font-semibold text-gray-500 mb-1">MASTER (Vellore)</div>
                          <div className="font-medium">{c.master.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {c.master.sku} · {c.master.manufacturer ?? "sem marca"} · R$ {c.master.basePrice}
                            {c.master.ean && ` · EAN ${c.master.ean}`}
                          </div>
                        </div>
                        <div className="rounded border p-3">
                          <div className="text-xs font-semibold text-gray-500 mb-1">CANDIDATO</div>
                          <div className="font-medium">{c.candidate.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {c.candidate.sku} · {c.candidate.manufacturer ?? "sem marca"} · R${" "}
                            {c.candidate.basePrice}
                            {c.candidate.ean && ` · EAN ${c.candidate.ean}`}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <Atributos e={c.evidence} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => decidir(c.id, "rejected")}>
                            <X className="w-4 h-4 mr-1" />
                            Não é o mesmo
                          </Button>
                          <Button size="sm" onClick={() => decidir(c.id, "approved")}>
                            <Check className="w-4 h-4 mr-1" />
                            Vincular
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
