import { useState, useEffect } from "react";
import { getStock, type PoloStock, type PoloType, POLO_TYPE_LABELS } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shirt, Package } from "lucide-react";

function StockTab({ items }: { items: PoloStock[] }) {
  const totalPolos = items.reduce((s, i) => s + i.total, 0);
  const totalAvailable = items.reduce((s, i) => s + i.available, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{totalPolos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-lg bg-success flex items-center justify-center">
              <Shirt className="w-6 h-6 text-success-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
              <p className="text-2xl font-bold">{totalAvailable}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tamanhos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {items.map((item) => (
              <div
                key={`${item.type}-${item.size}`}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-lg gradient-card flex items-center justify-center text-accent-foreground font-bold text-sm">
                    {item.size}
                  </span>
                  <div>
                    <p className="font-semibold">Tamanho {item.size}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.available} de {item.total} disponíveis
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StockPage() {
  const [stock, setStock] = useState<PoloStock[]>(getStock());

  useEffect(() => {
    setStock(getStock());
  }, []);

  const sedeStock = stock.filter(s => s.type === 'sede');
  const eventoStock = stock.filter(s => s.type === 'evento');

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Estoque de Polos</h1>
        <p className="text-muted-foreground mt-1">
          Visualize os tamanhos e quantidades disponíveis.
        </p>
      </div>

      <Tabs defaultValue="sede">
        <TabsList>
          <TabsTrigger value="sede">Sede</TabsTrigger>
          <TabsTrigger value="evento">Evento</TabsTrigger>
        </TabsList>
        <TabsContent value="sede" className="mt-4">
          <StockTab items={sedeStock} />
        </TabsContent>
        <TabsContent value="evento" className="mt-4">
          <StockTab items={eventoStock} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
