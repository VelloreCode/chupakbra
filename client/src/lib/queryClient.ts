import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: "include",
  };

  if (data instanceof FormData) {
    // Don't set Content-Type for FormData, let browser set it with boundary
    options.body = data;
  } else {
    options.headers = data ? { "Content-Type": "application/json" } : {};
    options.body = data ? JSON.stringify(data) : undefined;
  }

  const res = await fetch(url, options);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // Build URL with query parameters from queryKey
    if (queryKey.length > 1) {
      const params = new URLSearchParams();
      
      // Process additional queryKey segments for parameters
      for (let i = 1; i < queryKey.length; i++) {
        const segment = queryKey[i];
        if (typeof segment === 'object' && segment !== null) {
          Object.entries(segment).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              params.set(key, String(value));
            }
          });
        }
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // Add default queryFn
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchInterval: false,
      refetchIntervalInBackground: false,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});