import { useQuery } from "@tanstack/react-query";

export type UserRole = "administrador" | "editor" | "visualizador";

export interface UserPermissions {
  canAccessDashboard: boolean;
  canAccessComparison: boolean;
  canAccessMonitoring: boolean;
  canAccessClients: boolean;
  canAccessCategories: boolean;
  canAccessProducts: boolean;
  canAccessProductsUrl: boolean;
  canAccessUpload: boolean;
  canAccessUsers: boolean;
  canAccessReports: boolean;
  canAccessDataCleanup: boolean;
  canAccessApiDocs: boolean;
  canCreateProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  canCreateClients: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;
  canCreateCategories: boolean;
  canEditCategories: boolean;
  canDeleteCategories: boolean;
}

export function getPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case "administrador":
      // Acesso completo
      return {
        canAccessDashboard: true,
        canAccessComparison: true,
        canAccessMonitoring: true,
        canAccessClients: true,
        canAccessCategories: true,
        canAccessProducts: true,
        canAccessProductsUrl: true,
        canAccessUpload: true,
        canAccessUsers: true,
        canAccessReports: true,
        canAccessDataCleanup: true,
        canAccessApiDocs: true,
        canCreateProducts: true,
        canEditProducts: true,
        canDeleteProducts: true,
        canCreateClients: true,
        canEditClients: true,
        canDeleteClients: true,
        canCreateCategories: true,
        canEditCategories: true,
        canDeleteCategories: true,
      };
    case "editor":
      // Tudo exceto menu usuários
      return {
        canAccessDashboard: true,
        canAccessComparison: true,
        canAccessMonitoring: true,
        canAccessClients: true,
        canAccessCategories: true,
        canAccessProducts: true,
        canAccessProductsUrl: true,
        canAccessUpload: true,
        canAccessUsers: false,
        canAccessReports: true,
        canAccessDataCleanup: true,
        canAccessApiDocs: true,
        canCreateProducts: true,
        canEditProducts: true,
        canDeleteProducts: true,
        canCreateClients: true,
        canEditClients: true,
        canDeleteClients: true,
        canCreateCategories: true,
        canEditCategories: true,
        canDeleteCategories: true,
      };
    case "visualizador":
      // Apenas Dashboard, Comparação de Preços, Monitoramento URL e Relatórios
      return {
        canAccessDashboard: true,
        canAccessComparison: true,
        canAccessMonitoring: true,
        canAccessClients: false,
        canAccessCategories: false,
        canAccessProducts: false,
        canAccessProductsUrl: false,
        canAccessUpload: false,
        canAccessUsers: false,
        canAccessReports: true,
        canAccessDataCleanup: false,
        canAccessApiDocs: false,
        canCreateProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canCreateClients: false,
        canEditClients: false,
        canDeleteClients: false,
        canCreateCategories: false,
        canEditCategories: false,
        canDeleteCategories: false,
      };
    default:
      return getPermissions("visualizador");
  }
}

export function useUserRole() {
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const role = (user?.role as UserRole) || "visualizador";
  const permissions = getPermissions(role);

  return {
    role,
    permissions,
    isAdmin: role === "administrador",
    isEditor: role === "editor", 
    isViewer: role === "visualizador",
  };
}