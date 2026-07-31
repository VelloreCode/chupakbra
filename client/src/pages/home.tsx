import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import Sidebar from "@/components/layout/sidebar";
import StatsCards from "@/components/dashboard/stats-cards";
import { PlatformWizard } from "@/components/wizard/platform-wizard";
import { InteractiveOnboarding } from "@/components/wizard/interactive-onboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Package, Clock, AlertTriangle, Zap, Activity, Target, BarChart3, ArrowRight, Sparkles, BookOpen, Play, HelpCircle, Rocket } from "lucide-react";

export default function Home() {
  const { permissions } = useUserRole();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);

  const { data: recentProducts, isLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-products"],
  });

  const { data: clients } = useQuery({ queryKey: ["/api/clients"] });
  const { data: categories } = useQuery({ queryKey: ["/api/categories"] });
  const { data: products } = useQuery({ queryKey: ["/api/products"] });

  // Check if user needs onboarding
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    const hasData = (clients && clients.length > 0) || 
                   (categories && categories.length > 0) || 
                   (products && products.products && products.products.length > 0);
    
    if (!hasCompletedOnboarding && !hasData) {
      setShowOnboardingPrompt(true);
    }
  }, [clients, categories, products]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding-completed', 'true');
    setIsOnboardingOpen(false);
    setShowOnboardingPrompt(false);
  };

  const dismissOnboardingPrompt = () => {
    setShowOnboardingPrompt(false);
    localStorage.setItem('onboarding-dismissed', 'true');
  };

  if (!permissions.canAccessDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <div className="ml-64">
          <main className="p-6">
            <Card className="shadow-lg border-0">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
                  <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
                </div>
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
          {/* Interactive Onboarding Prompt */}
          {showOnboardingPrompt && (
            <Card className="mb-8 border-0 shadow-xl bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                      <Rocket className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-1">
                        Configurar sua Plataforma
                      </h3>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Configure clientes, produtos e monitoramento com nosso assistente interativo passo a passo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-orange-500 text-white">
                      Recomendado
                    </Badge>
                    <Button
                      variant="outline"
                      onClick={dismissOnboardingPrompt}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      Mais tarde
                    </Button>
                    <Button
                      onClick={() => setIsOnboardingOpen(true)}
                      className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      Começar Configuração
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tutorial Access Banner */}
          <Card className="mb-8 border-0 shadow-xl bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
                      Como usar a Plataforma
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      Aprenda todas as funcionalidades em um tutorial detalhado ou use o assistente interativo
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsOnboardingOpen(true)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Assistente Interativo
                  </Button>
                  <Button
                    onClick={() => setIsWizardOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Tutorial Completo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <StatsCards />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Produtos Recentes - Redesigned */}
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-t-xl">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        Atualizações Recentes
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Produtos sincronizados
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-500 text-white">
                    Tempo Real
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentProducts && Array.isArray(recentProducts) && recentProducts.length > 0 ? (
                  <div className="space-y-4">
                    {recentProducts.slice(0, 5).map((product: any, index: number) => (
                      <div key={product.id} className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            {/* Product Thumbnail with Image */}
                            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="w-full h-full gradient-primary flex items-center justify-center">
                                          <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20 6h-2.18l-1.41-1.41c-.19-.19-.44-.29-.71-.29H8.31c-.27 0-.52.1-.71.29L6.18 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                          </svg>
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full gradient-primary flex items-center justify-center">
                                  <Package className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">{index + 1}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                              {product.name}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                SKU: {product.sku}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                R$ {parseFloat(product.basePrice || '0').toFixed(2)}
                              </Badge>
                              {product.matchGroup && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  Match: {product.matchGroup}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full pulse-monitoring"></div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {product.lastPriceUpdate 
                                  ? new Date(product.lastPriceUpdate).toLocaleDateString('pt-BR')
                                  : 'Hoje'
                                }
                              </p>
                            </div>
                          </div>
                          {/* Monitor Button */}
                          <button
                            onClick={() => window.location.href = `/comparison?product=${product.id}`}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex items-center space-x-1"
                          >
                            <TrendingUp className="h-3 w-3" />
                            <span>Monitor</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Nenhum produto encontrado
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Adicione produtos para ver atualizações recentes.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Oportunidades - Redesigned */}
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-t-xl">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                        Insights Estratégicos
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Oportunidades identificadas
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white">
                    <Zap className="h-3 w-3 mr-1" />
                    IA
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="relative p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900 dark:to-orange-900 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400 rounded-full -mr-10 -mt-10 opacity-20"></div>
                    <div className="relative">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-yellow-500 rounded-xl">
                          <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-yellow-800 dark:text-yellow-200 text-lg">
                            Análise de Cobertura
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 leading-relaxed">
                            Produtos detectados sem comparação de múltiplos fornecedores. 
                            Recomendamos expandir a rede de parceiros para otimização.
                          </p>
                          <div className="mt-3">
                            <Badge className="bg-yellow-600 text-white">
                              Prioridade Alta
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900 dark:to-cyan-900 border-2 border-blue-200 dark:border-blue-700 rounded-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400 rounded-full -mr-10 -mt-10 opacity-20"></div>
                    <div className="relative">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-blue-500 rounded-xl">
                          <Target className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-blue-800 dark:text-blue-200 text-lg">
                            Monitoramento Inteligente
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-2 leading-relaxed">
                            Configure alertas automáticos para variações de preço e 
                            mantenha vantagem competitiva no mercado.
                          </p>
                          <div className="mt-3">
                            <Badge className="bg-blue-600 text-white">
                              Automatização
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 border-2 border-purple-200 dark:border-purple-700 rounded-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400 rounded-full -mr-10 -mt-10 opacity-20"></div>
                    <div className="relative">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-purple-500 rounded-xl">
                          <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-purple-800 dark:text-purple-200 text-lg">
                            Análise Preditiva
                          </h4>
                          <p className="text-sm text-purple-700 dark:text-purple-300 mt-2 leading-relaxed">
                            Utilize machine learning para prever tendências de mercado 
                            e antecipar mudanças de preços.
                          </p>
                          <div className="mt-3">
                            <Badge className="bg-purple-600 text-white">
                              Em Breve
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Platform Wizard */}
      <PlatformWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
      
      {/* Interactive Onboarding */}
      <InteractiveOnboarding 
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
