import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Shield, Users, Award, 
  ArrowRight, Building2, Target, 
  Clock, CheckCircle2, Star, Lightbulb
} from "lucide-react";

export default function About() {
  const values = [
    {
      icon: <Target className="h-8 w-8 text-blue-600" />,
      title: "Precisão",
      description: "Dados exatos e análises confiáveis para decisões assertivas"
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-yellow-600" />,
      title: "Inovação",
      description: "Tecnologia de ponta aplicada à inteligência comercial"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-600" />,
      title: "Segurança",
      description: "Proteção total dos seus dados e informações estratégicas"
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Parceria",
      description: "Relacionamento próximo e suporte dedicado aos nossos clientes"
    }
  ];

  const stats = [
    { number: "10+", label: "Anos de Experiência" },
    { number: "500+", label: "Empresas Atendidas" },
    { number: "99.9%", label: "Disponibilidade" },
    { number: "24/7", label: "Suporte Técnico" }
  ];

  const timeline = [
    {
      year: "2015",
      title: "Fundação",
      description: "Início das operações focadas em soluções de precificação para o varejo"
    },
    {
      year: "2018",
      title: "Expansão Digital",
      description: "Lançamento da primeira plataforma online de comparação de preços"
    },
    {
      year: "2021",
      title: "Inteligência Artificial",
      description: "Implementação de IA para análises preditivas e recomendações automáticas"
    },
    {
      year: "2025",
      title: "Nova Geração",
      description: "Plataforma totalmente renovada com recursos avançados de analytics"
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
                <p className="text-sm text-gray-600 font-medium">Nossa História</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Início
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
            <Building2 className="h-4 w-4 mr-2" />
            Sobre o Grupo Vellore
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Liderança em
            </span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Inteligência Comercial
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto">
            Há mais de uma década transformando como as empresas entendem e precificam seus produtos. 
            Nossa missão é democratizar o acesso à inteligência de mercado através de tecnologia inovadora.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-orange-600 mb-2">{stat.number}</div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 mb-20 border-0 shadow-lg">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Nossa Missão</h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              Empoderar empresas de todos os tamanhos com ferramentas de inteligência comercial 
              que antes eram exclusivas de grandes corporações. Acreditamos que toda empresa 
              merece acesso a dados precisos e análises sofisticadas para tomar as melhores 
              decisões de precificação.
            </p>
            <div className="flex items-center justify-center">
              <Award className="h-16 w-16 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nossos Valores</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Os princípios que guiam cada decisão e inovação em nossa jornada
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, idx) => (
              <Card key={idx} className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      {value.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nossa Jornada</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Uma década de inovação e crescimento contínuo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {timeline.map((item, idx) => (
              <Card key={idx} className="relative group hover:shadow-xl transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-4">
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-lg font-bold px-3 py-1">
                      {item.year}
                    </Badge>
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{item.description}</p>
                </CardContent>
                {idx < timeline.length - 1 && (
                  <div className="hidden lg:block absolute top-8 -right-4 w-8 h-0.5 bg-orange-200"></div>
                )}
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
              Faça Parte da Nossa História
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-3xl mx-auto">
              Junte-se às centenas de empresas que já transformaram suas estratégias 
              de precificação com nossas soluções. Seu sucesso é nossa próxima conquista.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/login'}
                className="bg-white text-orange-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 group"
              >
                <Shield className="h-5 w-5 mr-2" />
                Começar Agora
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/features'}
                className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg backdrop-blur-sm"
              >
                <Star className="h-5 w-5 mr-2" />
                Conhecer Recursos
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 mt-8 text-orange-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Setup rápido</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Suporte completo</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span className="text-sm">Qualidade garantida</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}