import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatPrice";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings,
  BarChart3,
  FileText,
  Shield,
  FolderOpen
} from "lucide-react";

const Admin = () => {
  const adminSections = [
    {
      title: "Dashboard",
      description: "Visão geral do desempenho da loja",
      icon: LayoutDashboard,
      href: "/admin/dashboard",
      color: "text-blue-600"
    },
    {
      title: "Produtos",
      description: "Gerencie o catálogo de produtos",
      icon: Package,
      href: "/admin/products",
      color: "text-green-600"
    },
    {
      title: "Categorias",
      description: "Organize produtos por categorias",
      icon: FolderOpen,
      href: "/admin/categories",
      color: "text-indigo-600"
    },
    {
      title: "Pedidos",
      description: "Acompanhe e gerencie pedidos",
      icon: ShoppingCart,
      href: "/admin/pedidos",
      color: "text-orange-600"
    },
    {
      title: "Clientes",
      description: "Gerencie informações dos clientes",
      icon: Users,
      href: "/admin/clientes",
      color: "text-purple-600"
    },
    {
      title: "Configurações",
      description: "Configure a loja e sistema",
      icon: Settings,
      href: "/admin/configuracoes",
      color: "text-gray-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold">Chiva Computer</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="outline">
                  Ver Site
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Área Administrativa
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Bem-vindo ao painel administrativo da Chiva Computer. 
            Gerencie sua loja de computadores de forma eficiente.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Receita Hoje</p>
                  <p className="text-2xl font-bold">{formatPrice(125000)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <ShoppingCart className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pedidos Hoje</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Produtos</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Clientes</p>
                  <p className="text-2xl font-bold">247</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Card key={section.href} className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to={section.href}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <section.icon className={`h-8 w-8 ${section.color}`} />
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {section.description}
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin/products">
              <Button className="w-full h-14 text-left justify-start" variant="outline">
                <Package className="h-5 w-5 mr-3" />
                Adicionar Produto
              </Button>
            </Link>
            <Link to="/admin/pedidos">
              <Button className="w-full h-14 text-left justify-start" variant="outline">
                <ShoppingCart className="h-5 w-5 mr-3" />
                Ver Pedidos Pendentes
              </Button>
            </Link>
            <Link to="/admin/configuracoes">
              <Button className="w-full h-14 text-left justify-start" variant="outline">
                <Settings className="h-5 w-5 mr-3" />
                Configurar Loja
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;

