import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Encyclopedia from "@/pages/encyclopedia";
import SpeciesDetail from "@/pages/species-detail";
import AdminSpecies from "@/pages/admin/species";
import AdminMembers from "@/pages/admin/members";
import AdminPhotos from "@/pages/admin/photos";
import AdminInvitations from "@/pages/admin/invitations";
import Review from "@/pages/review";
import Pending from "@/pages/pending";
import InvitePage from "@/pages/invite";
import NotFound from "@/pages/not-found";
import type { Member } from "@shared/schema";

function AuthenticatedApp() {
  const { user, isLoading: authLoading } = useAuth();
  const [location] = useLocation();

  const { data: member, isLoading: memberLoading } = useQuery<Member>({
    queryKey: ["/api/me"],
    enabled: !!user,
  });

  // Invite pages are accessible without full auth
  if (location.startsWith("/invite/")) {
    return <Switch><Route path="/invite/:token" component={InvitePage} /></Switch>;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Skeleton className="w-12 h-12 rounded-full mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  // Wait for member data to load
  if (memberLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Skeleton className="w-12 h-12 rounded-full mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
        </div>
      </div>
    );
  }

  // Show pending page for unapproved members
  if (member?.status === "pending") {
    return <Pending />;
  }

  // Block inactive/suspended members
  if (member && member.status !== "active") {
    return <Pending />;
  }

  const role = member?.role || "member";
  const isAdmin = role === "admin";
  const isReviewer = role === "reviewer";

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar member={member} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/encyclopedia" component={Encyclopedia} />
              <Route path="/species/:id" component={SpeciesDetail} />
              
              {isAdmin && (
                <>
                  <Route path="/admin/species" component={AdminSpecies} />
                  <Route path="/admin/members" component={AdminMembers} />
                  <Route path="/admin/photos" component={AdminPhotos} />
                  <Route path="/admin/invitations" component={AdminInvitations} />
                </>
              )}
              
              {isReviewer && (
                <Route path="/review" component={Review} />
              )}
              
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="begonia-theme">
        <TooltipProvider>
          <AuthenticatedApp />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
