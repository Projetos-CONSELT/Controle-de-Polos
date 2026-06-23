import { useState, useEffect } from "react";
import { getLoans, requestReturn, type PoloLoan, type PoloSize, type PoloType, POLO_TYPE_LABELS } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, AlertTriangle, Undo2 } from "lucide-react";
import LoanFilters, { filterLoans } from "@/components/LoanFilters";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Em uso",
  returned: "Devolvida",
};

function LoanList({ loans, onRefresh }: { loans: PoloLoan[]; onRefresh: () => void }) {
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
                          {loan.size} · Devolução: {new Date(loan.expectedReturn).toLocaleDateString("pt-BR")}
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
            const isOverdue = new Date(loan.expectedReturn) < new Date();
            const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(loan.expectedReturn).getTime()) / (1000 * 60 * 60 * 24)) : 0;
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
                        {loan.size} · Devolução: {new Date(loan.expectedReturn).toLocaleDateString("pt-BR")}
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

  const loadLoans = () => setLoans(getLoans());

  useEffect(() => {
    loadLoans();
  }, []);

  const sedeLoans = loans.filter(l => l.type === 'sede');
  const eventoLoans = loans.filter(l => l.type === 'evento');

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Acompanhamento</h1>
        <p className="text-muted-foreground mt-1">Veja os empréstimos ativos.</p>
      </div>

      <Tabs defaultValue="sede">
        <TabsList>
          <TabsTrigger value="sede">Sede</TabsTrigger>
          <TabsTrigger value="evento">Evento</TabsTrigger>
        </TabsList>
        <TabsContent value="sede" className="mt-4">
          <LoanList loans={sedeLoans} onRefresh={loadLoans} />
        </TabsContent>
        <TabsContent value="evento" className="mt-4">
          <LoanList loans={eventoLoans} onRefresh={loadLoans} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
