import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  Check, 
  X, 
  Send, 
  Link, 
  CheckCircle,
  History,
  Loader2,
  Download,
  FileSpreadsheet,
  FileText,
  CalendarIcon,
  Filter,
  XCircle
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { exportActivityLogToPDF, exportActivityLogToExcel } from '@/lib/activityExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ActivityLog {
  id: string;
  case_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

interface CaseActivityTimelineProps {
  caseId: string;
  caseTitle?: string;
}

const ACTION_TYPES = [
  'העלאת מסמך',
  'אישור מסמך',
  'דחיית מסמך',
  'שליחת תזכורת',
  'שליחת לינק',
  'השלמת תיק',
] as const;

const actionIcons: Record<string, typeof Upload> = {
  'העלאת מסמך': Upload,
  'אישור מסמך': Check,
  'דחיית מסמך': X,
  'שליחת תזכורת': Send,
  'שליחת לינק': Link,
  'השלמת תיק': CheckCircle,
};

const actionColors: Record<string, string> = {
  'העלאת מסמך': 'bg-info text-info-foreground',
  'אישור מסמך': 'bg-success text-success-foreground',
  'דחיית מסמך': 'bg-destructive text-destructive-foreground',
  'שליחת תזכורת': 'bg-warning text-warning-foreground',
  'שליחת לינק': 'bg-primary text-primary-foreground',
  'השלמת תיק': 'bg-success text-success-foreground',
};

export function CaseActivityTimeline({ caseId, caseTitle = 'תיק' }: CaseActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('case_activity_log')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setActivities(data);
      }
      setLoading(false);
    };

    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('case-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'case_activity_log',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivityLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  // Filter activities based on selected filters
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Filter by action type
      if (actionTypeFilter !== 'all' && activity.action_type !== actionTypeFilter) {
        return false;
      }
      
      // Filter by from date
      if (fromDate) {
        const activityDate = new Date(activity.created_at);
        if (isBefore(activityDate, startOfDay(fromDate))) {
          return false;
        }
      }
      
      // Filter by to date
      if (toDate) {
        const activityDate = new Date(activity.created_at);
        if (isAfter(activityDate, endOfDay(toDate))) {
          return false;
        }
      }
      
      return true;
    });
  }, [activities, actionTypeFilter, fromDate, toDate]);

  const hasActiveFilters = actionTypeFilter !== 'all' || fromDate || toDate;

  const clearFilters = () => {
    setActionTypeFilter('all');
    setFromDate(undefined);
    setToDate(undefined);
  };

  const handleExportPDF = () => {
    if (filteredActivities.length === 0) {
      toast({ title: 'אין פעילות לייצוא', variant: 'destructive' });
      return;
    }
    exportActivityLogToPDF(filteredActivities, caseTitle);
    toast({ title: 'יומן הפעילות יורד כ-PDF' });
  };

  const handleExportExcel = () => {
    if (filteredActivities.length === 0) {
      toast({ title: 'אין פעילות לייצוא', variant: 'destructive' });
      return;
    }
    exportActivityLogToExcel(filteredActivities, caseTitle);
    toast({ title: 'יומן הפעילות יורד כ-Excel' });
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          יומן פעילות
          {activities.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredActivities.length} מתוך {activities.length})
            </span>
          )}
        </CardTitle>
        {activities.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                ייצוא
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                ייצוא ל-PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                ייצוא ל-Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      {/* Filters */}
      {activities.length > 0 && (
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">סינון</span>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-7 px-2 text-xs gap-1"
              >
                <XCircle className="h-3 w-3" />
                נקה סינון
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Action Type Filter */}
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סוג פעולה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הפעולות</SelectItem>
                {ACTION_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* From Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-start font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {fromDate ? format(fromDate, 'dd/MM/yyyy') : 'מתאריך'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* To Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-start font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {toDate ? format(toDate, 'dd/MM/yyyy') : 'עד תאריך'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <CardContent>
        {filteredActivities.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {hasActiveFilters ? 'אין תוצאות לסינון הנוכחי' : 'אין פעילות עדיין'}
          </p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute top-0 bottom-0 right-4 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const Icon = actionIcons[activity.action_type] || History;
                const colorClass = actionColors[activity.action_type] || 'bg-muted text-muted-foreground';
                
                return (
                  <div key={activity.id} className="flex gap-4 relative">
                    {/* Icon circle */}
                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{activity.action_type}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {activity.description}
                          </p>
                        </div>
                        <time className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                        </time>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
