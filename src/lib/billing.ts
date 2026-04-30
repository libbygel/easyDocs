import { supabase } from '@/lib/supabase';

export interface CaseCharge {
  id: string;
  advisor_id: string;
  client_id: string;
  case_id: string;
  amount: number;
  description: string | null;
  charged_at: string;
  created_at: string;
}

export interface CasePayment {
  id: string;
  advisor_id: string;
  client_id: string;
  case_id: string;
  amount: number;
  description: string | null;
  payment_method: string | null;
  paid_at: string;
  created_at: string;
  charge_id: string | null;
}

export interface CaseTimeEntry {
  id: string;
  advisor_id: string;
  client_id: string;
  case_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  source: 'timer' | 'manual' | 'auto';
  created_at: string;
}

export interface CaseFinancials {
  totalCharged: number;
  totalPaid: number;
  balance: number;
  totalSeconds: number;
}

export interface ClientFinancials extends CaseFinancials {
  perCase: Map<string, CaseFinancials>;
}

/* ----------------------------- Charges --------------------------------- */
export async function listCaseCharges(caseId: string) {
  const { data, error } = await supabase
    .from('case_charges' as any)
    .select('*')
    .eq('case_id', caseId)
    .order('charged_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CaseCharge[];
}

export async function listClientCharges(clientId: string) {
  const { data, error } = await supabase
    .from('case_charges' as any)
    .select('*')
    .eq('client_id', clientId)
    .order('charged_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CaseCharge[];
}

export async function createCharge(input: {
  advisor_id: string;
  client_id: string;
  case_id: string;
  amount: number;
  description?: string | null;
  charged_at?: string;
}) {
  const { error } = await supabase.from('case_charges' as any).insert(input as any);
  if (error) throw error;
}

export async function deleteCharge(id: string) {
  const { error } = await supabase.from('case_charges' as any).delete().eq('id', id);
  if (error) throw error;
}

/* ---------------------------- Payments --------------------------------- */
export async function listCasePayments(caseId: string) {
  const { data, error } = await supabase
    .from('case_payments' as any)
    .select('*')
    .eq('case_id', caseId)
    .order('paid_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CasePayment[];
}

export async function listClientPayments(clientId: string) {
  const { data, error } = await supabase
    .from('case_payments' as any)
    .select('*')
    .eq('client_id', clientId)
    .order('paid_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CasePayment[];
}

export async function createPayment(input: {
  advisor_id: string;
  client_id: string;
  case_id: string;
  amount: number;
  description?: string | null;
  payment_method?: string | null;
  paid_at?: string;
  charge_id?: string | null;
}) {
  const { error } = await supabase.from('case_payments' as any).insert(input as any);
  if (error) throw error;
}

export async function updatePaymentChargeLink(paymentId: string, chargeId: string | null) {
  const { error } = await supabase
    .from('case_payments' as any)
    .update({ charge_id: chargeId } as any)
    .eq('id', paymentId);
  if (error) throw error;
}

/* ----------------------- Charge settlement helpers --------------------- */
export interface ChargeSettlement {
  paid: number;
  remaining: number;
  status: 'open' | 'partial' | 'paid';
}

export function summarizeChargeSettlement(
  charge: CaseCharge,
  payments: CasePayment[],
): ChargeSettlement {
  const paid = payments
    .filter((p) => p.charge_id === charge.id)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const amount = Number(charge.amount || 0);
  const remaining = Math.max(0, amount - paid);
  let status: 'open' | 'partial' | 'paid' = 'open';
  if (paid >= amount && amount > 0) status = 'paid';
  else if (paid > 0) status = 'partial';
  return { paid, remaining, status };
}

export async function deletePayment(id: string) {
  const { error } = await supabase.from('case_payments' as any).delete().eq('id', id);
  if (error) throw error;
}

/* ----------------------------- Time ------------------------------------ */
export async function listCaseTimeEntries(caseId: string) {
  const { data, error } = await supabase
    .from('case_time_entries' as any)
    .select('*')
    .eq('case_id', caseId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CaseTimeEntry[];
}

export async function listClientTimeEntries(clientId: string) {
  const { data, error } = await supabase
    .from('case_time_entries' as any)
    .select('*')
    .eq('client_id', clientId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CaseTimeEntry[];
}

export async function getOpenTimeEntry(advisorId: string) {
  const { data, error } = await supabase
    .from('case_time_entries' as any)
    .select('*')
    .eq('advisor_id', advisorId)
    .is('ended_at', null)
    .maybeSingle();
  if (error) throw error;
  return (data || null) as unknown as CaseTimeEntry | null;
}

export async function startTimer(input: {
  advisor_id: string;
  client_id: string;
  case_id: string;
  description?: string | null;
  source?: 'timer' | 'auto';
}) {
  // Stop any other open timers for this advisor first (defensive — DB also enforces uniqueness).
  const open = await getOpenTimeEntry(input.advisor_id);
  if (open) {
    await stopTimer(open.id);
  }
  const { data, error } = await supabase
    .from('case_time_entries' as any)
    .insert({
      advisor_id: input.advisor_id,
      client_id: input.client_id,
      case_id: input.case_id,
      started_at: new Date().toISOString(),
      description: input.description ?? null,
      source: input.source ?? 'timer',
    } as any)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as unknown as CaseTimeEntry;
}

export async function stopTimer(entryId: string, description?: string | null) {
  const endedAt = new Date();
  // Read the row to compute duration.
  const { data: row, error: readErr } = await supabase
    .from('case_time_entries' as any)
    .select('started_at')
    .eq('id', entryId)
    .maybeSingle();
  if (readErr) throw readErr;
  const startedAt = row ? new Date((row as any).started_at) : endedAt;
  const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
  const update: any = {
    ended_at: endedAt.toISOString(),
    duration_seconds: durationSeconds,
  };
  if (description !== undefined) update.description = description;
  const { error } = await supabase
    .from('case_time_entries' as any)
    .update(update)
    .eq('id', entryId);
  if (error) throw error;
  return durationSeconds;
}

export async function createManualTimeEntry(input: {
  advisor_id: string;
  client_id: string;
  case_id: string;
  duration_seconds: number;
  description?: string | null;
  started_at?: string;
}) {
  const startedAt = input.started_at ? new Date(input.started_at) : new Date();
  const endedAt = new Date(startedAt.getTime() + input.duration_seconds * 1000);
  const { error } = await supabase.from('case_time_entries' as any).insert({
    advisor_id: input.advisor_id,
    client_id: input.client_id,
    case_id: input.case_id,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_seconds: input.duration_seconds,
    description: input.description ?? null,
    source: 'manual',
  } as any);
  if (error) throw error;
}

export async function deleteTimeEntry(id: string) {
  const { error } = await supabase.from('case_time_entries' as any).delete().eq('id', id);
  if (error) throw error;
}

/* --------------------------- Aggregations ------------------------------ */
export function summarizeCase(
  charges: CaseCharge[],
  payments: CasePayment[],
  timeEntries: CaseTimeEntry[],
): CaseFinancials {
  const totalCharged = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalSeconds = timeEntries.reduce(
    (s, e) => s + (e.duration_seconds || 0),
    0,
  );
  return {
    totalCharged,
    totalPaid,
    balance: totalCharged - totalPaid,
    totalSeconds,
  };
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}