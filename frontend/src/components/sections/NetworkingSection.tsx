import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, Wifi, Server, Shield, Cable, Activity, Check, Globe, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StatCardProps {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

const StatCard = ({ value, label, icon: Icon, className }: StatCardProps) => (
  <Card className={cn("border-border/40", className)}>
    <CardContent className="flex items-center p-6">
      <div className="p-2 bg-primary/10 rounded-lg mr-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </CardContent>
  </Card>
);

interface FeatureItemProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FeatureItem = ({ title, description, icon: Icon }: FeatureItemProps) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0 mt-1">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </div>
    <div>
      <h4 className="text-base font-medium mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const NetworkingSection = () => {
  const services = [
    {
      icon: Cable,
      title: 'Cabeamento Estruturado',
      description: 'Infraestrutura de rede certificada e profissional',
      features: [
        { label: 'Certificação CAT6A', highlight: true },
        { label: 'Fibra óptica', highlight: true },
        { label: 'Racks organizados' },
        { label: 'Patch panels' },
        { label: 'Documentação técnica' },
        { label: 'Testes de performance' },
        { label: 'Garantia estendida' },
        { label: 'Suporte dedicado' }
      ]
    },
    {
      icon: Wifi,
      title: 'Redes Wireless',
      description: 'Conectividade sem fio de alta performance',
      features: [
        { label: 'Wi-Fi 6E', highlight: true },
        { label: 'Mesh system', highlight: true },
        { label: 'Heat mapping' },
        { label: 'Controle de banda' },
        { label: 'Guest network' },
        { label: 'Monitoramento' },
        { label: 'Load balancing' },
        { label: 'Cloud management' }
      ]
    },
    {
      icon: Server,
      title: 'Servidores & Storage',
      description: 'Soluções empresariais de processamento e dados',
      features: [
        { label: 'Virtualização', highlight: true },
        { label: 'Storage NAS/SAN', highlight: true },
        { label: 'Backup em nuvem' },
        { label: 'Alta disponibilidade' },
        { label: 'Monitoramento 24/7' },
        { label: 'Disaster recovery' },
        { label: 'Redundância RAID' },
        { label: 'Suporte remoto' }
      ]
    },
    {
      icon: Shield,
      title: 'Segurança de Rede',
      description: 'Proteção avançada para sua infraestrutura',
      features: [
        { label: 'Next-Gen Firewall', highlight: true },
        { label: 'SD-WAN', highlight: true },
        { label: 'VPN corporativa' },
        { label: 'IDS/IPS' },
        { label: 'Web filtering' },
        { label: 'DDoS protection' },
        { label: 'Log management' },
        { label: 'Compliance' }
      ]
    }
  ];

  return (
    <section className="w-full py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center mb-12">
          <Network className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-4xl font-bold text-center mb-4">Rede de Computadores</h2>
          <p className="text-xl text-muted-foreground text-center max-w-2xl">
            Infraestrutura de rede de alto desempenho para suas necessidades corporativas
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => {
            const ServiceIcon = service.icon;
            return (
              <Card key={index} className="w-full hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-col items-center pt-6">
                  <ServiceIcon className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-center">{service.title}</h3>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center mb-6">{service.description}</p>
                  <div className="flex flex-col gap-2">
                    {service.features.map((feature, idx) => (
                      <Badge 
                        key={idx} 
                        variant={feature.highlight ? "default" : "secondary"}
                        className="w-full justify-center py-1.5"
                      >
                        {feature.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-12 text-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Solicitar Projeto
          </Button>
        </div>
      </div>
    </section>
  );
};

export default NetworkingSection;