import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Camera, Bell, Key, Shield as ShieldIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FeatureProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

const Feature = ({ title, description, icon: Icon, className }: FeatureProps) => (
  <div className={cn("flex items-start space-x-4", className)}>
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

const SecuritySection = () => {
  const services = [
    {
      icon: Camera,
      title: 'Videomonitoramento IP',
      description: 'Sistemas de CFTV avançados com análise inteligente',
      features: [
        { label: 'Câmeras IP 4K/8MP', highlight: true },
        { label: 'Análise por IA', highlight: true },
        { label: 'Reconhecimento facial' },
        { label: 'Detecção de movimento' },
        { label: 'Visão noturna IR' },
        { label: 'Gravação em nuvem' },
        { label: 'Acesso remoto 24/7' },
        { label: 'Integração móvel' }
      ]
    },
    {
      icon: Bell,
      title: 'Alarmes Inteligentes',
      description: 'Sistemas avançados de detecção e alerta',
      features: [
        { label: 'Sensores sem fio', highlight: true },
        { label: 'Sirenes inteligentes', highlight: true },
        { label: 'Notificações móveis' },
        { label: 'Integração com CFTV' },
        { label: 'Bateria backup' },
        { label: 'Monitoramento 24h' },
        { label: 'Zonas múltiplas' },
        { label: 'Controle remoto' }
      ]
    },
    {
      icon: Key,
      title: 'Controle de Acesso',
      description: 'Soluções avançadas de controle e autenticação',
      features: [
        { label: 'Biometria facial', highlight: true },
        { label: 'Cartões RFID/NFC', highlight: true },
        { label: 'Fechaduras smart' },
        { label: 'Portaria remota' },
        { label: 'Controle de visitantes' },
        { label: 'Integração cloud' },
        { label: 'Relatórios detalhados' },
        { label: 'Multi-autenticação' }
      ]
    },
    {
      icon: ShieldIcon,
      title: 'Cercas Elétricas',
      description: 'Proteção perimetral de alta performance',
      features: [
        { label: 'Alta tensão pulsada', highlight: true },
        { label: 'Hastes inox', highlight: true },
        { label: 'Alarme integrado' },
        { label: 'Sensores de violação' },
        { label: 'Módulo GSM' },
        { label: 'Bateria backup' },
        { label: 'Manutenção preventiva' },
        { label: 'Garantia extendida' }
      ]
    }
  ];

  return (
    <section className="w-full py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Segurança Eletrônica Profissional</h2>
          <p className="text-xl text-muted-foreground">
            Soluções integradas de segurança com tecnologia de ponta para proteção completa
          </p>
        </div>

        {/* Main Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {services.map((service, index) => {
            const ServiceIcon = service.icon;
            return (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/40">
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-6 p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                    <ServiceIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                  <p className="text-muted-foreground text-sm">{service.description}</p>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {service.features.filter(f => f.highlight).map((feature, idx) => (
                      <div key={idx} className="flex items-center">
                        <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                        <span className="text-sm font-medium">{feature.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/60">
                    <div className="space-y-2">
                      {service.features.filter(f => !f.highlight).map((feature, idx) => (
                        <div key={idx} className="flex items-center text-muted-foreground">
                          <div className="w-1 h-1 bg-primary/60 rounded-full mr-2" />
                          <span className="text-sm">{feature.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/security#${service.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      Saiba Mais
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Feature
            icon={Camera}
            title="Monitoramento 24/7"
            description="Central de monitoramento ativa com resposta imediata a eventos"
          />
          <Feature
            icon={Bell}
            title="Alertas Inteligentes"
            description="Notificações em tempo real e verificação automática de alarmes"
          />
          <Feature
            icon={Key}
            title="Controle Total"
            description="Gestão completa do sistema via aplicativo móvel ou web"
          />
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-slate-900 text-white rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Proteja seu patrimônio com expertise profissional
            </h3>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              Nossa equipe especializada está pronta para desenvolver uma solução 
              personalizada para suas necessidades de segurança
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/security" className="px-8">
                  Solicitar Orçamento
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white/10">
                Falar com Especialista
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;