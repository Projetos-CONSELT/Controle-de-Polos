import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import conseltLogo from "@/assets/conselt-logo.png";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <div className="max-w-md w-full bg-card border border-border/50 rounded-2xl p-8 shadow-xl text-center space-y-6">
        <div className="flex justify-center">
          <img
            src={conseltLogo}
            alt="Conselt Jr. Logo"
            className="h-24 w-auto object-contain hover:scale-105 transition-transform duration-300 drop-shadow-md"
          />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-accent/20 text-accent uppercase tracking-wider">
            Erro 404
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Página não encontrada
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ops! A página que você está tentando acessar não existe, foi removida ou o endereço inserido está incorreto.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto font-medium gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              Voltar para o Início
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto font-medium gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
            Voltar Página
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
