import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAuthPassword } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

interface PasswordRecoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string | null;
}

export function PasswordRecoveryModal({ open, onOpenChange, userEmail }: PasswordRecoveryModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length !== 4) {
      toast({
        title: "Senha inválida",
        description: "A senha deve conter exatamente 4 dígitos numéricos.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser idênticas.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const formattedPwd = formatAuthPassword(newPassword);
      const { error } = await supabase.auth.updateUser({ password: formattedPwd });

      if (error) {
        toast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      window.history.replaceState(null, "", window.location.pathname);

      toast({
        title: "Senha atualizada com sucesso! 🎉",
        description: "Sua nova senha de 4 dígitos foi salva com segurança.",
      });

      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro inesperado",
        description: err?.message || "Ocorreu um erro ao atualizar a senha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <KeyRound className="w-5 h-5 text-accent" /> Redefinir Senha de Acesso
          </DialogTitle>
          <DialogDescription>
            {userEmail ? (
              <span>Redefinindo a senha para o e-mail: <strong>{userEmail}</strong></span>
            ) : (
              "Digite e confirme sua nova senha de 4 dígitos."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="recoveryNewPassword">Nova Senha (4 dígitos)</Label>
            <Input
              id="recoveryNewPassword"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recoveryConfirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="recoveryConfirmPassword"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              required
            />
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive font-medium">
                As senhas não coincidem.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || newPassword.length !== 4 || newPassword !== confirmPassword}
            >
              {loading ? "Salvando nova senha..." : "Salvar Nova Senha"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
