import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Users, Trash2, Edit2, Eye, CheckSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { CreateClientDialog } from '@/components/clients/CreateClientDialog';
import { EditClientDialog } from '@/components/clients/EditClientDialog';
import { SendGroupEmailDialog } from '@/components/clients/SendGroupEmailDialog';
import { ImportClientsDialog } from '@/components/clients/ImportClientsDialog';
import { BulkCreateCasesDialog } from '@/components/cases/BulkCreateCasesDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Mail, FolderPlus, FileSpreadsheet, TrendingDown } from 'lucide-react';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [groupEmailOpen, setGroupEmailOpen] = useState(false);
  const [groupEmailInitialCategory, setGroupEmailInitialCategory] = useState<string | undefined>(undefined);
  const [bulkCasesOpen, setBulkCasesOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase.from('clients').select('*').eq('advisor_id', user.id).order('full_name');
    if (data) setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
    if (user) {
      supabase
        .from('client_categories' as any)
        .select('id, name')
        .eq('advisor_id', user.id)
        .order('name')
        .then(({ data }) => setCategories(((data as any) || []) as any));
    }
  }, [user]);

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const filteredClients = clients.filter((c) => {
    const matchSearch = !searchTerm ||
      c.full_name.includes(searchTerm) ||
      c.email?.includes(searchTerm) ||
      c.phone?.includes(searchTerm) ||
      c.id_number?.includes(searchTerm);
    const catId = (c as any).category_id || null;
    const matchCat = filterCategory === 'all' || (filterCategory === 'none' ? !catId : catId === filterCategory);
    return matchSearch && matchCat;
  });

  const { sortedData, sortConfig, requestSort } = useTableSort(filteredClients, 'full_name');

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setClientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    await supabase.from('clients').delete().eq('id', clientToDelete);
    toast({ title: 'הלקוח נמחק' });
    setDeleteDialogOpen(false);
    setClientToDelete(null);
    fetchClients();
  };

  const allVisibleSelected = sortedData.length > 0 && sortedData.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedData.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const { error } = await supabase.from('clients').delete().in('id', ids);
    if (!error) {
      setClients((prev) => prev.filter((c) => !ids.includes(c.id)));
      toast({ title: `${ids.length} לקוחות נמחקו` });
    } else {
      const isFK = error.message?.includes('foreign key') || error.message?.includes('violates');
      toast({
        title: 'לא ניתן למחוק',
        description: isFK
          ? 'לחלק מהלקוחות יש תיקים או נתונים קשורים. יש למחוק אותם קודם.'
          : error.message,
        variant: 'destructive',
      });
    }
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
  };

  const handleExportDebtors = async () => {
    if (!user) return;
    toast({ title: 'מכין דוח חייבים...' });
    try {
      // Fetch all charges and payments for this advisor in parallel
      const [chargesRes, paymentsRes] = await Promise.all([
        supabase.from('case_charges' as any).select('client_id, amount').eq('advisor_id', user.id),
        supabase.from('case_payments' as any).select('client_id, amount').eq('advisor_id', user.id),
      ]);

      // Sum charges per client
      const chargesByClient = new Map<string, number>();
      for (const c of (chargesRes.data || []) as any[]) {
        chargesByClient.set(c.client_id, (chargesByClient.get(c.client_id) || 0) + Number(c.amount || 0));
      }

      // Sum payments per client
      const paymentsByClient = new Map<string, number>();
      for (const p of (paymentsRes.data || []) as any[]) {
        paymentsByClient.set(p.client_id, (paymentsByClient.get(p.client_id) || 0) + Number(p.amount || 0));
      }

      // Build debtors list — only clients with balance > 0
      const rows = clients
        .map((client) => {
          const charged = chargesByClient.get(client.id) || 0;
          const paid = paymentsByClient.get(client.id) || 0;
          const balance = charged - paid;
          return { client, charged, paid, balance };
        })
        .filter((r) => r.balance > 0)
        .sort((a, b) => b.balance - a.balance);

      if (rows.length === 0) {
        toast({ title: 'אין חייבים', description: 'לכל הלקוחות יתרה אפסית או חיובית' });
        return;
      }

      const wsData = [
        ['שם לקוח', 'ת.ז.', 'טלפון', 'אימייל', 'סך חיובים (₪)', 'סך תשלומים (₪)', 'יתרה לגבייה (₪)'],
        ...rows.map((r) => [
          r.client.full_name,
          r.client.id_number || '',
          r.client.phone || '',
          r.client.email || '',
          r.charged,
          r.paid,
          r.balance,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'חייבים');
      XLSX.writeFile(wb, `דוח_חייבים_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);

      toast({ title: `הדוח הופק בהצלחה`, description: `${rows.length} לקוחות חייבים` });
    } catch (err: any) {
      toast({ title: 'שגיאה בהפקת הדוח', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">לקוחות</h1>
            <p className="text-muted-foreground mt-1">ניהול רשימת הלקוחות שלך</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              לקוח חדש
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              ייבוא מאקסל
            </Button>
            <Button variant="outline" onClick={() => setBulkCasesOpen(true)} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              פתחי תיקים מרובים
            </Button>
            <Button variant="outline" onClick={() => { setGroupEmailInitialCategory(undefined); setGroupEmailOpen(true); }} className="gap-2">
              <Mail className="h-4 w-4" />
              מייל קבוצתי
            </Button>
            <Button variant="outline" onClick={handleExportDebtors} className="gap-2">
              <TrendingDown className="h-4 w-4" />
              דוח חייבים
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="חיפוש..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">כל הסיווגים</SelectItem>
                  <SelectItem value="none">ללא סיווג</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterCategory !== 'all' && (
                <Button
                  variant="default"
                  onClick={() => { setGroupEmailInitialCategory(filterCategory); setGroupEmailOpen(true); }}
                  className="gap-2 whitespace-nowrap"
                >
                  <Mail className="h-4 w-4" />
                  שלח מייל לסיווג ({filteredClients.filter((c) => c.email).length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                לקוחות ({filteredClients.length})
              </CardTitle>
              {someSelected && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedIds.size} נבחרו</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    מחק נבחרים
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                    בטל בחירה
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">טוען...</div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">אין לקוחות</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <th className="h-12 px-4 w-10">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="בחר הכל"
                        />
                      </th>
                      <SortableTableHead<Client> sortKey="full_name" sortConfig={sortConfig} onSort={requestSort}>
                        שם מלא
                      </SortableTableHead>
                      <SortableTableHead<Client> sortKey="id_number" sortConfig={sortConfig} onSort={requestSort}>
                        ת.ז.
                      </SortableTableHead>
                      <SortableTableHead<Client> sortKey="phone" sortConfig={sortConfig} onSort={requestSort}>
                        טלפון
                      </SortableTableHead>
                      <SortableTableHead<Client> sortKey="email" sortConfig={sortConfig} onSort={requestSort}>
                        אימייל
                      </SortableTableHead>
                      <th className="h-12 px-4 text-start align-middle font-medium text-muted-foreground">סיווג</th>
                      <SortableTableHead<Client> sortKey="created_at" sortConfig={sortConfig} onSort={requestSort}>
                        נוצר
                      </SortableTableHead>
                      <th className="h-12 px-4 text-start align-middle font-medium text-muted-foreground w-24">פעולות</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((client) => (
                      <TableRow
                        key={client.id}
                        className={`cursor-pointer hover:bg-accent/50 ${selectedIds.has(client.id) ? 'bg-accent/30' : ''}`}
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(client.id)}
                            onCheckedChange={() => toggleSelect(client.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{client.full_name}</TableCell>
                        <TableCell dir="ltr" className="text-start">{client.id_number || '-'}</TableCell>
                        <TableCell dir="ltr" className="text-start">{client.phone || '-'}</TableCell>
                        <TableCell dir="ltr" className="text-start">{client.email || '-'}</TableCell>
                        <TableCell>
                          {(client as any).category_id ? (
                            <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {categoryNameById.get((client as any).category_id) || '—'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{format(new Date(client.created_at), 'dd/MM/yyyy')}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${client.id}`)} title="פתח עמוד לקוח">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(client)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(client.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <CreateClientDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchClients} />
      <EditClientDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        client={editingClient}
        onSuccess={fetchClients} 
      />
      <SendGroupEmailDialog open={groupEmailOpen} onOpenChange={setGroupEmailOpen} initialCategoryId={groupEmailInitialCategory} />
      <BulkCreateCasesDialog open={bulkCasesOpen} onOpenChange={setBulkCasesOpen} />
      <ImportClientsDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={fetchClients} />
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="מחיקת לקוח"
        description="האם אתה בטוח שברצונך למחוק לקוח זה? כל התיקים המשויכים אליו יימחקו גם כן."
      />
      <DeleteConfirmationDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleBulkDeleteConfirm}
        title={`מחיקת ${selectedIds.size} לקוחות`}
        description={`האם למחוק ${selectedIds.size} לקוחות? כל התיקים המשויכים אליהם יימחקו גם כן. פעולה זו אינה הפיכה.`}
      />
    </AppLayout>
  );
}
