import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Contact, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import { EditContactDialog } from '@/components/contacts/EditContactDialog';

interface ContactRow {
  id: string;
  advisor_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  notes: string | null;
  created_at: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase.from('contacts').select('*').eq('advisor_id', user.id).order('full_name');
    if (data) setContacts(data as ContactRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [user]);

  const filteredContacts = contacts.filter(c =>
    c.full_name.includes(searchTerm) ||
    c.email?.includes(searchTerm) ||
    c.phone?.includes(searchTerm) ||
    c.role?.includes(searchTerm)
  );

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    await supabase.from('contacts').delete().eq('id', contactToDelete);
    toast({ title: 'איש הקשר נמחק' });
    setDeleteDialogOpen(false);
    setContactToDelete(null);
    fetchContacts();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">אנשי קשר</h1>
            <p className="text-muted-foreground mt-1">ניהול בנקאים ואנשי קשר מקצועיים</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            איש קשר חדש
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="חיפוש..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Contact className="h-5 w-5" />
              אנשי קשר ({filteredContacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">טוען...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <Contact className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">אין אנשי קשר</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם מלא</TableHead>
                      <TableHead>תפקיד</TableHead>
                      <TableHead>טלפון</TableHead>
                      <TableHead>אימייל</TableHead>
                      <TableHead>הערות</TableHead>
                      <TableHead className="w-24">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.full_name}</TableCell>
                        <TableCell>{contact.role || '-'}</TableCell>
                        <TableCell dir="ltr" className="text-start">{contact.phone || '-'}</TableCell>
                        <TableCell dir="ltr" className="text-start">{contact.email || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={contact.notes || ''}>{contact.notes || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingContact(contact); setEditDialogOpen(true); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setContactToDelete(contact.id); setDeleteDialogOpen(true); }}>
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
      <CreateContactDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchContacts} />
      <EditContactDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} contact={editingContact} onSuccess={fetchContacts} />
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="מחיקת איש קשר"
        description="האם אתה בטוח שברצונך למחוק איש קשר זה?"
      />
    </AppLayout>
  );
}
