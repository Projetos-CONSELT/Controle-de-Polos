import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Search, X, Calendar as CalendarIcon } from "lucide-react";
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
  showDateFilter?: boolean;
  startDate?: string;
  onStartDateChange?: (value: string) => void;
  endDate?: string;
  onEndDateChange?: (value: string) => void;
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
  showDateFilter = false,
  startDate = "",
  onStartDateChange,
  endDate = "",
  onEndDateChange,
}: LoanFiltersProps) {
  const toggleSize = (size: PoloSize) => {
    onSizesChange(
      selectedSizes.includes(size)
        ? selectedSizes.filter((s) => s !== size)
        : [...selectedSizes, size]
    );
  };

  const hasFilters = search || selectedSizes.length > 0 || delayOnly || startDate || endDate;

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

      {showDateFilter && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-accent" /> Filtrar por data:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={startDate}
              onChange={(val) => onStartDateChange && onStartDateChange(val)}
              placeholder="Data inicial"
              className="w-36 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <DatePicker
              value={endDate}
              onChange={(val) => onEndDateChange && onEndDateChange(val)}
              placeholder="Data final"
              className="w-36 h-8 text-xs"
            />
          </div>
        </div>
      )}

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
              if (onStartDateChange) onStartDateChange("");
              if (onEndDateChange) onEndDateChange("");
            }}
          >
            <X className="w-3 h-3 mr-1" /> Limpar Filtros
          </Button>
        )}
      </div>
    </div>
  );
}

export function filterLoans<T extends { requesterName: string; size: string; expectedReturn: string; status: string; returnedDate?: string; requestDate?: string }>(
  loans: T[],
  search: string,
  selectedSizes: PoloSize[],
  delayOnly: boolean,
  startDate?: string,
  endDate?: string
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
    const targetDateStr = l.status === "returned" ? (l.returnedDate || l.requestDate) : l.requestDate;
    if (startDate && targetDateStr) {
      const itemDateStr = targetDateStr.split("T")[0];
      if (itemDateStr < startDate) return false;
    }
    if (endDate && targetDateStr) {
      const itemDateStr = targetDateStr.split("T")[0];
      if (itemDateStr > endDate) return false;
    }
    return true;
  });
}

