import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  BookOpen, 
  Search, 
  Users, 
  ClipboardCheck,
  Image,
  Home,
  LogOut,
  Pencil,
  Link2,
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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Member } from "@shared/schema";

const displayNameSchema = z.object({
  displayName: z.string().min(1, "表示名は必須です").max(100, "表示名は100文字以内で入力してください"),
});

interface AppSidebarProps {
  member?: Member | null;
}

export function AppSidebar({ member }: AppSidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  
  const role = member?.role || "member";
  const displayName = member?.displayName || user?.firstName || "会員";
  
  const form = useForm<z.infer<typeof displayNameSchema>>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: {
      displayName: displayName,
    },
  });
  
  const updateDisplayName = useMutation({
    mutationFn: async (data: z.infer<typeof displayNameSchema>) => {
      const res = await apiRequest("PATCH", "/api/me", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "表示名を更新しました" });
      setEditOpen(false);
    },
    onError: () => {
      toast({ title: "更新に失敗しました", variant: "destructive" });
    },
  });
  
  const handleEditOpen = () => {
    form.reset({ displayName });
    setEditOpen(true);
  };
  
  const onSubmit = (data: z.infer<typeof displayNameSchema>) => {
    updateDisplayName.mutate(data);
  };

  const memberItems = [
    { title: "ホーム", url: "/", icon: Home },
    { title: "図鑑検索", url: "/encyclopedia", icon: Search },
  ];

  const adminItems = [
    { title: "種マスター管理", url: "/admin/species", icon: BookOpen },
    { title: "会員管理", url: "/admin/members", icon: Users },
    { title: "写真管理", url: "/admin/photos", icon: Image },
    { title: "招待URL管理", url: "/admin/invitations", icon: Link2 },
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
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {displayName}
              </p>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-1"
                    onClick={handleEditOpen}
                    data-testid="button-edit-display-name"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>表示名を変更</DialogTitle>
                    <DialogDescription>
                      他の会員に表示される名前を変更できます
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>表示名</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="表示名を入力"
                                data-testid="input-display-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditOpen(false)}
                          data-testid="button-cancel-edit"
                        >
                          キャンセル
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateDisplayName.isPending}
                          data-testid="button-save-display-name"
                        >
                          {updateDisplayName.isPending ? "保存中..." : "保存"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
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
