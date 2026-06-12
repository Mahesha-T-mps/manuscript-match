import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
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
            <ErrorBoundary enableReporting={true}>
              <Routes>
                {/* Login as default route */}
                <Route path="/" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <LoginForm />
                  </AuthProviderWithErrorBoundary>
                } />
                
                {/* Public App Selector (if needed) */}
                <Route path="/select" element={<AppSelector />} />
                
                {/* Authenticated App Selector - After login */}
                <Route path="/apps" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <ProtectedRoute>
                      <AuthenticatedAppSelector />
                    </ProtectedRoute>
                  </AuthProviderWithErrorBoundary>
                } />
                
                {/* ScholarFinder Routes - Use ScholarFinder Auth Context */}
                <Route path="/login" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <LoginForm />
                  </AuthProviderWithErrorBoundary>
                } />
                
                {/* Masked Route Handler */}
                <Route path="/app/:maskedPath" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <MaskedRouteHandler />
                  </AuthProviderWithErrorBoundary>
                } />
                
                {/* Secure ScholarFinder Routes */}
                <Route path="/scholarfinder" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <SecureRoute originalPath="/scholarfinder">
                      <Index />
                    </SecureRoute>
                  </AuthProviderWithErrorBoundary>
                } />
                <Route path="/reports" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <SecureRoute originalPath="/reports">
                      <Reports />
                    </SecureRoute>
                  </AuthProviderWithErrorBoundary>
                } />
                <Route path="/accept-invitation" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <AcceptInvitation />
                  </AuthProviderWithErrorBoundary>
                } />
                <Route path="/scholarfinder/*" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <SecureRoute originalPath="/scholarfinder">
                      <ScholarFinderApp />
                    </SecureRoute>
                  </AuthProviderWithErrorBoundary>
                } />
                
                {/* MSXpert Routes - Now use ScholarFinder Auth Context */}
                <Route path="/msxpert/app" element={
                  <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
                    <SecureRoute originalPath="/msxpert/app">
                      <MSXpertApp />
                    </SecureRoute>
                  </AuthProviderWithErrorBoundary>
                } />
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Footer />
            </ErrorBoundary>
          </BrowserRouter>
          {config.enableDevTools && <ReactQueryDevtools initialIsOpen={false} />}
        </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
