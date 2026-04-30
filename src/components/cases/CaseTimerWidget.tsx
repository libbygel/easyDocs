import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Square, Clock, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  type CaseTimeEntry,
  formatDuration,
  getOpenTimeEntry,
  startTimer,
  stopTimer,
  createManualTimeEntry,
} from '@/lib/billing';

interface Props {
  caseId: string;
  clientId: string;
  timerMode: 'manual' | 'auto';
  onChange?: () => void;
}

/**
 * Widget that lets the advisor track time on a case.
 * - Manual mode: explicit Start/Stop buttons.
 * - Auto mode: timer starts on mount and stops when the component unmounts
 *   (i.e. when the advisor navigates away from this case).
 * Both modes also support adding a past entry manually.
 */
export function CaseTimerWidget({ caseId, clientId, timerMode, onChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [openEntry, setOpenEntry] = useState<CaseTimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('30');
  const [manualDescription, setManualDescription] = useState('');
  const tickRef = useRef<number | null>(null);

  // Initial fetch + auto-start in auto mode.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const existing = await getOpenTimeEntry(user.id);
        if (cancelled) return;
        // Only show as "running for this case" if it matches.
        if (existing && existing.case_id === caseId) {
          setOpenEntry(existing);
        } else if (timerMode === 'auto' && !existing) {
          // Auto-start: only when no other timer is running.
          const started = await startTimer({
            advisor_id: user.id,
            client_id: clientId,
            case_id: caseId,
            source: 'auto',
          });
          if (!cancelled) setOpenEntry(started);
        }
      } catch (err: any) {
        console.error('Timer init failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, caseId, clientId]);

  // Auto-stop on unmount when in auto mode.
  useEffect(() => {
    return () => {
      if (timerMode === 'auto' && openEntry) {
        // Fire-and-forget — UI is leaving this page anyway.
        stopTimer(openEntry.id).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMode, openEntry?.id]);

  // Tick elapsed clock while a timer is open.
  useEffect(() => {
    if (!openEntry) {
      setElapsed(0);
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    const startedMs = new Date(openEntry.started_at).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    update();
    tickRef.current = window.setInterval(update, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [openEntry?.id, openEntry?.started_at]);

  const handleStart = async () => {
    if (!user) return;
    try {
      const started = await startTimer({
        advisor_id: user.id,
        client_id: clientId,
        case_id: caseId,
        source: 'timer',
      });
      setOpenEntry(started);
      toast({ title: 'הטיימר הותחל' });
      onChange?.();
    } catch (err: any) {
      toast({ title: 'שגיאה בהתחלת טיימר', description: err?.message, variant: 'destructive' });
    }
  };

  const handleStop = async () => {
    if (!openEntry) return;
    try {
      const seconds = await stopTimer(openEntry.id);
      setOpenEntry(null);
      toast({ title: 'הטיימר נעצר', description: `נרשמו ${formatDuration(seconds)}` });
      onChange?.();
    } catch (err: any) {
      toast({ title: 'שגיאה בעצירת טיימר', description: err?.message, variant: 'destructive' });
    }
  };

  const handleManualAdd = async () => {
    if (!user) return;
    const mins = parseInt(manualMinutes, 10);
    if (!mins || mins <= 0) {
      toast({ title: 'נא להזין מספר דקות תקין', variant: 'destructive' });
      return;
    }
    try {
      await createManualTimeEntry({
        advisor_id: user.id,
        client_id: clientId,
        case_id: caseId,
        duration_seconds: mins * 60,
        description: manualDescription || null,
      });
      toast({ title: 'הזמן נוסף' });
      setShowManual(false);
      setManualMinutes('30');
      setManualDescription('');
      onChange?.();
    } catch (err: any) {
      toast({ title: 'שגיאה בהוספת זמן', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold">טיימר עבודה</span>
            {timerMode === 'auto' && (
              <span className="text-xs text-muted-foreground">(מצב אוטומטי)</span>
            )}
          </div>
          <div className="font-mono text-2xl tabular-nums">
            {openEntry ? formatDuration(elapsed) : '00:00'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {openEntry ? (
            <Button onClick={handleStop} variant="destructive" className="gap-2">
              <Square className="h-4 w-4" />
              עצור
            </Button>
          ) : (
            <Button onClick={handleStart} className="gap-2">
              <Play className="h-4 w-4" />
              התחל
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowManual((s) => !s)} className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף זמן ידני
          </Button>
        </div>
        {showManual && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t">
            <Input
              type="number"
              min={1}
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              placeholder="דקות"
            />
            <Input
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="תיאור (אופציונלי)"
              className="sm:col-span-2"
            />
            <Button onClick={handleManualAdd} className="sm:col-start-3">שמור</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}