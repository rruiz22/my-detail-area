import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "@/components/NotificationProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import SalesOrders from "./pages/SalesOrders";
import ServiceOrders from "./pages/ServiceOrders";
import ReconOrders from "./pages/ReconOrders";
import GetReady from "./pages/GetReady";
import CarWash from "./pages/CarWash";
import Stock from "./pages/Stock";
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
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import { InvitationAccept } from "./pages/InvitationAccept";
import NotFound from "./pages/NotFound";

// Load order migration utility for development
if (import.meta.env.DEV) {
  import('@/utils/migrateOrders');
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PermissionProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* QR Code redirect route - no auth required */}
                <Route path="/s/:slug" element={<QRRedirect />} />
                
                {/* Public invitation acceptance route */}
                <Route path="/invitation/:token" element={<InvitationAccept />} />
                
                {/* Protected application routes - Root level */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute><SalesOrders /></ProtectedRoute>} />
                <Route path="/service" element={<ProtectedRoute><ServiceOrders /></ProtectedRoute>} />
                <Route path="/recon" element={<ProtectedRoute><ReconOrders /></ProtectedRoute>} />
                <Route path="/carwash" element={<ProtectedRoute><CarWash /></ProtectedRoute>} />
                <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/vin-scanner" element={<ProtectedRoute><VinScanner /></ProtectedRoute>} />
                <Route path="/nfc-tracking" element={<ProtectedRoute><NFCTracking /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/dealerships" element={<ProtectedRoute><Dealerships /></ProtectedRoute>} />
                <Route path="/dealers/:id" element={<ProtectedRoute><DealerView /></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/management" element={<ProtectedRoute><Management /></ProtectedRoute>} />
                <Route path="/get-ready/*" element={<ProtectedRoute><GetReady /></ProtectedRoute>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </PermissionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
