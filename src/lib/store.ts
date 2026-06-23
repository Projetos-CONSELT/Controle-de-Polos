export type PoloSize = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XGG';
export type PoloType = 'sede' | 'evento';

export const POLO_TYPE_LABELS: Record<PoloType, string> = {
  sede: 'Sede',
  evento: 'Evento',
};

export interface PoloStock {
  size: PoloSize;
  type: PoloType;
  total: number;
  available: number;
}

export type LoanStatus = 'pending' | 'approved' | 'return_pending' | 'returned';

export interface PoloLoan {
  id: string;
  requesterName: string;
  requesterEmail: string;
  size: PoloSize;
  type: PoloType;
  quantity: number;
  requestDate: string;
  expectedReturn: string;
  status: LoanStatus;
  returnedDate?: string;
}

const STOCK_KEY = 'conselt_polo_stock';
const LOANS_KEY = 'conselt_polo_loans';
const MANAGER_PIN = '1234';

const SIZES: PoloSize[] = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];
const TYPES: PoloType[] = ['sede', 'evento'];

function getDefaultStock(): PoloStock[] {
  const stock: PoloStock[] = [];
  for (const type of TYPES) {
    const defaults: Record<PoloSize, number> = {
      PP: 5, P: 10, M: 15, G: 10, GG: 5, XGG: 3,
    };
    for (const size of SIZES) {
      stock.push({ size, type, total: defaults[size], available: defaults[size] });
    }
  }
  return stock;
}

export function getStock(): PoloStock[] {
  const data = localStorage.getItem(STOCK_KEY);
  if (!data) return getDefaultStock();
  const parsed = JSON.parse(data) as PoloStock[];
  // Migration: if old format without type, convert
  if (parsed.length > 0 && !parsed[0].type) {
    const migrated = getDefaultStock();
    // Map old stock to 'sede'
    for (const old of parsed as any[]) {
      const item = migrated.find(s => s.size === old.size && s.type === 'sede');
      if (item) {
        item.total = old.total;
        item.available = old.available;
      }
    }
    saveStock(migrated);
    return migrated;
  }
  return parsed;
}

export function getStockByType(type: PoloType): PoloStock[] {
  return getStock().filter(s => s.type === type);
}

export function saveStock(stock: PoloStock[]) {
  localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
}

export function getLoans(): PoloLoan[] {
  const data = localStorage.getItem(LOANS_KEY);
  if (!data) return [];
  const parsed = JSON.parse(data) as PoloLoan[];
  // Migration: add type='sede' to old loans without type
  return parsed.map(l => ({ ...l, type: l.type || 'sede' as PoloType }));
}

export function saveLoans(loans: PoloLoan[]) {
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}

export function createLoan(loan: Omit<PoloLoan, 'id' | 'requestDate' | 'status'>): boolean {
  const stock = getStock();
  const item = stock.find(s => s.size === loan.size && s.type === loan.type);
  if (!item || item.available < loan.quantity) return false;

  const loans = getLoans();
  loans.push({
    ...loan,
    id: crypto.randomUUID(),
    requestDate: new Date().toISOString(),
    status: 'pending',
  });
  saveLoans(loans);
  return true;
}

export function approveLoan(loanId: string): boolean {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'pending') return false;

  const stock = getStock();
  const item = stock.find(s => s.size === loan.size && s.type === loan.type);
  if (!item || item.available < loan.quantity) return false;

  item.available -= loan.quantity;
  saveStock(stock);

  loan.status = 'approved';
  saveLoans(loans);
  return true;
}

export function rejectLoan(loanId: string) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'pending') return;

  loans.splice(loans.indexOf(loan), 1);
  saveLoans(loans);
}

export function requestReturn(loanId: string): boolean {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'approved') return false;

  loan.status = 'return_pending';
  saveLoans(loans);
  return true;
}

export function approveReturn(loanId: string) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'return_pending') return;

  loan.status = 'returned';
  loan.returnedDate = new Date().toISOString();
  saveLoans(loans);

  const stock = getStock();
  const item = stock.find(s => s.size === loan.size && s.type === loan.type);
  if (item) {
    item.available = Math.min(item.total, item.available + loan.quantity);
    saveStock(stock);
  }
}

export function rejectReturn(loanId: string) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'return_pending') return;

  loan.status = 'approved';
  saveLoans(loans);
}

export function verifyManagerPin(pin: string): boolean {
  return pin === MANAGER_PIN;
}
