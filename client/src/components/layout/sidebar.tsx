import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { PlatformWizard } from "@/components/wizard/platform-wizard";
import { InteractiveOnboarding } from "@/components/wizard/interactive-onboarding";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Package,
  Users,
  Tags,
  Scale,
  FileSpreadsheet,
  ChartBar,
  Code,
  UserCog,
  LogOut,
  Database,
  Shield,
  Zap,
  TrendingUp,
  Target,
  Activity,
  Globe,
  Upload,
  FileText,
  HelpCircle,
  Truck,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const [location] = useLocation();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const { user } = useAuth();
  const { role, permissions } = useUserRole();

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding-completed', 'true');
    setIsOnboardingOpen(false);
  };

  const userData = user || {
    profileImageUrl: null,
    firstName: null,
    email: null,
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: BarChart3,
      show: permissions.canAccessDashboard,
      isLive: true,
    },
    {
      name: "Monitoramento URL",
      href: "/price-monitoring",
      icon: Target,
      show: permissions.canAccessMonitoring,
    },
    {
      name: "Comparação de Preços",
      href: "/comparison",
      icon: Zap,
      show: permissions.canAccessComparison,
      isLive: true,
    },
    {
      name: "Clientes",
      href: "/clients",
      icon: Users,
      show: permissions.canAccessClients,
    },
    {
      name: "Categorias",
      href: "/categories",
      icon: Tags,
      show: permissions.canAccessCategories,
    },
    {
      name: "Produtos",
      href: "/products",
      icon: Package,
      show: permissions.canAccessProducts,
    },
    {
      name: "Produtos URL",
      href: "/products-url",
      icon: Globe,
      show: permissions.canAccessProductsUrl,
    },
    {
      name: "Fornecedores",
      href: "/suppliers",
      icon: Truck,
      show: permissions.canAccessProductsUrl,
    },
    {
      name: "Revisão de Match",
      href: "/match-review",
      icon: Link2,
      show: permissions.canAccessProductsUrl,
    },
    {
      name: "Upload",
      href: "/upload",
      icon: Upload,
      show: permissions.canAccessUpload,
    },
    {
      name: "Usuários",
      href: "/users",
      icon: UserCog,
      show: permissions.canAccessUsers,
    },
    {
      name: "Relatórios",
      href: "/reports",
      icon: FileText,
      show: permissions.canAccessReports,
    },
    {
      name: "Limpeza de Dados",
      href: "/data-cleanup",
      icon: Database,
      show: permissions.canAccessDataCleanup,
    },
    {
      name: "API & Docs",
      href: "/api-docs",
      icon: Code,
      show: true, // Always show API docs for all users
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-40">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Chupa K bra</h1>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <Activity className="h-2.5 w-2.5 monitoring-active pulse-monitoring" />
              Grupo Vellore
            </p>
          </div>
        </div>
      </div>
      {/* Navigation */}
      <nav className="p-3">
        <ul className="space-y-1">
          {navigation
            .filter((item) => item.show)
            .map((item) => {
              const isActive = location === item.href;
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center p-2.5 rounded-md transition-all cursor-pointer group",
                        isActive
                          ? "gradient-primary text-white shadow-lg"
                          : "text-text-secondary hover:bg-gray-100 hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-center space-x-2.5">
                        <item.icon
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive
                              ? "text-white"
                              : "group-hover:text-primary-orange",
                          )}
                        />
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
      {/* User Profile */}
      <div className="absolute bottom-0 left-0 w-64 p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2.5 p-2">
          <img
            src={
              userData.profileImageUrl ||
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
            }
            alt="User profile"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">
              {userData.firstName || userData.email || "Usuário"}
            </p>
            <div className="flex items-center space-x-1">
              <Shield className="h-2.5 w-2.5 text-text-secondary flex-shrink-0" />
              <p className="text-xs text-text-secondary capitalize truncate">{role}</p>
            </div>
          </div>
        </div>
        
        {/* Action buttons row */}
        <div className="flex items-center justify-center space-x-1 px-2 pb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOnboardingOpen(true)}
            className="text-green-600 hover:text-green-700 p-1.5"
            title="Assistente Interativo"
          >
            <Target className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="text-blue-600 hover:text-blue-700 p-1.5"
            title="Tutorial Completo"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/api/logout")}
            className="text-text-secondary hover:text-text-primary p-1.5"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
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
    </aside>
  );
}
