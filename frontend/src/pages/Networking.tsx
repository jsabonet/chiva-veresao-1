import Header from '@/components/layout/Header';
import NetworkingSection from '@/components/sections/NetworkingSection';
import Footer from '@/components/layout/Footer';
import { Network, Wifi, Server, Shield, Cable } from 'lucide-react';

const Networking = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-slate-900 to-primary/90 text-white py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Infraestrutura de Rede Profissional
              </h1>
              <p className="text-xl md:text-2xl text-slate-200 mb-8">
                Soluções completas em redes corporativas e residenciais
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
                  Solicitar Projeto
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                  Consultar Especialista
                </button>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] pointer-events-none" />
        </section>

        {/* Main Networking Section with all services */}
        <NetworkingSection />

        {/* Solutions Grid */}
        <section className="py-16 bg-slate-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Nossas Soluções</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Cable,
                  title: "Cabeamento Estruturado",
                  features: [
                    "Certificação CAT6A",
                    "Fibra óptica",
                    "Organização de racks",
                    "Documentação técnica"
                  ]
                },
                {
                  icon: Wifi,
                  title: "Redes Wireless",
                  features: [
                    "Wi-Fi 6E",
                    "Mesh network",
                    "Análise de cobertura",
                    "Controle de acesso"
                  ]
                },
                {
                  icon: Server,
                  title: "Servidores & Storage",
                  features: [
                    "Virtualização",
                    "Backup em nuvem",
                    "Alta disponibilidade",
                    "Monitoramento 24/7"
                  ]
                },
                {
                  icon: Shield,
                  title: "Segurança de Rede",
                  features: [
                    "Next-Gen Firewall",
                    "VPN corporativa",
                    "IDS/IPS",
                    "Análise de tráfego"
                  ]
                },
                {
                  icon: Network,
                  title: "Projetos de Rede",
                  features: [
                    "Consultoria especializada",
                    "Dimensionamento",
                    "Documentação",
                    "Suporte contínuo"
                  ]
                }
              ].map((solution, index) => {
                const Icon = solution.icon;
                return (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <Icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-4">{solution.title}</h3>
                    <ul className="space-y-2">
                      {solution.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-slate-600">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Nosso Processo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Análise",
                  description: "Avaliação completa das necessidades e infraestrutura existente"
                },
                {
                  step: "02",
                  title: "Projeto",
                  description: "Desenvolvimento da solução técnica e planejamento detalhado"
                },
                {
                  step: "03",
                  title: "Implementação",
                  description: "Execução do projeto com equipe especializada"
                },
                {
                  step: "04",
                  title: "Suporte",
                  description: "Monitoramento contínuo e suporte técnico especializado"
                }
              ].map((phase, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-bold text-primary mb-4">{phase.step}</div>
                  <h3 className="text-xl font-semibold mb-2">{phase.title}</h3>
                  <p className="text-slate-600">{phase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Modernize sua infraestrutura de rede
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Entre em contato para uma avaliação gratuita das necessidades da sua empresa
            </p>
            <button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
              Agendar Avaliação Gratuita
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Networking;
