import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronLeft, 
  X,
  Play,
  Pause,
  RotateCcw,
  Target,
  Users,
  FolderOpen,
  Package,
  Eye,
  Upload,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Clock,
  Star
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'setup' | 'data' | 'monitoring' | 'analysis';
  estimatedTime: number;
  isCompleted: boolean;
  isOptional: boolean;
  actionUrl?: string;
  checkCompletion?: () => Promise<boolean>;
  tips: string[];
  requirements?: string[];
}

interface InteractiveOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function InteractiveOnboarding({ isOpen, onClose, onComplete }: InteractiveOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isGuideMode, setIsGuideMode] = useState(true);
  const queryClient = useQueryClient();

  // Fetch system data to check completion status
  const { data: clients } = useQuery({ queryKey: ["/api/clients"] });
  const { data: categories } = useQuery({ queryKey: ["/api/categories"] });
  const { data: products } = useQuery({ queryKey: ["/api/products"] });
  const { data: dashboardStats } = useQuery({ queryKey: ["/api/dashboard/stats"] });

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Bem-vindo à Plataforma',
      description: 'Conheça o sistema de inteligência de preços e suas principais funcionalidades',
      icon: <Target className="h-5 w-5" />,
      category: 'setup',
      estimatedTime: 2,
      isCompleted: false,
      isOptional: false,
      tips: [
        'Esta plataforma oferece comparação de preços e monitoramento em tempo real',
        'Você pode pular etapas opcionais, mas recomendamos completar todas',
        'Use o modo guiado para ter dicas contextuais durante a configuração'
      ],
      requirements: []
    },
    {
      id: 'clients-setup',
      title: 'Configurar Clientes',
      description: 'Configure sua empresa como cliente master e adicione outros clientes para comparação',
      icon: <Users className="h-5 w-5" />,
      category: 'setup',
      estimatedTime: 5,
      isCompleted: false,
      isOptional: false,
      actionUrl: '/clients',
      checkCompletion: async () => {
        return clients && Array.isArray(clients) && clients.length >= 2;
      },
      tips: [
        'Comece criando sua empresa como cliente master',
        'Adicione pelo menos um cliente adicional para comparações',
        'Marque concorrentes apropriadamente para monitoramento automático'
      ],
      requirements: ['Ter pelo menos 2 clientes cadastrados', 'Um cliente deve ser marcado como master']
    },
    {
      id: 'categories-setup',
      title: 'Criar Categorias',
      description: 'Organize produtos em categorias para melhor gestão e relatórios',
      icon: <FolderOpen className="h-5 w-5" />,
      category: 'setup',
      estimatedTime: 3,
      isCompleted: false,
      isOptional: false,
      actionUrl: '/categories',
      checkCompletion: async () => {
        return categories && Array.isArray(categories) && categories.length >= 1;
      },
      tips: [
        'Crie categorias amplas primeiro (ex: Eletrônicos, Iluminação)',
        'Use nomes descritivos e claros',
        'Categorias ajudam na organização e filtragem de produtos'
      ],
      requirements: ['Ter pelo menos 1 categoria criada']
    },
    {
      id: 'products-master',
      title: 'Cadastrar Produtos Master',
      description: 'Adicione seus produtos principais que servirão como base para comparações',
      icon: <Package className="h-5 w-5" />,
      category: 'data',
      estimatedTime: 10,
      isCompleted: false,
      isOptional: false,
      actionUrl: '/products',
      checkCompletion: async () => {
        const result = products as any;
        if (!result?.products) return false;
        return result.products.some((p: any) => p.isMaster);
      },
      tips: [
        'Marque produtos como "Master" para sua empresa',
        'Use nomes descritivos com especificações técnicas',
        'Adicione URLs de origem para referência'
      ],
      requirements: ['Ter pelo menos 1 produto master cadastrado']
    },
    {
      id: 'import-data',
      title: 'Importar Dados em Lote',
      description: 'Use planilhas Excel para importar múltiplos produtos rapidamente',
      icon: <Upload className="h-5 w-5" />,
      category: 'data',
      estimatedTime: 15,
      isCompleted: false,
      isOptional: true,
      actionUrl: '/upload',
      tips: [
        'Baixe o template com instruções detalhadas',
        'Preencha dados seguindo os exemplos fornecidos',
        'Teste com poucos produtos antes de importar em massa'
      ],
      requirements: ['Template baixado e dados preparados']
    },
    {
      id: 'monitoring-setup',
      title: 'Configurar Monitoramento',
      description: 'Configure monitoramento automático de preços de concorrentes via URL',
      icon: <Eye className="h-5 w-5" />,
      category: 'monitoring',
      estimatedTime: 8,
      isCompleted: false,
      isOptional: false,
      actionUrl: '/products-url',
      checkCompletion: async () => {
        const result = products as any;
        if (!result?.products) return false;
        return result.products.some((p: any) => p.isCompetitor && p.sourceUrl);
      },
      tips: [
        'Vincule produtos de concorrentes aos seus produtos master',
        'URLs devem ser páginas diretas dos produtos',
        'Sistema atualiza preços automaticamente às 7h da manhã'
      ],
      requirements: ['Pelo menos 1 produto concorrente com URL configurado']
    },
    {
      id: 'first-analysis',
      title: 'Primeira Análise',
      description: 'Explore comparações de preços e relatórios disponíveis',
      icon: <BarChart3 className="h-5 w-5" />,
      category: 'analysis',
      estimatedTime: 5,
      isCompleted: false,
      isOptional: false,
      actionUrl: '/comparison',
      tips: [
        'Acesse a página de comparação para ver análises',
        'Use filtros para focar em categorias específicas',
        'Identifique oportunidades de ajuste de preços'
      ],
      requirements: ['Acessar página de comparação de preços']
    },
    {
      id: 'completion',
      title: 'Configuração Completa',
      description: 'Parabéns! Sua plataforma está configurada e pronta para uso',
      icon: <CheckCircle2 className="h-5 w-5" />,
      category: 'analysis',
      estimatedTime: 1,
      isCompleted: false,
      isOptional: false,
      tips: [
        'Sua plataforma está totalmente configurada',
        'Continue adicionando produtos e monitorando preços',
        'Acesse relatórios regulares para insights estratégicos'
      ],
      requirements: []
    }
  ];

  // Check completion status for each step
  useEffect(() => {
    const checkStepsCompletion = async () => {
      const newCompletedSteps = new Set(completedSteps);
      
      for (const step of onboardingSteps) {
        if (step.checkCompletion) {
          try {
            const isCompleted = await step.checkCompletion();
            if (isCompleted) {
              newCompletedSteps.add(step.id);
            }
          } catch (error) {
            console.error(`Error checking completion for step ${step.id}:`, error);
          }
        }
      }
      
      setCompletedSteps(newCompletedSteps);
    };

    if (isOpen) {
      checkStepsCompletion();
    }
  }, [isOpen, clients, categories, products, dashboardStats]);

  const currentStepData = onboardingSteps[currentStep];
  const totalSteps = onboardingSteps.length;
  const completedCount = completedSteps.size;
  const progressPercentage = (completedCount / totalSteps) * 100;

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleActionClick = () => {
    if (currentStepData.actionUrl) {
      // Store current onboarding state
      localStorage.setItem('onboarding-current-step', currentStep.toString());
      localStorage.setItem('onboarding-guide-mode', isGuideMode.toString());
      
      // Navigate to action URL
      window.location.href = currentStepData.actionUrl;
    }
  };

  const markStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const resetOnboarding = () => {
    setCompletedSteps(new Set());
    setCurrentStep(0);
    localStorage.removeItem('onboarding-current-step');
    localStorage.removeItem('onboarding-guide-mode');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                {currentStepData.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentStepData.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Passo {currentStep + 1} de {totalSteps} • {currentStepData.estimatedTime} min
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGuideMode(!isGuideMode)}
              >
                {isGuideMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isGuideMode ? 'Modo Livre' : 'Modo Guiado'}
              </Button>
              <Button variant="outline" size="sm" onClick={resetOnboarding}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progresso Geral
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {completedCount}/{totalSteps} concluídos
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Step Navigation */}
          <div className="mt-6 px-2">
            <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              {/* Progress Line */}
              <div className="absolute top-10 left-10 right-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div 
                className="absolute top-10 left-10 h-1 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${Math.max(8, (completedCount / (totalSteps - 1)) * 84)}%` }}
              ></div>
              
              {/* Steps Container */}
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 relative">
                {onboardingSteps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center">
                    <button
                      onClick={() => goToStep(index)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 relative z-10 mb-2 ${
                        index === currentStep
                          ? 'bg-blue-600 text-white shadow-xl ring-4 ring-blue-200 dark:ring-blue-800 ring-opacity-50'
                          : completedSteps.has(step.id)
                          ? 'bg-green-600 text-white shadow-lg hover:shadow-xl'
                          : 'bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      {completedSteps.has(step.id) ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </button>
                    
                    <div className="text-center w-full">
                      <span className={`text-xs font-medium leading-tight block transition-colors duration-200 ${
                        index === currentStep
                          ? 'text-blue-700 dark:text-blue-300 font-semibold'
                          : completedSteps.has(step.id)
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {index === 0 ? 'Bem-vindo' :
                         index === 1 ? 'Configurar' :
                         index === 2 ? 'Criar' :
                         index === 3 ? 'Cadastrar' :
                         index === 4 ? 'Importar' :
                         index === 5 ? 'Configurar' :
                         index === 6 ? 'Primeira' :
                         'Configuração'}
                      </span>
                      <span className={`text-xs leading-tight block mt-0.5 ${
                        index === currentStep
                          ? 'text-blue-600 dark:text-blue-400'
                          : completedSteps.has(step.id)
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-500'
                      }`}>
                        {index === 0 ? '' :
                         index === 1 ? 'Clientes' :
                         index === 2 ? 'Categorias' :
                         index === 3 ? 'Produtos' :
                         index === 4 ? 'Dados' :
                         index === 5 ? 'Monitoramento' :
                         index === 6 ? 'Análise' :
                         'Completa'}
                      </span>
                      {step.isOptional && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-xs px-1 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                            Opcional
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {currentStepData.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {currentStepData.description}
                </p>

                {/* Requirements */}
                {currentStepData.requirements && currentStepData.requirements.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Requisitos para completar:
                    </h4>
                    <ul className="space-y-1">
                      {currentStepData.requirements.map((req, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <Circle className="h-4 w-4 text-gray-400" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                {currentStepData.actionUrl && (
                  <div className="mb-6">
                    <Button
                      onClick={handleActionClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {currentStepData.id === 'welcome' ? 'Começar Configuração' : 
                       currentStepData.id === 'completion' ? 'Finalizar Onboarding' : 
                       'Ir para Configuração'}
                    </Button>
                  </div>
                )}

                {/* Completion Status */}
                {completedSteps.has(currentStepData.id) && (
                  <div className="flex items-center space-x-2 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-800 dark:text-green-200 font-medium">
                      Etapa concluída!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Tips */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    <span>Dicas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {currentStepData.tips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{tip}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Time Estimate */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Tempo Estimado
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentStepData.estimatedTime} minutos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Badge */}
              <div className="flex justify-center">
                <Badge 
                  variant="outline" 
                  className={`${
                    currentStepData.category === 'setup' ? 'border-blue-300 text-blue-700' :
                    currentStepData.category === 'data' ? 'border-green-300 text-green-700' :
                    currentStepData.category === 'monitoring' ? 'border-orange-300 text-orange-700' :
                    'border-purple-300 text-purple-700'
                  }`}
                >
                  {currentStepData.category === 'setup' ? 'Configuração' :
                   currentStepData.category === 'data' ? 'Dados' :
                   currentStepData.category === 'monitoring' ? 'Monitoramento' :
                   'Análise'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <div className="flex items-center space-x-4">
              {!completedSteps.has(currentStepData.id) && (
                <Button
                  variant="outline"
                  onClick={() => markStepComplete(currentStepData.id)}
                >
                  Marcar como Concluído
                </Button>
              )}
              
              {currentStep === totalSteps - 1 ? (
                <Button
                  onClick={onComplete}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finalizar Onboarding
                </Button>
              ) : (
                <Button onClick={nextStep}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}