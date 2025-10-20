import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Linkedin, MessageCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'Sobre Nós', href: '#' },
    { name: 'Contato', href: '#' },
    { name: 'Política de Garantia', href: '#' },
    { name: 'Termos de Uso', href: '#' },
    { name: 'Política de Privacidade', href: '#' },
    { name: 'FAQ', href: '#' }
  ];

  const categories = [
    { name: 'Laptops & Notebooks', href: '#' },
    { name: 'Desktops Gaming', href: '#' },
    { name: 'Monitores', href: '#' },
    { name: 'Periféricos', href: '#' },
    { name: 'Acessórios', href: '#' },
    { name: 'Componentes', href: '#' }
  ];

  const paymentMethods = [
    'M-Pesa',
    'E-mola',
  ];

  return (
    <footer className="bg-secondary text-secondary-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            {/* Social Media */}
            <div>
              <h4 className="font-semibold mb-3">Redes Sociais</h4>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" className="hover:bg-primary hover:text-primary-foreground">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-primary hover:text-primary-foreground">
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-primary hover:text-primary-foreground">
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-primary hover:text-primary-foreground">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-white text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Categorias</h4>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.name}>
                  <a 
                    href={category.href} 
                    className="text-white text-muted-foreground hover:text-primary transition-colors"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <span>+258 87 849 4330</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span>+258 87 849 4330 (WhatsApp)</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>info@chivacomputer.co.mz</span>
              </div>
              <div className="flex items-start space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span>Nampula Shopping 1 andar loja 20<br />Nampula, Moçambique</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>Seg-Sex: 08:00-17:00</span>
              </div>
            </div>

            {/* Newsletter */}
            <div className="mt-6">
              <h5 className="font-medium mb-2">Newsletter</h5>
              <p className="text-xs text-muted-foreground mb-3">
                Receba ofertas especiais e novidades
              </p>
              <div className="flex space-x-2">
                <Input 
                  type="email" 
                  placeholder="Seu e-mail" 
                  className="text-sm"
                />
                <Button variant="default" size="sm">
                  Inscrever
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h5 className="font-medium mb-2">Métodos de Pagamento</h5>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {paymentMethods.map((method, index) => (
                  <span key={index} className="bg-muted/50 px-2 py-1 rounded">
                    {method}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-white">Compra 100% Segura</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-border bg-secondary-light">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>© {currentYear} Chiva Computer & Service Lda. Todos os direitos reservados.</p>
            {/* <p className="mt-2 md:mt-0">
              Desenvolvido com ❤️ para impulsionar negócios em Moçambique
            </p> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;