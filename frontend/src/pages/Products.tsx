import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useProducts } from '@/hooks/useApi';
import ProductCard from '@/components/ui/ProductCard';
import Loading from '@/components/ui/Loading';

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
    // Prefer names coming from API payload to reflect the exact names
    const first = Array.isArray(products) && products.length > 0 ? products[0] : undefined;
    const catName = first?.category_name;
    const subName = first?.subcategory_name;
    if (subcategory && subName) return `${subName}`;
    if (category && catName) return `${catName}`;
    return 'Produtos';
  }, [category, subcategory, search, products]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        {loading && <Loading label="Carregando produtos..." />}
        {error && <div className="text-red-600">Erro: {error}</div>}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products?.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Products;
