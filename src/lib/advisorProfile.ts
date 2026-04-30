import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface AdvisorProfileInfo {
  email: string;
  name: string;
  senderDisplayName: string;
  displayName: string;
}

const isMissingColumnError = (error: any, column: string) =>
  error?.code === '42703' || String(error?.message || '').includes(column);

const resolveDisplayName = (profile: Partial<AdvisorProfileInfo>, fallbackEmail = '', fallbackName = '') =>
  profile.senderDisplayName || profile.name || fallbackName || (fallbackEmail ? fallbackEmail.split('@')[0] : '');

async function selectProfileBy(column: 'user_id' | 'id', userId: string) {
  const full = await supabase
    .from('profiles')
    .select('email, name, sender_display_name')
    .eq(column, userId)
    .maybeSingle();

  if (full.error && isMissingColumnError(full.error, 'sender_display_name')) {
    return supabase
      .from('profiles')
      .select('email, name')
      .eq(column, userId)
      .maybeSingle();
  }

  return full;
}

export async function fetchAdvisorProfileByUserId(userId: string, fallbackEmail = '', fallbackName = ''): Promise<AdvisorProfileInfo> {
  let result = await selectProfileBy('user_id', userId);

  if (result.error && isMissingColumnError(result.error, 'user_id')) {
    result = await selectProfileBy('id', userId);
  }

  const data = (result.data || {}) as any;
  const email = data.email || fallbackEmail || '';
  const name = data.name || fallbackName || '';
  const senderDisplayName = data.sender_display_name || '';

  return {
    email,
    name,
    senderDisplayName,
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
  if (!user) return Promise.resolve({ email: '', name: '', senderDisplayName: '', displayName: '' });
  return fetchAdvisorProfileByUserId(user.id, user.email || '', getUserFallbackName(user));
}

async function updateProfileBy(column: 'user_id' | 'id', userId: string, values: Record<string, any>) {
  const result = await supabase.from('profiles').update(values as any).eq(column, userId);
  if (result.error && isMissingColumnError(result.error, 'sender_display_name')) {
    const { sender_display_name: _ignored, ...safeValues } = values;
    return supabase.from('profiles').update(safeValues as any).eq(column, userId);
  }
  return result;
}

export async function updateCurrentAdvisorProfile(
  user: User,
  values: { name: string; email: string; senderDisplayName: string },
) {
  const payload = {
    name: values.name,
    email: values.email,
    sender_display_name: values.senderDisplayName,
  };

  let result = await updateProfileBy('user_id', user.id, payload);
  if (result.error && isMissingColumnError(result.error, 'user_id')) {
    result = await updateProfileBy('id', user.id, payload);
  }
  if (result.error) throw result.error;
}