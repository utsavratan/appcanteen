import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import SplashScreen from "./pages/SplashScreen";
import CustomerMenu from "./pages/CustomerMenu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import OrderHistory from "./pages/OrderHistory";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import Login from "./pages/Login";
import ChefDashboard from "./pages/ChefDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TokenDisplay from "./pages/TokenDisplay";
import BillView from "./pages/BillView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/menu" element={<CustomerMenu />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:id" element={<OrderTracking />} />
            <Route path="/history" element={<OrderHistory />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/chef" element={<ChefDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/token-display" element={<TokenDisplay />} />
            <Route path="/bill/:id" element={<BillView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
