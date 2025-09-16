import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { NotificationProvider } from "@/components/NotificationProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { GlobalChatWrapper } from "@/components/GlobalChatWrapper";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import Dashboard from "./pages/Dashboard";
import SalesOrders from "./pages/SalesOrders";
import SimpleSalesOrders from "./components/debug/SimpleSalesOrders";
import Profile from "./pages/Profile";
import ServiceOrders from "./pages/ServiceOrders";
import ReconOrders from "./pages/ReconOrders";
import GetReady from "./pages/GetReady";
import CarWash from "./pages/CarWash";
import Stock from "./pages/Stock";
import Productivity from "./pages/Productivity";
import DetailHub from "./pages/DetailHub";
import Chat from "./pages/Chat";
import { Dealerships } from "./pages/Dealerships";
import Contacts from "./pages/Contacts";
import DealerView from "./pages/DealerView";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Management from "./pages/Management";
import QRRedirect from "./pages/QRRedirect";
import VinScanner from "./pages/VinScanner";
import NFCTracking from "./pages/NFCTracking";
import Phase3Dashboard from "./pages/Phase3Dashboard";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import { InvitationAccept } from "./pages/InvitationAccept";
import NotFound from "./pages/NotFound";
import { TooltipTester } from "./components/debug/TooltipTester";
import { DuplicateTooltipTester } from "./components/debug/DuplicateTooltipTester";
import { RouteLogger } from "@/components/debug/RouteLogger";
import SimpleServiceOrders from "./components/debug/SimpleServiceOrders";

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
          <Route path="settings" element={<Settings />} />
          <Route path="dealerships" element={<Dealerships />} />
          <Route path="dealers/:id" element={<DealerView />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<Users />} />
          <Route path="management" element={<Management />} />
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
