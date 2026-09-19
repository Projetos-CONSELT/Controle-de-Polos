import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordRecoveryModal } from "@/components/PasswordRecoveryModal";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isRecoveryOpen: boolean;
  setIsRecoveryOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  isRecoveryOpen: false,
  setIsRecoveryOpen: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

  useEffect(() => {
    let handledRecovery = false;

    const checkRecovery = (event: string, sessionUser: User | null) => {
      const isRecoveryHash = window.location.hash.includes("type=recovery");
      if ((event === "PASSWORD_RECOVERY" || isRecoveryHash) && sessionUser && !handledRecovery) {
        handledRecovery = true;
        setIsRecoveryOpen(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        checkRecovery(event, currentUser);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        checkRecovery("INITIAL", currentUser);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, isRecoveryOpen, setIsRecoveryOpen }}>
      {children}
      <PasswordRecoveryModal
        open={isRecoveryOpen}
        onOpenChange={setIsRecoveryOpen}
        userEmail={user?.email}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

