import { Link, useLocation } from "react-router-dom";
import { ClipboardList, Eye, ShieldCheck, LogOut, Shirt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import conseltLogo from "@/assets/conselt-logo.png";

const navItems = [
  { to: "/solicitar", label: "Solicitar", icon: ClipboardList },
  { to: "/estoque", label: "Estoque", icon: Shirt },
  { to: "/acompanhar", label: "Acompanhar", icon: Eye },
  { to: "/gerente", label: "Gerente", icon: ShieldCheck },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="gradient-primary sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/solicitar" className="flex items-center gap-2">
            <div className="bg-white px-2 py-1 rounded-md shadow-sm flex items-center justify-center shrink-0">
              <img src={conseltLogo} alt="Conselt" className="h-7 w-auto object-contain" />
            </div>
            <span className="text-xs sm:text-lg font-bold text-primary-foreground tracking-tight leading-tight">
              Aluguel<br className="sm:hidden" /> de Polos
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => {
                const active = pathname === to || (to === "/solicitar" && pathname === "/");
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-primary-foreground"
                        : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-8">{children}</main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        © 2026 Conselt — Sistema de Empréstimo de Polos
      </footer>
    </div>
  );
}
