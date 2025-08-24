import { Award, Globe, Shield, Truck, Users, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AboutSection = () => {
  const features = [
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Importação Direta",
      description: "Produtos importados diretamente dos fabricantes com qualidade garantida"
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "15 Anos de Experiência",
      description: "Mais de uma década servindo o mercado moçambicano com excelência"
    },
    {
      icon: <Truck className="h-6 w-6" />,
      title: "Entrega Nacional",
      description: "Entregamos em todo o país com segurança e agilidade"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Garantia Oficial",
      description: "Todos os produtos com garantia oficial do fabricante"
    },
    {
      icon: <Wrench className="h-6 w-6" />,
      title: "Assistência Técnica",
      description: "Suporte técnico especializado para máquinas industriais"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Atendimento Personalizado",
      description: "Consultoria especializada para escolher o produto ideal"
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Sobre a Chiva Computer & Service
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Há mais de 15 anos no mercado moçambicano, a Chiva Computer & Service é referência 
            em equipamentos industriais e produtos de informática. Oferecemos soluções completas 
            para empresas e profissionais que buscam qualidade, tecnologia e confiabilidade.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors duration-300">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-8 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <p className="text-sm text-muted-foreground">Produtos em Catálogo</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">1000+</div>
              <p className="text-sm text-muted-foreground">Clientes Satisfeitos</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">15+</div>
              <p className="text-sm text-muted-foreground">Anos de Experiência</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Suporte Online</p>
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="text-center">
          <div className="max-w-4xl mx-auto">
            <blockquote className="text-xl text-foreground font-medium italic mb-6">
              "Nossa missão é fornecer equipamentos e tecnologia de qualidade que impulsionem 
              o crescimento dos negócios em Moçambique, sempre com o melhor atendimento e preços competitivos."
            </blockquote>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button variant="default" size="lg">
                Conhecer Mais Sobre Nós
              </Button>
              <Button variant="outline" size="lg">
                Falar com Especialista
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;