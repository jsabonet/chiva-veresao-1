import { useState } from 'react';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const categories = [
    {
      name: 'Máquinas Industriais',
      subcategories: ['Máquinas de Sorvete', 'Máquinas de Talho', 'Corte a Laser', 'Máquinas de Ração', 'Máquinas de Costura', 'Perfuração de Água']
    },
    {
      name: 'Informática e Acessórios', 
      subcategories: ['Laptops', 'Monitores', 'Teclados e Mouses', 'Impressoras', 'Acessórios', 'Periféricos']
    },
    {
      name: 'Importados & Diversos',
      subcategories: ['Ferramentas', 'Peças de Reposição', 'Equipamentos Especiais', 'Produtos Importados']
    }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row justify-center md:justify-between items-center text-sm gap-2 md:gap-0">
            <div className="flex flex-col md:flex-row items-center md:space-x-4 gap-1 md:gap-0">
              <span>📞 +258 87 849 4330</span>
              <span>📧 chivaimportacoes@gmail.com</span>
            </div>
            <div className="flex md:flex space-x-2">
              <span className="md:block">WhatsApp: +258 87 849 4330</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/image.png" 
              alt="Chiva Computer & Service" 
              className="h-12 w-auto"
            />
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Buscar produtos..."
                className="pl-4 pr-10 w-full"
              />
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/carrinho">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <div className="md:hidden mt-4">
          <div className="relative">
            <Input
              type="search"
              placeholder="Buscar produtos..."
              className="pl-4 pr-10 w-full"
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="border-t">
        <div className="container mx-auto px-4">
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="space-x-6">
              {categories.map((category) => (
                <NavigationMenuItem key={category.name}>
                  <NavigationMenuTrigger className="text-sm font-medium">
                    {category.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[400px]">
                      {category.subcategories.map((sub) => (
                        <a
                          key={sub}
                          href="#"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">{sub}</div>
                        </a>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
              <NavigationMenuItem>
                <a 
                  href="#" 
                  className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                >
                  <span className="text-primary font-semibold">Promoções</span>
                </a>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.name} className="border-b border-border pb-2">
                    <button className="font-medium text-foreground py-2 w-full text-left">
                      {category.name}
                    </button>
                    <div className="pl-4 space-y-1">
                      {category.subcategories.map((sub) => (
                        <a
                          key={sub}
                          href="#"
                          className="block py-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          {sub}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
                <a 
                  href="#" 
                  className="block py-2 text-primary font-semibold"
                >
                  Promoções
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;