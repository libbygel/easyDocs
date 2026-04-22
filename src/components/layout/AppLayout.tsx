import React, { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  Bell,
  LayoutDashboard,
  Contact,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/cases', label: 'תיקים', icon: FolderOpen },
  { href: '/clients', label: 'לקוחות', icon: Users },
  { href: '/contacts', label: 'אנשי קשר', icon: Contact },
  { href: '/templates', label: 'תבניות', icon: FileText },
  { href: '/how-it-works', label: 'מדריך', icon: HelpCircle },
  { href: '/notifications', label: 'התראות', icon: Bell },
  { href: '/settings', label: 'הגדרות', icon: Settings },
];

export const AppLayout = React.forwardRef<HTMLDivElement, AppLayoutProps>(function AppLayout({ children }, ref) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, case_id')
        .eq('advisor_id', user.id)
        .eq('is_read', false);
      if (data) {
        const uniqueCases = new Set(data.map((n: any) => n.case_id || n.id));
        setUnreadCount(uniqueCases.size);
      } else {
        setUnreadCount(0);
      }
      retryCountRef.current = 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Retry with backoff
      if (retryCountRef.current < 3) {
        const delay = Math.min(2000 * Math.pow(2, retryCountRef.current), 15000);
        retryCountRef.current++;
        retryRef.current = setTimeout(fetchUnreadCount, delay);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();

    // Listen for custom event from Notifications page
    const handleNotificationsChanged = () => {
      fetchUnreadCount();
    };
    window.addEventListener('notifications-changed', handleNotificationsChanged);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    if (user) {
      channel = supabase
        .channel('notifications-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `advisor_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setTimeout(fetchUnreadCount, 3000);
          }
        });
    }

    return () => {
      window.removeEventListener('notifications-changed', handleNotificationsChanged);
      if (channel) supabase.removeChannel(channel);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [user, fetchUnreadCount]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[Logout] error:', err);
    }
    navigate('/login');
  };

  return (
    <div ref={ref} className="min-h-screen bg-background">
      {/* Top Navigation - Dark Emerald */}
      <header className="sticky top-0 z-50 w-full border-b border-sidebar-border bg-[hsl(var(--sidebar-background))] shadow-md">
        <div className="flex h-16 items-center justify-between px-4 max-w-screen-2xl mx-auto w-full">
          {/* Logo */}
          <Link to="/cases" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/20">
              <FolderOpen className="h-5 w-5 text-sidebar-primary" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground hidden sm:block">
              EasyDocs
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              const showBadge = item.href === '/notifications' && unreadCount > 0;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", showBadge && !isActive && "text-destructive")} />
                  {item.label}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs leading-tight text-sidebar-foreground/60 hidden md:block truncate max-w-[180px]" dir="ltr" title={user?.email}>
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              title="יציאה"
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-1 h-7 px-2 shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-xs hidden md:inline">יציאה</span>
            </Button>

            {/* Mobile Menu */}
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      onClick={() => {
                        navigate(item.href);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Icon className={cn("h-4 w-4", item.href === '/notifications' && unreadCount > 0 && "text-destructive")} />
                      {item.label}
                      {item.href === '/notifications' && unreadCount > 0 && (
                        <span className="mr-auto h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  יציאה
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 px-4">
        {children}
      </main>
    </div>
  );
});
