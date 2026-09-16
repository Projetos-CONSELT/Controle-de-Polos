import { useState, useEffect } from "react";
import { getStock, createLoan, type PoloSize, type PoloType, POLO_TYPE_LABELS } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { Send, Info } from "lucide-react";

interface MemberProfile {
  name: string;
  email: string;
}

export default function RequestLoan() {
  const stock = getStock();
  const { toast } = useToast();
  const { user } = useAuth();
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [form, setForm] = useState({
    type: "" as PoloType | "",
    size: "" as PoloSize | "",
    quantity: 1,
    expectedReturn: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("members")
        .select("name, email")
        .eq("auth_user_id", user.id)
        .single();
      if (data) {
        setMemberProfile(data);
      } else {
        setMemberProfile({ name: user.email?.split("@")[0] || "Usuário", email: user.email || "" });
      }
    };
    loadProfile();
  }, [user]);

  const filteredStock = form.type ? stock.filter(s => s.type === form.type) : [];
  const selectedStock = filteredStock.find(s => s.size === form.size);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.size || !form.expectedReturn || !memberProfile) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    const ok = createLoan({
      requesterName: memberProfile.name,
      requesterEmail: memberProfile.email,
      type: form.type as PoloType,
      size: form.size as PoloSize,
      quantity: form.quantity,
      expectedReturn: form.expectedReturn,
    });
    if (ok) {
      toast({ title: "Solicitação enviada!", description: "Aguarde a aprovação do gerente." });
      setForm({ type: "", size: "", quantity: 1, expectedReturn: "" });
    } else {
      toast({ title: "Estoque insuficiente para este tamanho", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Solicitar Empréstimo</h1>
        <p className="text-muted-foreground mt-1">Selecione a polo desejada.</p>
      </div>

      {memberProfile && (
        <div className="p-4 rounded-lg bg-secondary">
          <p className="text-sm text-muted-foreground">Solicitante</p>
          <p className="font-semibold">{memberProfile.name}</p>
          <p className="text-sm text-muted-foreground">{memberProfile.email}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Nova Solicitação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Polo</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as PoloType, size: "", quantity: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sede">Sede</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                </SelectContent>
              </Select>
              {form.type && (
                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5 p-2 rounded bg-muted/50 border border-border/40">
                  <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-foreground">{POLO_TYPE_LABELS[form.type]}:</strong>{" "}
                    {form.type === "sede"
                      ? "As polos de outras gerações anteriores. Usadas para participar de RG ou ficar na sede."
                      : "As polos novas da Conselt. Usadas para reuniões com clientes, parceiros e eventos."}
                  </span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tamanho</Label>
                <Select value={form.size} onValueChange={(v) => setForm(f => ({ ...f, size: v as PoloSize }))} disabled={!form.type}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStock.map(s => (
                      <SelectItem key={s.size} value={s.size} disabled={s.available === 0}>
                        {s.size} ({s.available} disp.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Quantidade</Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  max={selectedStock?.available || 1}
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnDate">Data Prevista de Devolução</Label>
              <DatePicker
                id="returnDate"
                value={form.expectedReturn}
                onChange={val => setForm(f => ({ ...f, expectedReturn: val }))}
                placeholder="Selecione a data de devolução"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!memberProfile}>
              Solicitar Empréstimo
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
