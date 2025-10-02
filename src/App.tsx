import { RouteLogger } from "@/components/debug/RouteLogger";
import { GlobalChatWrapper } from "@/components/GlobalChatWrapper";
import { NotificationProvider } from "@/components/NotificationProvider";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DuplicateTooltipTester } from "./components/debug/DuplicateTooltipTester";
import { TooltipTester } from "./components/debug/TooltipTester";
import Auth from "./pages/Auth";
import CarWash from "./pages/CarWash";
import Chat from "./pages/Chat";
import Contacts from "./pages/Contacts";
import Dashboard from "./pages/Dashboard";
import { Dealerships } from "./pages/Dealerships";
import DealerView from "./pages/DealerView";
import DetailHub from "./pages/DetailHub";
import GetReady from "./pages/GetReady";
import Index from "./pages/Index";
import { InvitationAccept } from "./pages/InvitationAccept";
import Management from "./pages/Management";
import NFCTracking from "./pages/NFCTracking";
import NotFound from "./pages/NotFound";
import Phase3Dashboard from "./pages/Phase3Dashboard";
import Productivity from "./pages/Productivity";
import Profile from "./pages/Profile";
import PublicReconData from "./pages/PublicReconData";
import QRRedirect from "./pages/QRRedirect";
import ReconOrders from "./pages/ReconOrders";
import Reports from "./pages/Reports";
import SalesOrders from "./pages/SalesOrders";
import ServiceOrders from "./pages/ServiceOrders";
import Settings from "./pages/Settings";
import Stock from "./pages/Stock";
import VinScanner from "./pages/VinScanner";
import AdminDashboard from "./pages/AdminDashboard";

    console.log('🚀 App starting up with improved navigation');
    console.log('📱 Current URL:', window.location.href);
    console.log('🔄 Router should handle navigation correctly');

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <>
      <RouteLogger />
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/s/:slug" element={<QRRedirect />} />
        <Route path="/invitation/:token" element={<InvitationAccept />} />
        <Route path="/landing" element={<ProtectedRoute><Index /></ProtectedRoute>} />

        {/* Nueva ruta pública para datos de recon */}
        <Route path="/public/recon-data" element={<PublicReconData />} />

        {/* Protected application routes - Nested under ProtectedLayout */}
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sales" element={<SalesOrders />} />
          <Route path="service" element={<ServiceOrders />} />
          <Route path="recon" element={<ReconOrders />} />
          <Route path="carwash" element={<CarWash />} />
          <Route path="stock" element={<Stock />} />
          <Route path="productivity" element={<Productivity />} />
          <Route path="detail-hub/*" element={<DetailHub />} />
          <Route path="chat" element={<Chat />} />
          <Route path="vin-scanner" element={<VinScanner />} />
          <Route path="nfc-tracking" element={<NFCTracking />} />
          <Route path="reports" element={<Reports />} />
          <Route
            path="settings"
            element={
              <PermissionGuard module="settings" permission="view">
                <Settings />
              </PermissionGuard>
            }
          />
          <Route path="dealerships" element={<Dealerships />} />
          <Route
            path="dealers/:id"
            element={
              <PermissionGuard module="dealerships" permission="admin">
                <DealerView />
              </PermissionGuard>
            }
          />
          <Route path="contacts" element={<Contacts />} />
          <Route path="profile" element={<Profile />} />
          <Route path="management" element={<Management />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="phase3" element={<Phase3Dashboard />} />
          <Route path="get-ready/*" element={<GetReady />} />
          <Route path="debug/tooltips" element={<TooltipTester />} />
          <Route path="debug/duplicate-tooltips" element={<DuplicateTooltipTester />} />
        </Route>

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PermissionProvider>
          <GlobalChatWrapper>
            <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: false,
                v7_relativeSplatPath: true
              }}
            >
                <AppRoutes />
            </BrowserRouter>
           </NotificationProvider>
           </GlobalChatWrapper>
        </PermissionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
