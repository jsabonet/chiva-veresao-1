import { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useApi';
import { formatPrice } from '@/lib/formatPrice';

const useQuery = () => new URLSearchParams(useLocation().search);

const Products = () => {
  const query = useQuery();
  const category = query.get('category') || undefined;
  const subcategory = query.get('subcategory') || undefined;
  const search = query.get('q') || undefined;

  const { products, loading, error } = useProducts({
    category,
    ordering: '-created_at',
    ...(subcategory ? { subcategory } : {}),
    ...(search ? { search } : {}),
  });

  const title = useMemo(() => {
    if (search) return `Resultados para: ${search}`;
    if (subcategory) return 'Produtos por Subcategoria';
    if (category) return 'Produtos por Categoria';
    return 'Produtos';
  }, [category, subcategory, search]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        {loading && <div>Carregando...</div>}
        {error && <div className="text-red-600">Erro: {error}</div>}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products?.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <Link to={`/products/${p.slug}`}>
                  <img src={p.main_image_url || '/placeholder.svg'} alt={p.name} className="w-full h-48 object-cover" />
                </Link>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium line-clamp-1">{p.name}</h3>
                    {p.is_on_sale && <Badge variant="destructive">Promoção</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">{p.category_name}{p.subcategory_name ? ` • ${p.subcategory_name}` : ''}</div>
                  <div className="font-bold">{formatPrice(parseFloat(p.price))}</div>
                  <Button asChild className="w-full mt-2">
                    <Link to={`/products/${p.slug}`}>Ver detalhes</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Products;
