import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

/**
 * Returns the advisor's display name (sender_display_name || name || email prefix).
 * Used to populate "from" info in client-facing emails so the recipient
 * knows who is requesting the documents.
 */
export function useAdvisorName(): string {
  const { user } = useAuth();
  const [name, setName] = useState<string>('');

  useEffect(() => {
    if (!user) { setName(''); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('name, sender_display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const resolved =
          (data as any)?.sender_display_name ||
          (data as any)?.name ||
          (user.email ? user.email.split('@')[0] : '');
        setName(resolved || '');
      } catch {
        if (!cancelled && user.email) setName(user.email.split('@')[0]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return name;
}
