import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Plus, Search, FolderOpen, Eye, Trash2, Send } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { CreateCaseDialog } from '@/components/cases/CreateCaseDialog';
import { BulkCreateCasesDialog } from '@/components/cases/BulkCreateCasesDialog';
import { deriveCaseStatus } from '@/lib/caseStatusSync';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CaseWithRelations = Case & {
  clients: Client | null;
  case_types: CaseType | null;
  case_documents?: { required: boolean; review_status: string }[];
  derived_status?: Case['status'];
  urgency?: string;
};

const ITEMS_PER_PAGE = 10;

export default function Cases() {
  const [cases, setCases] = useState<CaseWithRelations[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [caseTypeFilter, setCaseTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('not_submitted');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [sentFilter, setSentFilter] = useState('all');
  const [showPendingDocsOnly, setShowPendingDocsOnly] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const hasPendingDocFilter = searchParams.get('docStatus') === 'pending';
  const hasActiveFilters =
    !!searchTerm.trim() ||
    categoryFilter !== 'all' ||
    caseTypeFilter !== 'all' ||
    statusFilter !== 'not_submitted' ||
    urgencyFilter !== 'all' ||
    sentFilter !== 'all' ||
    showPendingDocsOnly;

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

  useEffect(() => {
    if (!user) return;
    supabase
      .from('client_categories' as any)
      .select('id, name')
      .eq('advisor_id', user.id)
      .order('name')
      .then(({ data }) => setCategories(((data as any) || []) as { id: string; name: string }[]));
  }, [user]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  useEffect(() => {
    setShowPendingDocsOnly(hasPendingDocFilter);
  }, [hasPendingDocFilter]);

  const categoryOptions = useMemo(() => {
    const idsInCases = new Set(
      cases
        .map((c) => c.clients?.category_id)
        .filter((id): id is string => Boolean(id))
    );
    return categories
      .filter((category) => idsInCases.has(category.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }, [cases, categories]);

  const caseTypeOptions = useMemo(() => {
    return Array.from(new Set(cases.map((c) => c.case_types?.name || '').filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'he')
    );
  }, [cases]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(cases.map((c) => c.derived_status || c.status).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'he')
    );
  }, [cases]);

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    categoryFilter,
    caseTypeFilter,
    statusFilter,
    urgencyFilter,
    sentFilter,
    showPendingDocsOnly,
  ]);

  const filteredCases = cases.filter((c) => {
    const status = c.derived_status || c.status;
    const requiredDocs = (c.case_documents || []).filter((doc) => doc.required);
    const isCompletedByDocs = requiredDocs.length > 0 && requiredDocs.every((doc) => doc.review_status === 'תקין');

    if (statusFilter === 'completed_ready' && !isCompletedByDocs) return false;
    if (statusFilter === 'not_submitted' && status === 'הוגש') return false;
    if (
      statusFilter !== 'all' &&
      statusFilter !== 'not_submitted' &&
      statusFilter !== 'completed_ready' &&
      status !== statusFilter
    ) return false;

    const clientName = c.clients?.full_name || '';

    const clientCategoryId = c.clients?.category_id || null;
    if (categoryFilter === '__none__' && clientCategoryId) return false;
    if (categoryFilter !== 'all' && categoryFilter !== '__none__' && clientCategoryId !== categoryFilter) return false;

    const caseTypeName = c.case_types?.name || '';
    if (caseTypeFilter !== 'all' && caseTypeName !== caseTypeFilter) return false;

    if (urgencyFilter !== 'all' && ((c as any).urgency || 'normal') !== urgencyFilter) return false;

    const hasSent = !!c.last_portal_link_sent_at;
    if (sentFilter === 'sent' && !hasSent) return false;
    if (sentFilter === 'not_sent' && hasSent) return false;

    if (showPendingDocsOnly) {
      const hasPendingDocs = (c.case_documents || []).some(
        (doc) => doc.review_status === 'הועלה' || doc.review_status === 'נחתם'
      );
      if (!hasPendingDocs) return false;
    }

    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase().trim();
    const title = c.title.toLowerCase();
    const client = clientName.toLowerCase();
    const caseType = caseTypeName.toLowerCase();
    return title.includes(search) || client.includes(search) || caseType.includes(search);
  });

  const sortedData = useMemo(() => {
    return [...filteredCases].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filteredCases]);

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

  const handleBulkDeleteConfirm = async () => {
    if (selectedCases.size === 0) return;
    const ids = Array.from(selectedCases);
    const { error } = await supabase.from('cases').delete().in('id', ids);
    if (error) {
      toast({ title: 'שגיאה במחיקת תיקים', variant: 'destructive' });
    } else {
      toast({ title: `${ids.length} תיקים נמחקו בהצלחה` });
    }
    setBulkDeleteDialogOpen(false);
    setSelectedCases(new Set());
    fetchCases();
  };

  const toggleSelectCase = (id: string) => {
    setSelectedCases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCases.size === paginatedData.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(paginatedData.map((c) => c.id)));
    }
  };

  const handlePendingDocsFilterToggle = (nextValue: boolean) => {
    setShowPendingDocsOnly(nextValue);
    const nextParams = new URLSearchParams(searchParams);
    if (nextValue) {
      nextParams.set('docStatus', 'pending');
    } else {
      nextParams.delete('docStatus');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setCaseTypeFilter('all');
    setStatusFilter('not_submitted');
    setUrgencyFilter('all');
    setSentFilter('all');
    setShowPendingDocsOnly(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('docStatus');
    setSearchParams(nextParams, { replace: true });
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
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי שם לקוח, כותרת או סוג תיק..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button
                type="button"
                variant={showPendingDocsOnly ? 'default' : 'outline'}
                onClick={() => handlePendingDocsFilterToggle(!showPendingDocsOnly)}
              >
                ממתינים לבדיקה
              </Button>
              {hasActiveFilters && (
                <Button type="button" variant="outline" onClick={resetAllFilters}>
                  איפוס סינון
                </Button>
              )}
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
            ) : cases.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  עדיין אין תיקים
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setDialogOpen(true)}
                >
                  צור תיק ראשון
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedCases.size > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <span className="text-sm font-medium">
                      {selectedCases.size} תיקים נבחרו
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      מחק נבחרים
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCases(new Set())}
                    >
                      בטל בחירה
                    </Button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={paginatedData.length > 0 && selectedCases.size === paginatedData.length}
                            onCheckedChange={toggleSelectAll}
                            aria-label="בחר הכל"
                          />
                        </TableHead>
                        <TableHead>כותרת</TableHead>
                        <TableHead>לקוח</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <span>סיווג לקוח</span>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">הכל</SelectItem>
                                <SelectItem value="__none__">ללא סיווג</SelectItem>
                                {categoryOptions.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <span>סוג תיק</span>
                            <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">הכל</SelectItem>
                                {caseTypeOptions.map((value) => (
                                  <SelectItem key={value} value={value}>{value}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <span>סטטוס</span>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_submitted">לא הוגש</SelectItem>
                                <SelectItem value="completed_ready">הושלם (כל המסמכים תקינים)</SelectItem>
                                <SelectItem value="all">הכל</SelectItem>
                                {statusOptions.map((value) => (
                                  <SelectItem key={value} value={value}>{value}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <span>דחיפות</span>
                            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">הכל</SelectItem>
                                <SelectItem value="normal">רגיל</SelectItem>
                                <SelectItem value="urgent">דחוף</SelectItem>
                                <SelectItem value="critical">דחוף מאוד</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                        <TableHead>נוצר בתאריך</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <span>נשלח ללקוח</span>
                            <Select value={sentFilter} onValueChange={setSentFilter}>
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">הכל</SelectItem>
                                <SelectItem value="sent">נשלח</SelectItem>
                                <SelectItem value="not_sent">לא נשלח</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                        <TableHead>פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.length > 0 ? paginatedData.map((caseItem) => (
                        <TableRow 
                          key={caseItem.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/cases/${caseItem.id}`)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedCases.has(caseItem.id)}
                              onCheckedChange={() => toggleSelectCase(caseItem.id)}
                              aria-label={`בחר ${caseItem.title}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {caseItem.title}
                          </TableCell>
                          <TableCell>
                            {caseItem.clients?.full_name || '-'}
                          </TableCell>
                          <TableCell>
                            {caseItem.clients?.category_id ? (
                              <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {categoryNameById.get(caseItem.clients.category_id) || '—'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {caseItem.case_types?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={caseItem.derived_status || caseItem.status} />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={(caseItem as any).urgency || 'normal'}
                              onValueChange={async (value) => {
                                const prev = (caseItem as any).urgency || 'normal';
                                setCases((old) => old.map((c) => c.id === caseItem.id ? { ...c, urgency: value } as any : c));
                                const { error } = await supabase.from('cases').update({ urgency: value } as any).eq('id', caseItem.id);
                                if (error) {
                                  setCases((old) => old.map((c) => c.id === caseItem.id ? { ...c, urgency: prev } as any : c));
                                  toast({ title: 'שגיאה בעדכון דחיפות', variant: 'destructive' });
                                }
                              }}
                            >
                              <SelectTrigger className={`h-7 w-32 text-xs rounded-full border ${
                                ((caseItem as any).urgency || 'normal') === 'critical'
                                  ? 'border-red-300 text-red-700 bg-red-50'
                                  : ((caseItem as any).urgency || 'normal') === 'urgent'
                                  ? 'border-orange-300 text-orange-700 bg-orange-50'
                                  : 'border-gray-200 text-gray-600'
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">רגיל</SelectItem>
                                <SelectItem value="urgent">דחוף</SelectItem>
                                <SelectItem value="critical">דחוף מאוד</SelectItem>
                              </SelectContent>
                            </Select>
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
                      )) : (
                        <TableRow>
                          <TableCell colSpan={10} className="py-8 text-center">
                            <p className="text-muted-foreground">לא נמצאו תיקים לפי הסינון שנבחר</p>
                            {hasActiveFilters && (
                              <Button variant="outline" className="mt-3" onClick={resetAllFilters}>
                                איפוס סינון והצג הכל
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
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
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDeleteConfirm}
        title="מחיקת תיקים מרובים"
        description={`האם אתה בטוח שברצונך למחוק ${selectedCases.size} תיקים? כל המסמכים והפעילות המשויכים אליהם יימחקו גם כן. פעולה זו אינה ניתנת לביטול.`}
      />
    </AppLayout>
  );
}
