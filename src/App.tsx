import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/config";
import { AuthProviderWithErrorBoundary } from "./components/auth/AuthProviderWithErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SecureRoute, MaskedRouteHandler } from "./components/auth/SecureRoute";
import { LoginForm } from "./components/auth/LoginForm";
import { 
  ErrorBoundary, 
  NetworkStatusToast, 
  GlobalErrorToastHandler,
  initializeGlobalErrorHandlers 
} from "./components/error";
import AppSelector from "./pages/AppSelector";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AcceptInvitation from "./pages/AcceptInvitation";
import Reports from "./pages/Reports";
import AuthenticatedAppSelector from "./pages/AuthenticatedAppSelector";
import { ScholarFinderApp } from "./features/scholarfinder";
import { MSXpertApp } from "./components/msxpert/MSXpertApp";
import { GlobalNotificationProvider } from "./components/notifications/GlobalNotificationProvider";
import { Footer } from "./components/layout/Footer";
import { MPSLogoBanner } from "./components/layout/MPSLogoBanner";

// Initialize global error handlers
initializeGlobalErrorHandlers();

const App = () => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('App-level error:', error, errorInfo);
    }}
    showErrorDetails={config.enableDevTools}
    enableReporting={true}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NetworkStatusToast />
        <GlobalErrorToastHandler />
        <GlobalNotificationProvider />
        <BrowserRouter>
          <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
            <MPSLogoBanner />
            <ErrorBoundary enableReporting={true}>
              <Routes>
                {/* Login as default route */}
                <Route path="/" element={<LoginForm />} />
                
                {/* Public App Selector (if needed) */}
                <Route path="/select" element={<AppSelector />} />
                
                {/* Authenticated App Selector - After login */}
                <Route path="/apps" element={
                  <ProtectedRoute>
                    <AuthenticatedAppSelector />
                  </ProtectedRoute>
                } />
                
                {/* ScholarFinder Routes - Use ScholarFinder Auth Context */}
                <Route path="/login" element={<LoginForm />} />
                
                {/* Masked Route Handler */}
                <Route path="/app/:maskedPath" element={<MaskedRouteHandler />} />
                
                {/* Secure ScholarFinder Routes */}
                <Route path="/scholarfinder" element={
                  <SecureRoute originalPath="/scholarfinder">
                    <Index />
                  </SecureRoute>
                } />
                <Route path="/reports" element={
                  <SecureRoute originalPath="/reports">
                    <Reports />
                  </SecureRoute>
                } />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/scholarfinder/*" element={
                  <SecureRoute originalPath="/scholarfinder">
                    <ScholarFinderApp />
                  </SecureRoute>
                } />
                
                {/* MSXpert Routes - Now use ScholarFinder Auth Context */}
                <Route path="/msxpert/app" element={
                  <SecureRoute originalPath="/msxpert/app">
                    <MSXpertApp />
                  </SecureRoute>
                } />
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Footer />
            </ErrorBoundary>
          </AuthProviderWithErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
