import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Users, Zap, Shield, 
  Clock, Target, ArrowRight, DollarSign, 
  CheckCircle2, Star, Monitor, Database,
  FileText, Settings, Layers, Activity
} from "lucide-react";

export default function Features() {
  const features = [
    {
      category: "Dashboard & Analytics",
      icon: <BarChart3 className="h-6 w-6" />,
      color: "from-blue-500 to-blue-600",
      items: [
        "Dashboard executivo com KPIs em tempo real",
        "Relatórios customizáveis e exportáveis",
        "Gráficos interativos de tendências de preços",
        "Alertas automáticos de variações de mercado"
      ]
    },
    {
      category: "Comparação Inteligente",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "from-green-500 to-green-600",
      items: [
        "Comparação automática entre fornecedores",
        "Identificação de melhores oportunidades",
        "Análise de margem e competitividade",
        "Histórico de variações de preços"
      ]
    },
    {
      category: "Gestão de Dados",
      icon: <Database className="h-6 w-6" />,
      color: "from-purple-500 to-purple-600",
      items: [
        "Upload em massa via Excel/CSV",
        "Validação automática de dados",
        "Limpeza e organização inteligente",
        "Sincronização com sistemas externos"
      ]
    },
    {
      category: "Controle de Acesso",
      icon: <Shield className="h-6 w-6" />,
      color: "from-orange-500 to-orange-600",
      items: [
        "Perfis de usuário granulares",
        "Autenticação segura multi-fator",
        "Auditoria completa de ações",
        "API keys individualizadas"
      ]
    }
  ];

  const benefits = [
    {
      title: "Redução de Custos",
      description: "Até 15% de economia através de decisões de compra otimizadas",
      icon: <DollarSign className="h-8 w-8 text-green-600" />
    },
    {
      title: "Velocidade de Decisão",
      description: "Análises que antes levavam horas, agora em segundos",
      icon: <Zap className="h-8 w-8 text-yellow-600" />
    },
    {
      title: "Visibilidade Total",
      description: "Controle completo sobre preços e competitividade",
      icon: <Monitor className="h-8 w-8 text-blue-600" />
    },
    {
      title: "Escalabilidade",
      description: "Cresce junto com seu negócio, sem limitações",
      icon: <Activity className="h-8 w-8 text-purple-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Grupo Vellore</h1>
                <p className="text-sm text-gray-600 font-medium">Funcionalidades Completas</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Voltar
              </Button>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
              >
                <Shield className="h-4 w-4 mr-2" />
                Acessar Sistema
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-orange-100 text-orange-700 border-orange-200 px-4 py-2">
            <Star className="h-4 w-4 mr-2" />
            Recursos Avançados
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Tudo que Você Precisa
            </span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              em Uma Plataforma
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto">
            Descubra todos os recursos que fazem do Grupo Vellore a solução mais completa 
            para inteligência em precificação do mercado.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {features.map((feature, idx) => (
            <Card key={idx} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">{feature.category}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feature.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Benefícios Comprovados
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Resultados reais que você pode esperar ao usar nossa plataforma
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, idx) => (
              <Card key={idx} className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      {benefit.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl shadow-2xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 opacity-90"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pronto para Começar?
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-3xl mx-auto">
              Transforme sua estratégia de precificação hoje mesmo. 
              Comece gratuitamente e veja os resultados em minutos.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/login'}
                className="bg-white text-orange-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 group"
              >
                <Shield className="h-5 w-5 mr-2" />
                Acessar Sistema
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 mt-8 text-orange-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Setup em 2 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Dados seguros</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="text-sm">Suporte 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}