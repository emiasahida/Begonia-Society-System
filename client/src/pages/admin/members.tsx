import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Users, Pencil, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import type { Member, InsertMember, UserRole, MemberStatus } from "@shared/schema";

export default function AdminMembers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/admin/members", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      const res = await fetch(`/api/admin/members?${params}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertMember>) => {
      return apiRequest("POST", "/api/admin/members", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      setIsAddDialogOpen(false);
      toast({ title: "会員を登録しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "会員の登録に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMember> }) => {
      return apiRequest("PATCH", `/api/admin/members/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      setEditingMember(null);
      toast({ title: "会員情報を更新しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "会員情報の更新に失敗しました", variant: "destructive" });
    },
  });

  const roleLabels: Record<UserRole, string> = {
    member: "会員",
    admin: "管理者",
    reviewer: "理事",
  };

  const statusLabels: Record<MemberStatus, string> = {
    pending: "承認待ち",
    active: "有効",
    inactive: "無効",
    suspended: "停止",
  };

  const statusColors: Record<MemberStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const pendingMembers = members?.filter(m => m.status === "pending") || [];
  const activeMembers = members?.filter(m => m.status !== "pending") || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            会員管理
          </h1>
          <p className="text-muted-foreground">
            会員の登録・ロール変更・状態更新
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-member">
              <Plus className="w-4 h-4 mr-2" />
              会員登録
            </Button>
          </DialogTrigger>
          <DialogContent>
            <MemberForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="会員番号・表示名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-member"
        />
      </div>

      {pendingMembers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <Clock className="w-5 h-5" />
            承認待ち ({pendingMembers.length}件)
          </h2>
          {pendingMembers.map((member) => (
            <Card key={member.id} className="p-4 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {member.displayName || "名称未設定"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[member.status]}`}>
                      {statusLabels[member.status]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: member.id, data: { status: "active" } })}
                    disabled={updateMutation.isPending}
                    data-testid={`button-approve-member-${member.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    承認
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: member.id, data: { status: "suspended" } })}
                    disabled={updateMutation.isPending}
                    data-testid={`button-reject-member-${member.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    却下
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">会員一覧</h2>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-2/3" />
            </Card>
          ))
        ) : activeMembers.length > 0 ? (
          activeMembers.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {member.displayName || "名称未設定"}
                    </span>
                    {member.memberNumber && (
                      <Badge variant="outline" className="text-xs">
                        {member.memberNumber}
                      </Badge>
                    )}
                    <Badge variant="secondary">{roleLabels[member.role]}</Badge>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[member.status]}`}>
                      {statusLabels[member.status]}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingMember(member)}
                  data-testid={`button-edit-member-${member.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>会員が見つかりません</p>
          </div>
        )}
      </div>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          {editingMember && (
            <MemberForm
              member={editingMember}
              onSubmit={(data) => updateMutation.mutate({ id: editingMember.id, data })}
              isPending={updateMutation.isPending}
              onCancel={() => setEditingMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MemberFormProps {
  member?: Member;
  onSubmit: (data: Partial<InsertMember>) => void;
  isPending: boolean;
  onCancel: () => void;
}

function MemberForm({ member, onSubmit, isPending, onCancel }: MemberFormProps) {
  const [formData, setFormData] = useState({
    memberNumber: member?.memberNumber || "",
    displayName: member?.displayName || "",
    role: member?.role || "member" as UserRole,
    status: member?.status || "active" as MemberStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{member ? "会員情報の編集" : "新規会員登録"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="memberNumber">会員番号</Label>
          <Input
            id="memberNumber"
            value={formData.memberNumber}
            onChange={(e) => setFormData({ ...formData, memberNumber: e.target.value })}
            data-testid="input-member-number"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="displayName">表示名</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            data-testid="input-display-name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role">ロール</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
          >
            <SelectTrigger data-testid="select-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">会員</SelectItem>
              <SelectItem value="admin">管理者</SelectItem>
              <SelectItem value="reviewer">理事</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">状態</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as MemberStatus })}
          >
            <SelectTrigger data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">承認待ち</SelectItem>
              <SelectItem value="active">有効</SelectItem>
              <SelectItem value="inactive">無効</SelectItem>
              <SelectItem value="suspended">停止</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-submit-member">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : member ? "更新" : "登録"}
        </Button>
      </DialogFooter>
    </form>
  );
}
