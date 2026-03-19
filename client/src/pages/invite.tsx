import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Leaf,
  LogIn,
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import type { Member } from "@shared/schema";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");

  const { data: inviteInfo, isLoading: inviteLoading, error: inviteError } = useQuery<{ valid: boolean; note: string | null }>({
    queryKey: ["/api/invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/invite/${token}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "招待URLが無効です");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/me"],
    enabled: !!user,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/invite/${token}/accept`, { displayName });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "登録に失敗しました");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "入会が完了しました", description: "ようこそ、日本ベゴニア協会へ！" });
      setTimeout(() => setLocation("/"), 1500);
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const loading = authLoading || inviteLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-sm">日本ベゴニア協会</h1>
            <p className="text-xs text-muted-foreground">図鑑システム</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-foreground">
              入会ご招待
            </h2>
            <p className="text-muted-foreground text-sm">
              日本ベゴニア協会の図鑑システムに招待されました
            </p>
          </div>

          {loading ? (
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </Card>
          ) : inviteError ? (
            <Card className="p-6 text-center space-y-3">
              <XCircle className="w-10 h-10 text-destructive mx-auto" />
              <p className="font-medium text-foreground">招待URLが無効です</p>
              <p className="text-sm text-muted-foreground">
                {(inviteError as Error).message}
              </p>
            </Card>
          ) : currentMember?.status === "active" ? (
            <Card className="p-6 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <div>
                <p className="font-medium text-foreground">既に会員です</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentMember.displayName} 様、ご登録済みです
                </p>
              </div>
              <Button asChild className="w-full">
                <a href="/">図鑑を開く</a>
              </Button>
            </Card>
          ) : !user ? (
            <Card className="p-6 space-y-5">
              {inviteInfo?.note && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-sm text-muted-foreground">招待メモ</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{inviteInfo.note}</p>
                </div>
              )}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">1.</span>
                  下のボタンからReplitアカウントでログインしてください
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">2.</span>
                  ログイン後、表示名を入力して入会手続きを完了します
                </p>
              </div>
              <Button
                className="w-full"
                asChild
                data-testid="button-login-to-join"
              >
                <a href={`/api/login?redirectTo=/invite/${token}`}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Replitアカウントでログイン
                </a>
              </Button>
            </Card>
          ) : (
            <Card className="p-6 space-y-5">
              {inviteInfo?.note && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-sm text-muted-foreground">招待メモ</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{inviteInfo.note}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Replitアカウントでのログインを確認しました</span>
              </div>
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">
                    表示名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="例：山田花子"
                    maxLength={100}
                    data-testid="input-display-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    図鑑システム内で表示される名前です。後から変更できます。
                  </p>
                </div>
                {acceptMutation.isError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{(acceptMutation.error as Error)?.message}</span>
                  </div>
                )}
                {acceptMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>登録が完了しました。ページを移動します...</span>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => acceptMutation.mutate()}
                  disabled={!displayName.trim() || acceptMutation.isPending || acceptMutation.isSuccess}
                  data-testid="button-accept-invitation"
                >
                  {acceptMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />登録中...</>
                  ) : acceptMutation.isSuccess ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" />登録完了</>
                  ) : (
                    "入会する"
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
