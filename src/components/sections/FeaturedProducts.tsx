import { Wrench, Monitor } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import { getFeaturedProducts } from '@/data/products';

const FeaturedProducts = () => {
  const { industrial: industrialProducts, tech: techProducts } = getFeaturedProducts();

  const ProductSection = ({ 
    products, 
    title, 
    Icon, 
    viewAllText 
  }: {
    products: any[];
    title: string;
    Icon: any;
    viewAllText: string;
  }) => (
    <div className="mb-16">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground">Produtos em destaque da categoria</p>
          </div>
        </div>
        <Button variant="outline" className="hidden md:flex">
          {viewAllText}
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>

      {/* Mobile View All Button */}
      <div className="md:hidden mt-6 text-center">
        <Button variant="outline" className="w-full">
          {viewAllText}
        </Button>
      </div>
    </div>
  );

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <ProductSection 
          products={industrialProducts}
          title="Máquinas Industriais"
          Icon={Wrench}
          viewAllText="Ver Todas as Máquinas"
        />
        
        <ProductSection 
          products={techProducts}
          title="Tecnologia"
          Icon={Monitor}
          viewAllText="Ver Todos os Produtos"
        />
      </div>
    </section>
  );
};

export default FeaturedProducts;
