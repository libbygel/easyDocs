import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Eye, GripVertical, Trash2, Clock, MessageSquare, Save, Upload as UploadIcon, Pencil, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import type { CaseDocument, Upload } from '@/lib/supabase';

type DocumentWithUpload = CaseDocument & {
  uploads: Upload[];
};

interface DraggableDocumentRowProps {
  doc: DocumentWithUpload;
  onApprove: (docId: string, docName: string) => void;
  onReject: (doc: DocumentWithUpload) => void;
  onDelete?: (docId: string, docName: string) => void;
  onViewFiles?: (doc: DocumentWithUpload) => void;
  onEditNote?: (docId: string, note: string) => void;
  onRename?: (docId: string, newName: string) => void;
  onUploadSignaturePdf?: (doc: DocumentWithUpload) => void;
  onAdvisorUpload?: (doc: DocumentWithUpload) => void;
  previewMode?: 'new_tab' | 'modal';
}

export function DraggableDocumentRow({ 
  doc, 
  onApprove, 
  onReject,
  onDelete,
  onViewFiles,
  onEditNote,
  onRename,
  onUploadSignaturePdf,
  onAdvisorUpload,
  previewMode = 'new_tab',
}: DraggableDocumentRowProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(doc.advisor_note || '');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState(doc.doc_name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const uploads = doc.uploads || [];
  const isSignatureDoc = (doc as any).document_type === 'signature';
  const hasClientUpload = uploads.some(u => u.uploaded_by === 'לקוח');
  
  // For signature docs, prefer client upload when present, otherwise fallback to any existing file.
  const clientUploads = uploads.filter(u => u.uploaded_by === 'לקוח');
  const displayUploads = isSignatureDoc
    ? (clientUploads.length > 0 ? clientUploads : uploads)
    : uploads;
  const latestUpload = displayUploads[displayUploads.length - 1];
  
  const effectiveSentStatus = isSignatureDoc && uploads.some(u => u.uploaded_by === 'יועץ') && !hasClientUpload
    ? 'ממתין ללקוח'
    : latestUpload ? 'נשלח' : doc.sent_status;

  const handleSaveNote = () => {
    onEditNote?.(doc.id, noteText);
    setNoteOpen(false);
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging ? 'bg-muted' : '', 'transition-colors duration-150 hover:bg-accent/50')}>
      <TableCell className="w-8">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-grab active:cursor-grabbing p-1 h-auto"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </TableCell>
      <TableCell className="font-medium max-w-[200px]">
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <Input
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (renameText.trim() && renameText !== doc.doc_name) {
                    onRename?.(doc.id, renameText.trim());
                  }
                  setIsRenaming(false);
                } else if (e.key === 'Escape') {
                  setRenameText(doc.doc_name);
                  setIsRenaming(false);
                }
              }}
            />
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
              if (renameText.trim() && renameText !== doc.doc_name) {
                onRename?.(doc.id, renameText.trim());
              }
              setIsRenaming(false);
            }}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
              setRenameText(doc.doc_name);
              setIsRenaming(false);
            }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group">
            <span className="truncate" title={doc.doc_name}>{doc.doc_name}</span>
            {onRename && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setRenameText(doc.doc_name); setIsRenaming(true); }}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        {doc.required ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        )}
      </TableCell>
      <TableCell className="tabular-nums">
        {doc.due_date ? format(new Date(doc.due_date), 'dd/MM/yyyy') : '-'}
      </TableCell>
      <TableCell className="text-sm">
        {(doc as any).sent_to_client_at ? (
          <span className="flex items-center gap-1 text-success" title={format(new Date((doc as any).sent_to_client_at), 'dd/MM/yyyy HH:mm')}>
            <Send className="h-3.5 w-3.5" />
            {formatDistanceToNow(new Date((doc as any).sent_to_client_at), { addSuffix: true, locale: he })}
          </span>
        ) : (
          <span className="text-muted-foreground">לא נשלח</span>
        )}
      </TableCell>
      <TableCell>
        {effectiveSentStatus === 'ממתין ללקוח' ? (
          <span className="status-badge status-warning"><Clock className="h-3.5 w-3.5" />ממתין ללקוח</span>
        ) : (
          <StatusBadge status={effectiveSentStatus as any} />
        )}
      </TableCell>
      <TableCell>
        {displayUploads.length > 1 ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-primary hover:underline p-0 h-auto"
            onClick={() => onViewFiles?.(doc)}
          >
            <Eye className="h-4 w-4" />
            {displayUploads.length} קבצים
          </Button>
        ) : latestUpload ? (
          previewMode === 'modal' ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary hover:underline p-0 h-auto"
              onClick={() => onViewFiles?.(doc)}
            >
              <Eye className="h-4 w-4" />
              צפייה
            </Button>
          ) : (
            <a
              href={latestUpload.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline text-sm"
            >
              <Eye className="h-4 w-4" />
              צפייה
            </a>
          )
        ) : isSignatureDoc && onUploadSignaturePdf ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-primary hover:underline p-0 h-auto"
            onClick={() => onUploadSignaturePdf(doc)}
          >
            <UploadIcon className="h-4 w-4" />
            העלה PDF
          </Button>
        ) : !isSignatureDoc && onAdvisorUpload ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-primary hover:underline p-0 h-auto"
            onClick={() => onAdvisorUpload(doc)}
          >
            <UploadIcon className="h-4 w-4" />
            העלה קובץ
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={doc.review_status} />
      </TableCell>
      <TableCell>
        {doc.review_status === 'הועלה' || doc.review_status === 'נחתם' ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-success text-success hover:bg-success hover:text-success-foreground"
              onClick={() => onApprove(doc.id, doc.doc_name)}
            >
              <Check className="h-3.5 w-3.5" />
              תקין
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onReject(doc)}
            >
              <X className="h-3.5 w-3.5" />
              לא תקין
            </Button>
          </div>
        ) : doc.review_status === 'תקין' ? (
          <div className="flex items-center gap-1">
            <span className="status-badge status-success"><Check className="h-3.5 w-3.5" />תקין</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => onReject(doc)}
              title="שנה ללא תקין"
            >
              <X className="h-3 w-3" />
              שנה
            </Button>
          </div>
        ) : doc.review_status === 'לא תקין' ? (
          <div className="flex items-center gap-1">
            <span className="status-badge status-error"><X className="h-3.5 w-3.5" />לא תקין</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs text-success hover:bg-success/10"
              onClick={() => onApprove(doc.id, doc.doc_name)}
              title="סמן כתקין"
            >
              <Check className="h-3 w-3" />
              אשר
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">ממתין להעלאה</span>
        )}
      </TableCell>
      <TableCell>
        <Popover open={noteOpen} onOpenChange={(open) => {
          setNoteOpen(open);
          if (open) setNoteText(doc.advisor_note || '');
        }}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 p-1 h-auto max-w-[180px]">
              {doc.advisor_note ? (
                <span className="text-sm text-muted-foreground line-clamp-1 text-start" title={doc.advisor_note}>
                  {doc.advisor_note}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MessageSquare className="h-3 w-3" />
                  הוסף הערה
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">הערה ללקוח</p>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="כתוב הערה שתוצג ללקוח בפורטל..."
                className="min-h-[80px]"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setNoteOpen(false)}>
                  ביטול
                </Button>
                <Button size="sm" onClick={handleSaveNote} className="gap-1">
                  <Save className="h-3 w-3" />
                  שמור
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
      {onDelete && (
        <TableCell className="w-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(doc.id, doc.doc_name)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
