import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAuthPassword, addNotification } from "@/lib/store";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let handledRecovery = false;

    const handleRecoveryIfNeeded = async (event: string, sessionUser: User | null) => {
      const isRecoveryHash = window.location.hash.includes("type=recovery");
      if ((event === "PASSWORD_RECOVERY" || isRecoveryHash) && sessionUser?.email && !handledRecovery) {
        handledRecovery = true;
        const emailLower = sessionUser.email.trim().toLowerCase();
        if (emailLower === "vicepresidencia@conselt.com.br") {
          const formattedPwd = formatAuthPassword("0000");
          const { error } = await supabase.auth.updateUser({ password: formattedPwd });
          if (!error) {
            localStorage.setItem("conselt_pwd_reset_warning", "true");
            addNotification({
              loanId: "security_warning",
              requesterName: "Segurança Conselt",
              requesterEmail: "vicepresidencia@conselt.com.br",
              title: "⚠ ATENÇÃO: Altere a sua senha de 0000 imediatamente!",
              message: "A senha da conta vicepresidencia@conselt.com.br foi redefinida temporariamente para 0000 via e-mail de recuperação. Por motivos de segurança, altere sua senha.",
              type: "rejected",
            });
            window.dispatchEvent(new Event("conselt_notifications_updated"));
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        await handleRecoveryIfNeeded(event, currentUser);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        await handleRecoveryIfNeeded("INITIAL", currentUser);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
