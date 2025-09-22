import Header from '@/components/layout/Header';
import SecuritySection from '@/components/sections/SecuritySection';
import Footer from '@/components/layout/Footer';
import { Helmet } from 'react-helmet-async';

const Security = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Segurança Eletrônica - Chiva Computer & Service</title>
        <meta 
          name="description" 
          content="Soluções completas em segurança eletrônica: CFTV, alarmes, controle de acesso e cercas elétricas para sua casa ou empresa." 
        />
      </Helmet>
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-slate-900 to-primary/90 text-white py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Segurança Eletrônica Profissional
              </h1>
              <p className="text-xl md:text-2xl text-slate-200 mb-8">
                Proteja seu patrimônio com soluções integradas e tecnologia de ponta
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
                  Solicitar Orçamento
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                  Falar com Especialista
                </button>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] pointer-events-none" />
        </section>

        {/* Main Security Section with all services */}
        <SecuritySection />

        {/* Benefits Section */}
        <section className="py-16 bg-slate-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Por Que Escolher Nossa Solução?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Monitoramento 24/7",
                  description: "Central de monitoramento ativa 24 horas por dia, 7 dias por semana."
                },
                {
                  title: "Tecnologia Avançada",
                  description: "Equipamentos de última geração com recursos de inteligência artificial."
                },
                {
                  title: "Instalação Profissional",
                  description: "Equipe técnica certificada e experiente para instalação e manutenção."
                },
                {
                  title: "Suporte Técnico",
                  description: "Assistência técnica especializada e pronto atendimento."
                },
                {
                  title: "Projetos Personalizados",
                  description: "Soluções sob medida para suas necessidades específicas."
                },
                {
                  title: "Garantia Estendida",
                  description: "Garantia completa em equipamentos e serviços."
                }
              ].map((benefit, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                  <p className="text-slate-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Proteja o que é importante para você
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Entre em contato hoje mesmo e receba uma consultoria gratuita com nossos especialistas em segurança
            </p>
            <button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
              Agendar Consultoria Gratuita
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Security;
