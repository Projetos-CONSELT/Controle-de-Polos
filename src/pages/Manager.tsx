import { useState, useEffect } from "react";
import { getLoans, getStock, saveStock, approveReturn, rejectReturn, approveLoan, rejectLoan, verifyManagerPin, type PoloLoan, type PoloStock, type PoloSize, type PoloType, POLO_TYPE_LABELS } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Undo2, Lock, UserPlus, Pencil, Users, Trash2, AlertTriangle, CheckCircle, XCircle, ClipboardList, KeyRound } from "lucide-react";
import LoanFilters, { filterLoans } from "@/components/LoanFilters";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Em uso",
  return_pending: "Devolução solicitada",
  returned: "Devolvida",
};

interface Member {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
}

const emptyMemberForm = { name: "", email: "", phone: "", role: "", department: "", password: "" };

export default function ManagerPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [loans, setLoans] = useState<PoloLoan[]>([]);
  const [stock, setStockState] = useState<PoloStock[]>([]);
  const [editingStock, setEditingStock] = useState(false);
  const [draft, setDraft] = useState<PoloStock[]>([]);
  const [stockType, setStockType] = useState<PoloType>("sede");
  const [searchActive, setSearchActive] = useState("");
  const [sizesActive, setSizesActive] = useState<PoloSize[]>([]);
  const [delayActive, setDelayActive] = useState(false);
  const [activeType, setActiveType] = useState<PoloType>("sede");
  const [searchReturned, setSearchReturned] = useState("");
  const [sizesReturned, setSizesReturned] = useState<PoloSize[]>([]);
  const [delayReturned, setDelayReturned] = useState(false);
  const [returnedType, setReturnedType] = useState<PoloType>("sede");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [passwordMember, setPasswordMember] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    if (authenticated) {
      setLoans(getLoans());
      const s = getStock();
      setStockState(s);
      setDraft(s);
      loadMembers();
    }
  }, [authenticated]);

  const loadMembers = async () => {
    const { data } = await supabase.from("members").select("*").order("name");
    if (data) setMembers(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyManagerPin(pin)) {
      setAuthenticated(true);
    } else {
      toast({ title: "PIN incorreto", variant: "destructive" });
    }
    setPin("");
  };

  const handleApproveReturn = (id: string) => {
    approveReturn(id);
    refreshData();
    toast({ title: "Devolução confirmada!" });
  };

  const handleRejectReturn = (id: string) => {
    rejectReturn(id);
    refreshData();
    toast({ title: "Solicitação de devolução recusada." });
  };

  const handleApprove = (id: string) => {
    const ok = approveLoan(id);
    if (ok) {
      refreshData();
      toast({ title: "Empréstimo aprovado!" });
    } else {
      toast({ title: "Estoque insuficiente para aprovar", variant: "destructive" });
    }
  };

  const handleReject = (id: string) => {
    rejectLoan(id);
    refreshData();
    toast({ title: "Solicitação recusada." });
  };

  const refreshData = () => {
    setLoans(getLoans());
    const s = getStock();
    setStockState(s);
    setDraft(s);
  };

  const handleSaveStock = () => {
    const currentStock = getStock();
    const updated = draft.map((d) => {
      const curr = currentStock.find(c => c.size === d.size && c.type === d.type);
      if (!curr) return d;
      const diff = d.total - curr.total;
      return { ...d, available: Math.max(0, curr.available + diff) };
    });
    saveStock(updated);
    setStockState(updated);
    setDraft(updated);
    setEditingStock(false);
    toast({ title: "Estoque atualizado com sucesso!" });
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: memberForm.email,
      password: memberForm.password,
    });

    if (authError) {
      toast({ title: "Erro ao criar conta", description: authError.message, variant: "destructive" });
      setMemberLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("members").insert({
      auth_user_id: authData.user?.id ?? null,
      name: memberForm.name,
      email: memberForm.email,
      phone: memberForm.phone,
      role: memberForm.role,
      department: memberForm.department,
    });

    if (insertError) {
      toast({ title: "Erro ao registrar membro", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Membro registrado com sucesso!" });
      setMemberForm(emptyMemberForm);
      setMemberDialogOpen(false);
      loadMembers();
    }
    setMemberLoading(false);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setMemberLoading(true);

    const { error } = await supabase.from("members").update({
      name: memberForm.name,
      email: memberForm.email,
      phone: memberForm.phone,
      role: memberForm.role,
      department: memberForm.department,
    }).eq("id", editingMember.id);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membro atualizado com sucesso!" });
      setEditingMember(null);
      setMemberForm(emptyMemberForm);
      setMemberDialogOpen(false);
      loadMembers();
    }
    setMemberLoading(false);
  };

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Tem certeza que deseja excluir ${member.name}?`)) return;
    const { error } = await supabase.from("members").delete().eq("id", member.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membro excluído com sucesso!" });
      loadMembers();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordMember) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Senha deve ter ao menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (!passwordMember.auth_user_id) {
      toast({ title: "Este membro não possui conta de acesso vinculada.", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-set-password", {
      body: {
        auth_user_id: passwordMember.auth_user_id,
        new_password: newPassword,
        pin: "1234",
      },
    });
    if (error || (data && (data as any).error)) {
      toast({
        title: "Erro ao redefinir senha",
        description: error?.message || (data as any)?.error,
        variant: "destructive",
      });
    } else {
      toast({ title: `Senha de ${passwordMember.name} redefinida com sucesso!` });
      setPasswordMember(null);
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };




  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      department: member.department,
      password: "",
    });
    setMemberDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingMember(null);
    setMemberForm(emptyMemberForm);
    setMemberDialogOpen(true);
  };

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto mt-20 animate-fade-in">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle>Área do Gerente</CardTitle>
            <p className="text-sm text-muted-foreground">Insira o PIN de acesso (padrão: 1234)</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input id="pin" type="password" maxLength={10} value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" />
              </div>
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pending = loans.filter(l => l.status === 'pending');
  const returnPending = loans.filter(l => l.status === 'return_pending');
  const active = loans.filter(l => l.status === 'approved' || l.status === 'return_pending');
  const returned = loans.filter(l => l.status === "returned");

  const filteredActive = filterLoans(active.filter(l => l.type === activeType), searchActive, sizesActive, delayActive);
  const filteredReturned = filterLoans(returned.filter(l => l.type === returnedType), searchReturned, sizesReturned, delayReturned);

  const stockByType = (editingStock ? draft : stock).filter(s => s.type === stockType);

  const LoanRow = ({ loan, showReturn }: { loan: PoloLoan; showReturn?: boolean }) => {
    const isOverdue = loan.status !== "returned" && new Date(loan.expectedReturn) < new Date();
    const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(loan.expectedReturn).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return (
      <div className={`flex items-center justify-between p-4 rounded-lg ${isOverdue ? "bg-destructive/10 ring-2 ring-destructive/60 shadow-[0_0_12px_-3px_hsl(var(--destructive)/0.4)]" : "bg-secondary"}`}>
        <div className="flex items-center gap-4">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${isOverdue ? "bg-destructive text-destructive-foreground" : "gradient-card text-accent-foreground"}`}>
            {isOverdue ? <AlertTriangle className="w-5 h-5" /> : loan.size}
          </span>
          <div>
            <p className={`font-semibold ${isOverdue ? "text-destructive" : ""}`}>{loan.requesterName}</p>
            <p className="text-xs text-muted-foreground">
              {loan.size} · Solicitado: {new Date(loan.requestDate).toLocaleDateString("pt-BR")} · Devolução: {new Date(loan.expectedReturn).toLocaleDateString("pt-BR")}
            </p>
            {loan.returnedDate && (
              <p className="text-xs text-success">Devolvida em: {new Date(loan.returnedDate).toLocaleDateString("pt-BR")}</p>
            )}
            {isOverdue && (
              <p className="text-xs text-destructive font-bold animate-pulse">
                ⚠ Atrasado — {daysOverdue} dia{daysOverdue !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">×{loan.quantity}</span>
          <Badge variant={isOverdue ? "destructive" : loan.status === "returned" ? "outline" : loan.status === "return_pending" ? "secondary" : "default"}>
            {isOverdue && loan.status !== "return_pending" ? "Atrasado" : statusLabels[loan.status]}
          </Badge>
        </div>
      </div>
    );
  };

  const memberFormFields = (
    <>
      <div className="space-y-2">
        <Label>Nome completo</Label>
        <Input value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label>Email Conselt</Label>
        <Input type="email" value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} placeholder="nome@conselt.com.br" required disabled={!!editingMember} />
      </div>
      {!editingMember && (
        <div className="space-y-2">
          <Label>Senha inicial</Label>
          <Input type="password" value={memberForm.password} onChange={e => setMemberForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" minLength={6} required />
        </div>
      )}
      <div className="space-y-2">
        <Label>Telefone (com DDD)</Label>
        <Input value={memberForm.phone} onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" required />
      </div>
      <div className="space-y-2">
        <Label>Cargo atual</Label>
        <Input value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))} placeholder="Ex: Consultor, Diretor..." required />
      </div>
      <div className="space-y-2">
        <Label>Coordenadoria e/ou diretoria</Label>
        <Input value={memberForm.department} onChange={e => setMemberForm(f => ({ ...f, department: e.target.value }))} placeholder="Ex: Marketing, Projetos..." required />
      </div>
    </>
  );

  const TypeSubTabs = ({ value, onChange }: { value: PoloType; onChange: (v: PoloType) => void }) => (
    <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-3">
      <button
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${value === "sede" ? "bg-background text-foreground shadow-sm" : ""}`}
        onClick={() => onChange("sede")}
      >
        Sede
      </button>
      <button
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${value === "evento" ? "bg-background text-foreground shadow-sm" : ""}`}
        onClick={() => onChange("evento")}
      >
        Evento
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-accent" /> Painel do Gerente
          </h1>
          <p className="text-muted-foreground mt-1">Controle completo dos empréstimos e membros.</p>
        </div>
        <Button variant="outline" onClick={() => setAuthenticated(false)}>Sair</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{pending.length}</p>
            <p className="text-sm text-muted-foreground">Solicitações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{active.length}</p>
            <p className="text-sm text-muted-foreground">Em uso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{returned.length}</p>
            <p className="text-sm text-muted-foreground">Devolvidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{members.length}</p>
            <p className="text-sm text-muted-foreground">Membros</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="w-full">
          <TabsTrigger value="requests" className="flex-1">Solicitações ({pending.length})</TabsTrigger>
          <TabsTrigger value="returns" className="flex-1">Devoluções ({returnPending.length})</TabsTrigger>
          <TabsTrigger value="stock" className="flex-1">Estoque</TabsTrigger>
          <TabsTrigger value="members" className="flex-1">Membros ({members.length})</TabsTrigger>
          <TabsTrigger value="active" className="flex-1">Em Uso ({active.length})</TabsTrigger>
          <TabsTrigger value="returned" className="flex-1">Devolvidas ({returned.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3 mt-4">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma solicitação pendente</p>
              </CardContent>
            </Card>
          ) : (
            pending.map(loan => (
              <div key={loan.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xs">
                    {loan.size}
                  </span>
                  <div>
                    <p className="font-semibold">{loan.requesterName}</p>
                    <p className="text-xs text-muted-foreground">
                      {POLO_TYPE_LABELS[loan.type]} · {loan.size} · Qtd: {loan.quantity} · Devolução: {new Date(loan.expectedReturn).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado em: {new Date(loan.requestDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Pendente</Badge>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleApprove(loan.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(loan.id)}>
                    <XCircle className="w-4 h-4 mr-1" /> Recusar
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="returns" className="space-y-3 mt-4">
          {returnPending.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Undo2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma devolução pendente</p>
              </CardContent>
            </Card>
          ) : (
            returnPending.map(loan => {
              const isOverdue = new Date(loan.expectedReturn) < new Date();
              const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(loan.expectedReturn).getTime()) / (1000 * 60 * 60 * 24)) : 0;
              return (
                <div key={loan.id} className={`flex items-center justify-between p-4 rounded-lg ${isOverdue ? "bg-destructive/10 ring-2 ring-destructive/60" : "bg-secondary"}`}>
                  <div className="flex items-center gap-4">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${isOverdue ? "bg-destructive text-destructive-foreground" : "gradient-card text-accent-foreground"}`}>
                      {isOverdue ? <AlertTriangle className="w-5 h-5" /> : loan.size}
                    </span>
                    <div>
                      <p className={`font-semibold ${isOverdue ? "text-destructive" : ""}`}>{loan.requesterName}</p>
                      <p className="text-xs text-muted-foreground">
                        {POLO_TYPE_LABELS[loan.type]} · {loan.size} · Qtd: {loan.quantity} · Devolução prevista: {new Date(loan.expectedReturn).toLocaleDateString("pt-BR")}
                      </p>
                      {isOverdue && (
                        <p className="text-xs text-destructive font-bold animate-pulse">
                          ⚠ Atrasado — {daysOverdue} dia{daysOverdue !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Devolução solicitada</Badge>
                    <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleApproveReturn(loan.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Confirmar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRejectReturn(loan.id)}>
                      <XCircle className="w-4 h-4 mr-1" /> Recusar
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-4 mt-4">
          <TypeSubTabs value={stockType} onChange={(v) => { setStockType(v); setEditingStock(false); }} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tamanhos — {POLO_TYPE_LABELS[stockType]}</CardTitle>
              {editingStock ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingStock(false); setDraft(stock); }}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveStock}>Salvar</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setDraft(stock); setEditingStock(true); }}>Editar</Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {stockByType.map((item) => {
                  const draftIdx = draft.findIndex(d => d.size === item.size && d.type === item.type);
                  return (
                    <div key={`${item.type}-${item.size}`} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                      <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-lg gradient-card flex items-center justify-center text-accent-foreground font-bold text-sm">{item.size}</span>
                        <div>
                          <p className="font-semibold">Tamanho {item.size}</p>
                          <p className="text-sm text-muted-foreground">{item.available} de {item.total} disponíveis</p>
                        </div>
                      </div>
                      {editingStock && draftIdx >= 0 && (
                        <Input type="number" min={0} className="w-20" value={draft[draftIdx].total} onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setDraft(d => d.map((s, i) => i === draftIdx ? { ...s, total: val } : s));
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" /> Membros Registrados
            </h2>
            <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openNewDialog}>
                  <UserPlus className="w-4 h-4 mr-1" /> Novo Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingMember ? "Editar Membro" : "Registrar Novo Membro"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={editingMember ? handleEditMember : handleRegisterMember} className="space-y-4">
                  {memberFormFields}
                  <Button type="submit" className="w-full" disabled={memberLoading}>
                    {memberLoading ? "Salvando..." : editingMember ? "Salvar Alterações" : "Registrar Membro"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum membro registrado.</p>
          ) : (
            <div className="grid gap-3">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.role} · {member.department} · {member.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(member)}>
                      <Pencil className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setPasswordMember(member); setNewPassword(""); setConfirmPassword(""); }}>
                      <KeyRound className="w-4 h-4 mr-1" /> Senha
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteMember(member)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir
                    </Button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-3 mt-4">
          <TypeSubTabs value={activeType} onChange={setActiveType} />
          <LoanFilters search={searchActive} onSearchChange={setSearchActive} selectedSizes={sizesActive} onSizesChange={setSizesActive} showDelayFilter delayOnly={delayActive} onDelayChange={setDelayActive} />
          {filteredActive.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum empréstimo encontrado.</p>
          ) : (
            filteredActive.map(l => <LoanRow key={l.id} loan={l} showReturn />)
          )}
        </TabsContent>

        <TabsContent value="returned" className="space-y-3 mt-4">
          <TypeSubTabs value={returnedType} onChange={setReturnedType} />
          <LoanFilters search={searchReturned} onSearchChange={setSearchReturned} selectedSizes={sizesReturned} onSizesChange={setSizesReturned} delayOnly={delayReturned} onDelayChange={setDelayReturned} />
          {filteredReturned.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma devolução encontrada.</p>
          ) : (
            filteredReturned.map(l => <LoanRow key={l.id} loan={l} />)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!passwordMember} onOpenChange={(o) => { if (!o) setPasswordMember(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Redefinir senha
            </DialogTitle>
          </DialogHeader>
          {passwordMember && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Definindo nova senha para <span className="font-semibold text-foreground">{passwordMember.name}</span> ({passwordMember.email}).
              </p>
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" minLength={6} required />
              </div>
              <Button type="submit" className="w-full" disabled={passwordLoading}>
                {passwordLoading ? "Redefinindo..." : "Redefinir senha"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
