import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { promotionsApi, type Promotion } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Loading from '@/components/ui/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PromotionsManagement = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await promotionsApi.listAdmin();
      setPromotions(Array.isArray(data) ? data : (data as any).results || []);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar promoções');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Promoções</h1>
          <p className="text-muted-foreground">Crie e gerencie campanhas promocionais</p>
        </div>
        <Button onClick={load} variant="outline">Atualizar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promoções Atuais</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 mb-4">{error}</div>}
          {loading ? (
            <Loading label="Carregando promoções..." />
          ) : promotions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Nenhuma promoção cadastrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">Período</th>
                    <th className="text-left p-2">Desconto</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">{new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}</td>
                      <td className="p-2">{p.discount_type === 'percentage' ? `${p.discount_value}%` : `${p.discount_value} MZN`}</td>
                      <td className="p-2">{p.status}{p.isActiveNow ? ' (Ativa)' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Criar Promoção Rápida</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Nome</Label>
            <Input placeholder="Ex: Black Friday" id="promo-name" />
          </div>
          <div>
            <Label>Desconto (%)</Label>
            <Input placeholder="Ex: 10" id="promo-discount" />
          </div>
          <div className="sm:col-span-2">
            <Button disabled variant="secondary">Salvar (em breve)</Button>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default PromotionsManagement;