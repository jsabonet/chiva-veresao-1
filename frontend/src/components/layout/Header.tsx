import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ShoppingCart, User, Menu, X, Settings, ChevronDown, ChevronUp, Heart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu';
import { Link, useNavigate } from 'react-router-dom';
import { useCategories, useSubcategories } from '@/hooks/useApi';
import { apiClient, productApi, type Product, type ProductListItem, type Category, type Subcategory, formatPrice, getImageUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavoritesContext } from '@/contexts/FavoritesContext';
import { useAdminStatus } from '@/hooks/useAdminStatus';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [spacerHeight, setSpacerHeight] = useState<number | null>(null);
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
  const ignoreScrollUntil = useRef(0);
  const collapseTimer = useRef<number | null>(null);
  const TRANSITION_MS = 300;
  useEffect(() => {
    // initialize
    try {
      lastScrollY.current = typeof window !== 'undefined' ? window.scrollY : 0;
    } catch (e) {
      lastScrollY.current = 0;
    }

  const onScroll = () => {
  // If we're currently ignoring scrolls (during hide/show animation), skip
  if (ignoreScrollUntil.current && Date.now() < ignoreScrollUntil.current) return;
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
      const hideThreshold = 14; // require larger downward movement to hide
      const showThreshold = 6;  // smaller upward movement to show

      // Scrolling down: hide immediately on a clear downward gesture
      if (delta > hideThreshold && currentY > 50) {
        if (isHeaderVisible) {
          setIsHeaderVisible(false);
          ignoreScrollUntil.current = Date.now() + 320;
          // Collapse spacer after the CSS transition finishes so content doesn't
          // immediately jump under the header and cause a visual pulse.
          if (collapseTimer.current) {
            clearTimeout(collapseTimer.current);
            collapseTimer.current = null;
          }
          collapseTimer.current = window.setTimeout(() => {
            setSpacerHeight(0);
            collapseTimer.current = null;
          }, TRANSITION_MS + 20);
        }
        lastScrollY.current = currentY;
        return;
      }

      // Scrolling up: show immediately on upward gesture
      if (delta < -showThreshold) {
        if (!isHeaderVisible) {
          // When showing, immediately ensure spacer is at header height so
          // there's no gap/pulse while the header animates into view.
          setSpacerHeight(headerHeight);
          setIsHeaderVisible(true);
          ignoreScrollUntil.current = Date.now() + 320;
        }
        lastScrollY.current = currentY;
        return;
      }

      // Not enough movement: just update lastScrollY for future deltas
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

    // Measure header height initially and on relevant changes (menu open/close)
    const measure = () => {
      try {
        const el = headerRef.current;
        if (el) {
          const h = el.offsetHeight;
          setHeaderHeight(h);
          // initialize spacerHeight on first measure or when header size changes
          setSpacerHeight((prev) => (prev === null ? h : h));
        }
      } catch (e) {
        // ignore
      }
    };
    measure();
    window.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('resize', measure);
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
      }
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
  const transformClass = isHeaderVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0';
  const shadowClass = isHeaderVisible ? 'shadow-md' : 'shadow-none';

  return (
    <>
      {/* Use fixed so header is removed from document flow; spacer controls layout.
          This ensures that when spacer collapses to 0 the next section sits at the very top. */}
  <header ref={headerRef} className={`fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transform ${transformClass} md:translate-y-0 transition-all duration-300 ease-in-out md:transition-none ${shadowClass}`}>
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

          {/* Search Bar - Desktop with suggestions */}
          <SearchBox />

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
          <SearchBox fullWidth />
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
      {/* Spacer to reserve/collapse space so content moves smoothly when header hides on mobile.
          On desktop we keep the spacer height equal to headerHeight so layout is stable. */}
      <div
        aria-hidden
        className={`w-full transition-[height] duration-300 ease-in-out`}
        style={{ height: (() => {
          // On desktop, always reserve full header height
          if (typeof window !== 'undefined' && window.innerWidth >= 768) return `${headerHeight}px`;
          // Use controlled spacerHeight state to avoid layout shift during show/hide
          if (spacerHeight === null) return `${headerHeight}px`;
          return `${spacerHeight}px`;
        })() }}
      />
    </>
  );
};

export default Header;

// --- SearchBox component ---
const SearchBox: React.FC<{ fullWidth?: boolean }> = ({ fullWidth = false }) => {
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [recomms, setRecomms] = useState<ProductListItem[]>([]);
  const [sales, setSales] = useState<ProductListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { subcategories } = useSubcategories();

  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Debounced search
  useEffect(() => {
    let active = true;
    const handler = setTimeout(async () => {
      const q = term.trim();
      if (!active) return;
      if (q.length < 2) {
        setResults([]);
        setError(null);
        // Prefetch strategic recommendations: bestsellers and on-sale
        try {
          const [b, s] = await Promise.all([
            productApi.getBestsellerProducts(),
            productApi.getSaleProducts(),
          ]);
          if (!active) return;
          setRecomms(Array.isArray(b) ? b.slice(0, 5) : []);
          setSales(Array.isArray(s) ? s.slice(0, 5) : []);
        } catch {
          // ignore
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const found = await productApi.searchProducts({ q });
        if (!active) return;
        setResults(Array.isArray(found) ? found.slice(0, 8) : []);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Erro na pesquisa');
        setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(handler); };
  }, [term]);

  const onSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = term.trim();
    if (q.length === 0) return;
    setFocused(false);
    navigate(`/products?q=${encodeURIComponent(q)}`);
  };

  const containerClass = fullWidth ? 'w-full' : 'hidden md:flex flex-1 max-w-md mx-8';

  return (
    <div className={containerClass}>
      <div ref={boxRef} className="relative w-full">
      <form onSubmit={onSubmit} className="w-full">
        <Input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Buscar produtos..."
          className="pl-4 pr-10 w-full"
          aria-label="Buscar produtos"
        />
        <Button
          size="sm"
          variant="ghost"
          type="submit"
          aria-label="Pesquisar"
          className="absolute right-1 top-1/2 transform -translate-y-1/2"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Suggestions dropdown */}
        {focused && (
          <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="max-h-[70vh] overflow-y-auto">
              {term.trim().length < 2 ? (
                <div className="p-3 space-y-4">
                  <div className="text-xs text-muted-foreground">Sugestões</div>
                  {/* Bestsellers */}
                  {recomms.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Mais vendidos</div>
                      <ul className="divide-y">
                        {recomms.map((p) => (
                          <li key={p.id}>
                            <Link
                              to={`/products/${p.slug}`}
                              onClick={() => setFocused(false)}
                              className="flex items-center gap-3 p-2 hover:bg-accent rounded"
                            >
                              <img src={getImageUrl(p.main_image_url)} alt="" className="h-10 w-10 object-cover rounded" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm">{p.name}</div>
                                {p.is_bestseller && (
                                  <div className="text-[10px] inline-flex px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 mt-0.5">TOP</div>
                                )}
                              </div>
                              <div className="text-xs font-medium text-foreground whitespace-nowrap">{formatPrice(p.price)}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* On sale */}
                  {sales.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Em promoção</div>
                      <ul className="divide-y">
                        {sales.map((p) => (
                          <li key={p.id}>
                            <Link
                              to={`/products/${p.slug}`}
                              onClick={() => setFocused(false)}
                              className="flex items-center gap-3 p-2 hover:bg-accent rounded"
                            >
                              <img src={getImageUrl(p.main_image_url)} alt="" className="h-10 w-10 object-cover rounded" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm">{p.name}</div>
                                {p.is_on_sale && (
                                  <div className="text-[10px] inline-flex px-1.5 py-0.5 rounded bg-red-100 text-red-700 mt-0.5">SALE</div>
                                )}
                              </div>
                              <div className="text-xs font-medium text-foreground whitespace-nowrap">{formatPrice(p.price)}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recomms.length === 0 && sales.length === 0 && (
                    <div className="text-sm text-muted-foreground">Digite pelo menos 2 letras para pesquisar.</div>
                  )}
                </div>
              ) : (
                <div className="p-3 space-y-4">
                  {/* Category/Subcategory matches */}
                  {(() => {
                    const qn = normalize(term.trim());
                    const catMatches = (categories || [])
                      .filter((c: Category) => normalize(c.name).includes(qn))
                      .slice(0, 5);
                    const subMatches = (subcategories || [])
                      .filter((s: Subcategory) => normalize(s.name).includes(qn))
                      .slice(0, 5);
                    return (
                      <>
                        {catMatches.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold mb-2 text-muted-foreground">Categorias</div>
                            <div className="grid grid-cols-1 gap-1">
                              {catMatches.map((c) => (
                                <Link
                                  key={c.id}
                                  to={`/products?category=${c.id}`}
                                  onClick={() => setFocused(false)}
                                  className="block rounded p-2 text-sm hover:bg-accent"
                                >
                                  {c.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                        {subMatches.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold mb-2 text-muted-foreground">Subcategorias</div>
                            <div className="grid grid-cols-1 gap-1">
                              {subMatches.map((s) => (
                                <Link
                                  key={s.id}
                                  to={`/products?category=${s.category}&subcategory=${s.id}`}
                                  onClick={() => setFocused(false)}
                                  className="block rounded p-2 text-sm hover:bg-accent"
                                >
                                  {s.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Product results with image and price */}
                  {loading && <div className="p-2 text-sm text-muted-foreground">Pesquisando...</div>}
                  {error && <div className="p-2 text-sm text-red-600">{error}</div>}
                  {!loading && !error && results.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">Sem resultados.</div>
                  )}
                  {!loading && !error && results.length > 0 && (
                    <ul className="divide-y">
                      {results.map((p) => {
                        const img = (p as any).main_image_url || (p as any).main_image;
                        const price = (p as any).price;
                        return (
                          <li key={p.id}>
                            <Link
                              to={`/products/${p.slug}`}
                              onClick={() => setFocused(false)}
                              className="flex items-center gap-3 p-2 hover:bg-accent rounded"
                            >
                              <img src={getImageUrl(img)} alt="" className="h-10 w-10 object-cover rounded" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm">{p.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{p.subcategory_name || ''}</div>
                              </div>
                              {price && (
                                <div className="text-xs font-medium text-foreground whitespace-nowrap">{formatPrice(price)}</div>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* CTA: See more in dominant category */}
                  {(() => {
                    if (!results || results.length < 3 || !categories || categories.length === 0) return null;
                    const counts = new Map<number, number>();
                    for (const p of results) {
                      const c = (p as any).category;
                      let cid: number | undefined;
                      if (typeof c === 'number') cid = c;
                      else if (c && typeof c === 'object' && 'id' in c) cid = (c as any).id as number;
                      if (cid) counts.set(cid, (counts.get(cid) || 0) + 1);
                    }
                    if (counts.size === 0) return null;
                    // Find top category
                    let topId: number | null = null;
                    let topCount = 0;
                    counts.forEach((v, k) => { if (v > topCount) { topCount = v; topId = k; } });
                    if (!topId) return null;
                    const ratio = topCount / results.length;
                    if (ratio < 0.6) return null; // require 60% concentration
                    const catObj = (categories as Category[]).find(c => c.id === topId);
                    if (!catObj) return null;
                    return (
                      <div className="pt-2">
                        <Link
                          to={`/products?category=${topId}`}
                          onClick={() => setFocused(false)}
                          className="block w-full text-center rounded border px-3 py-2 text-sm hover:bg-accent"
                        >
                          Ver mais em {catObj.name}
                        </Link>
                      </div>
                    );
                  })()}

                  <div className="pt-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => onSubmit()}>
                      Ver todos resultados
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
      </div>
    </div>
  );
};