import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import { getBestSellers } from '@/data/products';

const BestSellers = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const bestSellingProducts = getBestSellers();

  const itemsPerView = {
    mobile: 2,
    desktop: 4
  };

  const maxIndex = Math.max(0, bestSellingProducts.length - itemsPerView.desktop);

  const nextSlide = () => {
    setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const visibleProducts = bestSellingProducts.slice(currentIndex, currentIndex + itemsPerView.desktop);

  return (
    <section className="py-16 bg-accent/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Mais Vendidos</h2>
              <p className="text-muted-foreground">Os produtos preferidos pelos nossos clientes</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="hidden md:flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={nextSlide}
              disabled={currentIndex >= maxIndex}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Products Carousel */}
        <div className="relative overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bestSellingProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex justify-center space-x-2 mt-6">
          <Button variant="outline" size="sm">
            Ver Mais Produtos
          </Button>
        </div>

        {/* Slide Indicators - Desktop */}
        <div className="hidden md:flex justify-center space-x-2 mt-6">
          {Array.from({ length: maxIndex + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === currentIndex 
                  ? 'bg-primary w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BestSellers;
