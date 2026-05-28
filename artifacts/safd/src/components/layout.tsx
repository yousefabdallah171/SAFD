import React from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/hooks/use-auth";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  MessageSquare,
  Activity,
  BarChart2,
  Settings,
  LogOut,
  ImagePlay,
  Share2
} from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout: clearToken } = useAuthStore();
  const logoutMutation = useLogout();
  
  const { data: user } = useGetMe();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (e) {
      // ignore
    } finally {
      clearToken();
      setLocation("/");
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/posts", label: "Posts & Reels", icon: ImagePlay },
    { href: "/rules", label: "Automation Rules", icon: Share2 },
    { href: "/comments", label: "Comments", icon: MessageSquare },
    { href: "/activity", label: "Activity Log", icon: Activity },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Share2 className="w-6 h-6" />
            <span>SAFD</span>
          </div>
        </div>
        <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-border mt-auto">
          <div className="mb-4 px-2">
            <div className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/settings" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/settings' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="h-14 border-b border-border flex items-center px-4 md:hidden bg-card shrink-0">
          <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <Share2 className="w-5 h-5" />
            <span>SAFD</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
