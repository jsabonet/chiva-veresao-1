import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Security from "./pages/Security";
import Networking from "./pages/Networking";
import ForgotPassword from "./pages/ForgotPassword";
import TestCurrency from "./pages/TestCurrency";
import AccountLayout from "./pages/account/AccountLayout";
import AccountOverview from "./pages/account/AccountOverview";
import AccountOrders from "./pages/account/AccountOrders";
import AccountProfile from "./pages/account/AccountProfile";
import AccountAddresses from "./pages/account/AccountAddresses";
import AccountFavorites from "./pages/account/AccountFavorites";
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
import ProductsManagement from "./pages/ProductsManagement";
import Products from "./pages/Products";
import CategoriesManagement from "./pages/CategoriesManagement";
import CreateProduct from "./pages/CreateProduct";
import EditProduct from "./pages/EditProduct";
import OrdersManagement from "./pages/OrdersManagement";
import CustomersManagement from "./pages/CustomersManagement";
import AdminSettings from "./pages/AdminSettings";
import PromotionsManagement from "./pages/PromotionsManagement";
import NotFound from "./pages/NotFound";
import ReviewManagement from "./pages/ReviewManagement";
import OrderConfirmation from "./pages/OrderConfirmation";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/produto/:id" element={<ProductDetails />} />
            {/* Alias para rota em inglês */}
            <Route path="/products/:id" element={<ProductDetails />} />
            {/* Listagem de produtos com filtros */}
            <Route path="/products" element={<Products />} />
            {/* Páginas de Serviços Especializados */}
            <Route path="/security" element={<Security />} />
            <Route path="/networking" element={<Networking />} />
            <Route path="/carrinho" element={<Cart />} />
            <Route path="/order/:id/confirmation" element={<OrderConfirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/test-currency" element={<TestCurrency />} />
            {/* Customer Account Area */}
            <Route path="/account" element={
              <ProtectedRoute>
                <AccountLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AccountOverview />} />
              <Route path="orders" element={<AccountOrders />} />
              <Route path="profile" element={<AccountProfile />} />
              <Route path="addresses" element={<AccountAddresses />} />
              <Route path="favorites" element={<AccountFavorites />} />
            </Route>
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute>
                <Suspense fallback={<div>Loading...</div>}>
                  <AdminDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/products" element={
              <ProtectedRoute>
                <ProductsManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/reviews" element={
              <ProtectedRoute>
                <ReviewManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute>
                <CategoriesManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/products/create" element={
              <ProtectedRoute>
                <CreateProduct />
              </ProtectedRoute>
            } />
            <Route path="/admin/products/edit/:id" element={
              <ProtectedRoute>
                <EditProduct />
              </ProtectedRoute>
            } />
            <Route path="/admin/pedidos" element={
              <ProtectedRoute>
                <OrdersManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/clientes" element={
              <AdminRoute>
                <CustomersManagement />
              </AdminRoute>
            } />
            <Route path="/admin/configuracoes" element={
              <ProtectedRoute>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/promocoes" element={
              <AdminRoute>
                <PromotionsManagement />
              </AdminRoute>
            } />
            
            {/* Redirects para manter compatibilidade com rotas antigas */}
            <Route path="/admin/produtos" element={<Navigate to="/admin/products" replace />} />
            <Route path="/admin/produtos/adicionar" element={<Navigate to="/admin/products/create" replace />} />
            <Route path="/admin/produtos/editar/:id" element={<Navigate to="/admin/products/edit/:id" replace />} />
            
            <Route path="/404" element={<NotFound />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
