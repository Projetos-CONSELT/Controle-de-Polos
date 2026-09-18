import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import RequestLoan from "./pages/RequestLoan";
import TrackLoans from "./pages/TrackLoans";
import Manager from "./pages/Manager";
import Login from "./pages/Login";


import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<ProtectedRoute><Layout><RequestLoan /></Layout></ProtectedRoute>} />
      <Route path="/solicitar" element={<ProtectedRoute><Layout><RequestLoan /></Layout></ProtectedRoute>} />
      <Route path="/estoque" element={<ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>} />
      <Route path="/acompanhar" element={<ProtectedRoute><Layout><TrackLoans /></Layout></ProtectedRoute>} />
      <Route path="/gerente" element={<ProtectedRoute><Layout><Manager /></Layout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
