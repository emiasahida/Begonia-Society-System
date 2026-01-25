import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { 
  ClipboardCheck, 
  Check, 
  X, 
  Calendar, 
  User, 
  Leaf,
  AlertTriangle,
  Loader2,
  ImageOff
} from "lucide-react";
import type { PhotoSubmission, Species, RejectionCode, rejectionReasons } from "@shared/schema";

interface SubmissionWithDetails extends PhotoSubmission {
  speciesName?: string;
  memberName?: string;
}

const rejectionReasonLabels: Record<RejectionCode, string> = {
  R01: "R01: 権利確認不可",
  R02: "R02: 被写体不適切",
  R03: "R03: 画質不足",
  R04: "R04: 同定情報不足",
  R05: "R05: 規約抵触",
};

export default function Review() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithDetails | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<RejectionCode | "">("");

  const { data: queue, isLoading } = useQuery<SubmissionWithDetails[]>({
    queryKey: ["/api/review/queue"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/review/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/review/queue"] });
      setSelectedSubmission(null);
      toast({ title: "承認しました", description: "写真が公開されました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "承認に失敗しました", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, code }: { id: string; code: RejectionCode }) => {
      return apiRequest("POST", `/api/review/${id}/reject`, { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/review/queue"] });
      setSelectedSubmission(null);
      setRejectDialogOpen(false);
      setSelectedReason("");
      toast({ title: "却下しました", description: "写真データは削除されました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "却下に失敗しました", variant: "destructive" });
    },
  });

  const handleReject = () => {
    if (!selectedSubmission || !selectedReason) return;
    rejectMutation.mutate({ id: selectedSubmission.id, code: selectedReason as RejectionCode });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">
          審査キュー
        </h1>
        <p className="text-muted-foreground">
          提出写真の審査（先着順）
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : queue && queue.length > 0 ? (
        <div className="space-y-4">
          {queue.map((submission, index) => (
            <Card
              key={submission.id}
              className="p-4 hover-elevate cursor-pointer"
              onClick={() => setSelectedSubmission(submission)}
              data-testid={`submission-${submission.id}`}
            >
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {submission.fileKey ? (
                    <img
                      src={`/api/files/${submission.thumbKey || submission.fileKey}`}
                      alt="Submission"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {submission.credit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(submission.createdAt)}</span>
                      </div>
                    </div>
                    {!submission.speciesId && (
                      <Badge variant="secondary" className="flex-shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        種未確定
                      </Badge>
                    )}
                  </div>
                  {submission.speciesName && (
                    <div className="flex items-center gap-1 mt-2 text-sm">
                      <Leaf className="w-3 h-3 text-primary" />
                      <span className="italic text-foreground">{submission.speciesName}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-primary/50" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            審査待ちの提出はありません
          </h3>
          <p className="text-sm text-muted-foreground">
            新しい提出があると、ここに表示されます
          </p>
        </div>
      )}

      <Dialog
        open={!!selectedSubmission && !rejectDialogOpen}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>提出の審査</DialogTitle>
                <DialogDescription>
                  受付番号: {selectedSubmission.id.slice(0, 8)}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                  {selectedSubmission.fileKey ? (
                    <img
                      src={`/api/files/${selectedSubmission.fileKey}`}
                      alt="Review submission"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">クレジット:</span>
                    <span className="font-medium">{selectedSubmission.credit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">提出日時:</span>
                    <span>{formatDate(selectedSubmission.createdAt)}</span>
                  </div>
                  {selectedSubmission.speciesName ? (
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">対象種:</span>
                      <span className="italic">{selectedSubmission.speciesName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>種が未確定です（承認には種の指定が必要）</span>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSubmission(null)}
                >
                  閉じる
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={rejectMutation.isPending}
                >
                  <X className="w-4 h-4 mr-2" />
                  却下
                </Button>
                <Button
                  onClick={() => selectedSubmission && approveMutation.mutate(selectedSubmission.id)}
                  disabled={!selectedSubmission.speciesId || approveMutation.isPending}
                  data-testid="button-approve"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  承認
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>却下理由の選択</DialogTitle>
            <DialogDescription>
              却下理由を選択してください。却下後、写真データは即時削除されます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">却下理由 *</Label>
            <Select
              value={selectedReason}
              onValueChange={(v) => setSelectedReason(v as RejectionCode)}
            >
              <SelectTrigger data-testid="select-rejection-reason">
                <SelectValue placeholder="理由を選択..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(rejectionReasonLabels) as RejectionCode[]).map((code) => (
                  <SelectItem key={code} value={code}>
                    {rejectionReasonLabels[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!selectedReason || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "却下する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
