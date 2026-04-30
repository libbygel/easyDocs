import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchCurrentAdvisorProfile } from '@/lib/advisorProfile';

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
        if (cancelled) return;
        const profile = await fetchCurrentAdvisorProfile(user);
        if (!cancelled) setName(profile.displayName || '');
      } catch {
        if (!cancelled && user.email) setName(user.email.split('@')[0]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return name;
}
