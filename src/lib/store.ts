import { supabase } from '@/integrations/supabase/client';

export type PoloSize = string;
export type PoloType = 'sede' | 'evento';

export const POLO_TYPE_LABELS: Record<PoloType, string> = {
  sede: 'Sede',
  evento: 'Evento',
};

export interface PoloStock {
  id?: string;
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
  loanId?: string;
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

export async function addNotification(notif: Omit<LoanNotification, 'id' | 'createdAt' | 'read'>) {
  const newId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const newNotif: LoanNotification = {
    ...notif,
    id: newId,
    createdAt,
    read: false,
  };

  const notifications = getNotifications();
  notifications.unshift(newNotif);
  saveNotifications(notifications);

  // Sync with Supabase
  try {
    await supabase.from("loan_notifications").insert({
      id: newId,
      loan_id: notif.loanId || null,
      requester_name: notif.requesterName,
      requester_email: notif.requesterEmail,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      read: false,
      created_at: createdAt,
    });
  } catch (err) {
    console.warn("Erro ao salvar notificação no Supabase:", err);
  }
}

export function getUnreadNotificationsCount(userEmail?: string): number {
  const list = getNotifications();
  if (userEmail) {
    return list.filter(n => !n.read && n.requesterEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()).length;
  }
  return list.filter(n => !n.read).length;
}

export async function markNotificationsAsRead(userEmail?: string) {
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

  // Sync read status in Supabase
  try {
    if (userEmail) {
      await supabase
        .from("loan_notifications")
        .update({ read: true })
        .ilike("requester_email", userEmail.trim().toLowerCase());
    } else {
      await supabase
        .from("loan_notifications")
        .update({ read: true })
        .eq("read", false);
    }
  } catch (err) {
    console.warn("Erro ao marcar notificações como lidas no Supabase:", err);
  }
}

export async function deleteNotification(id: string) {
  const list = getNotifications();
  const updated = list.filter(n => n.id !== id);
  saveNotifications(updated);

  try {
    await supabase.from("loan_notifications").delete().eq("id", id);
  } catch (err) {
    console.warn("Erro ao excluir notificação do Supabase:", err);
  }
}

export function syncStockAvailable(stockList: PoloStock[], loansList: PoloLoan[] = getLoans()): PoloStock[] {
  return stockList.map(item => {
    const activeBorrowed = loansList
      .filter(l => 
        (l.status === 'approved' || l.status === 'return_pending') && 
        l.type === item.type && 
        l.size.trim().toUpperCase() === item.size.trim().toUpperCase()
      )
      .reduce((sum, l) => sum + (l.quantity || 1), 0);

    const available = Math.max(0, item.total - activeBorrowed);
    return { ...item, available };
  });
}

const SIZES: PoloSize[] = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];
const TYPES: PoloType[] = ['sede', 'evento'];

function getDefaultStock(): PoloStock[] {
  const stock: PoloStock[] = [];
  // Default values matching Sede (32 total) and Evento (48 total)
  const sedeDefaults: Record<PoloSize, number> = {
    PP: 2, P: 6, M: 12, G: 8, GG: 3, XGG: 1,
  };
  const eventoDefaults: Record<PoloSize, number> = {
    PP: 5, P: 10, M: 15, G: 10, GG: 5, XGG: 3,
  };

  for (const size of SIZES) {
    stock.push({ size, type: 'sede', total: sedeDefaults[size] || 0, available: sedeDefaults[size] || 0 });
  }
  for (const size of SIZES) {
    stock.push({ size, type: 'evento', total: eventoDefaults[size] || 0, available: eventoDefaults[size] || 0 });
  }
  return stock;
}

export function getStock(): PoloStock[] {
  try {
    const data = localStorage.getItem(STOCK_KEY);
    let stockItems: PoloStock[];
    if (!data) {
      stockItems = getDefaultStock();
    } else {
      const parsed = JSON.parse(data) as PoloStock[];
      if (parsed.length > 0 && !parsed[0].type) {
        const migrated = getDefaultStock();
        for (const old of parsed as any[]) {
          const item = migrated.find(s => s.size === old.size && s.type === 'sede');
          if (item) {
            item.total = old.total;
          }
        }
        stockItems = migrated;
      } else {
        stockItems = parsed;
      }
    }
    const loans = getLoans();
    return syncStockAvailable(stockItems, loans);
  } catch {
    return getDefaultStock();
  }
}

export function getStockByType(type: PoloType): PoloStock[] {
  return getStock().filter(s => s.type === type);
}

export async function saveStock(stock: PoloStock[]) {
  try {
    const synced = syncStockAvailable(stock, getLoans());
    localStorage.setItem(STOCK_KEY, JSON.stringify(synced));
    window.dispatchEvent(new Event("conselt_stock_updated"));

    // Sync to Supabase
    for (const item of synced) {
      await supabase.from("polo_stock").upsert(
        {
          type: item.type,
          size: item.size,
          total: item.total,
          available: item.available,
        },
        { onConflict: "type,size" }
      );
    }
  } catch (e) {
    console.error("Erro ao salvar estoque:", e);
  }
}

