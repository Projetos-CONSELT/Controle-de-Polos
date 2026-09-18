import { useState, useEffect } from "react";
import { getLoans, getStock, saveStock, approveReturn, returnLoan, rejectReturn, approveLoan, rejectLoan, verifyManagerPin, getManagerPin, saveManagerPin, getStoredRoles, saveStoredRoles, getStoredDepartments, saveStoredDepartments, formatAuthPassword, formatDisplayDate, isLoanOverdue, getOverdueDays, isReturnedLate, type PoloLoan, type PoloStock, type PoloSize, type PoloType, POLO_TYPE_LABELS } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Undo2, Lock, UserPlus, Pencil, Users, Trash2, AlertTriangle, CheckCircle, XCircle, ClipboardList, KeyRound, Plus, MessageSquare } from "lucide-react";
import LoanFilters, { filterLoans } from "@/components/LoanFilters";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuth } from "@/contexts/AuthContext";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Em uso",
  return_pending: "Devolução solicitada",
  returned: "Devolvida",
};

const ROLES = ["Assessor", "Coordenador", "Diretor"] as const;

const DEPARTMENTS_NON_DIRECTOR = [
  "Parcerias",
  "Jurídico Financeiro",
  "Vice presidência",
  "Negócios",
  "Marketing",
  "Projetos",
];

const DEPARTMENTS_DIRECTOR = [
  "Presidência",
  "Vice presidência",
  "Comercial",
  "Projetos",
];

