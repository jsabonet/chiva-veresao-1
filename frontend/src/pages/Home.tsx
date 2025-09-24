import Header from '@/components/layout/Header';
import HeroSection from '@/components/sections/HeroSection';
import FeaturedProducts from '@/components/sections/FeaturedProducts';
import BestSellers from '@/components/sections/BestSellers';
import AboutSection from '@/components/sections/AboutSection';
import Footer from '@/components/layout/Footer';
import { Shield, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const ServicePreview = ({ 
  icon: Icon, 
  title, 
  description, 
  features, 
  linkTo, 
  ctaText 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  features: string[]; 
  linkTo: string;
  ctaText: string;
}) => (
  <div className="relative group">
    <div className="h-full bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-slate-100">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full transform group-hover:scale-110 transition-transform duration-500" />
          <div className="relative p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-500">
            <Icon className="w-12 h-12 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
          <p className="text-muted-foreground text-base leading-relaxed max-w-md">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-8 mb-10">
        <ul className="space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start text-sm">
              <svg
                className="mr-3 h-5 w-5 text-primary flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4"
                />
              </svg>
              <span className="text-base">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-center">
        <Button 
          asChild
          className="w-full font-medium transition-all duration-300 hover:scale-105"
          size="lg"
        >
          <Link to={linkTo}>
            {ctaText}
          </Link>
        </Button>
      </div>
    </div>
  </div>
);

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturedProducts />
        <BestSellers />
        
        {/* Services Preview Section */}
        <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl font-bold tracking-tight">
                Nossos Serviços Especializados
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Soluções profissionais em segurança eletrônica e infraestrutura de rede 
                para impulsionar o sucesso do seu negócio
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              <ServicePreview 
                icon={Shield}
                title="Segurança Eletrônica"
                description="Proteção completa e inteligente para seu patrimônio com sistemas de última geração integrados e monitoramento avançado"
                features={[
                  "Câmeras IP 4K com detecção inteligente por IA",
                  "Sistema de alarme com zonas inteligentes",
                  "Controle de acesso biométrico e RFID",
                  "Central de monitoramento 24/7 com backup"
                ]}
                linkTo="/security"
                ctaText="Conheça Nossas Soluções"
              />
              <ServicePreview 
                icon={Network}
                title="Rede de Computadores"
                description="Infraestrutura de rede profissional projetada para máxima performance, segurança e escalabilidade do seu negócio"
                features={[
                  "Cabeamento estruturado Cat6A/Cat7",
                  "Redes wireless empresariais com roaming",
                  "Servidores & storage com redundância",
                  "Firewall UTM & segurança avançada"
                ]}
                linkTo="/networking"
                ctaText="Explore Nossos Serviços"
              />
            </div>
          </div>
        </section>

        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default Home;