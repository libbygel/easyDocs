import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';

// External auth endpoint for direct password sign-in.
const AUTH_URL = "https://aegwmpkihkeaemcdgyqq.supabase.co/auth/v1";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZ3dtcGtpaGtlYWVtY2RneXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg0NzUsImV4cCI6MjA4NTA4NDQ3NX0.5sfLvSwcmzUJShwPg8NpMD3t7VrEBYrfwdNBGlFjWdM";

type AuthResult = {
  error: Error | null;
};

type SignupResult = {
  error: Error | null;
  pendingApproval?: boolean;
  message?: string;
  requestId?: string;
  invocationCount?: number;
  upstreamInvocationCount?: number;
  deduped?: boolean;
};

type SignupEdgeResponse = {
  success: boolean;
  error: string | null;
  pendingApproval?: boolean;
  message?: string;
  userId?: string | null;
  requestId?: string;
  invocationCount?: number;
  upstreamInvocationCount?: number;
  deduped?: boolean;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<SignupResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createSignupRequestId = () => `signup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const signupRequestRef = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    console.log('[Auth] Attempting sign in for:', email);
    try {
      const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        const error = new Error(body.message || body.msg || 'Login failed');
        console.error('[Auth] Sign in failed:', error.message);
        return { error };
      }

      console.log('[Auth] Sign in successful, hydrating session');
      await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });

      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Sign in network error:', err);
      return { error: new Error('שגיאת רשת. אנא בדוק את החיבור לאינטרנט ונסה שוב.') };
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<SignupResult> => {
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();

    if (signupRequestRef.current) {
      console.warn('[Auth] Duplicate signup prevented. Active request:', signupRequestRef.current);
      return {
        error: new Error('בקשת הרשמה כבר נשלחת. אנא המתן לסיום הבקשה הנוכחית.'),
        requestId: signupRequestRef.current,
        deduped: true,
      };
    }

    const requestId = createSignupRequestId();
    signupRequestRef.current = requestId;
    console.log('[Auth] Calling auth-signup function', { email: normalizedEmail, requestId });

    try {
      const result = await invokeEdgeFunction<SignupEdgeResponse>('auth-signup', {
        email: normalizedEmail,
        password,
        name: normalizedName || undefined,
        requestId,
      });

      if (!result?.success) {
        const authError = new Error(result?.error || 'Signup failed');
        (authError as any).requestId = result?.requestId;
        (authError as any).invocationCount = result?.invocationCount;
        (authError as any).upstreamInvocationCount = result?.upstreamInvocationCount;
        (authError as any).deduped = result?.deduped;
        return {
          error: authError,
          requestId: result?.requestId ?? requestId,
          invocationCount: result?.invocationCount,
          upstreamInvocationCount: result?.upstreamInvocationCount,
          deduped: result?.deduped,
        };
      }

      console.log('[Auth] auth-signup completed', {
        requestId: result?.requestId ?? requestId,
        userId: result?.userId ?? null,
        invocationCount: result?.invocationCount ?? null,
        upstreamInvocationCount: result?.upstreamInvocationCount ?? null,
        deduped: result?.deduped ?? false,
      });

      return {
        error: null,
        pendingApproval: result.pendingApproval ?? true,
        message: result.message ?? 'בקשת ההרשמה נקלטה. החשבון ממתין לאישור מנהל המערכת. לפניות: dv4343@gmail.com',
        requestId: result?.requestId ?? requestId,
        invocationCount: result?.invocationCount,
        upstreamInvocationCount: result?.upstreamInvocationCount,
        deduped: result?.deduped,
      };
    } catch (err: any) {
      console.error('[Auth] Sign up failed:', { requestId, error: err });

      let parsedMessage = err?.message ?? 'Signup failed';
      let parsedCode: string | undefined;
      let parsedStatus: number | undefined;
      let parsedRequestId: string | undefined;
      let parsedInvocationCount: number | undefined;
      let parsedUpstreamInvocationCount: number | undefined;
      let parsedDeduped: boolean | undefined;

      const edgeErrorPrefix = 'Edge function error:';
      if (typeof parsedMessage === 'string' && parsedMessage.startsWith(edgeErrorPrefix)) {
        const payload = parsedMessage.slice(edgeErrorPrefix.length).trim();
        try {
          const parsed = JSON.parse(payload);
          parsedMessage = parsed.error || parsed.message || parsed.msg || parsedMessage;
          parsedCode = parsed.code;
          parsedStatus = parsed.status;
          parsedRequestId = parsed.requestId;
          parsedInvocationCount = parsed.invocationCount;
          parsedUpstreamInvocationCount = parsed.upstreamInvocationCount;
          parsedDeduped = parsed.deduped;
        } catch {
          parsedMessage = payload || parsedMessage;
        }
      }

      const authError = new Error(parsedMessage);
      (authError as any).code = parsedCode;
      (authError as any).status = parsedStatus;
      (authError as any).requestId = parsedRequestId ?? requestId;
      (authError as any).invocationCount = parsedInvocationCount;
      (authError as any).upstreamInvocationCount = parsedUpstreamInvocationCount;
      (authError as any).deduped = parsedDeduped;

      console.warn('[Auth] auth-signup debug', {
        requestId: parsedRequestId ?? requestId,
        invocationCount: parsedInvocationCount ?? null,
        upstreamInvocationCount: parsedUpstreamInvocationCount ?? null,
        deduped: parsedDeduped ?? false,
        status: parsedStatus ?? null,
        code: parsedCode ?? null,
      });

      return {
        error: authError,
        requestId: parsedRequestId ?? requestId,
        invocationCount: parsedInvocationCount,
        upstreamInvocationCount: parsedUpstreamInvocationCount,
        deduped: parsedDeduped,
      };
    } finally {
      console.log('[Auth] Sign up request finished', { requestId });
      signupRequestRef.current = null;
    }
  };

  const signOut = async () => {
    // Use local scope to avoid CORS issues with /auth/v1/logout
    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
