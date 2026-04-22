import { DocTemplate } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface SelectDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: DocTemplate[];
  selectedTemplates: Set<string>;
  onToggleTemplate: (templateId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function SelectDocumentsDialog({
  open,
  onOpenChange,
  templates,
  selectedTemplates,
  onToggleTemplate,
  onSelectAll,
  onDeselectAll,
}: SelectDocumentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>בחירת מסמכים נדרשים</DialogTitle>
          <DialogDescription>
            בחר את המסמכים הנדרשים לתיק זה. מסמכים המסומנים כ"נדרש" נבחרו אוטומטית.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-2 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="text-xs h-7"
          >
            בחר הכל
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDeselectAll}
            className="text-xs h-7"
          >
            נקה הכל
          </Button>
          <span className="text-sm text-muted-foreground mr-auto">
            {selectedTemplates.size}/{templates.length} נבחרו
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-1 border rounded-lg p-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
              onClick={() => onToggleTemplate(template.id)}
            >
              <Checkbox
                checked={selectedTemplates.has(template.id)}
                onCheckedChange={() => onToggleTemplate(template.id)}
              />
              <span className="text-sm flex-1">{template.doc_name}</span>
              {template.default_required && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">נדרש</span>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            אישור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
