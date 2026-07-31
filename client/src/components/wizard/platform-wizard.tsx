import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  FolderOpen, 
  Package, 
  TrendingUp, 
  Eye, 
  CheckCircle, 
  ArrowRight,
  Target,
  BarChart3,
  Clock,
  Globe,
  Database,
  Upload,
  Settings
} from 'lucide-react';

interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  category: 'setup' | 'products' | 'monitoring' | 'analysis';
}

interface PlatformWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformWizard({ isOpen, onClose }: PlatformWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const wizardSteps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Sistema de Inteligência de Preços',
      subtitle: 'Conheça as principais funcionalidades da plataforma',
      icon: <Target className="h-6 w-6" />,
      category: 'setup',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Sistema de Inteligência de Preços
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Uma plataforma completa para monitoramento e comparação de preços
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Comparação de Preços</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Compare preços entre produtos cadastrados de diferentes clientes e lojas
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <Clock className="h-5 w-5 text-green-500" />
                <span className="font-medium">Monitoramento em Tempo Real</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitore preços de concorrentes automaticamente através de URLs
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              O que você aprenderá neste tutorial:
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>• Como configurar clientes e categorias</li>
              <li>• Como cadastrar produtos para comparação</li>
              <li>• Como configurar monitoramento de concorrentes</li>
              <li>• Como analisar dados e gerar relatórios</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'clients',
      title: 'Cadastro de Clientes',
      subtitle: 'Configure os clientes para organizar e comparar preços',
      icon: <Users className="h-6 w-6" />,
      category: 'setup',
      content: (
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Para que servem os Clientes?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Os clientes representam diferentes lojas, fornecedores ou concorrentes no sistema. 
                Eles são essenciais para organizar e comparar preços entre diferentes fontes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Badge className="bg-green-500 text-white">Master</Badge>
                <span className="font-medium text-green-800 dark:text-green-200">Sua Empresa</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Cliente principal (conta master) que representa sua empresa e produtos
              </p>
            </div>

            <div className="p-4 border border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="outline">Cliente</Badge>
                <span className="font-medium text-blue-800 dark:text-blue-200">Parceiros</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Outros clientes para comparação de preços e análise de mercado
              </p>
            </div>

            <div className="p-4 border border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Badge className="bg-orange-500 text-white">Concorrente</Badge>
                <span className="font-medium text-orange-800 dark:text-orange-200">Competidores</span>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Concorrentes para monitoramento automático de preços via URL
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Como cadastrar um cliente:</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Acesse a página de Clientes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">No menu lateral, clique em "Clientes"</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Clique em "Novo Cliente"</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Preencha nome, email e informações de contato</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Configure o tipo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Defina se é cliente normal ou concorrente para monitoramento</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              💡 Dica importante:
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Configure primeiro seu cliente master (sua empresa) antes de adicionar outros clientes. 
              Isso será essencial para comparações de preços.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'categories',
      title: 'Cadastro de Categorias',
      subtitle: 'Organize produtos em categorias para melhor gestão',
      icon: <FolderOpen className="h-6 w-6" />,
      category: 'setup',
      content: (
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Para que servem as Categorias?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                As categorias ajudam a organizar produtos similares, facilitando a busca, 
                filtragem e análise de dados. Elas são fundamentais para uma gestão eficiente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Onde são utilizadas:</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Filtragem de produtos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Relatórios por categoria</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Análise de performance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Importação em lote</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Exemplos de categorias:</h4>
              <div className="space-y-2">
                <Badge variant="outline">Iluminação</Badge>
                <Badge variant="outline">Automação</Badge>
                <Badge variant="outline">Segurança</Badge>
                <Badge variant="outline">Eletrônicos</Badge>
                <Badge variant="outline">Ferramentas</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Como cadastrar uma categoria:</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Acesse a página de Categorias</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">No menu lateral, clique em "Categorias"</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Clique em "Nova Categoria"</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Preencha nome e descrição da categoria</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Salve e comece a usar</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">A categoria estará disponível para associar aos produtos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
              📁 Dica de organização:
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Crie categorias amplas primeiro (ex: Eletrônicos) e depois pode criar subcategorias 
              mais específicas (ex: Smartphones, Tablets) conforme necessário.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'products-comparison',
      title: 'Produtos para Comparação',
      subtitle: 'Cadastre produtos para comparar preços entre clientes',
      icon: <Package className="h-6 w-6" />,
      category: 'products',
      content: (
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Comparação de Preços entre Clientes
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Compare preços do mesmo produto entre diferentes clientes para identificar 
                oportunidades e ajustar estratégias de precificação.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Como funciona:</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium">Produto Master</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cadastre seu produto principal (is_master = sim)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium">Produtos de Clientes</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cadastre o mesmo produto de outros clientes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium">Match Automático</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sistema agrupa produtos similares automaticamente</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Onde são utilizados:</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Página de Comparação de Preços</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Relatórios de performance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Análise de competitividade</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Dashboard principal</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Como cadastrar produtos para comparação:</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Acesse Produtos</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Vá para a página de produtos no menu</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Cadastre o produto master</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Marque "É produto master" e associe ao seu cliente</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Cadastre versões de outros clientes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Use nomes similares para facilitar o match automático</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="font-medium">Importe via planilha</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Use o template para importar múltiplos produtos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
              💡 Dica para melhor match:
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Use nomes descritivos com especificações técnicas. Ex: "Smartphone Samsung Galaxy S24 256GB" 
              ao invés de apenas "Celular Samsung". Isso melhora o agrupamento automático.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'products-monitoring',
      title: 'Produtos para Monitoramento',
      subtitle: 'Configure monitoramento automático de preços de concorrentes',
      icon: <Eye className="h-6 w-6" />,
      category: 'monitoring',
      content: (
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Monitoramento Automático de Preços
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Monitore preços de concorrentes em tempo real através de URLs. 
                O sistema atualiza automaticamente os preços todos os dias às 7h da manhã.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Como funciona:</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium">Produto Master</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Seu produto principal para comparação</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium">Concorrente + URL</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Produto do concorrente com link da página</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium">Vinculação</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Conecte via master_product_id</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <p className="font-medium">Atualização Automática</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sistema atualiza preços diariamente</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Onde são utilizados:</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Monitoramento de Preços</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Alertas de mudança de preço</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Análise competitiva</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Comparação em tempo real</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Como configurar monitoramento:</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Cadastre seu produto master</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Produto principal da sua empresa (is_master = sim)</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Cadastre cliente concorrente</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Crie cliente marcado como concorrente</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Cadastre produto do concorrente</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">is_competitor = sim + master_product_id + URL da página</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="font-medium">Aguarde a atualização</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sistema atualiza preços automaticamente às 7h</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
              🔗 Importante sobre URLs:
            </h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              A URL deve ser a página direta do produto no site do concorrente. 
              Evite URLs encurtadas ou de redirecionamento. Teste a URL manualmente antes de cadastrar.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'import-data',
      title: 'Importação de Dados',
      subtitle: 'Importe produtos em lote usando planilhas Excel',
      icon: <Upload className="h-6 w-6" />,
      category: 'products',
      content: (
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Importação em Lote via Excel
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Economize tempo importando múltiplos produtos, clientes e categorias 
                usando planilhas Excel com templates pré-configurados.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Template Produtos</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Inclui exemplos completos e instruções detalhadas
              </p>
              <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                <div>• 4 abas com instruções</div>
                <div>• Exemplos práticos</div>
                <div>• Dados prontos para uso</div>
              </div>
            </div>

            <div className="p-4 border border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Template Categorias</h4>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Categorias com IDs para vincular produtos
              </p>
              <div className="space-y-1 text-xs text-green-600 dark:text-green-400">
                <div>• IDs corretos</div>
                <div>• Nomes padronizados</div>
                <div>• Descrições completas</div>
              </div>
            </div>

            <div className="p-4 border border-purple-200 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20 rounded-lg">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Template Clientes</h4>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                Clientes configurados com tipos e status
              </p>
              <div className="space-y-1 text-xs text-purple-600 dark:text-purple-400">
                <div>• Master e concorrentes</div>
                <div>• Dados de contato</div>
                <div>• Status configurado</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Como fazer importação:</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Baixe o template</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Acesse Upload → "Template Produtos com Exemplos"</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Leia as instruções</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Estude as 4 abas: Visão Geral, Campos, Exemplos, Dados</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Preencha seus dados</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Use a aba "4-Dados Exemplo" como base</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="font-medium">Faça o upload</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Arraste o arquivo ou clique para selecionar</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Atenção aos campos obrigatórios:
            </h4>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <div>• <strong>nome</strong> e <strong>sku</strong> são obrigatórios</div>
              <div>• <strong>link_origem</strong> é obrigatório para monitoramento</div>
              <div>• <strong>master_product_id</strong> é obrigatório para concorrentes</div>
              <div>• IDs existentes atualizam, IDs vazios criam novos produtos</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analysis',
      title: 'Análise e Relatórios',
      subtitle: 'Extraia insights dos dados coletados',
      icon: <BarChart3 className="h-6 w-6" />,
      category: 'analysis',
      content: (
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Análise e Relatórios
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Use os dados coletados para tomar decisões estratégicas sobre precificação 
                e posicionamento no mercado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Páginas de análise:</h4>
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Comparação de Preços</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Compare preços entre diferentes clientes e identifique oportunidades
                  </p>
                </div>
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Monitoramento</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Acompanhe mudanças de preços dos concorrentes em tempo real
                  </p>
                </div>
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Relatórios</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gere relatórios detalhados por período, categoria ou cliente
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Métricas importantes:</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Menor preço do mercado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Maior preço do mercado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Variação percentual</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Posição competitiva</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Tendências de preço</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Como usar as análises:</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Identifique produtos problemáticos</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Produtos onde você está perdendo para concorrência</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Analise tendências</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Veja como os preços evoluem ao longo do tempo</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Ajuste sua estratégia</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Use insights para definir preços competitivos</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="font-medium">Gere relatórios</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Exporte dados para apresentações e reuniões</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-indigo-800 dark:text-indigo-200 mb-2">
              📊 Dica de análise:
            </h4>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Configure alertas para produtos críticos. Use filtros por categoria para 
              focar em segmentos específicos. Analise dados semanalmente para identificar padrões.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'conclusion',
      title: 'Próximos Passos',
      subtitle: 'Você está pronto para usar a plataforma!',
      icon: <CheckCircle className="h-6 w-6" />,
      category: 'analysis',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Parabéns! Você completou o tutorial
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Agora você conhece todas as funcionalidades da plataforma
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">O que você aprendeu:</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Configurar clientes e categorias</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Cadastrar produtos para comparação</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Configurar monitoramento automático</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Importar dados via Excel</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Analisar dados e gerar relatórios</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Próximos passos recomendados:</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium text-sm">Configure seus clientes</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Comece pelo cliente master (sua empresa)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium text-sm">Crie categorias</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Organize por segmentos de produtos</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium text-sm">Baixe o template</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Importe seus produtos em lote</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <p className="font-medium text-sm">Configure monitoramento</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Adicione concorrentes principais</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Precisa de ajuda?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Você pode acessar este tutorial novamente a qualquer momento
                </p>
              </div>
              <Button 
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Começar a usar
              </Button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentWizardStep = wizardSteps[currentStep];
  const progress = ((currentStep + 1) / wizardSteps.length) * 100;

  const nextStep = () => {
    if (currentStep < wizardSteps.length - 1) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                {currentWizardStep.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentWizardStep.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentWizardStep.subtitle}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>
              ×
            </Button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-between text-xs">
            {wizardSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`flex flex-col items-center space-y-1 p-2 rounded ${
                  index === currentStep
                    ? 'text-blue-600 dark:text-blue-400'
                    : index < currentStep
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span className="text-center leading-tight">{step.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {currentWizardStep.content}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </Button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentStep + 1} de {wizardSteps.length}
            </span>

            {currentStep === wizardSteps.length - 1 ? (
              <Button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Finalizar</span>
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
              >
                <span>Próximo</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}