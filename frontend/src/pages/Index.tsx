import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Chiva Computer & Service</h1>
        <p className="text-xl text-muted-foreground">Loja de Computadores e Equipamentos Industriais</p>
        <div className="flex gap-4 justify-center">
          <Link to="/home">
            <Button size="lg">Ir para Loja</Button>
          </Link>
          <Link to="/admin">
            <Button variant="outline" size="lg">Painel Admin</Button>
          </Link>
          <Link to="/test-currency">
            <Button variant="secondary" size="lg">Teste Moeda</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
