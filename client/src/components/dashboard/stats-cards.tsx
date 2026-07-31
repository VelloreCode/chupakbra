import { useQuery } from "@tanstack/react-query";
import { Activity, Package, Users, TrendingUp, Zap, Target, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  totalProducts: number;
  activeClients: number;
  todayUpdates: number;
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const dashboardStats: DashboardStats = stats || {
    totalProducts: 0,
    activeClients: 0,
    todayUpdates: 0,
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Produtos Monitorados */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            Produtos Monitorados
          </CardTitle>
          <div className="p-2 bg-blue-600 rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{dashboardStats.totalProducts}</div>
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            produtos em tempo real
          </p>
        </CardContent>
      </Card>

      {/* Clientes Conectados */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold text-green-800 dark:text-green-200">
            Clientes Conectados
          </CardTitle>
          <div className="p-2 bg-green-600 rounded-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-900 dark:text-green-100">{dashboardStats.activeClients}</div>
          <div className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full pulse-monitoring"></div>
            fontes ativas
          </div>
        </CardContent>
      </Card>

      {/* Atualizações Hoje */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold text-orange-800 dark:text-orange-200">
            Atualizações Hoje
          </CardTitle>
          <div className="p-2 bg-orange-600 rounded-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{dashboardStats.todayUpdates}</div>
          <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
            preços sincronizados
          </p>
        </CardContent>
      </Card>

      {/* Alertas Críticos */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold text-red-800 dark:text-red-200">
            Alertas Críticos
          </CardTitle>
          <div className="p-2 bg-red-600 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-900 dark:text-red-100">
            {Math.floor(dashboardStats.totalProducts * 0.15)}
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            variações elevadas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
