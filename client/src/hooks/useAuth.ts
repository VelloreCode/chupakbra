import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true, // Enable refetch on focus for better auth state sync
    staleTime: 0, // Always consider auth data stale to force refresh
    gcTime: 0, // Don't cache auth data
    // Don't throw errors for 401/403 responses - these are expected when not authenticated
    throwOnError: false,
  });

  // User is authenticated only if we have valid user data and no authentication error
  const isAuthenticated = !!user && !error;



  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
