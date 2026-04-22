import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { CaseType, DocTemplate } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, FileText, FolderOpen, ChevronLeft, Search, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TAX_TEMPLATES_SEED } from '@/lib/taxTemplatesSeed';

type TemplateWithType = DocTemplate & {
  case_types: CaseType | null;
};

interface CaseTypeWithCount extends CaseType {
  templateCount: number;
}

export default function Templates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [caseTypes, setCaseTypes] = useState<CaseTypeWithCount[]>([]);
  const [templates, setTemplates] = useState<TemplateWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newCaseTypeOpen, setNewCaseTypeOpen] = useState(false);
  const [newCaseTypeName, setNewCaseTypeName] = useState('');
  const [creatingType, setCreatingType] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    const [typesRes, templatesRes] = await Promise.all([
      supabase.from('case_types').select('*').eq('advisor_id', user.id).order('name'),
      supabase.from('doc_templates').select('*, case_types(*)').eq('advisor_id', user.id).order('doc_name'),
    ]);

    const typesData = (typesRes.data || []) as CaseType[];
    const templatesData = (templatesRes.data || []) as TemplateWithType[];

    // Count templates per case type
    const typesWithCount = typesData.map(type => ({
      ...type,
      templateCount: templatesData.filter(t => t.case_type_id === type.id).length,
    }));

    setCaseTypes(typesWithCount);
    setTemplates(templatesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreateCaseType = async () => {
    if (!newCaseTypeName.trim()) return;
    setCreatingType(true);

    const { error } = await supabase.from('case_types').insert({ name: newCaseTypeName.trim(), advisor_id: user!.id });

    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'התבנית נוצרה בהצלחה' });
      setNewCaseTypeName('');
      setNewCaseTypeOpen(false);
      fetchData();
    }
    setCreatingType(false);
  };

  const handleImportTaxTemplates = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const existingNames = new Set(caseTypes.map((t) => t.name));
      const toCreate = TAX_TEMPLATES_SEED.filter((t) => !existingNames.has(t.caseTypeName));

      if (toCreate.length === 0) {
        toast({ title: 'כל תבניות המס המוכנות כבר קיימות במערכת' });
        setImporting(false);
        return;
      }

      // 1. Insert case types
      const { data: insertedTypes, error: typesErr } = await supabase
        .from('case_types')
        .insert(toCreate.map((t) => ({ name: t.caseTypeName, advisor_id: user.id })))
        .select();

      if (typesErr || !insertedTypes) throw typesErr ?? new Error('Failed to create case types');

      // 2. Insert all docs in one shot
      const docsToInsert = insertedTypes.flatMap((ct) => {
        const seed = toCreate.find((t) => t.caseTypeName === ct.name);
        if (!seed) return [];
        return seed.documents.map((d) => ({
          advisor_id: user.id,
          case_type_id: ct.id,
          doc_name: d.doc_name,
          default_required: d.required,
          document_type: 'request',
        }));
      });

      if (docsToInsert.length > 0) {
        const { error: docsErr } = await supabase.from('doc_templates').insert(docsToInsert);
        if (docsErr) throw docsErr;
      }

      toast({
        title: 'התבניות יובאו בהצלחה',
        description: `נוצרו ${insertedTypes.length} תבניות מס עם ${docsToInsert.length} מסמכים`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: 'שגיאה בייבוא', description: err.message, variant: 'destructive' });
    }
    setImporting(false);
  };

  const filteredTypes = caseTypes.filter(type =>
    type.name.includes(searchTerm)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">תבניות תיקי מס</h1>
              <p className="text-sm text-muted-foreground">ניהול תבניות מסמכים לפי סוג תיק (שכיר, עצמאי, החזר מס וכו׳)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              className="gap-2 bg-gradient-to-l from-primary to-accent"
              onClick={handleImportTaxTemplates}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              ייבא תבניות מס מוכנות
            </Button>
            <Dialog open={newCaseTypeOpen} onOpenChange={setNewCaseTypeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                   <Plus className="h-4 w-4" />
                   תבנית חדשה
                 </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>יצירת תבנית חדשה</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                     <Label>שם התבנית</Label>
                     <Input
                       value={newCaseTypeName}
                       onChange={(e) => setNewCaseTypeName(e.target.value)}
                       placeholder="לדוגמה: שכיר / עצמאי / החזר מס"
                     />
                  </div>
                  <Button 
                    onClick={handleCreateCaseType} 
                    disabled={creatingType || !newCaseTypeName.trim()}
                    className="w-full"
                  >
                     {creatingType ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 ml-2" />}
                     צור תבנית
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="חיפוש סוג תיק..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pr-10" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Case Types Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTypes.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
               <p className="text-muted-foreground">אין תבניות עדיין</p>
               <p className="text-sm text-muted-foreground mt-1">לחץ על "ייבא תבניות מס מוכנות" כדי להתחיל מהר, או צור תבנית משלך</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTypes.map((type) => (
              <Card 
                key={type.id} 
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/templates/${type.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      {type.name}
                    </span>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {type.templateCount} תבניות מסמכים
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

    </AppLayout>
  );
}