export function getLoans(): PoloLoan[] {
  try {
    const data = localStorage.getItem(LOANS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as PoloLoan[];
    return parsed.map(l => ({ ...l, type: l.type || ('sede' as PoloType) }));
  } catch {
    return [];
  }
}

export function saveLoans(loans: PoloLoan[]) {
  try {
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
    window.dispatchEvent(new Event("conselt_loans_updated"));
    window.dispatchEvent(new Event("conselt_stock_updated"));
  } catch (e) {
    console.error("Erro ao salvar empréstimos:", e);
  }
}

export async function createLoan(loan: Omit<PoloLoan, 'id' | 'requestDate' | 'status'>): Promise<boolean> {
  const stock = getStock();
  const item = stock.find(s => s.size.toUpperCase() === loan.size.toUpperCase() && s.type === loan.type);
  if (!item || item.available < loan.quantity) return false;

  const newId = crypto.randomUUID();
  const requestDate = new Date().toISOString();
  const newLoan: PoloLoan = {
    ...loan,
    id: newId,
    requestDate,
    status: 'pending',
  };

  const loans = getLoans();
  loans.push(newLoan);
  saveLoans(loans);

  // Sync to Supabase
  try {
    const { error } = await supabase.from("polo_loans").insert({
      id: newId,
      requester_name: loan.requesterName,
      requester_email: loan.requesterEmail,
      type: loan.type,
      size: loan.size,
      quantity: loan.quantity,
      request_date: requestDate,
      expected_return: loan.expectedReturn,
      status: "pending",
    });
    if (error) console.warn("Erro ao salvar empréstimo no Supabase:", error);
  } catch (e) {
    console.warn("Erro na requisição createLoan Supabase:", e);
  }

  return true;
}

export async function approveLoan(loanId: string, customExpectedReturn?: string): Promise<boolean> {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'pending') return false;

  loan.status = 'approved';
  if (customExpectedReturn && customExpectedReturn.trim() !== '') {
    loan.expectedReturn = customExpectedReturn.trim();
  }
  saveLoans(loans);

  // Sync stock available counts
  saveStock(getStock());

  const formattedDate = formatDisplayDate(loan.expectedReturn);

  addNotification({
    loanId: loan.id,
    requesterName: loan.requesterName,
    requesterEmail: loan.requesterEmail,
    title: "Pedido Aprovado! 🎉",
    message: `Seu pedido da polo ${POLO_TYPE_LABELS[loan.type]} (tamanho ${loan.size}, Qtd: ${loan.quantity}) foi APROVADO. Data de devolução definida: ${formattedDate}.`,
    type: "approved",
  });

  // Sync to Supabase
  try {
    await supabase.from("polo_loans").update({
      status: "approved",
      expected_return: loan.expectedReturn,
    }).eq("id", loanId);
  } catch (e) {
    console.warn("Erro ao aprovar empréstimo no Supabase:", e);
  }

  return true;
}

export async function rejectLoan(loanId: string) {
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
  saveStock(getStock());

  // Sync to Supabase
  try {
    await supabase.from("polo_loans").delete().eq("id", loanId);
  } catch (e) {
    console.warn("Erro ao recusar empréstimo no Supabase:", e);
  }
}

export async function requestReturn(loanId: string, notes?: string): Promise<boolean> {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'approved') return false;

  loan.status = 'return_pending';
  if (notes !== undefined && notes.trim() !== '') {
    loan.returnNotes = notes.trim();
  }
  saveLoans(loans);

  // Sync to Supabase
  try {
    await supabase.from("polo_loans").update({
      status: "return_pending",
      return_notes: notes || null,
    }).eq("id", loanId);
  } catch (e) {
    console.warn("Erro ao solicitar devolução no Supabase:", e);
  }

  return true;
}

export async function approveReturn(loanId: string, notes?: string) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status !== 'return_pending') return;

  loan.status = 'returned';
  loan.returnedDate = new Date().toISOString();
  if (notes !== undefined && notes.trim() !== '') {
    loan.returnNotes = notes.trim();
  }
  saveLoans(loans);
  saveStock(getStock());

  const obsText = notes && notes.trim() ? ` (Obs: ${notes.trim()})` : '';
  addNotification({
    loanId: loan.id,
    requesterName: loan.requesterName,
    requesterEmail: loan.requesterEmail,
    title: "Devolução Confirmada! ✅",
    message: `A devolução da sua polo ${POLO_TYPE_LABELS[loan.type]} (tamanho ${loan.size}) foi ACEITA pelo gerente.${obsText}`,
    type: "return_approved",
  });

  // Sync to Supabase
  try {
    await supabase.from("polo_loans").update({
      status: "returned",
      returned_date: loan.returnedDate,
      return_notes: loan.returnNotes || null,
    }).eq("id", loanId);
  } catch (e) {
    console.warn("Erro ao confirmar devolução no Supabase:", e);
  }
}

