import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetails from "./pages/CaseDetails";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Contacts from "./pages/Contacts";
import Templates from "./pages/Templates";
import TemplateDocuments from "./pages/TemplateDocuments";
import HowItWorks from "./pages/HowItWorks";

import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ClientPortal from "./pages/ClientPortal";
import LandingPage from "./pages/LandingPage";
import GetOffer from "./pages/GetOffer";
import NotFound from "./pages/NotFound";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [checkingPaid, setCheckingPaid] = useState(true);

  useEffect(() => {
    if (!user) {
      setCheckingPaid(false);
      return;
    }
    supabase
      .from('profiles')
      .select('is_paid')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsPaid(data?.is_paid ?? false);
        setCheckingPaid(false);
      });
  }, [user]);

  if (loading || checkingPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">טוען...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPaid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
                <ShieldX className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">הגישה חסומה</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-muted-foreground">
              החשבון שלך אינו פעיל. נא פנה למנהל המערכת לצורך הפעלה:
            </p>
            <a
              href="mailto:dv4343@gmail.com"
              className="text-primary font-medium hover:underline text-lg"
            >
              dv4343@gmail.com
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">טוען...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/landing" element={<LandingPage />} />
    <Route path="/get-offer" element={<GetOffer />} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
    <Route path="/cases/:id" element={<ProtectedRoute><CaseDetails /></ProtectedRoute>} />
    <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
    <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
    <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
    <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
    <Route path="/templates/:typeId" element={<ProtectedRoute><TemplateDocuments /></ProtectedRoute>} />
    
    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
    <Route path="/how-it-works" element={<ProtectedRoute><HowItWorks /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/portal/:token" element={<ClientPortal />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
