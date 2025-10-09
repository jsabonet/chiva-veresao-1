import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Clock, User } from 'lucide-react';

const AccountOverview = () => {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Minha Conta</h1>
      <p className="text-muted-foreground text-sm">Resumo geral das suas informações e atividades.</p>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Perfil</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{currentUser?.displayName || 'Sem nome definido'}</p>
            <p className="text-muted-foreground truncate">{currentUser?.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-semibold">0</p>
            <p className="text-muted-foreground">Pedidos totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Último Pedido</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Nenhum pedido ainda</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountOverview;
