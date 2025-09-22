import { Network, Cable, Wifi, Server, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NetworkingServices = () => {
  const solutions = [
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
      ],
      benefits: [
        'Alta velocidade de transmissão',
        'Infraestrutura organizada',
        'Documentação completa',
        'Garantia de performance',
        'Facilidade de manutenção'
      ],
      applications: [
        'Data Centers',
        'Escritórios',
        'Indústrias',
        'Hospitais',
        'Universidades'
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
      ],
      benefits: [
        'Cobertura total',
        'Alta velocidade',
        'Gestão centralizada',
        'Segurança avançada',
        'Escalabilidade'
      ],
      applications: [
        'Empresas',
        'Hotéis',
        'Eventos',
        'Áreas públicas',
        'Residências'
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
      ],
      benefits: [
        'Alta disponibilidade',
        'Backup seguro',
        'Desempenho otimizado',
        'Recuperação rápida',
        'Escalabilidade'
      ],
      applications: [
        'Data Centers',
        'Empresas',
        'Bancos',
        'Hospitais',
        'E-commerce'
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
      ],
      benefits: [
        'Proteção avançada',
        'Conformidade',
        'Visibilidade total',
        'Controle de acesso',
        'Gestão de riscos'
      ],
      applications: [
        'Empresas',
        'Financeiro',
        'Saúde',
        'E-commerce',
        'Governo'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Network className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Redes de Computadores</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Infraestrutura de rede corporativa de alta performance.
              Soluções completas para conectividade, processamento e segurança.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Solicitar Projeto
            </Button>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {solutions.map((solution, index) => {
              const SolutionIcon = solution.icon;
              return (
                <Card key={index} className="w-full">
                  <Tabs defaultValue="features" className="w-full">
                    <CardHeader className="flex flex-col items-center pt-6">
                      <SolutionIcon className="w-12 h-12 text-primary mb-4" />
                      <h3 className="text-xl font-bold text-center">{solution.title}</h3>
                      <p className="text-muted-foreground text-center mt-2">
                        {solution.description}
                      </p>
                      <TabsList className="mt-4">
                        <TabsTrigger value="features">Recursos</TabsTrigger>
                        <TabsTrigger value="benefits">Benefícios</TabsTrigger>
                        <TabsTrigger value="applications">Aplicações</TabsTrigger>
                      </TabsList>
                    </CardHeader>
                    <CardContent className="p-6">
                      <TabsContent value="features">
                        <div className="flex flex-col gap-2">
                          {solution.features.map((feature, idx) => (
                            <Badge
                              key={idx}
                              variant={feature.highlight ? "default" : "secondary"}
                              className="w-full justify-center py-1.5"
                            >
                              {feature.label}
                            </Badge>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="benefits">
                        <ul className="space-y-2">
                          {solution.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </TabsContent>
                      <TabsContent value="applications">
                        <ul className="space-y-2">
                          {solution.applications.map((app, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                              <span>{app}</span>
                            </li>
                          ))}
                        </ul>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Transforme sua Infraestrutura de Rede
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Nossa equipe de especialistas está pronta para projetar e implementar
              a solução ideal para seu negócio. Solicite uma avaliação técnica gratuita.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Avalição Técnica Gratuita
              </Button>
              <Button size="lg" variant="outline">
                Ver Cases de Sucesso
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NetworkingServices;