import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

const AccountAddresses = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Endereços</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" /> Meus Endereços</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-4">
          <p>Nenhum endereço cadastrado.</p>
          <Button size="sm">Adicionar Endereço</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountAddresses;
