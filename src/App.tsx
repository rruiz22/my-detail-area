import { RouteLogger } from "@/components/debug/RouteLogger";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FirebaseMessagingProvider } from "@/components/FirebaseMessagingProvider";
import { GlobalChatWrapper } from "@/components/GlobalChatWrapper";
import { NotificationProvider } from "@/components/NotificationProvider";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateBanner } from "@/components/version/UpdateBanner";
import { AuthProvider } from "@/contexts/AuthContext";
import { DealerFilterProvider } from "@/contexts/DealerFilterContext";
import { DealershipProvider } from "@/contexts/DealershipContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { ServicesProvider } from "@/contexts/ServicesContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
// ✅ PHASE 3.3: Import AppLoadingBoundary for global loading state
import { AppLoadingBoundary } from "@/components/loading/AppLoadingBoundary";
import { CACHE_TIMES, GC_TIMES } from "@/constants/cacheConfig";
import { DuplicateTooltipTester } from "./components/debug/DuplicateTooltipTester";
import { TooltipTester } from "./components/debug/TooltipTester";
import AdminDashboard from "./pages/AdminDashboard";
import Announcements from "./pages/Announcements";
import Auth from "./pages/Auth";
import CarWash from "./pages/CarWash";
import Chat from "./pages/Chat";
import Contacts from "./pages/Contacts";
import Dashboard from "./pages/Dashboard";
import DealerView from "./pages/DealerView";
import DetailHub from "./pages/DetailHub";
import ForgotPassword from "./pages/ForgotPassword";
import GetReady from "./pages/GetReady";
import Index from "./pages/Index";
import MDAChatWidget from "./pages/MDAChatWidget";
// Invoices moved to Reports tab - no longer a separate page
import ClearCache from "./pages/ClearCache";
import { InvitationAccept } from "./pages/InvitationAccept";
import NFCTracking from "./pages/NFCTracking";
import NotFound from "./pages/NotFound";
import Phase3Dashboard from "./pages/Phase3Dashboard";
import Productivity from "./pages/Productivity";
import Profile from "./pages/Profile";
import PublicReconData from "./pages/PublicReconData";
import QRRedirect from "./pages/QRRedirect";
import ReconOrders from "./pages/ReconOrders";
import Reports from "./pages/Reports";
import ResetPassword from "./pages/ResetPassword";
import SalesOrders from "./pages/SalesOrders";
import ServiceOrders from "./pages/ServiceOrders";
import Settings from "./pages/Settings";
import Stock from "./pages/Stock";
import VehicleDetailsPage from "./pages/VehicleDetailsPage";
import VinScanner from "./pages/VinScanner";
import RemoteKiosk from "./pages/RemoteKiosk";

    console.log('🚀 App starting up with improved navigation');
    console.log('📱 Current URL:', window.location.href);
    console.log('🔄 Router should handle navigation correctly');

