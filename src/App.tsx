// @ts-nocheck
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/ui/cookie-consent";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Eagerly loaded — landing & critical auth paths
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy-loaded — checkout flow
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Receipt = lazy(() => import("./pages/Receipt"));

// Lazy-loaded — member / customer
const MemberArea = lazy(() => import("./pages/MemberArea"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));

// Lazy-loaded — legal pages
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const ProhibitedContent = lazy(() => import("./pages/ProhibitedContent"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Lazy-loaded — admin shell & pages
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const InstallPrompt = lazy(() => import("./components/InstallPrompt"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const Products = lazy(() => import("./pages/admin/Products"));
const ProductEdit = lazy(() => import("./pages/admin/ProductEdit"));
const Customers = lazy(() => import("./pages/admin/Customers"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Gateways = lazy(() => import("./pages/admin/Gateways"));
const Courses = lazy(() => import("./pages/admin/Courses"));
const Coupons = lazy(() => import("./pages/admin/Coupons"));
const AbandonedCarts = lazy(() => import("./pages/admin/AbandonedCarts"));
const Integrations = lazy(() => import("./pages/admin/Integrations"));
const GatewayManagement = lazy(() => import("./pages/admin/GatewayManagement"));

const SuperAdminDashboard = lazy(() => import("./pages/admin/SuperAdminDashboard"));
const CheckoutBuilder = lazy(() => import("./pages/admin/CheckoutBuilder"));
const Notifications = lazy(() => import("./pages/admin/Notifications"));
const Tracking = lazy(() => import("./pages/admin/Tracking"));
const Reviews = lazy(() => import("./pages/admin/Reviews"));
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));
const Webhooks = lazy(() => import("./pages/admin/Webhooks"));
const Emails = lazy(() => import("./pages/admin/Emails"));
const PwaSettings = lazy(() => import("./pages/admin/PwaSettings"));
const Billing = lazy(() => import("./pages/admin/Billing"));
const Upsell = lazy(() => import("./pages/admin/Upsell"));
const Roadmap = lazy(() => import("./pages/admin/Roadmap"));
const TechnicalManual = lazy(() => import("./pages/admin/TechnicalManual"));
const Domains = lazy(() => import("./pages/admin/Domains"));

const MyAccount = lazy(() => import("./pages/admin/MyAccount"));
const Metrics = lazy(() => import("./pages/admin/Metrics"));
const ProducerBilling = lazy(() => import("./pages/admin/ProducerBilling"));
const Blacklist = lazy(() => import("./pages/admin/Blacklist"));
const ApiKeys = lazy(() => import("./pages/admin/ApiKeys"));
const ProductReview = lazy(() => import("./pages/admin/ProductReview"));
const WhatsApp = lazy(() => import("./pages/admin/WhatsApp"));
const VerificationReview = lazy(() => import("./pages/admin/VerificationReview"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const MariaAI = lazy(() => import("./pages/admin/MariaAI"));
const AbandonedCartDetail = lazy(() => import("./pages/admin/AbandonedCartDetail"));
const CartControl = lazy(() => import("./pages/admin/CartControl"));
const EmailTemplates = lazy(() => import("./pages/admin/EmailTemplates"));
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
              <Route path="/recibo/:orderId" element={<Receipt />} />
              <Route path="/checkout/:productId" element={<Checkout />} />
              <Route path="/membros" element={<MemberArea />} />
              <Route path="/minha-conta" element={<CustomerPortal />} />
              <Route path="/login" element={<Login />} />
              <Route path="/completar-perfil" element={<CompleteProfile />} />
              <Route path="/aguardando-aprovacao" element={<PendingApproval />} />
              <Route path="/termos" element={<Terms />} />
              <Route path="/privacidade" element={<Privacy />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/isencao-financeira" element={<Disclaimer />} />
              <Route path="/produtos-proibidos" element={<ProhibitedContent />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                <Route path="abandoned-carts/:id" element={<AbandonedCartDetail />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="gateway-management" element={<GatewayManagement />} />
                
                <Route path="settings" element={<Settings />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="tracking" element={<Tracking />} />
                <Route path="reviews" element={<Reviews />} />
                <Route path="health" element={<SystemHealth />} />
                <Route path="webhooks" element={<Webhooks />} />
                <Route path="emails" element={<Emails />} />
                <Route path="pwa" element={<PwaSettings />} />
                
                <Route path="billing" element={<Billing />} />
                <Route path="platform" element={<SuperAdminDashboard />} />
                <Route path="cart-control" element={<CartControl />} />
                <Route path="domains" element={<Domains />} />
                
                
                <Route path="my-account" element={<MyAccount />} />
                <Route path="metrics" element={<Metrics />} />
                <Route path="financeiro" element={<ProducerBilling />} />
                <Route path="upsell" element={<Upsell />} />
                <Route path="roadmap" element={<Roadmap />} />
                <Route path="manual" element={<TechnicalManual />} />
                <Route path="blacklist" element={<Blacklist />} />
                <Route path="api-keys" element={<ApiKeys />} />
                <Route path="product-review" element={<ProductReview />} />
                <Route path="whatsapp" element={<WhatsApp />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="verification-review" element={<VerificationReview />} />
                <Route path="maria-ia" element={<MariaAI />} />
                <Route path="email-templates" element={<EmailTemplates />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          {/* Global LGPD/GDPR consent banner — covers member area, admin, and all routes EXCEPT checkout (which mounts its own localized banner) */}
          <GlobalCookieBanner />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function GlobalCookieBanner() {
  const { pathname } = useLocation();
  // Checkout routes mount their own localized cookie banner — skip the global PT one there.
  if (pathname.startsWith("/checkout/") && pathname !== "/checkout/sucesso") return null;
  return <CookieConsent />;
}

export default App;
