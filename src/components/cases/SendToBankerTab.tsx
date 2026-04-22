import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, UserPlus, Check, Clock } from 'lucide-react';
import type { CaseDocument, Upload } from '@/lib/supabase';

type DocumentWithUpload = CaseDocument & { uploads: Upload[] };

interface ContactRow {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
}

interface SendToBankerTabProps {
  caseId: string;
  caseTitle: string;
  documents: DocumentWithUpload[];
  advisorName: string;
}

export function SendToBankerTab({ caseId, caseTitle, documents, advisorName }: SendToBankerTabProps) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [manualEmail, setManualEmail] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [previousSends, setPreviousSends] = useState<{ to_email: string; sent_at: string; body_preview?: string | null }[]>([]);
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    supabase.from('contacts').select('id, full_name, email, role').eq('advisor_id', user.id).order('full_name')
      .then(({ data }) => { if (data) setContacts(data as ContactRow[]); });

    supabase.from('email_logs').select('to_email, sent_at, body_preview').eq('case_id', caseId).eq('email_type', 'הודעה על העלאה' as const)
      .then(({ data }) => { if (data) setPreviousSends(data); });

    // Load effective sender name: custom sender name first, otherwise advisor profile name
    supabase.from('profiles').select('sender_display_name, name').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setSenderDisplayName((data as any).sender_display_name || (data as any).name || ''); });
  }, [user, caseId]);

  // All docs that have files (uploaded/signed/approved)
  const docsWithFiles = useMemo(() => {
    return documents.filter(doc => doc.uploads && doc.uploads.length > 0);
  }, [documents]);

  const toggleDoc = (docId: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedDocIds.size === docsWithFiles.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(docsWithFiles.map(d => d.id)));
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const targetEmail = manualEmail || selectedContact?.email || '';

  const handleSend = async () => {
    if (!targetEmail || selectedDocIds.size === 0) {
      toast({ title: 'שגיאה', description: 'בחר מסמכים ואיש קשר עם מייל', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const selectedDocs = docsWithFiles.filter(d => selectedDocIds.has(d.id));
      const attachments = selectedDocs.map(doc => {
        const latestUpload = doc.uploads[doc.uploads.length - 1];
        return {
          doc_name: doc.doc_name,
          file_url: latestUpload.file_url,
          file_name: latestUpload.file_name,
        };
      });

      const effectiveSenderName = senderDisplayName || advisorName || user?.email?.split('@')[0] || 'EasyDocs';

      const response = await invokeEdgeFunction('send-documents-to-advisor', {
        recipientName: selectedContact?.full_name || 'נמען',
        recipientEmail: targetEmail,
        caseTitle,
        advisorName: effectiveSenderName,
        advisorEmail: user?.email || '',
        senderDisplayName: effectiveSenderName,
        note,
        documents: attachments,
      });

      if (response?.error) throw new Error(response.error.message);

      // Log email
      if (user) {
        await supabase.from('email_logs').insert({
          advisor_id: user.id,
          case_id: caseId,
          email_type: 'הודעה על העלאה' as const,
          to_email: targetEmail,
          subject: `מסמכים לתיק: ${caseTitle}`,
          body_preview: `${selectedDocs.length} מסמכים נשלחו ל-${selectedContact?.full_name || targetEmail}`,
        });
      }

      setPreviousSends(prev => [{ to_email: targetEmail, sent_at: new Date().toISOString() }, ...prev]);
      setSelectedDocIds(new Set());
      setNote('');
      toast({ title: 'המסמכים נשלחו בהצלחה!', description: `נשלח ל-${targetEmail}` });
    } catch (error: any) {
      toast({ title: 'שגיאה בשליחה', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Previous sends status */}
      {previousSends.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Check className="h-4 w-4" />
            נשלח לבנקאי בעבר ({previousSends.length} פעמים)
          </div>
          {previousSends.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground mr-6">
              <Clock className="h-3 w-3" />
              <span dir="ltr">{s.to_email}</span>
              <span>• {new Date(s.sent_at).toLocaleDateString('he-IL')} {new Date(s.sent_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
      {/* Contact Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>בחר איש קשר</Label>
          <Select value={selectedContactId} onValueChange={(val) => { 
            setSelectedContactId(val); 
            const contact = contacts.find(c => c.id === val);
            if (contact?.email) setManualEmail(contact.email);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="בחר מהרשימה..." />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {contacts.length === 0 ? (
                <SelectItem value="__none" disabled>אין אנשי קשר — הוסף בדף אנשי קשר</SelectItem>
              ) : (
                contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} {c.role ? `(${c.role})` : ''} {c.email ? `- ${c.email}` : '(ללא מייל)'}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>מייל הנמען</Label>
          <Input
            type="email"
            placeholder="email@example.com"
            value={manualEmail}
            onChange={(e) => { setManualEmail(e.target.value); setSelectedContactId(''); }}
            dir="ltr"
          />
        </div>
      </div>

      {/* Document Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">בחר מסמכים לשליחה</Label>
          <Button variant="ghost" size="sm" onClick={selectAll} className="gap-1">
            {selectedDocIds.size === docsWithFiles.length ? 'בטל הכל' : 'בחר הכל'}
          </Button>
        </div>

        {docsWithFiles.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">אין מסמכים עם קבצים מצורפים</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                   <TableHead>שם מסמך</TableHead>
                   <TableHead>סוג</TableHead>
                   <TableHead>סטטוס</TableHead>
                   <TableHead>נשלח לבנקאי</TableHead>
                   <TableHead>קבצים</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docsWithFiles.map(doc => (
                  <TableRow key={doc.id} className="cursor-pointer hover:bg-accent/50" onClick={() => toggleDoc(doc.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedDocIds.has(doc.id)}
                        onCheckedChange={() => toggleDoc(doc.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{doc.doc_name}</TableCell>
                    <TableCell>{doc.document_type === 'signature' ? 'חתימה' : 'בקשה'}</TableCell>
                    <TableCell><StatusBadge status={doc.review_status} /></TableCell>
                    <TableCell>
                      {previousSends.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <Check className="h-3.5 w-3.5" /> נשלח
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">טרם נשלח</span>
                      )}
                    </TableCell>
                    <TableCell>{doc.uploads.length} קבצים</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="space-y-2">
        <Label>הערה למייל (אופציונלי)</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="הערה שתצורף למייל..."
          rows={3}
        />
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground">* הקבצים נשלחים כמצורפים למייל. מגבלת גודל: עד <strong className="text-foreground">10MB</strong> לכל שליחה.</p>

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={sending || !targetEmail || selectedDocIds.size === 0}
        size="lg"
        className="w-full gap-2"
      >
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        שלח {selectedDocIds.size > 0 ? `${selectedDocIds.size} מסמכים` : 'מסמכים'} {selectedContact ? `ל${selectedContact.full_name}` : targetEmail ? `ל-${targetEmail}` : ''}
      </Button>
    </div>
  );
}
