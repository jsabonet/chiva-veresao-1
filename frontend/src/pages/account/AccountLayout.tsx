import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { User, Package, Home, LogOut, MapPin, Heart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const nav = [
  { to: '/account', label: 'Resumo', icon: Home, end: true },
  { to: '/account/orders', label: 'Pedidos', icon: Package },
  { to: '/account/favorites', label: 'Favoritos', icon: Heart },
  { to: '/account/profile', label: 'Perfil', icon: User },
];

const AccountLayout = () => {
  const { currentUser, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="font-semibold text-base">Chiva Computer</Link>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {currentUser?.displayName || currentUser?.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>Sair</Button>
          </div>
          {/* Mobile user / logout in header area */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-sm text-muted-foreground">{currentUser?.displayName || currentUser?.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>Sair</Button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 grid gap-8 md:grid-cols-[220px_1fr]">
        {/* Desktop sidebar */}
        <nav className="hidden md:block space-y-2">
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </nav>

        {/* Mobile drawer (overlay) */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} aria-hidden />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-lg p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <Link to="/" className="font-semibold text-lg">Chiva Computer</Link>
                <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)} aria-label="Fechar menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-2">
                {nav.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
                <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileNavOpen(false); logout(); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </Button>
              </nav>
            </aside>
          </div>
        )}
        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
