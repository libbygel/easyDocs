import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  updateTimeEntry,
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
  const [startDescription, setStartDescription] = useState('');
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [stopDescription, setStopDescription] = useState('');
  const [stopElapsed, setStopElapsed] = useState(0);
  const stoppedEntryIdRef = useRef<string | null>(null);
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
        description: startDescription.trim() || null,
      });
      setOpenEntry(started);
      setStartDescription('');
      toast({ title: 'הטיימר הותחל' });
      onChange?.();
    } catch (err: any) {
      toast({ title: 'שגיאה בהתחלת טיימר', description: err?.message, variant: 'destructive' });
    }
  };

  const handleStop = async () => {
    if (!openEntry) return;
    try {
      const existingDesc = openEntry.description || '';
      const seconds = await stopTimer(openEntry.id);
      stoppedEntryIdRef.current = openEntry.id;
      setStopDescription(existingDesc);
      setStopElapsed(seconds);
      setOpenEntry(null);
      setStopDialogOpen(true);
      onChange?.();
    } catch (err: any) {
      toast({ title: 'שגיאה בעצירת טיימר', description: err?.message, variant: 'destructive' });
    }
  };

  const handleStopDialogSave = async () => {
    const entryId = stoppedEntryIdRef.current;
    if (entryId) {
      try {
        await updateTimeEntry(entryId, { description: stopDescription.trim() || null });
      } catch (err: any) {
        toast({ title: 'שגיאה בשמירת תיאור', description: err?.message, variant: 'destructive' });
      }
    }
    toast({ title: 'הטיימר נעצר', description: `נרשמו ${formatDuration(stopElapsed)}` });
    setStopDialogOpen(false);
    stoppedEntryIdRef.current = null;
    setStopDescription('');
    onChange?.();
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
            <div className="flex flex-1 gap-2 min-w-0">
              <Input
                value={startDescription}
                onChange={(e) => setStartDescription(e.target.value)}
                placeholder="על מה אתה עובד? (אופציונלי)"
                className="flex-1 min-w-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStart();
                }}
              />
              <Button onClick={handleStart} className="gap-2 shrink-0">
                <Play className="h-4 w-4" />
                התחל
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => setShowManual((s) => !s)} className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף זמן ידני
          </Button>
        </div>
        {openEntry && openEntry.description && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium">עובד על:</span> {openEntry.description}
          </div>
        )}
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

      {/* Stop dialog — capture/edit description after stop */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">הטיימר נעצר</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              נרשמו <span className="font-mono font-semibold tabular-nums">{formatDuration(stopElapsed)}</span>.
            </div>
            <div className="space-y-1">
              <Label className="text-xs">על מה עבדת?</Label>
              <Input
                value={stopDescription}
                onChange={(e) => setStopDescription(e.target.value)}
                placeholder="תיאור קצר (אופציונלי)"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleStopDialogSave}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}