import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Admin from "./pages/Admin";
import TestCurrency from "./pages/TestCurrency";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/test-currency" element={<TestCurrency />} />
          <Route path="/admin/dashboard" element={
            <Suspense fallback={<div>Loading...</div>}>
              <AdminDashboard />
            </Suspense>
          } />
          <Route path="/admin/products" element={<ProductsManagement />} />
          <Route path="/admin/categories" element={<CategoriesManagement />} />
          <Route path="/admin/products/create" element={<CreateProduct />} />
          <Route path="/admin/products/edit/:id" element={<EditProduct />} />
          
          {/* Redirects para manter compatibilidade com rotas antigas */}
          <Route path="/admin/produtos" element={<Navigate to="/admin/products" replace />} />
          <Route path="/admin/produtos/adicionar" element={<Navigate to="/admin/products/create" replace />} />
          <Route path="/admin/produtos/editar/:id" element={<Navigate to="/admin/products/edit/:id" replace />} />
          
          <Route path="/admin/pedidos" element={<OrdersManagement />} />
          <Route path="/admin/clientes" element={<CustomersManagement />} />
          <Route path="/admin/configuracoes" element={<AdminSettings />} />
          <Route path="/404" element={<NotFound />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
