import { useState, useEffect } from "react";
import { getStock, type PoloStock, type PoloType, POLO_TYPE_LABELS } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shirt, Package, Info, UserCheck } from "lucide-react";

function StockTab({ items, type }: { items: PoloStock[]; type: PoloType }) {
  const totalPolos = items.reduce((s, i) => s + i.total, 0);
  const totalAvailable = items.reduce((s, i) => s + i.available, 0);
  const totalInUse = Math.max(0, totalPolos - totalAvailable);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Total ({POLO_TYPE_LABELS[type]})</p>
              <p className="text-2xl font-bold">{totalPolos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 text-green-600 flex items-center justify-center shrink-0">
              <Shirt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Disponíveis ({POLO_TYPE_LABELS[type]})</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalAvailable}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Em Uso ({POLO_TYPE_LABELS[type]})</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalInUse}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Tamanhos — {POLO_TYPE_LABELS[type]}</CardTitle>
          <Badge variant="outline" className="font-normal text-xs">
            {items.length} tamanho{items.length !== 1 ? "s" : ""} cadastrado{items.length !== 1 ? "s" : ""}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {items.map((item) => {
              const inUse = Math.max(0, item.total - item.available);
              const percentage = item.total > 0 ? Math.round((item.available / item.total) * 100) : 0;
              const isLow = item.available > 0 && item.available <= 2;
              const isOut = item.available === 0;

              return (
                <div
                  key={`${item.type}-${item.size}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-12 h-12 rounded-lg gradient-card flex items-center justify-center text-accent-foreground font-bold text-sm px-1 shrink-0">
                      {item.size}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm sm:text-base">Tamanho {item.size}</p>
                        <Badge
                          variant={isOut ? "destructive" : isLow ? "secondary" : "outline"}
                          className="text-[10px] py-0 px-1.5 h-4"
                        >
                          {isOut ? "Sem estoque" : isLow ? "Poucas unidades" : "Disponível"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">{item.available}</strong> de {item.total} disponíveis · <span className="text-muted-foreground">{inUse} em uso</span>
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-44 flex flex-col gap-1.5 sm:items-end justify-center">
                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full text-xs text-muted-foreground">
                      <span>Disponibilidade:</span>
                      <span className="font-semibold text-foreground">{percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOut ? "bg-destructive" : isLow ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum tamanho cadastrado para {POLO_TYPE_LABELS[type]}.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StockPage() {
  const [stock, setStock] = useState<PoloStock[]>(getStock());
  const [activeTab, setActiveTab] = useState<PoloType>("sede");

  const refreshStock = () => {
    setStock(getStock());
  };

  useEffect(() => {
    refreshStock();
    window.addEventListener("storage", refreshStock);
    window.addEventListener("conselt_notifications_updated", refreshStock);
    return () => {
      window.removeEventListener("storage", refreshStock);
      window.removeEventListener("conselt_notifications_updated", refreshStock);
    };
  }, []);

  const sedeStock = stock.filter((s) => s.type === "sede");
  const eventoStock = stock.filter((s) => s.type === "evento");

  const descriptions: Record<PoloType, string> = {
    sede: "As polos de outras gerações anteriores. Usadas para participar de RG ou ficar na sede.",
    evento: "As polos novas da Conselt. Usadas para reuniões com clientes, parceiros e eventos.",
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Estoque de Polos</h1>
        <p className="text-muted-foreground mt-1">
          Visualize os tamanhos e quantidades disponíveis por categoria.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PoloType)}>
        <TabsList>
          <TabsTrigger value="sede">Sede</TabsTrigger>
          <TabsTrigger value="evento">Evento</TabsTrigger>
        </TabsList>

        <div className="mt-3 p-3.5 rounded-lg bg-muted/60 border border-border/60 text-xs sm:text-sm flex items-start gap-2.5">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p>
            <strong className="font-semibold text-foreground">{POLO_TYPE_LABELS[activeTab]}:</strong>{" "}
            {descriptions[activeTab]}
          </p>
        </div>

        <TabsContent value="sede" className="mt-4">
          <StockTab items={sedeStock} type="sede" />
        </TabsContent>
        <TabsContent value="evento" className="mt-4">
          <StockTab items={eventoStock} type="evento" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
