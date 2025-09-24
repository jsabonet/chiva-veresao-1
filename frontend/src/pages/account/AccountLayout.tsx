import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, Package, Home, LogOut, MapPin, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const nav = [
  { to: '/account', label: 'Resumo', icon: Home, end: true },
  { to: '/account/orders', label: 'Pedidos', icon: Package },
  { to: '/account/favorites', label: 'Favoritos', icon: Heart },
  { to: '/account/profile', label: 'Perfil', icon: User },
  { to: '/account/addresses', label: 'Endereços', icon: MapPin }
];

const AccountLayout = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg">Chiva</Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {currentUser?.displayName || currentUser?.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>Sair</Button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <nav className="space-y-2">
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
        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
