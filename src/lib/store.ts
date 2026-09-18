export type PoloSize = string;
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
  returnNotes?: string;
  notes?: string;
}

export interface LoanNotification {
  id: string;
  loanId: string;
  requesterName: string;
  requesterEmail: string;
  title: string;
  message: string;
  type: 'approved' | 'rejected' | 'return_approved' | 'return_rejected';
  createdAt: string;
  read: boolean;
}

const STOCK_KEY = 'conselt_polo_stock';
const LOANS_KEY = 'conselt_polo_loans';
const PIN_KEY = 'conselt_manager_pin';
const NOTIFICATIONS_KEY = 'conselt_polo_notifications';
const DEFAULT_MANAGER_PIN = '1234';

export function getManagerPin(): string {
  return localStorage.getItem(PIN_KEY) || DEFAULT_MANAGER_PIN;
}

export function saveManagerPin(newPin: string): void {
  localStorage.setItem(PIN_KEY, newPin);
}

export function formatAuthPassword(pwd: string): string {
  if (!pwd) return "";
  return pwd.length < 6 ? `${pwd}_conselt_auth` : pwd;
}

export function parseLocalDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date();
  const cleanStr = dateStr.split("T")[0].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [year, month, day] = cleanStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanStr)) {
    const [day, month, year] = cleanStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(cleanStr)) {
    const [day, month, year] = cleanStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

export function formatDisplayDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const cleanStr = dateStr.split("T")[0].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [year, month, day] = cleanStr.split("-");
    return `${day}/${month}/${year}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanStr)) {
    return cleanStr;
  }
  try {
    const d = parseLocalDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function isLoanOverdue(expectedReturn: string | undefined | null, status?: string): boolean {
  if (status === "returned") return false;
  if (!expectedReturn) return false;
  const expDate = parseLocalDate(expectedReturn);
  expDate.setHours(23, 59, 59, 999);
  return new Date() > expDate;
}

export function getOverdueDays(expectedReturn: string | undefined | null, referenceDateStr?: string): number {
  if (!expectedReturn) return 0;
  const expDate = parseLocalDate(expectedReturn);
  expDate.setHours(23, 59, 59, 999);
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  if (refDate <= expDate) return 0;
  const diffMs = refDate.getTime() - expDate.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function isReturnedLate(loan: PoloLoan): boolean {
  if (loan.status !== "returned") return false;
  if (!loan.expectedReturn) return false;
  const expDate = parseLocalDate(loan.expectedReturn);
  expDate.setHours(23, 59, 59, 999);
  if (loan.returnedDate) {
    const retDate = new Date(loan.returnedDate);
    return retDate > expDate;
  }
  return false;
}

export function getNotifications(): LoanNotification[] {
  const data = localStorage.getItem(NOTIFICATIONS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as LoanNotification[];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: LoanNotification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event("conselt_notifications_updated"));
}

export function addNotification(notif: Omit<LoanNotification, 'id' | 'createdAt' | 'read'>) {
  const notifications = getNotifications();
  notifications.unshift({
    ...notif,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    read: false,
  });
  saveNotifications(notifications);
}

export function getUnreadNotificationsCount(userEmail?: string): number {
  const list = getNotifications();
  if (userEmail) {
    return list.filter(n => !n.read && n.requesterEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()).length;
  }
  return list.filter(n => !n.read).length;
}

export function markNotificationsAsRead(userEmail?: string) {
  const list = getNotifications();
  let changed = false;
  const updated = list.map(n => {
    if (!n.read && (!userEmail || n.requesterEmail.trim().toLowerCase() === userEmail.trim().toLowerCase())) {
      changed = true;
      return { ...n, read: true };
    }
    return n;
  });
  if (changed) {
    saveNotifications(updated);
  }
}

export function deleteNotification(id: string) {
  const list = getNotifications();
  const updated = list.filter(n => n.id !== id);
  saveNotifications(updated);
}

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
  if (parsed.length > 0 && !parsed[0].type) {
    const migrated = getDefaultStock();
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

export function approveLoan(loanId: string, customExpectedReturn?: string): boolean {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'pending') return false;

  const stock = getStock();
  const item = stock.find(s => s.size.toUpperCase() === loan.size.toUpperCase() && s.type === loan.type);
  if (item) {
    item.available = Math.max(0, item.available - loan.quantity);
    saveStock(stock);
  }

  loan.status = 'approved';
  if (customExpectedReturn && customExpectedReturn.trim() !== '') {
    loan.expectedReturn = customExpectedReturn.trim();
  }
  saveLoans(loans);

  const formattedDate = formatDisplayDate(loan.expectedReturn);

  addNotification({
    loanId: loan.id,
    requesterName: loan.requesterName,
    requesterEmail: loan.requesterEmail,
    title: "Pedido Aprovado! 🎉",
    message: `Seu pedido da polo ${POLO_TYPE_LABELS[loan.type]} (tamanho ${loan.size}, Qtd: ${loan.quantity}) foi APROVADO. Data de devolução definida: ${formattedDate}.`,
    type: "approved",
  });

  return true;
}

export function rejectLoan(loanId: string) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'pending') return;

  addNotification({
    loanId: loan.id,
    requesterName: loan.requesterName,
    requesterEmail: loan.requesterEmail,
    title: "Pedido Recusado",
    message: `Seu pedido da polo ${POLO_TYPE_LABELS[loan.type]} (tamanho ${loan.size}, Qtd: ${loan.quantity}) foi RECUSADO pelo gerente.`,
    type: "rejected",
  });

  loans.splice(loans.indexOf(loan), 1);
  saveLoans(loans);
}

export function requestReturn(loanId: string, notes?: string): boolean {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'approved') return false;

  loan.status = 'return_pending';
  if (notes !== undefined && notes.trim() !== '') {
    loan.returnNotes = notes.trim();
  }
  saveLoans(loans);
  return true;
}

export function approveReturn(loanId: string, notes?: string) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'return_pending') return;

  loan.status = 'returned';
  loan.returnedDate = new Date().toISOString();
  if (notes !== undefined && notes.trim() !== '') {
    loan.returnNotes = notes.trim();
  }
  saveLoans(loans);

  const stock = getStock();
  const item = stock.find(s => s.size === loan.size && s.type === loan.type);
  if (item) {
    item.available = Math.min(item.total, item.available + loan.quantity);
    saveStock(stock);
  }

  const obsText = notes && notes.trim() ? ` (Obs: ${notes.trim()})` : '';
  addNotification({
    loanId: loan.id,
    requesterName: loan.requesterName,
    requesterEmail: loan.requesterEmail,
    title: "Devolução Confirmada! ✅",
    message: `A devolução da sua polo ${POLO_TYPE_LABELS[loan.type]} (tamanho ${loan.size}) foi ACEITA pelo gerente.${obsText}`,
    type: "return_approved",
  });
}

export function returnLoan(loanId: string, notes?: string): boolean {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || (loan.status !== 'approved' && loan.status !== 'return_pending')) return false;

  loan.status = 'returned';
  loan.returnedDate = new Date().toISOString();
  if (notes !== undefined && notes.trim() !== '') {
    loan.returnNotes = notes.trim();
  }
  saveLoans(loans);

  const stock = getStock();
  const item = stock.find(s => s.size === loan.size && s.type === loan.type);
  if (item) {
    item.available = Math.min(item.total, item.available + loan.quantity);
    saveStock(stock);
  }

  const obsText = notes && notes.trim() ? ` (Obs: ${notes.trim()})` : '';
  addNotification({
    loanId: loan.id,
    requesterName: loan.requesterName,
    requesterEmail: loan.requesterEmail,
    title: "Devolução Registrada! ✅",
    message: `A devolução da sua polo ${POLO_TYPE_LABELS[loan.type]} (tamanho ${loan.size}) foi confirmada pelo gerente.${obsText}`,
    type: "return_approved",
  });

  return true;
}

export function rejectReturn(loanId: string) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'return_pending') return;

  loan.status = 'approved';
  saveLoans(loans);

  addNotification({
    loanId: loan.id,
    requesterName: loan.requesterName,
    requesterEmail: loan.requesterEmail,
    title: "Devolução Recusada",
    message: `A solicitação de devolução da polo ${POLO_TYPE_LABELS[loan.type]} (tamanho ${loan.size}) foi RECUSADA pelo gerente.`,
    type: "return_rejected",
  });
}

export function verifyManagerPin(pin: string): boolean {
  return pin === getManagerPin();
}
