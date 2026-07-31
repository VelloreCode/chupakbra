import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Globe, Upload, Zap, Shield, Star, Target, Database, Activity, Cpu, FileSpreadsheet, Code, Eye, LogIn, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformWizard } from "@/components/wizard/platform-wizard";
import { Link } from "wouter";

export default function LandingPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="flex justify-end gap-4">
          <Button 
            onClick={() => setIsWizardOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            size="lg"
          >
            <Play className="h-5 w-5 mr-2" />
            Veja como funciona
          </Button>
          <Link to="/login">
            <Button 
              className="bg-primary-orange hover:bg-primary-orange/90 text-white shadow-lg"
              size="lg"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Acessar Plataforma
            </Button>
          </Link>
        </div>
      </header>
      <div className="w-full">
        {/* Hero Section */}
        <section className="py-20 px-6 relative overflow-hidden pt-32">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-orange/10 to-transparent"></div>
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="mb-8">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-orange/20 rounded-full border border-primary-orange/30">
                  <Target className="h-5 w-5 text-primary-orange" />
                  <span className="text-primary-orange font-semibold">GRUPO VELLORE</span>
                </div>
              </div>
              
              <h1 className="text-6xl font-bold text-white mb-4 leading-tight">
                <span className="text-primary-orange">Chupa K Bra</span>
                <span className="block text-4xl mt-2 text-gray-300">
                  Monitoramento e Comparação de Preços
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
                Plataforma especializada para <strong className="text-primary-orange">indústrias e distribuidores</strong> que precisam 
                monitorar competitividade, analisar mercado e otimizar estratégias de precificação em tempo real.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
              <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
                <Activity className="h-8 w-8 text-primary-orange mx-auto mb-3" />
                <div className="text-2xl font-bold text-white mb-1">Tempo Real</div>
                <div className="text-gray-400">Monitoramento</div>
              </div>
              <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
                <Database className="h-8 w-8 text-primary-orange mx-auto mb-3" />
                <div className="text-2xl font-bold text-white mb-1">Ilimitados</div>
                <div className="text-gray-400">Produtos</div>
              </div>
              <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
                <Globe className="h-8 w-8 text-primary-orange mx-auto mb-3" />
                <div className="text-2xl font-bold text-white mb-1">Multi-Canais</div>
                <div className="text-gray-400">B2B e B2C</div>
              </div>
              <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
                <Shield className="h-8 w-8 text-primary-orange mx-auto mb-3" />
                <div className="text-2xl font-bold text-white mb-1">99%</div>
                <div className="text-gray-400">Inteligência Artificial
</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-slate-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Recursos Especializados para sua Operação
              </h2>
              <p className="text-xl text-gray-300 max-w-4xl mx-auto">
                Ferramentas desenvolvidas especificamente para <span className="text-primary-orange font-semibold">indústrias e distribuidores</span> 
                que precisam de inteligência competitiva
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Scraping Inteligente */}
              <Card className="bg-slate-700/50 border-slate-600 hover:border-primary-orange/50 transition-all duration-300 group">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary-orange to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Cpu className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    Scraping Inteligente
                    <Badge className="bg-green-500/20 text-green-400 text-xs border-green-500/30">IA</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 leading-relaxed">
                    Coleta automática de preços e dados de produtos usando inteligência artificial 
                    para máxima precisão e eficiência
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Upload via Planilha */}
              <Card className="bg-slate-700/50 border-slate-600 hover:border-primary-orange/50 transition-all duration-300 group">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    Upload Excel/CSV
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs border-blue-500/30">RÁPIDO</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 leading-relaxed">
                    Importe catálogos completos em segundos. Processamento em lote 
                    de milhares de produtos com validação automática
                  </CardDescription>
                </CardContent>
              </Card>

              {/* API REST */}
              <Card className="bg-slate-700/50 border-slate-600 hover:border-primary-orange/50 transition-all duration-300 group">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Code className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    API REST Completa
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs border-purple-500/30">DEV</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 leading-relaxed">
                    Integração total com ERP, CRM e sistemas internos. 
                    Documentação completa e endpoints especializados
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Dashboard Interativo */}
              <Card className="bg-slate-700/50 border-slate-600 hover:border-primary-orange/50 transition-all duration-300 group">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    Dashboard Executivo
                    <Badge className="bg-cyan-500/20 text-cyan-400 text-xs border-cyan-500/30">VISUAL</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 leading-relaxed">
                    Métricas em tempo real, gráficos interativos e relatórios 
                    executivos para tomada de decisão estratégica
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Diferenciais Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Diferenciais Competitivos
              </h2>
              <p className="text-xl text-gray-300 max-w-4xl mx-auto">
                Tecnologia de ponta desenvolvida pelo <span className="text-primary-orange font-semibold">Grupo Vellore</span> 
                para maximizar sua vantagem competitiva
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Monitoramento em Tempo Real */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600 hover:border-primary-orange/50 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-r from-primary-orange to-red-500 rounded-xl flex items-center justify-center mb-6">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  Tempo Real 24/7
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Monitoramento contínuo de preços e disponibilidade. 
                  Alertas instantâneos para mudanças críticas no mercado.
                </p>
                <div className="mt-4 text-primary-orange font-semibold">
                  → Atualizações a cada 15 minutos
                </div>
              </div>

              {/* Multi-Canal */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600 hover:border-primary-orange/50 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6">
                  <Globe className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  Multi-Canal Integrado
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Monitore e-commerce, B2B, distribuidores e mercados verticais 
                  em uma única plataforma centralizada.
                </p>
                <div className="mt-4 text-primary-orange font-semibold">
                  → +200 canais suportados
                </div>
              </div>

              {/* Inteligência Artificial */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600 hover:border-primary-orange/50 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
                  <Cpu className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  IA Especializada
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Algoritmos proprietários que identificam produtos equivalentes, 
                  detectam promoções e preveem tendências de mercado.
                </p>
                <div className="mt-4 text-primary-orange font-semibold">
                  → 99.8% de precisão
                </div>
              </div>

              {/* Escalabilidade Industrial */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600 hover:border-primary-orange/50 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6">
                  <Database className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  Escala Industrial
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Arquitetura cloud que suporta milhões de produtos, 
                  processamento paralelo e alta disponibilidade.
                </p>
                <div className="mt-4 text-primary-orange font-semibold">
                  → Infinitamente escalável
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="mt-16 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-8 text-center">
                Performance Comprovada
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-orange mb-2">85%</div>
                  <div className="text-gray-300">Redução de Tempo Operacional</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-orange mb-2">99.8%</div>
                  <div className="text-gray-300">Precisão dos Dados</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-orange mb-2">300%</div>
                  <div className="text-gray-300">ROI Médio</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-orange mb-2">24/7</div>
                  <div className="text-gray-300">Disponibilidade</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-primary-orange via-orange-600 to-red-600">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 rounded-full border border-white/30 mb-6">
                <Target className="h-5 w-5 text-white" />
                <span className="text-white font-semibold">GRUPO VELLORE • CHUPA K BRA</span>
              </div>
              
              <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                Maximize sua Competitividade
                <span className="block text-3xl mt-2 text-white/90">
                  com Inteligência de Mercado
                </span>
              </h2>
              
              <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
                Plataforma especializada para <strong>indústrias e distribuidores</strong> que precisam 
                de dados precisos, análises avançadas e monitoramento contínuo para 
                <strong> dominar seu mercado</strong>.
              </p>
            </div>

            {/* Key Value Props */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <Activity className="h-8 w-8 text-white mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Monitoramento Inteligente</h3>
                <p className="text-white/80 text-sm">Acompanhe preços e concorrentes 24/7</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <TrendingUp className="h-8 w-8 text-white mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Análise Competitiva</h3>
                <p className="text-white/80 text-sm">Identifique oportunidades de mercado</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <Shield className="h-8 w-8 text-white mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Dados Confiáveis</h3>
                <p className="text-white/80 text-sm">99.8% de precisão garantida</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">
                Entre em Contato para Conhecer a Plataforma
              </h3>
              <p className="text-white/90 mb-6">
                Solicite uma apresentação personalizada para sua operação
              </p>
              <div className="text-white/80">
                <p className="font-semibold">📧 contato@grupovellore.com.br</p>
                <p className="font-semibold mt-2">📞 (41) 98847-0604</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      {/* Platform Wizard */}
      <PlatformWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
}