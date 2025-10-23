import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign,
  AlertTriangle,
  Eye,
  Star,
  BarChart3,
  Search,
  Download,
  Settings
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProductStats, useProducts, useCategories, useDeleteProduct } from '@/hooks/useApi';
import { formatPrice, getImageUrl } from '@/lib/api';
import { useExport, generateFilename } from '@/hooks/useExport';
import Loading from '@/components/ui/Loading';

// Statistics Card Component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'positive',
  loading = false 
}: {
  title: string;
  value: string | number;
  icon: any;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {loading ? '...' : value}
      </div>
      {change && (
        <p className={`text-xs mt-1 flex items-center ${
          changeType === 'positive' ? 'text-green-600' : 
          changeType === 'negative' ? 'text-red-600' : 
          'text-muted-foreground'
        }`}>
          {changeType === 'positive' && <TrendingUp className="h-3 w-3 mr-1" />}
          {changeType === 'negative' && <TrendingDown className="h-3 w-3 mr-1" />}
          {change}
        </p>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { stats, loading: statsLoading, error: statsError, refresh } = useProductStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { categories, loading: categoriesLoading } = useCategories();
  const { products, loading: productsLoading, refresh: refreshProducts } = useProducts({ ordering: '-created_at', search: searchQuery || undefined, category: categoryFilter === 'all' ? undefined : categoryFilter, status: statusFilter === 'all' ? undefined : statusFilter });
  const { deleteProduct, loading: deleting } = useDeleteProduct();
  const { exportData, isExporting } = useExport();

  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (confirm(`Tem certeza que deseja deletar o produto "${productName}"?`)) {
      try {
        await deleteProduct(productId);
        // Refresh stats since product count changed
        refresh();
        alert('Produto deletado com sucesso!');
        // Note: You may need to reload the page or implement a refetch mechanism
        window.location.reload();
      } catch (error) {
        alert('Erro ao deletar produto. Tente novamente.');
      }
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    await exportData({
      endpoint: '/cart/admin/export/dashboard',
      format,
      filename: generateFilename('dashboard_stats'),
      filters: { days: 30 }
    });
  };

  // Get recent products (last 5)
  const recentProducts = products.slice(0, 5);

  // Get low stock products
  const lowStockProducts = products.filter(
    product => product.is_low_stock
  );

  // Get top selling products (mock data based on view count for now)
  const topProducts = products
    .filter(p => p.view_count > 0)
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 5);

  // Get products by category for analysis
  const getProductsByCategory = () => {
    const categoryStats = categories.map(category => {
      const categoryProducts = products.filter(p => p.category_name === category.name);
      return {
        name: category.name,
        count: categoryProducts.length,
        totalValue: categoryProducts.reduce((sum, p) => sum + (parseFloat(p.price) * p.stock_quantity), 0)
      };
    });
    return categoryStats.filter(stat => stat.count > 0);
  };

  const categoryStats = getProductsByCategory();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do seu sistema de e-commerce
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2">
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exportando...' : 'Exportar'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Exportar Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Exportar CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => navigate('/admin/configuracoes')} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </div>
            <div>
              <Button onClick={refresh} disabled={statsLoading}>
                Atualizar Dados
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {statsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Erro ao carregar estatísticas: {statsError}</p>
          </div>
        )}

        {/* Primary Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Produtos"
            value={stats?.total_products || 0}
            icon={Package}
            change="+5.1% vs mês anterior"
            changeType="positive"
            loading={statsLoading}
          />
          <StatCard
            title="Produtos Ativos"
            value={stats?.active_products || 0}
            icon={TrendingUp}
            change="+8.2% vs mês anterior"
            changeType="positive"
            loading={statsLoading}
          />
          <StatCard
            title="Valor do Estoque"
            value={stats ? formatPrice(stats.total_stock_value) : '0'}
            icon={DollarSign}
            change="+12.5% vs mês anterior"
            changeType="positive"
            loading={statsLoading}
          />
          <StatCard
            title="Categorias"
            value={stats?.categories_count || 0}
            icon={ShoppingCart}
            loading={statsLoading}
          />
        </div>

        {/* Alert Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
                <CardTitle className="text-orange-800 flex flex-col sm:flex-row sm:items-center gap-2 text-sm sm:text-base">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /><span>Produtos com Estoque Baixo</span></span>
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-orange-800">
                  {stats?.low_stock_products || 0}
                </span>
                <span className="text-orange-600 ml-2">produtos precisam de reposição</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex flex-col sm:flex-row sm:items-center gap-2 text-sm sm:text-base">
                <span className="flex items-center gap-2"><Star className="h-5 w-5" /><span>Produtos em Destaque</span></span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-800">
                  {stats?.featured_products || 0}
                </span>
                <span className="text-blue-600 ml-2">produtos destacados</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          {/* Mobile sticky tabs (only visible on xs) */}
          <div className="sm:hidden sticky top-16 z-40 bg-white/95 backdrop-blur-md">
            <TabsList className="p-2">
              {/* allow wrapping of tab triggers on small screens (mobile-first) */}
              <div className="flex flex-wrap gap-2">
                <TabsTrigger className="whitespace-normal px-3 py-2 text-sm touch-manipulation rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white" value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger className="whitespace-normal px-3 py-2 text-sm touch-manipulation rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white" value="products">Gestão de Produtos</TabsTrigger>
                <TabsTrigger className="whitespace-normal px-3 py-2 text-sm touch-manipulation rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white" value="recent">Produtos Recentes</TabsTrigger>
                <TabsTrigger className="whitespace-normal px-3 py-2 text-sm touch-manipulation rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white" value="low-stock">Estoque Baixo</TabsTrigger>
                <TabsTrigger className="whitespace-normal px-3 py-2 text-sm touch-manipulation rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white" value="analytics">Analytics</TabsTrigger>
              </div>
            </TabsList>
          </div>

          {/* Desktop/Tablet grid tabs */}
          <div className="hidden sm:block">
            <TabsList className="p-1">
              <div className="grid grid-cols-5 gap-3">
                <TabsTrigger className="px-3 py-1 text-sm" value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger className="px-3 py-1 text-sm" value="products">Gestão de Produtos</TabsTrigger>
                <TabsTrigger className="px-3 py-1 text-sm" value="recent">Produtos Recentes</TabsTrigger>
                <TabsTrigger className="px-3 py-1 text-sm" value="low-stock">Estoque Baixo</TabsTrigger>
                <TabsTrigger className="px-3 py-1 text-sm" value="analytics">Analytics</TabsTrigger>
              </div>
            </TabsList>
          </div>

          {/* spacer to avoid content being hidden under sticky tabs on mobile; increased to support two wrapped rows */}
          <div className="sm:hidden h-24" aria-hidden />

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Statistics Overview */}
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Estatísticas dos Produtos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Preço Médio</p>
                      <p className="text-2xl font-bold">
                        {stats ? formatPrice(stats.average_price) : '0'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Best Sellers</p>
                      <p className="text-2xl font-bold">{stats?.bestsellers || 0}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Em Promoção</p>
                      <p className="text-2xl font-bold">{stats?.products_on_sale || 0}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Fora de Estoque</p>
                      <p className="text-2xl font-bold text-red-600">
                        {stats?.out_of_stock_products || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products by Views */}
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Produtos Mais Visualizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topProducts.length > 0 ? (
                      topProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="ml-4 space-y-1 flex-1">
                            <p className="text-sm font-medium leading-none">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.category_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="w-3 h-3" />
                              {product.view_count}
                            </div>
                            <p className="text-sm font-medium">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum produto com visualizações ainda
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    <span className="font-medium">Gestão de Produtos</span>
                  </div>
                  <div>
                    <Button onClick={() => navigate('/admin/products/create')}>
                      Adicionar Produto
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative w-full sm:flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Buscar produtos..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              // Refresh products when pressing Enter
                              refreshProducts();
                            }
                          }}
                        />
                      </div>
                    <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Status filter */}
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                        <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Products Table */}
                  <div className="border rounded-lg">
                    {/* Table view for sm+ screens */}
                    <div className="hidden sm:block">
                      <div className="grid grid-cols-6 gap-4 p-4 border-b font-medium text-sm">
                        <div>Produto</div>
                        <div>Categoria</div>
                        <div>Preço</div>
                        <div>Estoque</div>
                        <div>Status</div>
                        <div>Ações</div>
                      </div>
                      {productsLoading ? (
                        <div className="p-8">
                          <Loading label="Carregando produtos..." />
                        </div>
                      ) : products.length > 0 ? (
                        products.slice(0, 10).map((product) => (
                          <div key={product.id} className="grid grid-cols-6 gap-4 p-4 border-b items-center hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              {product.main_image_url && (
                                <img 
                                  src={getImageUrl(product.main_image_url)}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/placeholder.svg";
                                  }}
                                />
                              )}
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                              </div>
                            </div>
                            <div>
                              <Badge variant="outline" className="text-xs">
                                {product.category_name}
                              </Badge>
                            </div>
                            <div>
                              <p className="font-medium">{formatPrice(product.price)}</p>
                              {product.original_price && product.original_price !== product.price && (
                                <p className="text-xs text-muted-foreground line-through">
                                  {formatPrice(product.original_price)}
                                </p>
                              )}
                            </div>
                            <div>
                              <Badge 
                                variant={
                                  product.stock_quantity === 0 ? "destructive" : 
                                  product.is_low_stock ? "secondary" : "default"
                                }
                                className="text-xs"
                              >
                                {product.stock_quantity}
                              </Badge>
                            </div>
                            <div>
                              <Badge 
                                variant={product.status === 'active' ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {product.status === 'active' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                              >
                                Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled={deleting}
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                              >
                                {deleting ? 'Deletando...' : 'Deletar'}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-muted-foreground">Nenhum produto encontrado</p>
                        </div>
                      )}
                    </div>

                    {/* Card/list view for mobile */}
                    <div className="sm:hidden">
                      {productsLoading ? (
                        <div className="p-6">
                          <Loading label="Carregando produtos..." />
                        </div>
                      ) : products.length > 0 ? (
                        <div className="space-y-3 p-2">
                          {products.slice(0, 10).map((product) => (
                            <div key={product.id} className="border rounded-lg p-3 bg-white">
                              <div className="flex items-start gap-3">
                                {product.main_image_url && (
                                  <img src={getImageUrl(product.main_image_url)} alt={product.name} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium line-clamp-2 break-words">{product.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{product.category_name}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="font-medium">{formatPrice(product.price)}</p>
                                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Badge variant="outline" className="text-xs max-w-[6rem] truncate">{product.category_name}</Badge>
                                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">{product.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => navigate(`/admin/products/edit/${product.id}`)}>Editar</Button>
                                      <Button size="sm" variant="outline" className="whitespace-nowrap" disabled={deleting} onClick={() => handleDeleteProduct(product.id, product.name)}>{deleting ? 'Deletando...' : 'Deletar'}</Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-muted-foreground">Nenhum produto encontrado</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pagination */}
                  {products.length > 10 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Mostrando 10 de {products.length} produtos
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled>
                          Anterior
                        </Button>
                        <Button variant="outline" size="sm">
                          Próximo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Produtos Adicionados Recentemente</CardTitle>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentProducts.length > 0 ? (
                  <div className="space-y-4">
                    {recentProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {product.main_image_url && (
                            <img 
                              src={getImageUrl(product.main_image_url)}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                              }}
                            />
                          )}
                          <div>
                            <h4 className="font-medium">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {product.category_name} • SKU: {product.sku}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(product.price)}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                              {product.stock_quantity} em estoque
                            </Badge>
                            {product.view_count > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Eye className="w-3 h-3" />
                                {product.view_count}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum produto encontrado.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="low-stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm sm:text-base">
                  <span className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /><span>Produtos com Estoque Baixo</span></span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockProducts.length > 0 ? (
                  <div className="space-y-4">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg bg-amber-50">
                        <div className="flex items-center space-x-4">
                          {product.main_image_url && (
                            <img 
                              src={getImageUrl(product.main_image_url)}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                              }}
                            />
                          )}
                          <div>
                            <h4 className="font-medium">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {product.category_name} • SKU: {product.sku}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">
                            {product.stock_quantity} restante(s)
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Estoque baixo
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum produto com estoque baixo.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Products by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Produtos por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoriesLoading ? (
                    <p>Carregando categorias...</p>
                  ) : categoryStats.length > 0 ? (
                    <div className="space-y-4">
                      {categoryStats.map((category) => (
                        <div key={category.name} className="flex items-center">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{category.name}</p>
                            <div className="flex items-center mt-1">
                              <Progress 
                                value={(category.count / Math.max(...categoryStats.map(c => c.count))) * 100} 
                                className="w-24 h-2 mr-2" 
                              />
                              <span className="text-xs text-muted-foreground">
                                {category.count} produtos
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            {formatPrice(category.totalValue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhuma categoria com produtos encontrada.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Stock Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Status do Estoque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Produtos em Estoque</span>
                    <Badge variant="default">
                      {(stats?.active_products || 0) - (stats?.out_of_stock_products || 0)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fora de Estoque</span>
                    <Badge variant="destructive">{stats?.out_of_stock_products || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estoque Baixo</span>
                    <Badge variant="secondary">{stats?.low_stock_products || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Produtos Inativos</span>
                    <Badge variant="outline">{stats?.inactive_products || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export { AdminDashboard };
export default AdminDashboard;
