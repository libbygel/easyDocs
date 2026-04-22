import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { CaseType, DocTemplate } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, FileText, Edit2, Trash2, Clock, CheckCircle, PenTool, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { CreateTemplateDialog } from '@/components/templates/CreateTemplateDialog';
import { EditTemplateDialog } from '@/components/templates/EditTemplateDialog';

export default function TemplateDocuments() {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocTemplate | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user || !typeId) return;

    const [typeRes, templatesRes] = await Promise.all([
      supabase.from('case_types').select('*').eq('id', typeId).single(),
      supabase.from('doc_templates').select('*').eq('case_type_id', typeId).order('doc_name'),
    ]);

    if (typeRes.data) setCaseType(typeRes.data);
    if (templatesRes.data) setTemplates(templatesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, typeId]);

  const { sortedData, sortConfig, requestSort } = useTableSort(templates, 'doc_name');

  const handleEdit = (template: DocTemplate) => {
    setEditingTemplate(template);
    setEditOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    await supabase.from('doc_templates').delete().eq('id', deleteId);
    toast({ title: 'התבנית נמחקה' });
    setDeleteOpen(false);
    setDeleteId(null);
    fetchData();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">טוען...</div>
        </div>
      </AppLayout>
    );
  }

  if (!caseType) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">סוג תיק לא נמצא</p>
          <Button onClick={() => navigate('/templates')} className="mt-4">
            חזרה לתבניות
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/templates')}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{caseType.name}</h1>
              <p className="text-sm text-muted-foreground">
                {templates.length} תבניות מסמכים
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            הוספת מסמך
          </Button>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              מסמכים נדרשים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">אין מסמכים לסוג תיק זה</p>
                <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  הוסף מסמכים
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead<DocTemplate> sortKey="doc_name" sortConfig={sortConfig} onSort={requestSort}>
                      שם המסמך
                    </SortableTableHead>
                    <th className="h-12 px-4 text-start align-middle font-medium text-muted-foreground">סוג</th>
                    <SortableTableHead<DocTemplate> sortKey="default_required" sortConfig={sortConfig} onSort={requestSort}>
                      נדרש
                    </SortableTableHead>
                    <SortableTableHead<DocTemplate> sortKey="default_due_days" sortConfig={sortConfig} onSort={requestSort}>
                      ימים לתאריך יעד
                    </SortableTableHead>
                    <th className="h-12 px-4 text-start align-middle font-medium text-muted-foreground">עריכה</th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={template.doc_name}>{template.doc_name}</TableCell>
                      <TableCell>
                        <Badge variant={(template as any).document_type === 'signature' ? 'outline' : 'secondary'}>
                          {(template as any).document_type === 'signature' ? (
                            <><PenTool className="h-3 w-3 ml-1" />לחתימה</>
                          ) : 'בקשה'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.default_required ? 'default' : 'secondary'}>
                          {template.default_required ? (
                            <><CheckCircle className="h-3 w-3 ml-1" />נדרש</>
                          ) : (
                            'אופציונלי'
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.default_due_days ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {template.default_due_days} ימים
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {(template as any).document_type === 'signature' && (template as any).template_file_url && (
                            <Button variant="ghost" size="sm" onClick={() => window.open((template as any).template_file_url, '_blank')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(template.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        caseTypes={caseType ? [caseType] : []}
        preselectedTypeId={typeId}
        onSuccess={fetchData}
      />

      <EditTemplateDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        caseTypes={caseType ? [caseType] : []}
        template={editingTemplate}
        onSuccess={fetchData}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="מחיקת תבנית"
        description="האם אתה בטוח שברצונך למחוק תבנית זו?"
      />
    </AppLayout>
  );
}