const getDepartmentOptions = (role: string) => {
  return role === "Diretor" ? DEPARTMENTS_DIRECTOR : DEPARTMENTS_NON_DIRECTOR;
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

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

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
  const [startDateReturned, setStartDateReturned] = useState("");
  const [endDateReturned, setEndDateReturned] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [passwordMember, setPasswordMember] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [newSizeName, setNewSizeName] = useState("");
  const [newSizeTotal, setNewSizeTotal] = useState<number>(0);
  const [returnDialogLoan, setReturnDialogLoan] = useState<PoloLoan | null>(null);
  const [returnDialogNotes, setReturnDialogNotes] = useState("");
  const [approvingLoan, setApprovingLoan] = useState<PoloLoan | null>(null);
  const [approveReturnDate, setApproveReturnDate] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const currentUserEmail = user?.email?.trim().toLowerCase();
  const isVP = currentUserEmail === "vicepresidencia@conselt.com.br";

  useEffect(() => {
    if (isVP) {
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }
  }, [isVP]);

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

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput || !/^\d{1,4}$/.test(newPinInput)) {
      toast({ title: "PIN inválido", description: "O novo PIN deve conter apenas números (no máximo 4 dígitos).", variant: "destructive" });
      return;
    }
    if (newPinInput !== confirmPinInput) {
      toast({ title: "PINs não coincidem", description: "A confirmação do novo PIN é diferente do novo PIN informado.", variant: "destructive" });
      return;
    }
    saveManagerPin(newPinInput);
    setNewPinInput("");
    setConfirmPinInput("");
    toast({ title: "PIN alterado com sucesso!", description: "O PIN de acesso ao painel do gerente foi atualizado." });
  };

  const openConfirmReturnDialog = (loan: PoloLoan) => {
    setReturnDialogLoan(loan);
    setReturnDialogNotes(loan.returnNotes || loan.notes || "");
  };

  const handleConfirmReturnSubmit = () => {
    if (!returnDialogLoan) return;
    if (returnDialogLoan.status === "return_pending") {
      approveReturn(returnDialogLoan.id, returnDialogNotes);
    } else {
      returnLoan(returnDialogLoan.id, returnDialogNotes);
    }
    refreshData();
    toast({ title: "Devolução confirmada com sucesso!" });
    setReturnDialogLoan(null);
    setReturnDialogNotes("");
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

  const openApproveModal = (loan: PoloLoan) => {
    setApprovingLoan(loan);
    const initialDate = loan.expectedReturn ? loan.expectedReturn.split("T")[0] : "";
    setApproveReturnDate(initialDate);
  };

  const confirmApproveLoan = () => {
    if (!approvingLoan) return;
    if (!approveReturnDate) {
      toast({ title: "Selecione uma data de devolução", variant: "destructive" });
      return;
    }
    const ok = approveLoan(approvingLoan.id, approveReturnDate);
    if (ok) {
      refreshData();
      toast({ title: "Empréstimo aprovado com sucesso!" });
      setApprovingLoan(null);
      setApproveReturnDate("");
    } else {
      toast({ title: "Estoque insuficiente para aprovar", variant: "destructive" });
    }
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

  const handleAddSize = () => {
    const trimmed = newSizeName.trim().toUpperCase();
    if (!trimmed) {
      toast({ title: "Nome do tamanho inválido", description: "Informe o nome do novo tamanho.", variant: "destructive" });
      return;
    }
    const exists = draft.some(s => s.type === stockType && s.size.toUpperCase() === trimmed);
    if (exists) {
      toast({ title: "Tamanho já existe", description: `O tamanho "${trimmed}" já está cadastrado em ${POLO_TYPE_LABELS[stockType]}.`, variant: "destructive" });
      return;
    }
    const total = Math.max(0, Number(newSizeTotal) || 0);
    const newItem: PoloStock = {
      size: trimmed,
      type: stockType,
      total: total,
      available: total,
    };
    setDraft(prev => [...prev, newItem]);
    setNewSizeName("");
    setNewSizeTotal(0);
    toast({ title: `Tamanho ${trimmed} adicionado!`, description: "Clique em Salvar para consolidar as alterações." });
  };

  const handleDeleteSize = (sizeToDelete: string) => {
    setDraft(prev => prev.filter(item => !(item.type === stockType && item.size === sizeToDelete)));
    toast({ title: `Tamanho ${sizeToDelete} removido.` });
  };

  const handleSaveStock = () => {
    const currentStock = getStock();
    const otherTypeItems = draft.filter(d => d.type !== stockType);
    const currentTypeDraft = draft.filter(d => d.type === stockType);

    const updatedCurrentType = currentTypeDraft.map((d) => {
      const curr = currentStock.find(c => c.size === d.size && c.type === d.type);
      if (!curr) {
        return { ...d, available: Math.max(0, d.total) };
      }
      const diff = d.total - curr.total;
      return { ...d, available: Math.max(0, Math.min(d.total, curr.available + diff)) };
    });

    const finalStock = [...otherTypeItems, ...updatedCurrentType];

    saveStock(finalStock);
    setStockState(finalStock);
    setDraft(finalStock);
    setEditingStock(false);
    toast({ title: "Estoque atualizado com sucesso!" });
  };

  const handleRoleChange = (newRole: string) => {
    setMemberForm(f => {
      const validDepts = getDepartmentOptions(newRole);
      const newDept = validDepts.includes(f.department) ? f.department : "";
      return { ...f, role: newRole, department: newDept };
    });
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberLoading(true);

    if (memberForm.password.length < 4) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter ao menos 4 caracteres.",
        variant: "destructive",
      });
      setMemberLoading(false);
      return;
    }

    const emailTrimmed = memberForm.email.trim().toLowerCase();

    // 1. Check if email already exists in members table
    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .ilike("email", emailTrimmed)
      .maybeSingle();

    if (existingMember) {
      toast({
        title: "Email já cadastrado",
        description: "Este endereço de email já está cadastrado no sistema.",
        variant: "destructive",
      });
      setMemberLoading(false);
      return;
    }

    // 2. Sign up in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: memberForm.email.trim(),
      password: formatAuthPassword(memberForm.password),
    });

    if (authError) {
      const isAlreadyRegistered =
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already exists") ||
        authError.message.toLowerCase().includes("já cadastrado");

      toast({
        title: isAlreadyRegistered ? "Email já cadastrado" : "Erro ao criar conta",
        description: isAlreadyRegistered ? "Este endereço de email já está cadastrado no sistema." : authError.message,
        variant: "destructive",
      });
      setMemberLoading(false);
      return;
    }

    // 3. Insert member record
    const { error: insertError } = await supabase.from("members").insert({
      auth_user_id: authData.user?.id ?? null,
      name: memberForm.name,
      email: memberForm.email.trim(),
      phone: memberForm.phone || "",
      role: "",
      department: "",
    });

    if (insertError) {
      const isAlreadyRegistered =
        insertError.message.toLowerCase().includes("unique constraint") ||
        insertError.message.toLowerCase().includes("already exists") ||
        insertError.message.toLowerCase().includes("duplicate key");

      toast({
        title: isAlreadyRegistered ? "Email já cadastrado" : "Erro ao registrar membro",
        description: isAlreadyRegistered ? "Este endereço de email já está cadastrado no sistema." : insertError.message,
        variant: "destructive",
      });
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

    if (editingMember.email.trim().toLowerCase() === "vicepresidencia@conselt.com.br" && !isVP) {
      toast({
        title: "Ação não permitida",
        description: "O perfil de Vice-Presidência só pode ser editado quando logado diretamente com essa conta.",
        variant: "destructive",
      });
      setMemberDialogOpen(false);
      return;
    }

    setMemberLoading(true);

    const emailTrimmed = memberForm.email.trim().toLowerCase();
    if (emailTrimmed !== editingMember.email.toLowerCase()) {
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .ilike("email", emailTrimmed)
        .neq("id", editingMember.id)
        .maybeSingle();

      if (existingMember) {
        toast({
          title: "Email já cadastrado",
          description: "Este endereço de email já está cadastrado por outro membro no sistema.",
          variant: "destructive",
        });
        setMemberLoading(false);
        return;
      }
    }

    const { error } = await supabase.from("members").update({
      name: memberForm.name,
      email: memberForm.email.trim(),
      phone: memberForm.phone || "",
      role: "",
      department: "",
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
    const emailTrimmed = member.email.trim().toLowerCase();
    if (emailTrimmed === "vicepresidencia@conselt.com.br") {
      toast({
        title: "Ação não permitida",
        description: "O perfil de Vice-Presidência (vicepresidencia@conselt.com.br) não pode ser excluído.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${member.name} (${member.email})?\nTodos os dados e a conta vinculados a este e-mail serão excluídos do sistema.`)) return;

    // 1. Call admin_delete_member RPC to delete from members and auth.users
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_delete_member", {
      p_member_id: member.id,
      p_email: emailTrimmed,
    });

    if (rpcError || (rpcData && typeof rpcData === "object" && !(rpcData as any).success)) {
      // Fallback: delete directly from members table
      const { error: deleteErr } = await supabase.from("members").delete().eq("id", member.id);
      if (deleteErr) {
        toast({ title: "Erro ao excluir membro", description: deleteErr.message, variant: "destructive" });
        return;
      }
    }

    // 2. Clean up any loans linked to this member's email from localStorage
    const currentLoans = getLoans();
    const updatedLoans = currentLoans.filter(l => l.requesterEmail.trim().toLowerCase() !== emailTrimmed);
    saveLoans(updatedLoans);

    toast({ title: "Membro e dados vinculados excluídos com sucesso!" });
    refreshData();
    loadMembers();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordMember) return;
    const targetEmail = passwordMember.email.trim().toLowerCase();
    const isTargetVp = targetEmail === "vicepresidencia@conselt.com.br";
    if (isTargetVp && !isVP) {
      toast({
        title: "Ação não permitida",
        description: "A senha da conta Vice-Presidência só pode ser alterada quando logado diretamente com essa conta.",
        variant: "destructive",
      });
      setPasswordMember(null);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação de senha devem ser exatamente idênticas.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length !== 4) {
      toast({
        title: "Senha inválida",
        description: "A senha deve conter exatamente 4 dígitos numéricos.",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const formattedPwd = formatAuthPassword(newPassword);
      const pin = getManagerPin();

      // 1. Try DB RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc("admin_set_member_password", {
        p_email: passwordMember.email,
        p_new_password: formattedPwd,
        p_pin: pin,
      });

      if (!rpcError && rpcData && typeof rpcData === "object" && (rpcData as any).success) {
        const returnedAuthId = (rpcData as any).auth_user_id;
        if (returnedAuthId && returnedAuthId !== passwordMember.auth_user_id) {
          await supabase
            .from("members")
            .update({ auth_user_id: returnedAuthId })
            .eq("id", passwordMember.id);
          loadMembers();
        }

        toast({ title: `Senha de ${passwordMember.name} alterada com sucesso!` });
        setPasswordMember(null);
        setNewPassword("");
        setConfirmPassword("");
        return;
      }

      if (rpcData && typeof rpcData === "object" && (rpcData as any).error) {
        toast({
          title: "Erro ao alterar senha",
          description: (rpcData as any).error,
          variant: "destructive",
        });
        return;
      }

      // 2. Fallback to Edge Function
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke("admin-set-password", {
        body: {
          auth_user_id: passwordMember.auth_user_id || undefined,
          email: passwordMember.email,
          new_password: formattedPwd,
          pin: pin,
        },
      });

      if (edgeError || (edgeData && (edgeData as any).error)) {
        const errMsg =
          (edgeData as any)?.error ||
          edgeError?.message ||
          rpcError?.message ||
          "Não foi possível alterar a senha no momento.";

        toast({
          title: "Erro ao alterar senha",
          description: errMsg.includes("Failed to send a request")
            ? "Serviço de senha indisponível no servidor Supabase. Execute a migration SQL de RPC no seu Supabase."
            : errMsg,
          variant: "destructive",
        });
      } else {
        const returnedAuthId = (edgeData as any)?.auth_user_id;
        if (returnedAuthId && returnedAuthId !== passwordMember.auth_user_id) {
          await supabase
            .from("members")
            .update({ auth_user_id: returnedAuthId })
            .eq("id", passwordMember.id);
          loadMembers();
        }

        toast({ title: `Senha de ${passwordMember.name} alterada com sucesso!` });
        setPasswordMember(null);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      console.error("Erro em handleResetPassword:", err);
      toast({
        title: "Erro ao redefinir senha",
        description: err.message || "Ocorreu uma falha ao tentar redefinir a senha.",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };




  const openEditDialog = (member: Member) => {
    if (member.email.trim().toLowerCase() === "vicepresidencia@conselt.com.br" && !isVP) {
      toast({
        title: "Ação não permitida",
        description: "O perfil de Vice-Presidência só pode ser editado quando logado diretamente com essa conta.",
        variant: "destructive",
      });
      return;
    }
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      email: member.email,
      phone: formatPhoneNumber(member.phone),
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
            <p className="text-sm text-muted-foreground">Insira o PIN de acesso</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                />
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

  // Ordenar devoluções por mais recente no topo (por data de devolução ou solicitação)
  const sortedReturned = [...returned].sort((a, b) => {
    const timeA = new Date(a.returnedDate || a.requestDate || 0).getTime();
    const timeB = new Date(b.returnedDate || b.requestDate || 0).getTime();
    return timeB - timeA;
  });

  const filteredActive = filterLoans(active.filter(l => l.type === activeType), searchActive, sizesActive, delayActive);
  const filteredReturned = filterLoans(
    sortedReturned.filter(l => l.type === returnedType),
    searchReturned,
    sizesReturned,
    delayReturned,
    startDateReturned,
    endDateReturned
  );

  const stockByType = (editingStock ? draft : stock).filter(s => s.type === stockType);

  const LoanRow = ({ loan, showReturn }: { loan: PoloLoan; showReturn?: boolean }) => {
    const isOverdue = isLoanOverdue(loan.expectedReturn, loan.status);
    const daysOverdue = isOverdue ? getOverdueDays(loan.expectedReturn) : 0;
    const isLateReturn = isReturnedLate(loan);

    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg gap-3 ${isOverdue ? "bg-destructive/10 ring-2 ring-destructive/60 shadow-[0_0_12px_-3px_hsl(var(--destructive)/0.4)]" : isLateReturn ? "bg-destructive/5 ring-1 ring-destructive/40" : "bg-secondary"}`}>
        <div className="flex items-center gap-4 min-w-0">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isOverdue || isLateReturn ? "bg-destructive text-destructive-foreground" : "gradient-card text-accent-foreground"}`}>
            {isOverdue || isLateReturn ? <AlertTriangle className="w-5 h-5" /> : loan.size}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${isOverdue || isLateReturn ? "text-destructive" : ""}`}>{loan.requesterName}</p>
            <p className="text-xs text-muted-foreground">
              {POLO_TYPE_LABELS[loan.type]} · {loan.size} · Qtd: {loan.quantity} · Solicitado: {formatDisplayDate(loan.requestDate)} · Devolução: {formatDisplayDate(loan.expectedReturn)}
            </p>
            {loan.returnedDate && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">Devolvida em: {formatDisplayDate(loan.returnedDate)}</p>
            )}
            {(loan.returnNotes || loan.notes) && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 bg-background/60 px-2.5 py-1 rounded border border-border/40 w-fit">
                <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="font-semibold text-foreground">Obs:</span> {loan.returnNotes || loan.notes}
              </p>
            )}
            {isOverdue && loan.status !== "returned" && (
              <p className="text-xs text-destructive font-bold animate-pulse mt-0.5">
                ⚠ Atrasado — {daysOverdue} dia{daysOverdue !== 1 ? "s" : ""}
              </p>
            )}
            {isLateReturn && (
              <p className="text-xs text-destructive font-bold mt-0.5">
                ⚠ Entregue com atraso
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-border/40 sm:border-t-0 sm:pt-0 justify-end w-full sm:w-auto">
          <span className="text-sm text-muted-foreground mr-1">×{loan.quantity}</span>
          {isLateReturn ? (
            <Badge variant="destructive" className="bg-destructive text-destructive-foreground font-semibold">
              Devolvida com atraso
            </Badge>
          ) : (
            <Badge variant={isOverdue && loan.status !== "returned" ? "destructive" : loan.status === "returned" ? "outline" : loan.status === "return_pending" ? "secondary" : "default"}>
              {isOverdue && loan.status !== "returned" && loan.status !== "return_pending" ? "Atrasado" : statusLabels[loan.status]}
            </Badge>
          )}
          {showReturn && loan.status !== "returned" && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openConfirmReturnDialog(loan)}>
              <Undo2 className="w-3.5 h-3.5 mr-1" /> Devolver
            </Button>
          )}
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
          <Label>Senha inicial (4 dígitos)</Label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={memberForm.password}
            onChange={e => setMemberForm(f => ({ ...f, password: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
            placeholder="Senha de 4 dígitos"
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Telefone (opcional)</Label>
        <Input
          value={memberForm.phone}
          onChange={e => setMemberForm(f => ({ ...f, phone: formatPhoneNumber(e.target.value) }))}
          placeholder="(11) 99999-9999"
          maxLength={15}
        />
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-accent shrink-0" /> Painel do Gerente
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Controle completo dos empréstimos e membros.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAuthenticated(false)}>Sair</Button>
      </div>

      <div className="w-full overflow-x-auto no-scrollbar scrollbar-none pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex sm:grid sm:grid-cols-4 gap-3 md:gap-4 min-w-max sm:min-w-0">
          <Card className="min-w-[150px] sm:min-w-0 flex-1 shrink-0 shadow-sm">
            <CardContent className="p-4 md:p-6 text-center">
              <p className="text-2xl md:text-3xl font-bold">{pending.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium whitespace-nowrap">Solicitações</p>
            </CardContent>
          </Card>
          <Card className="min-w-[150px] sm:min-w-0 flex-1 shrink-0 shadow-sm">
            <CardContent className="p-4 md:p-6 text-center">
              <p className="text-2xl md:text-3xl font-bold">{active.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium whitespace-nowrap">Em uso</p>
            </CardContent>
          </Card>
          <Card className="min-w-[150px] sm:min-w-0 flex-1 shrink-0 shadow-sm">
            <CardContent className="p-4 md:p-6 text-center">
              <p className="text-2xl md:text-3xl font-bold">{returned.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium whitespace-nowrap">Devolvidas</p>
            </CardContent>
          </Card>
          <Card className="min-w-[150px] sm:min-w-0 flex-1 shrink-0 shadow-sm">
            <CardContent className="p-4 md:p-6 text-center">
              <p className="text-2xl md:text-3xl font-bold">{members.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium whitespace-nowrap">Membros</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <div className="w-full overflow-x-auto no-scrollbar scrollbar-none pb-1">
          <TabsList className="w-max min-w-full inline-flex h-11 items-center justify-start sm:justify-center p-1 text-muted-foreground">
            <TabsTrigger value="requests" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm font-medium">Solicitações ({pending.length})</TabsTrigger>
            <TabsTrigger value="returns" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm font-medium">Devoluções ({returnPending.length})</TabsTrigger>
            <TabsTrigger value="stock" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm font-medium">Estoque</TabsTrigger>
            <TabsTrigger value="members" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm font-medium">Membros ({members.length})</TabsTrigger>
            <TabsTrigger value="active" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm font-medium">Em Uso ({active.length})</TabsTrigger>
            <TabsTrigger value="returned" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm font-medium">Devolvidas ({returned.length})</TabsTrigger>
            {isVP && (
              <TabsTrigger value="settings" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm font-medium">Configurações</TabsTrigger>
            )}
          </TabsList>
        </div>

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
              <div key={loan.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {loan.size}
                  </span>
                  <div>
                    <p className="font-semibold text-sm sm:text-base">{loan.requesterName}</p>
                    <p className="text-xs text-muted-foreground">
                      {POLO_TYPE_LABELS[loan.type]} · {loan.size} · Qtd: {loan.quantity} · Devolução: {formatDisplayDate(loan.expectedReturn)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado em: {formatDisplayDate(loan.requestDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border/40 sm:border-t-0 sm:pt-0 justify-end">
                  <Badge variant="secondary">Pendente</Badge>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => openApproveModal(loan)}>
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
              const isOverdue = isLoanOverdue(loan.expectedReturn, loan.status);
              const daysOverdue = isOverdue ? getOverdueDays(loan.expectedReturn) : 0;
              return (
                <div key={loan.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg gap-3 ${isOverdue ? "bg-destructive/10 ring-2 ring-destructive/60" : "bg-secondary"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isOverdue ? "bg-destructive text-destructive-foreground" : "gradient-card text-accent-foreground"}`}>
                      {isOverdue ? <AlertTriangle className="w-5 h-5" /> : loan.size}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-sm sm:text-base ${isOverdue ? "text-destructive" : ""}`}>{loan.requesterName}</p>
                      <p className="text-xs text-muted-foreground">
                        {POLO_TYPE_LABELS[loan.type]} · {loan.size} · Qtd: {loan.quantity} · Devolução prevista: {formatDisplayDate(loan.expectedReturn)}
                      </p>
                      {(loan.returnNotes || loan.notes) && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 bg-background/60 px-2.5 py-1 rounded border border-border/40 w-fit">
                          <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="font-semibold text-foreground">Obs:</span> {loan.returnNotes || loan.notes}
                        </p>
                      )}
                      {isOverdue && (
                        <p className="text-xs text-destructive font-bold animate-pulse mt-0.5">
                          ⚠ Atrasado — {daysOverdue} dia{daysOverdue !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40 sm:border-t-0 sm:pt-0 justify-end">
                    <Badge variant="secondary">Devolução solicitada</Badge>
                    <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => openConfirmReturnDialog(loan)}>
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
          <TypeSubTabs value={stockType} onChange={(v) => { setStockType(v); if (editingStock) setDraft(stock); }} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tamanhos — {POLO_TYPE_LABELS[stockType]}</CardTitle>
              {editingStock ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingStock(false); setDraft(stock); }}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveStock}>Salvar Alterações</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setDraft(stock); setEditingStock(true); }}>Editar</Button>
              )}
            </CardHeader>
            <CardContent>
              {editingStock ? (
                <div className="space-y-6">
                  <div className="grid gap-3">
                    {draft.filter(s => s.type === stockType).map((item) => {
                      const draftIdx = draft.findIndex(d => d.size === item.size && d.type === item.type);
                      return (
                        <div key={`${item.type}-${item.size}-${draftIdx}`} className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="w-10 h-10 rounded-lg gradient-card flex items-center justify-center text-accent-foreground font-bold text-xs shrink-0">
                              {item.size}
                            </span>
                            <div className="min-w-0 flex-1">
                              <Input
                                type="text"
                                className="h-8 font-bold uppercase w-28 text-sm"
                                value={draft[draftIdx]?.size || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraft(d => d.map((s, i) => i === draftIdx ? { ...s, size: val } : s));
                                }}
                                placeholder="Nome"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground hidden sm:inline">Qtd Total:</span>
                              <Input
                                type="number"
                                min={0}
                                className="w-20 h-8"
                                value={draft[draftIdx]?.total ?? 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setDraft(d => d.map((s, i) => i === draftIdx ? { ...s, total: val } : s));
                                }}
                              />
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                              onClick={() => handleDeleteSize(item.size)}
                              title="Excluir este tamanho"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {draft.filter(s => s.type === stockType).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">Nenhum tamanho cadastrado para {POLO_TYPE_LABELS[stockType]}.</p>
                    )}
                  </div>

                  <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Plus className="w-4 h-4 text-accent" /> Adicionar Novo Tamanho em {POLO_TYPE_LABELS[stockType]}
                    </h4>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <Input
                        type="text"
                        className="uppercase flex-1 h-9"
                        placeholder="Nome (ex: EXG, 38, Infantil)"
                        value={newSizeName}
                        onChange={(e) => setNewSizeName(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Qtd Inicial:</span>
                        <Input
                          type="number"
                          min={0}
                          className="w-24 h-9"
                          value={newSizeTotal}
                          onChange={(e) => setNewSizeTotal(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                      </div>
                      <Button type="button" size="sm" variant="secondary" onClick={handleAddSize} className="shrink-0 h-9">
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {stockByType.map((item) => (
                    <div key={`${item.type}-${item.size}`} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                      <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-lg gradient-card flex items-center justify-center text-accent-foreground font-bold text-sm px-1 text-center">
                          {item.size}
                        </span>
                        <div>
                          <p className="font-semibold">Tamanho {item.size}</p>
                          <p className="text-sm text-muted-foreground">{item.available} de {item.total} disponíveis</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stockByType.length === 0 && (
                    <p className="text-center text-muted-foreground py-6">Nenhum tamanho cadastrado para este tipo.</p>
                  )}
                </div>
              )}
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
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      {member.phone && <p className="text-xs text-muted-foreground break-words">{member.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40 sm:border-t-0 sm:pt-0 justify-end w-full sm:w-auto">
                    {(member.email.trim().toLowerCase() !== "vicepresidencia@conselt.com.br" || isVP) && (
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-initial h-8 px-2.5 text-xs" onClick={() => openEditDialog(member)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                    )}
                    {(member.email.trim().toLowerCase() !== "vicepresidencia@conselt.com.br" || isVP) && (
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-initial h-8 px-2.5 text-xs" onClick={() => { setPasswordMember(member); setNewPassword(""); setConfirmPassword(""); }}>
                        <KeyRound className="w-3.5 h-3.5 mr-1" /> Senha
                      </Button>
                    )}
                    {member.email.trim().toLowerCase() !== "vicepresidencia@conselt.com.br" && (
                      <Button size="sm" variant="destructive" className="flex-1 sm:flex-initial h-8 px-2.5 text-xs" onClick={() => handleDeleteMember(member)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-3 mt-4">
          <TypeSubTabs value={activeType} onChange={(v) => { setActiveType(v); setSizesActive([]); }} />
          <LoanFilters
            search={searchActive}
            onSearchChange={setSearchActive}
            selectedSizes={sizesActive}
            onSizesChange={setSizesActive}
            showDelayFilter
            delayOnly={delayActive}
            onDelayChange={setDelayActive}
            poloType={activeType}
            customStock={stock}
          />
          {filteredActive.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum empréstimo encontrado.</p>
          ) : (
            filteredActive.map(l => <LoanRow key={l.id} loan={l} showReturn />)
          )}
        </TabsContent>

        <TabsContent value="returned" className="space-y-3 mt-4">
          <TypeSubTabs value={returnedType} onChange={(v) => { setReturnedType(v); setSizesReturned([]); }} />
          <LoanFilters
            search={searchReturned}
            onSearchChange={setSearchReturned}
            selectedSizes={sizesReturned}
            onSizesChange={setSizesReturned}
            delayOnly={delayReturned}
            onDelayChange={setDelayReturned}
            poloType={returnedType}
            customStock={stock}
            showDateFilter
            startDate={startDateReturned}
            onStartDateChange={setStartDateReturned}
            endDate={endDateReturned}
            onEndDateChange={setEndDateReturned}
          />
          {filteredReturned.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma devolução encontrada.</p>
          ) : (
            filteredReturned.map(l => <LoanRow key={l.id} loan={l} />)
          )}
        </TabsContent>

        {isVP && (
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card className="max-w-xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <KeyRound className="w-5 h-5 text-accent" /> Alterar PIN de Acesso
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Atualize o código de PIN utilizado para acessar a Área do Gerente.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="font-semibold text-amber-900 dark:text-amber-100">
                    Recomendação de Segurança
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs sm:text-sm mt-1">
                    Recomendamos realizar a troca do PIN de acesso ao menos uma vez a cada nova gestão para garantir a proteção e o controle do painel.
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleChangePin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPinInput">Novo PIN</Label>
                    <Input
                      id="newPinInput"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="Digite o novo PIN (máx. 4 dígitos)"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPinInput">Confirmar Novo PIN</Label>
                    <Input
                      id="confirmPinInput"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="Confirme o novo PIN"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Alterar PIN
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!passwordMember} onOpenChange={(o) => { if (!o) setPasswordMember(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Alterar Senha do Membro
            </DialogTitle>
          </DialogHeader>
          {passwordMember && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Alterando a senha da conta vinculada ao membro: <span className="font-semibold text-foreground">{passwordMember.name}</span> ({passwordMember.email}).
              </p>
              <div className="space-y-2">
                <Label htmlFor="memberNewPassword">Nova Senha (4 dígitos)</Label>
                <Input
                  id="memberNewPassword"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Digite a nova senha de 4 dígitos"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberConfirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="memberConfirmPassword"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Confirme a nova senha de 4 dígitos"
                  required
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive font-medium">
                    As senhas não coincidem. A senha e a confirmação devem ser idênticas.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={passwordLoading || (!!confirmPassword && newPassword !== confirmPassword)}
              >
                {passwordLoading ? "Alterando senha..." : "Salvar Nova Senha"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnDialogLoan} onOpenChange={(o) => { if (!o) setReturnDialogLoan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="w-5 h-5 text-accent" /> Confirmar Devolução
            </DialogTitle>
          </DialogHeader>
          {returnDialogLoan && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Registrando a devolução da polo <span className="font-semibold text-foreground">{POLO_TYPE_LABELS[returnDialogLoan.type]}</span> (tamanho <span className="font-semibold text-foreground">{returnDialogLoan.size}</span>) de <span className="font-semibold text-foreground">{returnDialogLoan.requesterName}</span>.
              </p>
              <div className="space-y-2">
                <Label htmlFor="managerReturnNotesInput">Observação da devolução (opcional)</Label>
                <Input
                  id="managerReturnNotesInput"
                  value={returnDialogNotes}
                  onChange={(e) => setReturnDialogNotes(e.target.value)}
                  placeholder="Ex: Entregue em bom estado, lavada, guardada na sede..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setReturnDialogLoan(null)}>Cancelar</Button>
                <Button onClick={handleConfirmReturnSubmit}>Confirmar Devolução</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!approvingLoan} onOpenChange={(o) => { if (!o) setApprovingLoan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" /> Aprovar Solicitação
            </DialogTitle>
          </DialogHeader>
          {approvingLoan && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Aprovando a solicitação de <span className="font-semibold text-foreground">{approvingLoan.requesterName}</span> para a polo <span className="font-semibold text-foreground">{POLO_TYPE_LABELS[approvingLoan.type]}</span> (tamanho <span className="font-semibold text-foreground">{approvingLoan.size}</span>, Qtd: {approvingLoan.quantity}).
              </p>
              <div className="space-y-2">
                <Label htmlFor="approveReturnDateInput">Data de devolução</Label>
                <DatePicker
                  id="approveReturnDateInput"
                  value={approveReturnDate}
                  onChange={(val) => setApproveReturnDate(val)}
                  placeholder="Selecione a data de devolução"
                />
                <p className="text-xs text-muted-foreground">
                  Data sugerida inicialmente a partir da solicitação do usuário ({formatDisplayDate(approvingLoan.expectedReturn)}).
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setApprovingLoan(null)}>Cancelar</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={confirmApproveLoan}>Confirmar Aprovação</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
