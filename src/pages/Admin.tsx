import { useState } from 'react';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Plus,
  Search,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/formatPrice';

const Admin = () => {
  const [products] = useState([
    {
      id: 1,
      name: "Máquina de Sorvete Industrial GELATO PRO 3000",
      category: "Máquinas Industriais",
      price: 85000,
      stock: 5,
      status: "Ativo"
    },
    {
      id: 2,
      name: "Laptop Dell Inspiron 15",
      category: "Informática",
      price: 45000,
      stock: 12,
      status: "Ativo"
    },
    {
      id: 3,
      name: "Máquina de Corte a Laser CNC",
      category: "Máquinas Industriais",
      price: 125000,
      stock: 2,
      status: "Baixo Estoque"
    }
  ]);

  const [orders] = useState([
    {
      id: "#ORD-001",
      customer: "João Silva",
      total: 85000,
      status: "Pendente",
      date: "2024-01-15"
    },
    {
      id: "#ORD-002",
      customer: "Maria Santos",
      total: 45000,
      status: "Processando",
      date: "2024-01-14"
    },
    {
      id: "#ORD-003",
      customer: "Pedro Costa",
      total: 125000,
      status: "Entregue",
      date: "2024-01-13"
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'bg-success text-success-foreground';
      case 'baixo estoque':
        return 'bg-warning text-warning-foreground';
      case 'pendente':
        return 'bg-warning text-warning-foreground';
      case 'processando':
        return 'bg-info text-info-foreground';
      case 'entregue':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Chiva Computer & Service</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">+12% do mês passado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">+5% do dia anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(2450000)}</div>
              <p className="text-xs text-muted-foreground">+8% do mês passado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">+3% do mês passado</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="customers">Clientes</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Gerenciar Produtos</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produtos..." className="pl-10" />
              </div>
              <Button variant="outline">Filtros</Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>{product.stock} unidades</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(product.status)}>
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Gerenciar Pedidos</h2>
              <Button variant="outline">Exportar</Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>{formatPrice(order.total)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Gerenciar Clientes</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  Lista de clientes será implementada aqui.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Relatórios</h2>
              <Button variant="outline">Gerar Relatório</Button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Gráfico de vendas por categoria será implementado aqui.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Produtos Mais Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Lista dos produtos mais vendidos será implementada aqui.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;