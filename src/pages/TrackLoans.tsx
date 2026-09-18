import { useState, useEffect } from "react";
import { getLoans, requestReturn, getNotifications, markNotificationsAsRead, deleteNotification, formatDisplayDate, isLoanOverdue, getOverdueDays, type PoloLoan, type PoloSize, type PoloType, type LoanNotification } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, AlertTriangle, Undo2, MessageSquare, Bell, CheckCircle, XCircle, Trash2, CheckCheck } from "lucide-react";
import LoanFilters, { filterLoans } from "@/components/LoanFilters";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Em uso",
  returned: "Devolvida",
};

function LoanList({ loans, onRefresh, poloType }: { loans: PoloLoan[]; onRefresh: () => void; poloType?: PoloType }) {
  const [search, setSearch] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<PoloSize[]>([]);
  const [delayOnly, setDelayOnly] = useState(false);
  const { toast } = useToast();

  const activeLoans = filterLoans(
    loans.filter(l => l.status !== "returned"),
    search,
    selectedSizes,
    delayOnly
  );

  const pendingLoans = activeLoans.filter(l => l.status === "pending");
  const returnPendingLoans = activeLoans.filter(l => l.status === "return_pending");
  const approvedLoans = activeLoans.filter(l => l.status === "approved");

  const handleRequestReturn = (loanId: string) => {
    const ok = requestReturn(loanId);
    if (ok) {
      onRefresh();
      toast({ title: "Devolução solicitada!", description: "Aguarde a confirmação do gerente." });
    }
  };

  return (
    <div className="space-y-4">
      <LoanFilters
        search={search}
        onSearchChange={setSearch}
        selectedSizes={selectedSizes}
        onSizesChange={setSelectedSizes}
        showDelayFilter
        delayOnly={delayOnly}
        onDelayChange={setDelayOnly}
        poloType={poloType}
      />

      {activeLoans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum empréstimo encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingLoans.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Aguardando aprovação</p>
              {pendingLoans.map(loan => (
                <Card key={loan.id} className="border-amber-400 border-2 bg-amber-500/5">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <span className="w-11 h-11 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xs">
                        {loan.size}
                      </span>
                      <div>
                        <p className="font-semibold">{loan.requesterName}</p>
                        <p className="text-sm text-muted-foreground">
                          {loan.size} · Devolução: {formatDisplayDate(loan.expectedReturn)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Qtd: {loan.quantity}</span>
                      <Badge variant="secondary">Pendente</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {returnPendingLoans.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Devolução solicitada</p>
              {returnPendingLoans.map(loan => (
                <Card key={loan.id} className="border-blue-400 border-2 bg-blue-500/5">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <span className="w-11 h-11 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {loan.size}
                      </span>
                      <div>
                        <p className="font-semibold">{loan.requesterName}</p>
                        <p className="text-sm text-muted-foreground">
                          {loan.size} · Aguardando confirmação do gerente
                        </p>
                        {(loan.returnNotes || loan.notes) && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 bg-background/60 px-2 py-0.5 rounded border border-border/40 w-fit">
                            <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span className="font-semibold text-foreground">Obs:</span> {loan.returnNotes || loan.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Qtd: {loan.quantity}</span>
                      <Badge variant="outline">Devolução pendente</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {approvedLoans.map(loan => {
            const isOverdue = isLoanOverdue(loan.expectedReturn, loan.status);
            const daysOverdue = isOverdue ? getOverdueDays(loan.expectedReturn) : 0;
            return (
              <Card key={loan.id} className={isOverdue ? "border-destructive border-2 bg-destructive/5 shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.3)]" : ""}>
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <span className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-xs ${isOverdue ? "bg-destructive text-destructive-foreground" : "gradient-card text-accent-foreground"}`}>
                      {isOverdue ? <AlertTriangle className="w-5 h-5" /> : loan.size}
                    </span>
                    <div>
                      <p className={`font-semibold ${isOverdue ? "text-destructive" : ""}`}>{loan.requesterName}</p>
                      <p className="text-sm text-muted-foreground">
                        {loan.size} · Devolução: {formatDisplayDate(loan.expectedReturn)}
                      </p>
                      {isOverdue && (
                        <p className="text-xs text-destructive font-bold animate-pulse">
                          ⚠ Atrasado — {daysOverdue} dia{daysOverdue !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Qtd: {loan.quantity}</span>
                    <Badge variant={isOverdue ? "destructive" : "default"}>
                      {isOverdue ? "Atrasado" : "Em uso"}
                    </Badge>
                    <Button size="sm" variant={isOverdue ? "destructive" : "outline"} onClick={() => handleRequestReturn(loan.id)}>
                      <Undo2 className="w-4 h-4 mr-1" /> Devolver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TrackLoans() {
  const [loans, setLoans] = useState<PoloLoan[]>([]);
  const [notifications, setNotifications] = useState<LoanNotification[]>([]);
  const { user } = useAuth();

  const userEmail = user?.email?.trim().toLowerCase();

  const loadData = () => {
    const allLoans = getLoans();
    const isVP = userEmail === "vicepresidencia@conselt.com.br";
    const filteredLoans = isVP
      ? allLoans
      : userEmail
      ? allLoans.filter(l => l.requesterEmail && l.requesterEmail.trim().toLowerCase() === userEmail)
      : [];
    setLoans(filteredLoans);

    const allNotifs = getNotifications();
    const filteredNotifs = isVP
      ? allNotifs
      : userEmail
      ? allNotifs.filter(n => n.requesterEmail && n.requesterEmail.trim().toLowerCase() === userEmail)
      : [];
    setNotifications(filteredNotifs);
  };

  useEffect(() => {
    loadData();
    if (userEmail) {
      markNotificationsAsRead(userEmail);
    }

    const handleUpdate = () => {
      loadData();
      if (userEmail) {
        markNotificationsAsRead(userEmail);
      }
    };

    window.addEventListener("conselt_notifications_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("conselt_notifications_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [userEmail]);

  const handleClearNotifications = () => {
    notifications.forEach(n => deleteNotification(n.id));
    loadData();
  };

  const sedeLoans = loans.filter(l => l.type === 'sede');
  const eventoLoans = loans.filter(l => l.type === 'evento');

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Meus Empréstimos</h1>
        <p className="text-muted-foreground mt-1">
          {userEmail
            ? `Acompanhe as solicitações e empréstimos ativos vinculados a ${userEmail}.`
            : "Faça login com seu e-mail da Conselt para acompanhar seus empréstimos."}
        </p>
      </div>

      {!userEmail ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">Conta não identificada</p>
          <p className="text-sm mt-1">Por favor, faça login com a sua conta para visualizar seus pedidos de polo.</p>
        </Card>
      ) : (
        <>
          {notifications.length > 0 && (
            <Card className="border-accent/40 bg-accent/5 overflow-hidden">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/40 bg-accent/10">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-accent animate-bounce" />
                  <h3 className="text-sm font-bold tracking-tight">Minhas Notificações</h3>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={handleClearNotifications}>
                  <CheckCheck className="w-3.5 h-3.5 mr-1" /> Limpar Notificações
                </Button>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-start justify-between p-3 rounded-lg bg-background border border-border/60 gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {n.type === 'approved' || n.type === 'return_approved' ? (
                        <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                          <XCircle className="w-4 h-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold">{n.title}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {formatDisplayDate(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => { deleteNotification(n.id); loadData(); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="sede">
            <TabsList>
              <TabsTrigger value="sede">Sede</TabsTrigger>
              <TabsTrigger value="evento">Evento</TabsTrigger>
            </TabsList>
            <TabsContent value="sede" className="mt-4">
              <LoanList loans={sedeLoans} onRefresh={loadData} poloType="sede" />
            </TabsContent>
            <TabsContent value="evento" className="mt-4">
              <LoanList loans={eventoLoans} onRefresh={loadData} poloType="evento" />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
