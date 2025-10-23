import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  MoreHorizontal,
  Package,
  ArrowUpDown,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Loading from '@/components/ui/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatPrice } from '@/lib/formatPrice';
import { useProducts, useCategories, useDeleteProduct, useProductStats } from '@/hooks/useApi';
import { productApi, type Product, type ProductListItem, type Category, type ProductCreateUpdate } from '@/lib/api';

const ProductsManagement = () => {
  const navigate = useNavigate();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'price' | 'category'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Success/Error state
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // API hooks
  const { 
    products, 
    loading: productsLoading, 
    error: productsError, 
    refresh: refreshProducts 
  } = useProducts({
    search: searchTerm || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    ordering: sortDirection === 'desc' ? `-${sortField}` : sortField
  });

  const { 
    categories, 
    loading: categoriesLoading 
  } = useCategories();

  const { 
    stats, 
    loading: statsLoading 
  } = useProductStats();

  const { 
    deleteProduct, 
    loading: deleteLoading 
  } = useDeleteProduct();

  // Form state
  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const handleSort = (field: 'name' | 'price' | 'category') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditProduct = (product: ProductListItem) => {
    navigate(`/admin/products/edit/${product.id}`);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      await deleteProduct(productId);
      setSuccessMessage('Produto excluído com sucesso!');
      refreshProducts();
    } catch (error) {
      setErrorMessage('Erro ao excluir produto. Tente novamente.');
    }
  };

  const handleDuplicateProduct = async (product: ProductListItem) => {
    if (!confirm(`Duplicar o produto "${product.name}"?`)) return;
    try {
      const duplicated = await productApi.duplicateProduct(product.id);
      setSuccessMessage('Produto duplicado com sucesso!');
      // Refresh list and go to edit page of the new product
      refreshProducts();
      navigate(`/admin/products/edit/${duplicated.id}`);
    } catch (error) {
      console.error(error);
      setErrorMessage('Erro ao duplicar produto.');
    }
  };

  const handleViewProduct = (productSlug: string) => {
    // Navigate to product detail page with preview flag
    navigate(`/products/${productSlug}?preview=1`);
  };

  const getStockStatus = (stockQuantity?: number) => {
    if (!stockQuantity || stockQuantity === 0) {
      return { status: 'out', color: 'bg-gray-100 text-gray-800', text: 'Sem estoque' };
    }
    if (stockQuantity <= 5) {
      return { status: 'low', color: 'bg-red-100 text-red-800', text: `${stockQuantity} unidades` };
    }
    if (stockQuantity <= 20) {
      return { status: 'medium', color: 'bg-yellow-100 text-yellow-800', text: `${stockQuantity} unidades` };
    }
    return { status: 'high', color: 'bg-green-100 text-green-800', text: `${stockQuantity} unidades` };
  };

  const getCategoryName = (categoryName?: string): string => {
    return categoryName || 'Sem categoria';
  };

  return (
    <AdminLayout>
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertTriangle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {productsError && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Erro ao carregar produtos: {productsError}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de produtos da loja
          </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/categories')}
            className="w-full sm:w-auto"
          >
            <Package className="h-4 w-4 mr-2" />
            Gerenciar Categorias
          </Button>
          <Button onClick={() => navigate('/admin/products/create')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Produtos
                </p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.total_products || products?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Produtos Ativos
                </p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.active_products || products?.filter(p => p.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Estoque Baixo
                </p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.low_stock_products || products?.filter(p => (p.stock_quantity || 0) <= 5).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Sem Estoque
                </p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.out_of_stock_products || products?.filter(p => !p.stock_quantity || p.stock_quantity === 0).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categoriesLoading ? (
                  <SelectItem value="loading" disabled>
                    Carregando categorias...
                  </SelectItem>
                ) : (
                  categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button variant="outline" disabled>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="pt-6">
          {productsLoading ? (
            <Loading label="Carregando produtos..." />
          ) : (
            <>
              <div className="rounded-md border">
                <div className="hidden md:block">
                  <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Produto</th>
                      <th className="text-left p-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSort('category')}
                          className="p-0 h-auto font-medium hover:bg-transparent"
                        >
                          Categoria
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </th>
                      <th className="text-left p-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSort('price')}
                          className="p-0 h-auto font-medium hover:bg-transparent"
                        >
                          Preço
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </th>
                      <th className="text-left p-4">Estoque</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products?.map((product) => {
                      const stock = getStockStatus(product.stock_quantity);
                      return (
                        <tr key={product.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={product.main_image_url || '/placeholder.svg'}
                                alt={product.name}
                                className="w-10 h-10 rounded-md object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{getCategoryName(product.category_name)}</Badge>
                          </td>
                          <td className="p-4">
                            <div>
                              {product.price !== undefined ? (
                                <>
                                  <p className="font-medium">{formatPrice(parseFloat(product.price))}</p>
                                  {product.original_price && parseFloat(product.original_price) > parseFloat(product.price) && (
                                    <p className="text-sm text-muted-foreground line-through">
                                      {formatPrice(parseFloat(product.original_price))}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">Preço não definido</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stock.color}`}>
                              {stock.text}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              {product.status !== 'active' && <Badge variant="secondary">Inativo</Badge>}
                              {product.is_featured && <Badge variant="default">Destaque</Badge>}
                              {product.is_on_sale && (
                                <Badge variant="destructive">Promoção</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={deleteLoading}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewProduct(product.slug)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateProduct(product)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden p-2 space-y-3">
                  {products?.map((product) => {
                    const stock = getStockStatus(product.stock_quantity);
                    return (
                      <Card key={product.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <img src={product.main_image_url || '/placeholder.svg'} alt={product.name} className="w-12 h-12 rounded-md object-cover" />
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-sm text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                                </div>
                              </div>

                              <p className="text-sm mt-2">{getCategoryName(product.category_name)}</p>
                              <p className="text-sm mt-1 font-medium">{product.price !== undefined ? formatPrice(parseFloat(product.price)) : 'Preço não definido'}</p>
                            </div>
                            <div className="ml-4 text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${stock.color}`}>{stock.text}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3">
                            <Button variant="ghost" size="sm" onClick={() => handleViewProduct(product.slug)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicateProduct(product)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              
              {(!products || products.length === 0) && !productsLoading && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum produto encontrado</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || selectedCategory 
                      ? 'Tente ajustar os filtros ou adicionar novos produtos.'
                      : 'Comece adicionando seu primeiro produto.'
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

    </AdminLayout>
  );
};

export default ProductsManagement;
