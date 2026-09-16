import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { getStock, isLoanOverdue, isReturnedLate, type PoloSize, type PoloType, type PoloStock, type PoloLoan } from "@/lib/store";

interface LoanFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedSizes: PoloSize[];
  onSizesChange: (sizes: PoloSize[]) => void;
  showDelayFilter?: boolean;
  delayOnly: boolean;
  onDelayChange: (value: boolean) => void;
  poloType?: PoloType;
  customStock?: PoloStock[];
}

export default function LoanFilters({
  search,
  onSearchChange,
  selectedSizes,
  onSizesChange,
  showDelayFilter = false,
  delayOnly,
  onDelayChange,
  poloType,
  customStock,
}: LoanFiltersProps) {
  const toggleSize = (size: PoloSize) => {
    onSizesChange(
      selectedSizes.includes(size)
        ? selectedSizes.filter((s) => s !== size)
        : [...selectedSizes, size]
    );
  };

  const hasFilters = search || selectedSizes.length > 0 || delayOnly;

  const currentStock = customStock && customStock.length > 0 ? customStock : getStock();
  const availableSizes = poloType
    ? Array.from(new Set(currentStock.filter((s) => s.type === poloType).map((s) => s.size)))
    : Array.from(new Set(currentStock.map((s) => s.size)));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Tamanho:</span>
        {availableSizes.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">Nenhum tamanho registrado no estoque</span>
        ) : (
          availableSizes.map((size) => (
            <Badge
              key={size}
              variant={selectedSizes.includes(size) ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => toggleSize(size)}
            >
              {size}
            </Badge>
          ))
        )}
        {showDelayFilter && (
          <>
            <span className="text-xs text-muted-foreground font-medium ml-2">Status:</span>
            <Badge
              variant={delayOnly ? "destructive" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => onDelayChange(!delayOnly)}
            >
              Atrasados
            </Badge>
          </>
        )}
        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => {
              onSearchChange("");
              onSizesChange([]);
              onDelayChange(false);
            }}
          >
            <X className="w-3 h-3 mr-1" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

export function filterLoans<T extends { requesterName: string; size: string; expectedReturn: string; status: string }>(
  loans: T[],
  search: string,
  selectedSizes: PoloSize[],
  delayOnly: boolean
): T[] {
  return loans.filter((l) => {
    if (search && !l.requesterName.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedSizes.length > 0 && !selectedSizes.includes(l.size as PoloSize)) return false;
    if (delayOnly) {
      if (l.status === "returned") {
        if (!isReturnedLate(l as unknown as PoloLoan)) return false;
      } else {
        if (!isLoanOverdue(l.expectedReturn, l.status)) return false;
      }
    }
    return true;
  });
}

