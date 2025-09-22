import { Shield, Camera, Bell, Key, CheckCircle2, Shield as ShieldIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SecurityServices = () => {
  const solutions = [
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
      ],
      benefits: [
        'Monitoramento em tempo real 24/7',
        'Detecção inteligente de eventos',
        'Redução de falsos alarmes',
        'Evidências em alta qualidade',
        'Economia com segurança física'
      ],
      applications: [
        'Empresas e Indústrias',
        'Condomínios',
        'Comércio',
        'Estacionamentos',
        'Armazéns e Depósitos'
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
      ],
      benefits: [
        'Proteção 24 horas por dia',
        'Resposta rápida a eventos',
        'Monitoramento profissional',
        'Integração com outros sistemas',
        'Baixo custo de manutenção'
      ],
      applications: [
        'Residências',
        'Pequenas Empresas',
        'Lojas',
        'Escritórios',
        'Galpões'
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
      ],
      benefits: [
        'Controle total de acessos',
        'Registro de entradas/saídas',
        'Autenticação segura',
        'Gestão centralizada',
        'Relatórios gerenciais'
      ],
      applications: [
        'Edifícios Corporativos',
        'Indústrias',
        'Data Centers',
        'Hospitais',
        'Universidades'
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
      ],
      benefits: [
        'Proteção perimetral efetiva',
        'Efeito visual dissuasivo',
        'Baixo consumo de energia',
        'Durabilidade superior',
        'Manutenção simples'
      ],
      applications: [
        'Indústrias',
        'Galpões Logísticos',
        'Condomínios',
        'Áreas Rurais',
        'Empresas'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">Segurança Eletrônica</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Soluções completas em segurança eletrônica com tecnologia de ponta.
              Proteja seu patrimônio com sistemas inteligentes e monitoramento 24/7.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Solicitar Consultoria Gratuita
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

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Pronto para Proteger seu Patrimônio?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Nossa equipe está preparada para desenvolver a solução ideal para suas necessidades.
              Entre em contato e solicite uma avaliação gratuita.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Solicitar Orçamento
              </Button>
              <Button size="lg" variant="outline">
                Falar com Especialista
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SecurityServices;