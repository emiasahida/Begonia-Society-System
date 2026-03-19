import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Link2,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Invitation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type InvitationWithStatus = Invitation & { status: "active" | "used" | "expired" };

function getStatus(inv: Invitation): "active" | "used" | "expired" {
  if (inv.usedAt) return "used";
  if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return "expired";
  return "active";
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
          data-testid="button-copy-url"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "コピーしました" : "URLをコピー"}</TooltipContent>
    </Tooltip>
  );
}

export default function AdminInvitations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/admin/invitations"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/invitations", {
        note: note.trim() || undefined,
        expiresAt: expiresAt || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
      setIsCreateOpen(false);
      setNote("");
      setExpiresAt("");
      toast({ title: "招待URLを発行しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "招待URLの発行に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
      toast({ title: "招待URLを削除しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "削除に失敗しました", variant: "destructive" });
    },
  });

  const getInviteUrl = (token: string) => {
    return `${window.location.origin}/invite/${token}`;
  };

  const statusConfig = {
    active: { label: "有効", variant: "default" as const, icon: <CheckCircle2 className="w-3 h-3" /> },
    used: { label: "使用済み", variant: "secondary" as const, icon: <Check className="w-3 h-3" /> },
    expired: { label: "期限切れ", variant: "destructive" as const, icon: <XCircle className="w-3 h-3" /> },
  };

  const list = (invitations ?? []).map(inv => ({ ...inv, status: getStatus(inv) }));
  const activeCount = list.filter(i => i.status === "active").length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">招待URL管理</h1>
          <p className="text-muted-foreground text-sm">
            新規会員向けに個別招待URLを発行できます
            {activeCount > 0 && (
              <span className="ml-2 text-primary font-medium">（有効: {activeCount}件）</span>
            )}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-invitation">
              <Plus className="w-4 h-4 mr-2" />
              招待URLを発行
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>招待URLの発行</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="note">メモ（任意）</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例：山田花子様向け、2025年春入会者"
                  data-testid="input-invitation-note"
                />
                <p className="text-xs text-muted-foreground">
                  招待する方のお名前など、管理用のメモです。URLには表示されません。
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiresAt">有効期限（任意）</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  data-testid="input-invitation-expires"
                />
                <p className="text-xs text-muted-foreground">
                  空欄の場合は無期限有効です（1回限り使用可）。
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1 sm:flex-none">
                キャンセル
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex-1 sm:flex-none"
                data-testid="button-confirm-create"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />発行中...</>
                ) : (
                  "発行する"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">招待URLがありません</p>
          <p className="text-xs mt-1">「招待URLを発行」から新しいURLを作成できます</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((inv) => {
            const url = getInviteUrl(inv.token);
            const config = statusConfig[inv.status];
            return (
              <Card
                key={inv.id}
                className={`p-4 ${inv.status !== "active" ? "opacity-60" : ""}`}
                data-testid={`invitation-row-${inv.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
                        {config.icon}
                        {config.label}
                      </Badge>
                      {inv.note && (
                        <span className="text-sm font-medium text-foreground truncate max-w-xs">
                          {inv.note}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground font-mono truncate flex-1">
                        {url}
                      </span>
                      {inv.status === "active" && <CopyButton url={url} />}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        発行: {formatDate(inv.createdAt)}
                      </span>
                      {inv.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          期限: {formatDate(inv.expiresAt)}
                        </span>
                      )}
                      {inv.usedAt && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Check className="w-3 h-3" />
                          使用: {formatDate(inv.usedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm("この招待URLを削除しますか？")) {
                        deleteMutation.mutate(inv.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-invitation-${inv.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
