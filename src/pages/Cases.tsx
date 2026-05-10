import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Case, Client, CaseType } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Plus, Search, FolderOpen, Eye, Trash2, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { CreateCaseDialog } from '@/components/cases/CreateCaseDialog';
import { BulkCreateCasesDialog } from '@/components/cases/BulkCreateCasesDialog';
import { deriveCaseStatus } from '@/lib/caseStatusSync';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

type CaseWithRelations = Case & {
  clients: Client | null;
  case_types: CaseType | null;
  case_documents?: { required: boolean; review_status: string }[];
  derived_status?: Case['status'];
};

const ITEMS_PER_PAGE = 10;

export default function Cases() {
  const [cases, setCases] = useState<CaseWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchCases = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Single optimized relational query with advisor filter
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          clients!cases_client_id_fkey (*),
          case_types!cases_case_type_id_fkey (*),
          case_documents (required, review_status)
        `)
        .eq('advisor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cases:', error);
      }
      
      if (data) {
        const enriched = (data as CaseWithRelations[]).map((c) => {
          const docs = c.case_documents || [];
          const derived = deriveCaseStatus(docs as any, c.status as any);
          const finalStatus = derived || c.status;
          // Best-effort background sync if stale
          if (derived && derived !== c.status) {
            supabase.from('cases').update({ status: derived }).eq('id', c.id).then(() => {});
          }
          return { ...c, derived_status: finalStatus } as CaseWithRelations;
        });
        setCases(enriched);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredCases = cases.filter((c) => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase().trim();
    const title = c.title?.toLowerCase() || '';
    const clientName = c.clients?.full_name?.toLowerCase() || '';
    const caseType = c.case_types?.name?.toLowerCase() || '';
    
    return title.includes(search) ||
           clientName.includes(search) ||
           caseType.includes(search);
  });

  const { sortedData, sortConfig, requestSort } = useTableSort(filteredCases, 'created_at', 'desc');

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDeleteClick = (id: string) => {
    setCaseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!caseToDelete) return;
    await supabase.from('cases').delete().eq('id', caseToDelete);
    toast({ title: 'התיק נמחק' });
    setDeleteDialogOpen(false);
    setCaseToDelete(null);
    fetchCases();
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }
    return pages;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">תיקים</h1>
            <p className="text-muted-foreground mt-1">
              ניהול כל התיקים שלך במקום אחד
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)} className="gap-2">
              <FolderOpen className="h-4 w-4" />
              פתיחה מרובה
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              תיק חדש
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם לקוח, כותרת או סוג תיק..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cases Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              רשימת תיקים ({filteredCases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                טוען תיקים...
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'לא נמצאו תיקים התואמים לחיפוש' : 'עדיין אין תיקים'}
                </p>
                {!searchTerm && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setDialogOpen(true)}
                  >
                    צור תיק ראשון
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead<CaseWithRelations> sortKey="title" sortConfig={sortConfig} onSort={requestSort}>
                          כותרת
                        </SortableTableHead>
                        <SortableTableHead<CaseWithRelations> sortKey="clients" sortConfig={sortConfig} onSort={requestSort}>
                          לקוח
                        </SortableTableHead>
                        <SortableTableHead<CaseWithRelations> sortKey="case_types" sortConfig={sortConfig} onSort={requestSort}>
                          סוג תיק
                        </SortableTableHead>
                        <SortableTableHead<CaseWithRelations> sortKey="status" sortConfig={sortConfig} onSort={requestSort}>
                          סטטוס
                        </SortableTableHead>
                        <SortableTableHead<CaseWithRelations> sortKey="created_at" sortConfig={sortConfig} onSort={requestSort}>
                          נוצר בתאריך
                        </SortableTableHead>
                        <SortableTableHead<CaseWithRelations> sortKey="last_portal_link_sent_at" sortConfig={sortConfig} onSort={requestSort}>
                          נשלח ללקוח
                        </SortableTableHead>
                        <th className="h-12 px-4 text-start align-middle font-medium text-muted-foreground">פעולות</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((caseItem) => (
                        <TableRow 
                          key={caseItem.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/cases/${caseItem.id}`)}
                        >
                          <TableCell className="font-medium">
                            {caseItem.title}
                          </TableCell>
                          <TableCell>
                            {caseItem.clients?.full_name || '-'}
                          </TableCell>
                          <TableCell>
                            {caseItem.case_types?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={caseItem.derived_status || caseItem.status} />
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {format(new Date(caseItem.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            {caseItem.last_portal_link_sent_at ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-success">
                                <Send className="h-3 w-3" />
                                {formatDistanceToNow(new Date(caseItem.last_portal_link_sent_at), { addSuffix: true, locale: he })}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">לא נשלח</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/cases/${caseItem.id}`);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(caseItem.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      מציג {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} מתוך {sortedData.length} תיקים
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {getPageNumbers().map((page, index) => (
                          <PaginationItem key={index}>
                            {page === 'ellipsis' ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => handlePageChange(currentPage + 1)}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateCaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchCases}
      />
      <BulkCreateCasesDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onSuccess={fetchCases}
      />
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="מחיקת תיק"
        description="האם אתה בטוח שברצונך למחוק תיק זה? כל המסמכים והפעילות המשויכים אליו יימחקו גם כן."
      />
    </AppLayout>
  );
}