export async function returnLoan(loanId: string, notes?: string): Promise<boolean> {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan || (loan.status !== 'approved' && loan.status !== 'return_pending')) return false;

  loan.status = 'returned';
  loan.returnedDate = new Date().toISOString();
  if (notes !== undefined && notes.trim() !== '') {
    loan.returnNotes = notes.trim();
  }
  saveLoans(loans);
  saveStock(getStock());

  const obsText = notes && notes.trim() ? ` (Obs: ${notes.trim()})` : '';
  addNotification({
    loanId: loan.id,
    requesterName: loan.requesterName,
    requesterEmail: loan.requesterEmail,
    title: "Devolução Registrada! ✅",
    message: `A devolução da sua polo ${POLO_TYPE_LABELS[loan.type]} (tamanho ${loan.size}) foi confirmada pelo gerente.${obsText}`,
    type: "return_approved",
  });

  // Sync to Supabase
  try {
    await supabase.from("polo_loans").update({
      status: "returned",
      returned_date: loan.returnedDate,
      return_notes: loan.returnNotes || null,
    }).eq("id", loanId);
  } catch (e) {
    console.warn("Erro ao registrar devolução no Supabase:", e);
  }

  return true;
}

export async function rejectReturn(loanId: string) {
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

  // Sync to Supabase
  try {
    await supabase.from("polo_loans").update({
      status: "approved",
    }).eq("id", loanId);
  } catch (e) {
    console.warn("Erro ao recusar devolução no Supabase:", e);
  }
}

export function verifyManagerPin(pin: string): boolean {
  return pin === getManagerPin();
}

// -------------------------------------------------------------
// REALTIME SYNCHRONIZATION WITH SUPABASE
// -------------------------------------------------------------

export async function fetchStockFromSupabase(): Promise<PoloStock[]> {
  try {
    const { data, error } = await supabase
      .from("polo_stock")
      .select("*")
      .order("type", { ascending: false })
      .order("size");

    if (error || !data || data.length === 0) {
      return getStock();
    }

    const mappedStock: PoloStock[] = data.map(item => ({
      id: item.id,
      size: item.size,
      type: item.type as PoloType,
      total: item.total,
      available: item.available,
    }));

    const synced = syncStockAvailable(mappedStock, getLoans());
    localStorage.setItem(STOCK_KEY, JSON.stringify(synced));
    window.dispatchEvent(new Event("conselt_stock_updated"));
    return synced;
  } catch (err) {
    console.warn("Falha ao buscar estoque do Supabase:", err);
    return getStock();
  }
}

export async function fetchLoansFromSupabase(): Promise<PoloLoan[]> {
  try {
    const { data, error } = await supabase
      .from("polo_loans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return getLoans();
    }

    const mappedLoans: PoloLoan[] = data.map(row => ({
      id: row.id,
      requesterName: row.requester_name,
      requesterEmail: row.requester_email,
      size: row.size,
      type: row.type as PoloType,
      quantity: row.quantity,
      requestDate: row.request_date,
      expectedReturn: row.expected_return,
      status: row.status as LoanStatus,
      returnedDate: row.returned_date || undefined,
      returnNotes: row.return_notes || undefined,
      notes: row.notes || undefined,
    }));

    localStorage.setItem(LOANS_KEY, JSON.stringify(mappedLoans));
    window.dispatchEvent(new Event("conselt_loans_updated"));
    window.dispatchEvent(new Event("conselt_stock_updated"));
    return mappedLoans;
  } catch (err) {
    console.warn("Falha ao buscar empréstimos do Supabase:", err);
    return getLoans();
  }
}

export async function fetchNotificationsFromSupabase(): Promise<LoanNotification[]> {
  try {
    const { data, error } = await supabase
      .from("loan_notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return getNotifications();
    }

    const mappedNotifs: LoanNotification[] = data.map(row => ({
      id: row.id,
      loanId: row.loan_id || undefined,
      requesterName: row.requester_name,
      requesterEmail: row.requester_email,
      title: row.title,
      message: row.message,
      type: row.type as any,
      createdAt: row.created_at,
      read: row.read,
    }));

    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(mappedNotifs));
    window.dispatchEvent(new Event("conselt_notifications_updated"));
    return mappedNotifs;
  } catch (err) {
    console.warn("Falha ao buscar notificações do Supabase:", err);
    return getNotifications();
  }
}

export async function syncAllWithSupabase() {
  await Promise.allSettled([
    fetchStockFromSupabase(),
    fetchLoansFromSupabase(),
    fetchNotificationsFromSupabase(),
  ]);
}

// Subscribe to Supabase Realtime Channels
let realtimeChannelInitialized = false;

export function initSupabaseRealtime() {
  if (realtimeChannelInitialized || typeof window === "undefined") return;
  realtimeChannelInitialized = true;

  // Initial fetch
  syncAllWithSupabase();

  const channel = supabase
    .channel("schema-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "polo_stock" },
      () => {
        fetchStockFromSupabase();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "polo_loans" },
      () => {
        fetchLoansFromSupabase().then(() => {
          fetchStockFromSupabase();
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "loan_notifications" },
      () => {
        fetchNotificationsFromSupabase();
      }
    )
    .subscribe();

  return channel;
}

// Auto-initialize realtime subscriptions on client
if (typeof window !== "undefined") {
  initSupabaseRealtime();
}
