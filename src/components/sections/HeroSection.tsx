import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Monitor, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import computersHero from '@/assets/computers-hero.jpg';
import laptop from '@/assets/laptop.jpg';

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      id: 1,
      image: computersHero,
      title: "Tecnologia de Ponta em Moçambique",
      subtitle: "Computadores e acessórios de alta qualidade",
      description: "Laptops, desktops, monitores e periféricos das melhores marcas do mercado",
      cta: "Ver Produtos",
      ctaSecondary: "Ofertas Especiais",
      icon: <Monitor className="h-8 w-8" />,
      category: "computers"
    },
    {
      id: 2,
      image: laptop,
      title: "Laptops & Notebooks",
      subtitle: "Performance e portabilidade",
      description: "Desde ultrabooks executivos até laptops gaming de alta performance",
      cta: "Ver Laptops",
      ctaSecondary: "Configurar PC",
      icon: <Cpu className="h-8 w-8" />,
      category: "laptops"
    }
  ];

  // Auto-rotate slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const currentSlideData = slides[currentSlide];

  return (
    <section className="relative h-[600px] md:h-[700px] overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url(${currentSlideData.image})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl text-white">
          {/* Icon & Category */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-primary/20 rounded-full backdrop-blur-sm">
              {currentSlideData.icon}
            </div>
            <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">
              {currentSlideData.category === 'industrial' ? 'Máquinas Industriais' : 'Tecnologia'}
            </span>
          </div>

          {/* Main Content */}
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            {currentSlideData.title}
          </h1>
          
          <h2 className="text-xl md:text-2xl mb-4 text-gray-200">
            {currentSlideData.subtitle}
          </h2>
          
          <p className="text-lg mb-8 text-gray-300 max-w-lg">
            {currentSlideData.description}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="lg" className="text-base">
              {currentSlideData.cta}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              {currentSlideData.ctaSecondary}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute inset-0 flex items-center justify-between p-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          className="bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm rounded-full"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          className="bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm rounded-full"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-primary scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 right-8 z-20">
        <div className="text-white/70 text-sm font-medium">
          {String(currentSlide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;