import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface AdvisorProfileInfo {
  email: string;
  name: string;
  senderDisplayName: string;
  displayName: string;
  hourlyRate: number | null;
  timerMode: 'manual' | 'auto';
  notifyOnClientUpload: boolean;
}

const isMissingColumnError = (error: any, column?: string) => {
  const message = String(error?.message || '');
  if (error?.code !== '42703' && !/column .* does not exist/i.test(message)) return false;
  return !column || message.includes(column);
};

const resolveDisplayName = (profile: Partial<AdvisorProfileInfo>, fallbackEmail = '', fallbackName = '') =>
  profile.senderDisplayName || profile.name || fallbackName || (fallbackEmail ? fallbackEmail.split('@')[0] : '');

async function selectProfileById(userId: string) {
  // Try with all extended columns first; fall back gracefully if some are missing.
  const ext = await supabase
    .from('profiles')
    .select('email, name, sender_display_name, hourly_rate, timer_mode, notify_on_client_upload')
    .eq('id', userId)
    .maybeSingle();
  if (!ext.error) return ext;

  if (isMissingColumnError(ext.error, 'notify_on_client_upload')) {
    const full = await supabase
      .from('profiles')
      .select('email, name, sender_display_name, hourly_rate, timer_mode')
      .eq('id', userId)
      .maybeSingle();
    if (!full.error) return full;
  }

  if (isMissingColumnError(ext.error) && !isMissingColumnError(ext.error, 'notify_on_client_upload')) {
    return supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .maybeSingle();
  }

  const full = await supabase
    .from('profiles')
    .select('email, name, sender_display_name, hourly_rate, timer_mode')
    .eq('id', userId)
    .maybeSingle();
  if (!full.error) return full;

  if (isMissingColumnError(full.error, 'hourly_rate') || isMissingColumnError(full.error, 'timer_mode')) {
    const mid = await supabase
      .from('profiles')
      .select('email, name, sender_display_name')
      .eq('id', userId)
      .maybeSingle();
    if (!mid.error) return mid;
    if (isMissingColumnError(mid.error, 'sender_display_name')) {
      return supabase
        .from('profiles')
        .select('email, name')
        .eq('id', userId)
        .maybeSingle();
    }
    return mid;
  }

  if (isMissingColumnError(full.error, 'sender_display_name')) {
    return supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .maybeSingle();
  }

  return full;
}

export async function fetchAdvisorProfileByUserId(userId: string, fallbackEmail = '', fallbackName = ''): Promise<AdvisorProfileInfo> {
  const result = await selectProfileById(userId);

  const data = (result.data || {}) as any;
  const email = data.email || fallbackEmail || '';
  const name = data.name || fallbackName || '';
  const senderDisplayName = data.sender_display_name || '';
  const hourlyRate = data.hourly_rate != null ? Number(data.hourly_rate) : null;
  const timerMode: 'manual' | 'auto' = data.timer_mode === 'auto' ? 'auto' : 'manual';
  const notifyOnClientUpload = data.notify_on_client_upload === false ? false : true;

  return {
    email,
    name,
    senderDisplayName,
    hourlyRate,
    timerMode,
    notifyOnClientUpload,
    displayName: resolveDisplayName({ name, senderDisplayName }, email, fallbackName),
  };
}

export function getUserFallbackName(user: User | null | undefined) {
  return (
    (user?.user_metadata?.name as string | undefined) ||
    (user?.email ? user.email.split('@')[0] : '')
  );
}

export function fetchCurrentAdvisorProfile(user: User | null | undefined) {
  if (!user) return Promise.resolve({ email: '', name: '', senderDisplayName: '', displayName: '', hourlyRate: null, timerMode: 'manual' as const, notifyOnClientUpload: true });
  return fetchAdvisorProfileByUserId(user.id, user.email || '', getUserFallbackName(user));
}

async function updateProfileById(userId: string, values: Record<string, any>) {
  let attempt = await supabase.from('profiles').update(values as any).eq('id', userId);
  if (!attempt.error) return attempt;

  // Strip newer columns one-by-one to remain compatible with older schemas.
  const stripKeys: string[] = ['notify_on_client_upload', 'hourly_rate', 'timer_mode', 'sender_display_name'];
  let safeValues = { ...values };
  for (const key of stripKeys) {
    if (attempt.error && isMissingColumnError(attempt.error, key)) {
      delete safeValues[key];
      attempt = await supabase.from('profiles').update(safeValues as any).eq('id', userId);
      if (!attempt.error) return attempt;
    }
  }
  return attempt;
}

export async function updateCurrentAdvisorProfile(
  user: User,
  values: { name?: string; email?: string; senderDisplayName?: string; hourlyRate?: number | null; timerMode?: 'manual' | 'auto'; notifyOnClientUpload?: boolean },
) {
  const payload: Record<string, any> = {};
  if (values.name !== undefined) payload.name = values.name;
  if (values.email !== undefined) payload.email = values.email;
  if (values.senderDisplayName !== undefined) payload.sender_display_name = values.senderDisplayName;
  if (values.hourlyRate !== undefined) payload.hourly_rate = values.hourlyRate;
  if (values.timerMode !== undefined) payload.timer_mode = values.timerMode;
  if (values.notifyOnClientUpload !== undefined) payload.notify_on_client_upload = values.notifyOnClientUpload;

  const result = await updateProfileById(user.id, payload);
  if (result.error) throw result.error;
}