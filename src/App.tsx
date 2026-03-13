import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import MemberArea from "./pages/MemberArea";
import CustomerPortal from "./pages/CustomerPortal";
import Login from "./pages/Login";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Orders from "./pages/admin/Orders";
import Products from "./pages/admin/Products";
import ProductEdit from "./pages/admin/ProductEdit";
import Customers from "./pages/admin/Customers";
import Settings from "./pages/admin/Settings";
import Gateways from "./pages/admin/Gateways";
import Courses from "./pages/admin/Courses";
import Coupons from "./pages/admin/Coupons";
import AbandonedCarts from "./pages/admin/AbandonedCarts";
import Integrations from "./pages/admin/Integrations";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import CheckoutBuilder from "./pages/admin/CheckoutBuilder";
import Notifications from "./pages/admin/Notifications";
import Tracking from "./pages/admin/Tracking";
import Reviews from "./pages/admin/Reviews";
import SystemHealth from "./pages/admin/SystemHealth";
import Webhooks from "./pages/admin/Webhooks";
import Emails from "./pages/admin/Emails";
import PwaSettings from "./pages/admin/PwaSettings";
import NotFound from "./pages/NotFound";
import InstallPrompt from "./components/InstallPrompt";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/manual-tecnico" element={<ManualTecnico />} />
            <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
            <Route path="/checkout/:productId" element={<Checkout />} />
            <Route path="/membros" element={<MemberArea />} />
            <Route path="/minha-conta" element={<CustomerPortal />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/products/:productId/checkout-builder" element={<CheckoutBuilder />} />
            <Route path="/admin/products/:productId/checkout-builder/:configId" element={<CheckoutBuilder />} />
            <Route path="/admin" element={<><InstallPrompt /><AdminLayout /></>}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:productId/edit" element={<ProductEdit />} />
              <Route path="customers" element={<Customers />} />
              <Route path="gateways" element={<Gateways />} />
              <Route path="courses" element={<Courses />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="abandoned" element={<AbandonedCarts />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="tracking" element={<Tracking />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="health" element={<SystemHealth />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="emails" element={<Emails />} />
              <Route path="pwa" element={<PwaSettings />} />
              <Route path="platform" element={<SuperAdminDashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