/**
 * Global QueryClient Configuration
 *
 * Default cache configuration for all queries in the application.
 * Individual queries can override these defaults as needed.
 *
 * Configuration:
 * - staleTime: 5 minutes (data fresh for 5 min before refetch)
 * - gcTime: 10 minutes (unused data kept in cache for 10 min)
 * - refetchOnWindowFocus: false (don't refetch when user switches tabs)
 * - refetchOnMount: 'stale' (only refetch if data is stale)
 * - retry: 2 (retry failed requests twice)
 * - retryDelay: exponential backoff (1s, 2s, 4s...)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.MEDIUM,           // 5 minutes
      gcTime: GC_TIMES.MEDIUM,                 // 10 minutes
      refetchOnWindowFocus: false,             // Reduce unnecessary refetches
      refetchOnMount: 'stale',                 // Only refetch if data is stale
      retry: 2,                                // Retry failed requests twice
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s, max 30s
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
    },
    mutations: {
      retry: 1,                                // Retry mutations once
    },
  },
});

// Helper component to redirect /dealers/:id to /admin/:id
const DealerRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/admin/${id}`} replace />;
};

const AppRoutes = () => {
  return (
    <>
      <RouteLogger />
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/s/:slug" element={<QRRedirect />} />
        <Route path="/invitation/:token" element={<InvitationAccept />} />
        <Route path="/landing" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/remote-kiosk" element={<RemoteKiosk />} />

        {/* Nueva ruta pública para datos de recon */}
        <Route path="/public/recon-data" element={<PublicReconData />} />

        {/* Protected application routes - Nested under ProtectedLayout */}
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route
            path="sales"
            element={
              <PermissionGuard module="sales_orders" permission="view" checkDealerModule={true}>
                <SalesOrders />
              </PermissionGuard>
            }
          />
          <Route
            path="service"
            element={
              <PermissionGuard module="service_orders" permission="view" checkDealerModule={true}>
                <ErrorBoundary>
                  <ServiceOrders />
                </ErrorBoundary>
              </PermissionGuard>
            }
          />
          <Route
            path="recon"
            element={
              <PermissionGuard module="recon_orders" permission="view" checkDealerModule={true}>
                <ErrorBoundary>
                  <ReconOrders />
                </ErrorBoundary>
              </PermissionGuard>
            }
          />
          <Route
            path="carwash"
            element={
              <PermissionGuard module="car_wash" permission="view" checkDealerModule={true}>
                <ErrorBoundary>
                  <CarWash />
                </ErrorBoundary>
              </PermissionGuard>
            }
          />
          <Route
            path="stock/*"
            element={
              <PermissionGuard module="stock" permission="view" checkDealerModule={true}>
                <Routes>
                  <Route index element={<Stock />} />
                  <Route path="vehicles/:id" element={<VehicleDetailsPage />} />
                </Routes>
              </PermissionGuard>
            }
          />
          <Route
            path="productivity"
            element={
              <PermissionGuard module="productivity" permission="view" checkDealerModule={true}>
                <Productivity />
              </PermissionGuard>
            }
          />
          <Route
            path="detail-hub/*"
            element={
              <PermissionGuard module="detail_hub" permission="view" checkDealerModule={true}>
                <DetailHub />
              </PermissionGuard>
            }
          />
          <Route
            path="chat"
            element={
              <PermissionGuard module="chat" permission="view" checkDealerModule={true}>
                <Chat />
              </PermissionGuard>
            }
          />
          <Route
            path="vin-scanner"
            element={
              <PermissionGuard module="vin_scanner" permission="view_vin_scanner" checkDealerModule={true}>
                <VinScanner />
              </PermissionGuard>
            }
          />
          <Route
            path="nfc-tracking"
            element={
              <PermissionGuard module="nfc_tracking" permission="view_nfc_dashboard" checkDealerModule={true}>
                <NFCTracking />
              </PermissionGuard>
            }
          />
          <Route
            path="reports"
            element={
              <PermissionGuard module="reports" permission="view" checkDealerModule={true}>
                <Reports />
              </PermissionGuard>
            }
          />
              {/* Invoices moved to Reports tab */}
          <Route
            path="settings"
            element={
              <PermissionGuard requireSystemPermission="manage_all_settings">
                <Settings />
              </PermissionGuard>
            }
          />
          <Route
            path="contacts"
            element={
              <PermissionGuard module="contacts" permission="view" checkDealerModule={true}>
                <Contacts />
              </PermissionGuard>
            }
          />
          <Route path="profile" element={<Profile />} />

          {/* Cache Management - Accessible to all authenticated users */}
          <Route path="clearcache" element={<ClearCache />} />

          {/* System Administration */}
          <Route
            path="admin"
            element={
              <PermissionGuard module="management" permission="admin">
                <AdminDashboard />
              </PermissionGuard>
            }
          />
          <Route
            path="admin/:id"
            element={
              <PermissionGuard module="dealerships" permission="admin" checkDealerModule={true}>
                <DealerView />
              </PermissionGuard>
            }
          />
          <Route
            path="announcements"
            element={
              <ProtectedRoute>
                <Announcements />
              </ProtectedRoute>
            }
          />

          {/* Legacy routes - redirect to /admin */}
          <Route path="dealers" element={<Navigate to="/admin" replace />} />
          <Route path="dealers/:id" element={<DealerRedirect />} />
          <Route path="dealerships" element={<Navigate to="/admin" replace />} />
          {/* <Route
            path="management"
            element={
              <PermissionGuard module="management" permission="admin" checkDealerModule={true}>
                <Management />
              </PermissionGuard>
            }
          /> */}
          <Route path="phase3" element={<Phase3Dashboard />} />
          <Route
            path="get-ready/*"
            element={
              <PermissionGuard module="get_ready" permission="view" checkDealerModule={true}>
                <GetReady />
              </PermissionGuard>
            }
          />
          <Route path="debug/tooltips" element={<TooltipTester />} />
          <Route path="debug/duplicate-tooltips" element={<DuplicateTooltipTester />} />
        </Route>

        {/* MDAChat Widget Routes */}
        <Route path="/lc/widget" element={<MDAChatWidget />} />

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* React Query Devtools - Only in development */}
    {import.meta.env.DEV && (
      <ReactQueryDevtools
        initialIsOpen={false}
        position="bottom-right"
        buttonPosition="bottom-right"
      />
    )}
    <TooltipProvider>
      <AuthProvider>
        {/* ✅ FirebaseMessagingProvider - Registers FCM tokens and handles push notifications */}
        <FirebaseMessagingProvider>
          {/* ✅ DealershipProvider MUST come after AuthProvider (needs user.id) */}
          <DealershipProvider>
          <DealerFilterProvider>
            <PermissionProvider>
              <ServicesProvider>
                {/* ✅ PHASE 3.3: Wrap entire app in AppLoadingBoundary */}
                {/* This eliminates "Access Denied" flash by waiting for all critical systems */}
                <AppLoadingBoundary>
                  <GlobalChatWrapper>
                    <NotificationProvider>
                      <BrowserRouter
                        future={{
                          v7_startTransition: false,
                          v7_relativeSplatPath: true
                        }}
                      >
                        <AppRoutes />
                        {/* Update banner for new versions */}
                        <UpdateBanner />

                      </BrowserRouter>
                    </NotificationProvider>
                  </GlobalChatWrapper>
                </AppLoadingBoundary>
              </ServicesProvider>
            </PermissionProvider>
          </DealerFilterProvider>
        </DealershipProvider>
        </FirebaseMessagingProvider>
      </AuthProvider>
    </TooltipProvider>
    {/* Sistema de toast shadcn/ui - Sistema unificado */}
    <Toaster />
    {/* Vercel Speed Insights - Performance monitoring */}
    <SpeedInsights />
  </QueryClientProvider>
);

export default App;
