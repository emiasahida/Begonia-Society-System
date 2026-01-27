import { useState, useRef } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Camera, Loader2, Image, Trash2, Search, X, Check, ChevronsUpDown } from "lucide-react";
import type { Species, Photo, PhotoSubmission } from "@shared/schema";

export default function AdminPhotos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>("");
  const [selectedSpeciesName, setSelectedSpeciesName] = useState<string>("");
  const [credit, setCredit] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [speciesSearchOpen, setSpeciesSearchOpen] = useState(false);
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState("");

  const { data: photos, isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: ["/api/admin/photos"],
  });

  const { data: pendingSubmissions, isLoading: pendingLoading } = useQuery<PhotoSubmission[]>({
    queryKey: ["/api/admin/submissions/pending"],
  });

  const { data: speciesSearchResults, isLoading: speciesSearchLoading } = useQuery<{ data: Species[] }>({
    queryKey: ["/api/species", { q: speciesSearchQuery }],
    queryFn: async () => {
      const res = await fetch(`/api/species?q=${encodeURIComponent(speciesSearchQuery)}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch species");
      return res.json();
    },
    enabled: speciesSearchQuery.length >= 2,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/admin/photos", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions/pending"] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedSpeciesId("");
      setSelectedSpeciesName("");
      setSpeciesSearchQuery("");
      setCredit("");
      toast({ title: "写真を登録しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "写真の登録に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photos"] });
      toast({ title: "写真を削除しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "写真の削除に失敗しました", variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !credit) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("credit", credit);
    if (selectedSpeciesId) {
      formData.append("speciesId", selectedSpeciesId);
    }
    uploadMutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            写真管理
          </h1>
          <p className="text-muted-foreground">
            写真の登録・管理
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-photo">
              <Upload className="w-4 h-4 mr-2" />
              写真登録
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>写真の登録</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>写真ファイル *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="text-center">
                      <Image className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-sm">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-sm">画像を選択</span>
                    </div>
                  )}
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="species">対象種 *</Label>
                <Popover open={speciesSearchOpen} onOpenChange={setSpeciesSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={speciesSearchOpen}
                      className="justify-between font-normal"
                      data-testid="select-species"
                    >
                      {selectedSpeciesName || "種を検索して選択..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="学名または和名で検索..."
                          value={speciesSearchQuery}
                          onChange={(e) => setSpeciesSearchQuery(e.target.value)}
                          className="h-8 border-0 focus-visible:ring-0"
                          data-testid="input-species-search"
                        />
                        {selectedSpeciesId && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              setSelectedSpeciesId("");
                              setSelectedSpeciesName("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {speciesSearchQuery.length < 2 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          2文字以上入力して検索
                        </div>
                      ) : speciesSearchLoading ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          検索中...
                        </div>
                      ) : speciesSearchResults?.data?.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          該当する種が見つかりません
                        </div>
                      ) : (
                        speciesSearchResults?.data?.map((s) => (
                          <button
                            key={s.id}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                            onClick={() => {
                              setSelectedSpeciesId(s.id);
                              setSelectedSpeciesName(s.scientificName);
                              setSpeciesSearchOpen(false);
                            }}
                            data-testid={`species-option-${s.id}`}
                          >
                            {selectedSpeciesId === s.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            <div className="flex-1">
                              <div>{s.scientificName}</div>
                              {s.japaneseName && (
                                <div className="text-xs text-muted-foreground">{s.japaneseName}</div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="credit">クレジット表示 *</Label>
                <Input
                  id="credit"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  placeholder="撮影者名・会員番号"
                  data-testid="input-credit"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !credit || !selectedSpeciesId || uploadMutation.isPending}
                data-testid="button-submit-photo"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "登録"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {pendingSubmissions && pendingSubmissions.length > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Camera className="w-4 h-4" />
            <span className="font-medium">
              種未確定の提出が {pendingSubmissions.length} 件あります
            </span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            種を確定してから公開できます
          </p>
        </Card>
      )}

      <div>
        <h2 className="font-semibold text-foreground mb-4">公開写真一覧</h2>
        {photosLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
              >
                <img
                  src={`/api/files/${photo.fileKey}`}
                  alt="Begonia"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (confirm("この写真を削除しますか？")) {
                        deleteMutation.mutate(photo.id);
                      }
                    }}
                    data-testid={`button-delete-photo-${photo.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white/90 truncate">{photo.credit}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Camera className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>公開写真がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
