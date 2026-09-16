import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAuthPassword } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Lock, KeyRound, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import conseltLogo from "@/assets/conselt-logo.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: formatAuthPassword(password),
    });
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSendResetEmail = async () => {
    setResetLoading(true);
    setResetSuccessMessage(null);

    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.resetPasswordForEmail("vicepresidencia@conselt.com.br", {
      redirectTo: redirectUrl,
    });

    setResetLoading(false);

    if (error) {
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const msg = "E-mail de recuperação enviado com sucesso para vicepresidencia@conselt.com.br! Verifique a caixa de entrada para redefinir a senha.";
      setResetSuccessMessage(msg);
      toast({
        title: "E-mail enviado com sucesso!",
        description: "Um e-mail de recuperação de senha foi enviado para vicepresidencia@conselt.com.br.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center">
          <img src={conseltLogo} alt="Conselt" className="h-14 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold tracking-tight">Aluguel de Polos</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Empréstimo de Polos</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Entrar</CardTitle>
            <p className="text-sm text-muted-foreground">Use suas credenciais de membro</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu.nome@conselt.com.br"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha (4 dígitos)</Label>
                <Input
                  id="password"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={password}
                  onChange={e => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border/50 text-center space-y-3">
              <p className="text-xs text-muted-foreground">
                Esqueceu sua senha? Solicite ao gerente para redefini-la.
              </p>

              <Dialog open={resetModalOpen} onOpenChange={(open) => { setResetModalOpen(open); if (!open) setResetSuccessMessage(null); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
                    <KeyRound className="w-3.5 h-3.5" /> Esqueci a senha gerência
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="w-5 h-5" /> Recuperação de Acesso da Gerência
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 pt-2">
                    <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <AlertTitle className="font-semibold text-amber-900 dark:text-amber-100">
                        Aviso Importante
                      </AlertTitle>
                      <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs sm:text-sm mt-1">
                        Este botão é só para membros de Vice-Presidência recuperarem o login.
                      </AlertDescription>
                    </Alert>

                    <p className="text-sm text-muted-foreground">
                      Ao prosseguir, um e-mail com as instruções para redefinição de senha será enviado diretamente para:
                      <br />
                      <strong className="text-foreground font-semibold">vicepresidencia@conselt.com.br</strong>
                    </p>

                    {resetSuccessMessage && (
                      <Alert className="bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-200">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                        <AlertDescription className="text-green-800 dark:text-green-200 text-xs sm:text-sm font-medium">
                          {resetSuccessMessage}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2 justify-end pt-2">
                      <Button variant="outline" onClick={() => setResetModalOpen(false)}>
                        {resetSuccessMessage ? "Fechar" : "Cancelar"}
                      </Button>
                      {!resetSuccessMessage && (
                        <Button
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={handleSendResetEmail}
                          disabled={resetLoading}
                        >
                          {resetLoading ? "Enviando..." : "Enviar E-mail de Recuperação"}
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Apenas membros registrados pelo gerente podem acessar.
        </p>
      </div>
    </div>
  );
}
