import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  FolderPlus,
  UserX,
  Trash2,
  CheckCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  WifiOff,
  RefreshCw,
  Send
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { SendReminderDialog } from '@/components/cases/SendReminderDialog';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import type { CaseDocument } from '@/lib/supabase';

interface Notification {
  id: string;
  advisor_id: string;
  case_id: string | null;
  client_id: string | null;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

interface GroupedNotification {
  case_id: string | null;
  ids: string[];
  latestTitle: string;
  caseName: string;
  clientName: string;
  count: number;
  latest_created_at: string;
  is_read: boolean;
  items: { title: string; message: string | null; type: string; created_at: string }[];
  documentNames: string[];
}

const notificationIcons: Record<string, React.ReactNode> = {
  'מסמך_התקבל': <FileText className="h-5 w-5 text-primary" />,
  'מסמך_דחוף': <AlertTriangle className="h-5 w-5 text-warning" />,
  'לקוח_לא_פעיל': <UserX className="h-5 w-5 text-muted-foreground" />,
  'מסמך_נדחה': <XCircle className="h-5 w-5 text-destructive" />,
  'תיק_חדש': <FolderPlus className="h-5 w-5 text-success" />,
  'מסמך_אושר': <CheckCircle className="h-5 w-5 text-success" />,
};

const notificationColors: Record<string, string> = {
  'מסמך_התקבל': 'bg-primary/10 border-primary/20',
  'מסמך_דחוף': 'bg-warning/10 border-warning/20',
  'לקוח_לא_פעיל': 'bg-muted border-muted-foreground/20',
  'מסמך_נדחה': 'bg-destructive/10 border-destructive/20',
  'תיק_חדש': 'bg-success/10 border-success/20',
  'מסמך_אושר': 'bg-success/10 border-success/20',
};

const Notifications = React.forwardRef<HTMLDivElement, Record<string, never>>(function Notifications(_props, _ref) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderCaseId, setReminderCaseId] = useState<string | null>(null);
  const [reminderDocs, setReminderDocs] = useState<CaseDocument[]>([]);
  const [reminderClientName, setReminderClientName] = useState('');
  const [reminderClientEmail, setReminderClientEmail] = useState('');
  const [reminderCaseTitle, setReminderCaseTitle] = useState('');
  const [reminderPortalToken, setReminderPortalToken] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchNotifications = useCallback(async (isRetry = false) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('advisor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('[Notifications] Raw data received:', data?.length, 'items', data?.slice(0, 3));
      setNotifications(data as Notification[]);
      setConnectionStatus('connected');
      retryCountRef.current = 0;
    } catch (error: any) {
      console.error('Notification fetch error details:', {
        message: error?.message,
        code: error?.code,
        cause: error?.cause,
        stack: error?.stack,
      });
      setConnectionStatus('disconnected');

      // Retry with exponential backoff (max 30s)
      if (retryCountRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(() => {
          fetchNotifications(true);
        }, delay);
      }

      if (!isRetry) {
        toast({ title: 'שגיאת חיבור', description: 'מנסה להתחבר מחדש...', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const handleManualRetry = () => {
    setConnectionStatus('connecting');
    retryCountRef.current = 0;
    fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    if (user) {
      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `advisor_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnectionStatus('disconnected');
          }
        });
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [user, fetchNotifications]);

  // Group notifications strictly by case_id
  const grouped = useMemo<GroupedNotification[]>(() => {
    const map = new Map<string, GroupedNotification>();
    for (const n of notifications) {
      const key = n.case_id || `no-case_${n.id}`;
      const existing = map.get(key);

      const clientMatch = n.title.match(/^(.+?)\s+(שלח|העלה)/) || n.title.match(/התקבלה מ-(.+)/);
      const clientName = clientMatch ? clientMatch[1] : '';
      const caseMatch = n.message?.match(/לתיק:\s*(.+?)(\n|$)/);
      const caseName = caseMatch ? caseMatch[1].trim() : '';
      const docNames: string[] = [];
      if (n.message) {
        // New format: single doc per notification
        const singleDocMatch = n.message.match(/מסמך:\s*(.+?)(\n|$)/);
        if (singleDocMatch) {
          docNames.push(singleDocMatch[1].trim());
        }
        // Old format: comma-separated list
        const docsMatch = n.message.match(/מסמכים:\s*(.+)/);
        if (docsMatch && docNames.length === 0) {
          docNames.push(...docsMatch[1].split(',').map(s => s.trim()).filter(Boolean));
        }
        // Fallback: quoted doc name
        const sigMatch = n.message.match(/"([^"]+)"/);
        if (sigMatch && docNames.length === 0) {
          docNames.push(sigMatch[1]);
        }
        // Extract from title for new format: "X - הועלה מסמך: Y"
        if (docNames.length === 0) {
          const titleDocMatch = n.title.match(/הועלה מסמך:\s*(.+)/);
          if (titleDocMatch) docNames.push(titleDocMatch[1].trim());
        }
      }

      if (existing) {
        existing.ids.push(n.id);
        existing.count++;
        if (!n.is_read) existing.is_read = false;
        if (n.created_at > existing.latest_created_at) {
          existing.latest_created_at = n.created_at;
          existing.latestTitle = n.title;
        }
        if (!existing.clientName && clientName) existing.clientName = clientName;
        if (!existing.caseName && caseName) existing.caseName = caseName;
        for (const dn of docNames) {
          if (!existing.documentNames.includes(dn)) existing.documentNames.push(dn);
        }
        existing.items.push({ title: n.title, message: n.message, type: n.type, created_at: n.created_at });
      } else {
        map.set(key, {
          case_id: n.case_id,
          ids: [n.id],
          latestTitle: n.title,
          caseName,
          clientName,
          count: 1,
          latest_created_at: n.created_at,
          is_read: n.is_read,
          documentNames: [...docNames],
          items: [{ title: n.title, message: n.message, type: n.type, created_at: n.created_at }],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime()
    );
  }, [notifications]);

  const toggleExpand = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const markGroupAsRead = async (group: GroupedNotification) => {
    const unreadIds = group.ids.filter(id => {
      const n = notifications.find(nn => nn.id === id);
      return n && !n.is_read;
    });
    if (unreadIds.length === 0) return;

    setNotifications(prev =>
      prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
    );
    window.dispatchEvent(new Event('notifications-changed'));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      if (error) {
        console.error('Error marking as read:', error);
        // Revert optimistic update
        fetchNotifications();
        toast({ title: 'שגיאה בעדכון התראות', description: error.message, variant: 'destructive' });
      }
      window.dispatchEvent(new Event('notifications-changed'));
    } catch (error) {
      console.error('Error marking as read:', error);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('advisor_id', user?.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notifications-changed'));
      toast({ title: 'כל ההתראות סומנו כנקראו' });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({ title: 'שגיאה בעדכון', variant: 'destructive' });
    }
  };

  const deleteGroup = async (group: GroupedNotification) => {
    try {
      const { error } = await supabase.from('notifications').delete().in('id', group.ids);
      if (error) {
        console.error('Error deleting group:', error);
        toast({ title: 'שגיאה במחיקה', description: error.message, variant: 'destructive' });
        return;
      }
      setNotifications(prev => prev.filter(n => !group.ids.includes(n.id)));
      window.dispatchEvent(new Event('notifications-changed'));
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
    }
  };

  const deleteAllRead = async () => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('advisor_id', user?.id)
        .eq('is_read', true);

      setNotifications(prev => prev.filter(n => !n.is_read));
      window.dispatchEvent(new Event('notifications-changed'));
      toast({ title: 'ההתראות שנקראו נמחקו' });
    } catch (error) {
      console.error('Error deleting read:', error);
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
    }
  };

  // Clean up notifications for documents that have been approved
  const cleanupApprovedDocNotifications = useCallback(async () => {
    if (!user || notifications.length === 0) return;

    const caseIds = [...new Set(notifications.filter(n => n.case_id).map(n => n.case_id!))];
    if (caseIds.length === 0) return;

    const { data: docs } = await supabase
      .from('case_documents')
      .select('doc_name, case_id, review_status')
      .in('case_id', caseIds);

    if (!docs) return;

    const approvedDocs = new Set(
      docs.filter(d => d.review_status === 'תקין' || d.review_status === 'נחתם')
        .map(d => `${d.case_id}_${d.doc_name}`)
    );

    const notifIdsToDelete: string[] = [];
    for (const n of notifications) {
      if (!n.case_id) continue;
      const docNames: string[] = [];
      if (n.message) {
        const singleMatch = n.message.match(/מסמך:\s*(.+?)(\n|$)/);
        if (singleMatch) docNames.push(singleMatch[1].trim());
        const sigMatch = n.message.match(/"([^"]+)"/);
        if (sigMatch && docNames.length === 0) docNames.push(sigMatch[1]);
      }
      if (docNames.length === 0) {
        const titleMatch = n.title.match(/הועלה מסמך:\s*(.+)/);
        if (titleMatch) docNames.push(titleMatch[1].trim());
        const titleMatch2 = n.title.match(/מסמך דחוף:\s*(.+)/);
        if (titleMatch2) docNames.push(titleMatch2[1].trim());
      }
      for (const dn of docNames) {
        if (approvedDocs.has(`${n.case_id}_${dn}`)) {
          notifIdsToDelete.push(n.id);
          break;
        }
      }
    }

    if (notifIdsToDelete.length > 0) {
      await supabase.from('notifications').delete().in('id', notifIdsToDelete);
      setNotifications(prev => prev.filter(n => !notifIdsToDelete.includes(n.id)));
      window.dispatchEvent(new Event('notifications-changed'));
    }
  }, [user, notifications]);

  useEffect(() => {
    cleanupApprovedDocNotifications();
  }, [notifications.length]);

  const openReminderDialog = async (caseId: string) => {
    try {
      const { data: caseData } = await supabase
        .from('cases')
        .select('*, clients(*)')
        .eq('id', caseId)
        .single();
      if (!caseData) return;

      const { data: docs } = await supabase
        .from('case_documents')
        .select('*')
        .eq('case_id', caseId);

      setReminderCaseId(caseId);
      setReminderDocs((docs || []) as CaseDocument[]);
      setReminderClientName((caseData.clients as any)?.full_name || '');
      setReminderClientEmail((caseData.clients as any)?.email || '');
      setReminderCaseTitle(caseData.title);
      setReminderPortalToken(caseData.portal_token);
      setReminderDialogOpen(true);
    } catch (error) {
      console.error('Error loading case for reminder:', error);
      toast({ title: 'שגיאה בטעינת נתוני התיק', variant: 'destructive' });
    }
  };

  const handleSendReminder = async (personalMessage: string) => {
    setSendingReminder(true);
    try {
      const missingDocs = reminderDocs
        .filter(d => d.review_status === 'חסר' || d.review_status === 'לא תקין')
        .map(d => ({ doc_name: d.doc_name, review_status: d.review_status, due_date: d.due_date, advisor_note: d.advisor_note }));

      await invokeEdgeFunction('send-reminder-to-client', {
        clientName: reminderClientName,
        clientEmail: reminderClientEmail,
        caseTitle: reminderCaseTitle,
        portalToken: reminderPortalToken,
        personalMessage,
        advisorEmail: user?.email || '',
        missingDocs,
      });
      toast({ title: 'התזכורת נשלחה בהצלחה' });
      setReminderDialogOpen(false);
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({ title: 'שגיאה בשליחת התזכורת', variant: 'destructive' });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleHeaderClick = async (group: GroupedNotification) => {
    await markGroupAsRead(group);
    const key = group.case_id || group.ids[0];
    toggleExpand(key);
  };

  const unreadCount = useMemo(() => {
    const unreadCases = new Set(
      notifications.filter(n => !n.is_read).map(n => n.case_id || n.id)
    );
    return unreadCases.size;
  }, [notifications]);

  const getGroupTitle = (group: GroupedNotification) => {
    if (group.caseName) {
      return `עדכונים לתיק ${group.caseName}`;
    }
    return group.latestTitle;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Connection status banner */}
        {connectionStatus === 'disconnected' && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">אין חיבור לשרת — ייתכן שהנתונים אינם עדכניים</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleManualRetry} className="gap-1 text-destructive hover:text-destructive">
              <RefreshCw className="h-3 w-3" />
              נסה שוב
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">התראות</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} תיקים עם עדכונים חדשים
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
                <CheckCheck className="h-4 w-4" />
                סמן הכל כנקרא
              </Button>
            )}
            {notifications.some(n => n.is_read) && (
              <Button variant="outline" size="sm" onClick={deleteAllRead} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                מחק נקראו
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">טוען...</div>
        ) : grouped.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">אין התראות</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {grouped.map((group) => {
              const key = group.case_id || group.ids[0];
              const isExpanded = expandedGroups.has(key);
              const latestType = group.items[0]?.type || 'מסמך_התקבל';

              return (
                <Card
                  key={key}
                  className={`shadow-sm transition-all ${
                    !group.is_read
                      ? `${notificationColors[latestType] || ''} border-2`
                      : 'opacity-75'
                  }`}
                >
                  <CardContent
                    className="py-4 cursor-pointer"
                    onClick={() => handleHeaderClick(group)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        !group.is_read ? 'bg-background' : 'bg-muted'
                      }`}>
                        {notificationIcons[latestType] || <Bell className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${!group.is_read ? '' : 'text-muted-foreground'}`}>
                            {getGroupTitle(group)}
                          </h3>
                          {!group.is_read && (
                            <Badge variant="default" className="text-xs">חדש</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(group.latest_created_at), {
                            addSuffix: true,
                            locale: he,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGroup(group);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>

                  {isExpanded && (
                    <div className="border-t px-6 pb-4 space-y-2 pt-3">
                      {group.items.map((item, idx) => {
                        const actionPrefix = item.type === 'מסמך_אושר' ? 'אושר מסמך'
                          : item.type === 'מסמך_נדחה' ? 'נדחה מסמך'
                          : item.type === 'תיק_חדש' ? 'תיק חדש'
                          : item.title.includes('חתם') || item.type.includes('חתימ') ? 'נחתם מסמך'
                          : 'הועלה מסמך';
                        
                        const docNames: string[] = [];
                        if (item.message) {
                          const singleDocMatch = item.message.match(/מסמך:\s*(.+?)(\n|$)/);
                          if (singleDocMatch) {
                            docNames.push(singleDocMatch[1].trim());
                          }
                          const docsMatch = item.message.match(/מסמכים:\s*(.+)/);
                          if (docsMatch && docNames.length === 0) {
                            docNames.push(...docsMatch[1].split(',').map(s => s.trim()).filter(Boolean));
                          }
                          const sigMatch = item.message.match(/"([^"]+)"/);
                          if (sigMatch && docNames.length === 0) {
                            docNames.push(sigMatch[1]);
                          }
                          if (docNames.length === 0) {
                            const titleDocMatch = item.title.match(/הועלה מסמך:\s*(.+)/);
                            if (titleDocMatch) docNames.push(titleDocMatch[1].trim());
                          }
                        }
                        
                        if (docNames.length > 0) {
                          return docNames.map((dn, di) => (
                            <div key={`${idx}-${di}`} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                              <div className="shrink-0">
                                {notificationIcons[item.type] || <FileText className="h-4 w-4" />}
                              </div>
                              <p className="text-foreground font-medium">{actionPrefix}: <span className="text-muted-foreground">{dn}</span></p>
                            </div>
                          ));
                        }
                        
                        // Fallback for old notifications without document names
                        return (
                          <div key={idx} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                            <div className="shrink-0">
                              {notificationIcons[item.type] || <FileText className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-foreground font-medium">{item.title}</p>
                              {item.message && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.message}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {group.case_id && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => navigate(`/cases/${group.case_id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                            עבור לתיק
                          </Button>
                          {group.items.some(item => item.type === 'מסמך_דחוף') && (
                            <Button
                              size="sm"
                              className="flex-1 gap-2"
                              onClick={() => group.case_id && openReminderDialog(group.case_id)}
                            >
                              <Send className="h-4 w-4" />
                              שלח תזכורת ללקוח
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <SendReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        documents={reminderDocs}
        clientName={reminderClientName}
        clientEmail={reminderClientEmail}
        onSend={handleSendReminder}
        sending={sendingReminder}
      />
    </AppLayout>
  );
});

export default Notifications;
