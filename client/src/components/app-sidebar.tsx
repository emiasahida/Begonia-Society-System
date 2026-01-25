import { Link, useLocation } from "wouter";
import { 
  BookOpen, 
  Search, 
  Users, 
  Settings, 
  ClipboardCheck,
  Image,
  FileText,
  Home,
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { Member } from "@shared/schema";

interface AppSidebarProps {
  member?: Member | null;
}

export function AppSidebar({ member }: AppSidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const role = member?.role || "member";
  const displayName = member?.displayName || user?.firstName || "会員";

  const memberItems = [
    { title: "ホーム", url: "/", icon: Home },
    { title: "図鑑検索", url: "/encyclopedia", icon: Search },
  ];

  const adminItems = [
    { title: "種マスター管理", url: "/admin/species", icon: BookOpen },
    { title: "会員管理", url: "/admin/members", icon: Users },
    { title: "写真管理", url: "/admin/photos", icon: Image },
  ];

  const reviewerItems = [
    { title: "審査キュー", url: "/review", icon: ClipboardCheck },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground text-sm">
              日本ベゴニア協会
            </h1>
            <p className="text-xs text-muted-foreground">図鑑システム</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {memberItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "home"}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === "admin" || role === "reviewer") && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {role === "admin" ? "管理" : "理事"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {role === "admin" && adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.startsWith(item.url)}
                      data-testid={`nav-${item.url.replace("/admin/", "admin-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {role === "reviewer" && reviewerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.startsWith(item.url)}
                      data-testid={`nav-${item.url.replace("/", "")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {displayName.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {role === "admin" ? "管理者" : role === "reviewer" ? "理事" : "会員"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-logout"
          >
            <a href="/api/logout">
              <LogOut className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
