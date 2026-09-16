import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ClipboardList, Eye, ShieldCheck, LogOut, Shirt, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { getUnreadNotificationsCount } from "@/lib/store";
import conseltLogo from "@/assets/conselt-logo.png";

const navItems = [
  { to: "/solicitar", label: "Solicitar", icon: ClipboardList },
  { to: "/estoque", label: "Estoque", icon: Shirt },
  { to: "/acompanhar", label: "Acompanhar", icon: Eye },
  { to: "/gerente", label: "Gerente", icon: ShieldCheck },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showSecurityBanner, setShowSecurityBanner] = useState<boolean>(false);

  const updateUnread = () => {
    setUnreadCount(getUnreadNotificationsCount(user?.email || undefined));
  };

  useEffect(() => {
    updateUnread();
    const checkWarning = () => {
      const warning = localStorage.getItem("conselt_pwd_reset_warning") === "true";
      const userEmail = user?.email?.trim().toLowerCase();
      const isVP = userEmail === "vicepresidencia@conselt.com.br";
      setShowSecurityBanner(warning && isVP);
    };
    checkWarning();

    window.addEventListener("conselt_notifications_updated", updateUnread);
    window.addEventListener("storage", updateUnread);
    window.addEventListener("storage", checkWarning);
    return () => {
      window.removeEventListener("conselt_notifications_updated", updateUnread);
      window.removeEventListener("storage", updateUnread);
      window.removeEventListener("storage", checkWarning);
    };
  }, [user?.email]);

  const handleDismissBanner = () => {
    localStorage.removeItem("conselt_pwd_reset_warning");
    setShowSecurityBanner(false);
  };

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
                const isAcompanhar = to === "/acompanhar";
                const hasUnread = isAcompanhar && unreadCount > 0;

                return (
                  <Link
                    key={to}
                    to={to}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-primary-foreground"
                        : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <div className="relative flex items-center">
                      <Icon className="w-4 h-4" />
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:inline">{label}</span>
                    {hasUnread && (
                      <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white bg-red-500 rounded-full ml-0.5">
                        {unreadCount}
                      </span>
                    )}
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

      {showSecurityBanner && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 shadow-lg border-b border-destructive-foreground/20 animate-fade-in">
          <div className="container flex items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0 text-white animate-bounce" />
              <p className="text-xs sm:text-sm font-medium text-white leading-snug">
                <strong className="font-extrabold uppercase tracking-wide">⚠ ATENÇÃO:</strong> Sua senha foi redefinida temporariamente para <strong className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-white">0000</strong> após o login via e-mail. Por motivos de segurança, altere sua senha de acesso na área de Membros imediatamente.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-bold whitespace-nowrap shrink-0 bg-white text-destructive hover:bg-white/90"
              onClick={handleDismissBanner}
            >
              Entendi
            </Button>
          </div>
        </div>
      )}

      <main className="flex-1 container py-8">{children}</main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        © 2026 Conselt — Sistema de Empréstimo de Polos
      </footer>
    </div>
  );
}
