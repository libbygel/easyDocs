import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function SupabaseStatus() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try a simple query to check connection
        const { error } = await supabase.from('profiles').select('id').limit(1);
        
        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is fine
          console.warn('[Supabase] Connection test warning:', error.message);
        }
        
        setStatus('connected');
      } catch (err) {
        console.error('[Supabase] Connection error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {status === 'loading' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>בודק חיבור...</span>
        </>
      )}
      {status === 'connected' && (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-green-600">מחובר לשרת</span>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">{errorMessage || 'שגיאת חיבור'}</span>
        </>
      )}
    </div>
  );
}
