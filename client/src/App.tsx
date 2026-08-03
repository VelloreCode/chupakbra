import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Features from "@/pages/features";
import About from "@/pages/about";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Products from "@/pages/products";
import Clients from "@/pages/clients";
import Competitors from "@/pages/competitors";
import Categories from "@/pages/categories";
import { ComparisonV3 } from "@/pages/comparison-v3";
import Upload from "@/pages/upload";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import ApiDocs from "@/pages/api-docs";
import DataCleanup from "@/pages/data-cleanup";
import ProductsUrl from "@/pages/products-url";
import PriceMonitoring from "@/pages/price-monitoring";
import PriceComparison from "@/pages/price-comparison";
import Suppliers from "@/pages/suppliers";
import MatchReview from "@/pages/match-review";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-orange mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/features" component={Features} />
          <Route path="/about" component={About} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/comparison" component={ComparisonV3} />
          <Route path="/products" component={Products} />
          <Route path="/products-url" component={ProductsUrl} />
          <Route path="/price-monitoring" component={PriceMonitoring} />
          <Route path="/price-comparison" component={PriceComparison} />
          <Route path="/suppliers" component={Suppliers} />
          <Route path="/match-review" component={MatchReview} />
          <Route path="/clients" component={Clients} />
          <Route path="/competitors" component={Competitors} />
          <Route path="/categories" component={Categories} />
          <Route path="/upload" component={Upload} />
          <Route path="/data-cleanup" component={DataCleanup} />
          <Route path="/reports" component={Reports} />
          <Route path="/users" component={Users} />
          <Route path="/api-docs" component={ApiDocs} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
