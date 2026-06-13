import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import ArtworkDetail from "./pages/ArtworkDetail";
import ArtistProfile from "./pages/ArtistProfile";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import ApplyArtist from "./pages/ApplyArtist";
import ContactUs from "./pages/ContactUs";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/artwork/:id" element={<ArtworkDetail />} />
              <Route path="/artist/:id" element={<ArtistProfile />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/apply-artist" element={<ApplyArtist />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/search" element={<Search />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
