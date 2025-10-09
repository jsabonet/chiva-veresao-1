import { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { Search, ShoppingCart, User, Menu, X, Settings, ChevronDown, ChevronUp, Heart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu';
import { Link } from 'react-router-dom';
import { useCategories, useSubcategories } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavoritesContext } from '@/contexts/FavoritesContext';
import { useAdminStatus } from '@/hooks/useAdminStatus';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [openCatIds, setOpenCatIds] = useState<Set<number>>(new Set());
  // Number of categories visible before grouping into "Mais" (responsive)
  const [maxVisible, setMaxVisible] = useState<number>(6);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isMenuOpen]);

  // Hide header on mobile when scrolling down, show when scrolling up
  const lastScrollY = useRef(0);
  useEffect(() => {
    // initialize
    try {
      lastScrollY.current = typeof window !== 'undefined' ? window.scrollY : 0;
    } catch (e) {
      lastScrollY.current = 0;
    }

    const onScroll = () => {
      if (typeof window === 'undefined') return;
      const currentY = window.scrollY || 0;
      const isMobile = window.innerWidth < 768;

      // On desktop, always show header
      if (!isMobile) {
        if (!isHeaderVisible) setIsHeaderVisible(true);
        lastScrollY.current = currentY;
        return;
      }

      // If mobile menu is open, keep header visible
      if (isMenuOpen) {
        if (!isHeaderVisible) setIsHeaderVisible(true);
        lastScrollY.current = currentY;
        return;
      }

      const delta = currentY - lastScrollY.current;
      const threshold = 8; // small threshold to avoid jitter
      if (Math.abs(delta) < threshold) return;

      if (delta > 0 && currentY > 50) {
        // scrolling down -> hide
        if (isHeaderVisible) setIsHeaderVisible(false);
      } else if (delta < 0) {
        // scrolling up -> show
        if (!isHeaderVisible) setIsHeaderVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Also update visibility on resize (in case breakpoint changes)
    const onResize = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth >= 768) {
        setIsHeaderVisible(true);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [isMenuOpen, isHeaderVisible]);

  // Close menu on Escape key (mobile)
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

  const { categories } = useCategories();
  const { subcategories } = useSubcategories();
  const { currentUser } = useAuth();
  const { totalQuantity } = useCart();
  const { favoriteCount } = useFavoritesContext();
  const { isAdmin, loading: adminStatusLoading } = useAdminStatus();

  // Debug log to help trace why admin gear may be hidden
  useEffect(() => {
    try {
      console.debug('[Header] admin status:', { isAdmin, adminStatusLoading, currentUser: currentUser ? currentUser.email : null });
    } catch (e) {
      // ignore
    }
  }, [isAdmin, adminStatusLoading, currentUser]);

  // Compute responsive limit for visible categories
  useEffect(() => {
    const computeMax = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
      // Tailwind breakpoints: md=768, lg=1024, xl=1280, 2xl=1536
      if (w >= 1536) return 8; // 2xl
      if (w >= 1280) return 6; // xl
      if (w >= 1024) return 5; // lg
      if (w >= 768) return 4;  // md
      return 3; // below md (not used for desktop nav, but safe default)
    };
    const handler = () => setMaxVisible(computeMax());
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Build menu tree: category -> subcategories
  const categoryTree = useMemo(() => {
    if (!categories) return [] as Array<{ id: number; name: string; subs: Array<{ id: number; name: string }> }>;
    const byCat: Record<number, Array<{ id: number; name: string }>> = {};
    for (const sub of subcategories || []) {
      // Keep only subcategories that have at least one active product
      const activeCount = (sub as any).product_count ?? 0;
      if (!activeCount || activeCount <= 0) continue;
      if (!byCat[sub.category]) byCat[sub.category] = [];
      byCat[sub.category].push({ id: sub.id, name: sub.name });
    }
    return categories
      .map(c => ({ id: c.id, name: c.name, subs: (byCat[c.id] || []).sort((a,b)=>a.name.localeCompare(b.name)) }))
      .filter(c => c.subs.length > 0)
      .sort((a,b)=>a.name.localeCompare(b.name));
  }, [categories, subcategories]);

  // When opening menu, expand the first category by default
  useEffect(() => {
    if (isMenuOpen) {
      if (categoryTree.length > 0) {
        setOpenCatIds(new Set([categoryTree[0].id]));
      } else {
        setOpenCatIds(new Set());
      }
    }
  }, [isMenuOpen, categoryTree]);

  const toggleMobileCategory = (id: number) => {
    setOpenCatIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Compute transform and shadow classes. Use responsive overrides so
  // the transform behavior and transition only apply on mobile (<md).
  const transformClass = isHeaderVisible ? 'translate-y-0' : '-translate-y-full';
  const shadowClass = isHeaderVisible ? 'shadow-md' : 'shadow-none';

  return (
    <header className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transform ${transformClass} md:translate-y-0 transition-transform duration-300 ease-in-out md:transition-none ${shadowClass}`}>
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row justify-center md:justify-between items-center text-sm gap-2 md:gap-0">
            <div className="flex flex-col md:flex-row items-center md:space-x-4 gap-1 md:gap-0">
              <span>📞 +258 87 849 4330</span>
              <span>📧 chivacomputer@gmail.com</span>
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
            {currentUser ? (
              <>
                <Button variant="ghost" size="icon" asChild title="Minha Conta">
                  <Link to="/account">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" asChild title="Entrar ou Registrar">
                <Link to="/login">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/carrinho" aria-label="Carrinho de compras">
                <ShoppingCart className="h-5 w-5" />
                {totalQuantity > 0 && (
                  <span
                    className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center animate-in zoom-in"
                    aria-live="polite"
                  >
                    {totalQuantity > 99 ? '99+' : totalQuantity}
                  </span>
                )}
              </Link>
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
            <NavigationMenuList className="space-x-6 flex-nowrap overflow-x-auto scrollbar-hide">
              {/* Visible categories */}
              {categoryTree.slice(0, maxVisible).map((category) => (
                <NavigationMenuItem key={category.id} className="flex-shrink-0">
                  <NavigationMenuTrigger className="text-sm font-medium">
                    {category.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[400px]">
                      {category.subs.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/products?category=${category.id}&subcategory=${sub.id}`}
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">{sub.name}</div>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
              {/* Overflow into "Mais" */}
              {categoryTree.length > maxVisible && (
                <NavigationMenuItem className="flex-shrink-0">
                  <NavigationMenuTrigger className="text-sm font-medium">Mais</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-4 p-6 w-[600px] sm:w-[700px] md:w-[800px]">
                      {categoryTree.slice(maxVisible).map((category) => (
                        <div key={category.id}>
                          <div className="text-sm font-semibold mb-2">{category.name}</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {category.subs.map((sub) => (
                              <Link
                                key={sub.id}
                                to={`/products?category=${category.id}&subcategory=${sub.id}`}
                                className="block select-none rounded-md p-2 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )}
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
            <div className="md:hidden py-2 border-t max-h-[70vh] overflow-y-auto overscroll-contain bg-background/95 backdrop-blur rounded-b-xl shadow-sm ring-1 ring-border">
              {/* Mobile menu header row */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-2 py-2 border-b">
              </div>
              <div className="px-1 sm:px-2 py-2 space-y-1">
                {categoryTree.map((category) => {
                  const isOpen = openCatIds.has(category.id);
                  return (
                    <div key={category.id} className="rounded-lg border border-transparent hover:border-border transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleMobileCategory(category.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left"
                        aria-expanded={isOpen}
                        aria-controls={`cat-${category.id}`}
                        title={category.name}
                      >
                        <span className="font-medium text-foreground">{category.name}</span>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {isOpen && (
                        <div id={`cat-${category.id}`} className="pl-3 pb-2">
                          <div className="grid grid-cols-1 gap-1">
                            {category.subs.map((sub) => (
                              <Link
                                key={sub.id}
                                to={`/products?category=${category.id}&subcategory=${sub.id}`}
                                onClick={() => setIsMenuOpen(false)}
                                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <a 
                  href="#" 
                  className="block rounded-md px-3 py-2 text-primary font-semibold hover:bg-accent/50"
                >
                  Promoções
                </a>
                <div className="h-2" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;