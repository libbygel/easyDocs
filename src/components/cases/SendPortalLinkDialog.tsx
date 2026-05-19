import { useState } from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { fetchCurrentAdvisorProfile } from '@/lib/advisorProfile';
import { absoluteAppUrl, openAppPath } from '@/lib/appUrl';
import { Loader2, Mail, Copy, Check, ExternalLink } from 'lucide-react';

interface SendPortalLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  portalToken: string;
  clientEmail?: string;
  clientName?: string;
  caseTitle?: string;
  onComplete: () => void;
  emailType?: 'new_case' | 'reminder' | 'new_document';
}

export function SendPortalLinkDialog({
  open,
  onOpenChange,
  caseId,
  portalToken,
  clientEmail,
  clientName,
  caseTitle,
  onComplete,
  emailType = 'reminder',
}: SendPortalLinkDialogProps) {
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const portalPath = `/portal/${portalToken}`;
  const portalLink = absoluteAppUrl(portalPath);
  const [advisorName, setAdvisorName] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    fetchCurrentAdvisorProfile(user).then((profile) => setAdvisorName(profile.displayName || ''));
  }, [user]);

  const handleSendEmail = async () => {
    if (!clientEmail) {
      toast({
        title: 'שגיאה',
        description: 'ללקוח אין כתובת מייל',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      let effectiveEmailType = emailType;

      const response = await invokeEdgeFunction('send-portal-link', {
        clientName: clientName || '',
        clientEmail,
        caseTitle: caseTitle || '',
        portalLink,
        advisorEmail: user?.email || '',
        advisorName: advisorName || user?.user_metadata?.name || user?.email?.split('@')[0] || '',
        emailType: effectiveEmailType,
      });

      if (response?.error) throw new Error(response.error);

      const now = new Date().toISOString();
      // Update sent_to_client_at on all case documents
      await supabase
        .from('case_documents')
        .update({ sent_to_client_at: now } as any)
        .eq('case_id', caseId);
      // Update last_portal_link_sent_at on the case
      await supabase
        .from('cases')
        .update({ last_portal_link_sent_at: now } as any)
        .eq('id', caseId);

      toast({
        title: 'הקישור נשלח בהצלחה',
        description: `מייל נשלח ל-${clientEmail}`,
      });
      onOpenChange(false);
      onComplete();
    } catch (error: any) {
      console.error('Error sending portal link:', error);
      toast({
        title: 'שגיאה בשליחת המייל',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    navigator.clipboard.writeText(portalLink);
    setCopied(true);

    const now = new Date().toISOString();
    // Update sent_to_client_at on all case documents
    await supabase
      .from('case_documents')
      .update({ sent_to_client_at: now } as any)
      .eq('case_id', caseId);
    // Update last_portal_link_sent_at on the case
    await supabase
      .from('cases')
      .update({ last_portal_link_sent_at: now } as any)
      .eq('id', caseId);

    toast({
      title: 'הקישור הועתק',
      description: 'ניתן לשלוח ללקוח',
    });
    onComplete();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>שליחת קישור ללקוח</DialogTitle>
          <DialogDescription>
            התיק נוצר בהצלחה! האם לשלוח קישור לפורטל ללקוח {clientName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Link Preview */}
          <div className="bg-muted p-3 rounded-lg text-sm font-mono break-all text-muted-foreground">
            {portalLink}
          </div>

          <div className="flex flex-col gap-2">
            {/* Send Email Button */}
            {clientEmail && (
              <Button
                onClick={handleSendEmail}
                disabled={sending}
                className="gap-2 w-full"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                שלח מייל ל-{clientEmail}
              </Button>
            )}

            {/* Copy Link Button */}
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2 w-full"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'הועתק!' : 'העתק קישור'}
            </Button>

            {/* Open Portal Button */}
            <Button
              variant="ghost"
              onClick={() => openAppPath(portalPath)}
              className="gap-2 w-full"
            >
              <ExternalLink className="h-4 w-4" />
              צפה בטופס הלקוח
            </Button>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="ghost" onClick={handleSkip}>
              דלג
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
