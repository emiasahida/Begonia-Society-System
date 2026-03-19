import { useState, useRef, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Camera, Loader2, ImageIcon, Trash2, Search, X, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import type { Species, Photo, PhotoSubmission } from "@shared/schema";

type PhotoWithSpecies = Photo & { species?: { scientificName: string; japaneseName: string | null } };

function PhotoThumbnail({ photo, onClick }: { photo: PhotoWithSpecies; onClick: () => void }) {
  const [error, setError] = useState(false);
  const src = photo.thumbKey
    ? `/api/files/${photo.thumbKey}`
    : `/api/files/${photo.fileKey}`;

  return (
    <div
      className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer"
      onClick={onClick}
      data-testid={`photo-thumbnail-${photo.id}`}
    >
      {error ? (
        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
          <ImageIcon className="w-6 h-6 opacity-40" />
        </div>
      ) : (
        <img
          src={src}
          alt="Begonia"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => setError(true)}
        />
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          variant="destructive"
          size="icon"
          className="shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("この写真を削除しますか？")) {
              (window as any).__deletePhoto?.(photo.id);
            }
          }}
          data-testid={`button-delete-photo-${photo.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
        {photo.species && (
          <p className="text-xs text-white font-medium truncate leading-tight">{photo.species.scientificName}</p>
        )}
        <p className="text-xs text-white/70 truncate">{photo.credit}</p>
      </div>
    </div>
  );
}

export default function AdminPhotos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>("");
  const [selectedSpeciesName, setSelectedSpeciesName] = useState<string>("");
  const [credit, setCredit] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [speciesSearchOpen, setSpeciesSearchOpen] = useState(false);
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [viewingPhoto, setViewingPhoto] = useState<PhotoWithSpecies | null>(null);

  const { data: photos, isLoading: photosLoading } = useQuery<PhotoWithSpecies[]>({
    queryKey: ["/api/admin/photos"],
  });

  const { data: pendingSubmissions } = useQuery<PhotoSubmission[]>({
    queryKey: ["/api/admin/submissions/pending"],
  });

  const { data: classifications } = useQuery<string[]>({
    queryKey: ["/api/species/classifications"],
  });

  const { data: speciesSearchResults, isLoading: speciesSearchLoading } = useQuery<{ data: Species[] }>({
    queryKey: ["/api/species", { q: speciesSearchQuery, classification: classificationFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (speciesSearchQuery) params.set("q", speciesSearchQuery);
      if (classificationFilter) params.set("classification", classificationFilter);
      const res = await fetch(`/api/species?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch species");
      return res.json();
    },
    enabled: speciesSearchQuery.length >= 2 || !!classificationFilter,
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
      handleCloseDialog();
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

  (window as any).__deletePhoto = (id: string) => deleteMutation.mutate(id);

  const applyFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "エラー", description: "画像ファイルを選択してください", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !credit || !selectedSpeciesId) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("credit", credit);
    formData.append("speciesId", selectedSpeciesId);
    uploadMutation.mutate(formData);
  };

  const handleCloseDialog = () => {
    setIsUploadDialogOpen(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedSpeciesId("");
    setSelectedSpeciesName("");
    setSpeciesSearchQuery("");
    setCredit("");
    setClassificationFilter("");
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">写真管理</h1>
          <p className="text-muted-foreground text-sm">写真の登録・管理</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsUploadDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-photo">
              <Upload className="w-4 h-4 mr-2" />
              写真登録
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>写真の登録</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>写真ファイル *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <img
                      src={previewUrl}
                      alt="プレビュー"
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                      onClick={() => {
                        setSelectedFile(null);
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5 text-xs text-white">
                      {selectedFile?.name}
                    </div>
                  </div>
                ) : (
                  <div
                    ref={dropZoneRef}
                    className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-select-file"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        ファイルを選択
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto sm:hidden"
                        onClick={() => cameraInputRef.current?.click()}
                        data-testid="button-camera-capture"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        カメラで撮影
                      </Button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-3 hidden sm:block">
                      またはここにドラッグ＆ドロップ
                    </p>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      JPEG・PNG・HEIC対応 / 最大10MB
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="species">対象種 *</Label>
                <Popover open={speciesSearchOpen} onOpenChange={setSpeciesSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={speciesSearchOpen}
                      className="justify-between font-normal text-left"
                      data-testid="select-species"
                    >
                      <span className="truncate">{selectedSpeciesName || "種を検索して選択..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full sm:w-80 p-0" align="start">
                    <div className="p-2 border-b space-y-2">
                      <Select
                        value={classificationFilter || "all"}
                        onValueChange={(val) => setClassificationFilter(val === "all" ? "" : val)}
                      >
                        <SelectTrigger className="h-8" data-testid="select-classification">
                          <SelectValue placeholder="分類で絞り込み" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべての分類</SelectItem>
                          {classifications?.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
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
                            className="h-6 w-6 shrink-0"
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
                    <div className="max-h-56 overflow-y-auto">
                      {speciesSearchQuery.length < 2 && !classificationFilter ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          分類を選択するか、2文字以上入力して検索
                        </div>
                      ) : speciesSearchLoading ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">検索中...</div>
                      ) : speciesSearchResults?.data?.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">該当する種が見つかりません</div>
                      ) : (
                        speciesSearchResults?.data?.map((s) => (
                          <button
                            key={s.id}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center gap-2"
                            onClick={() => {
                              setSelectedSpeciesId(s.id);
                              setSelectedSpeciesName(s.scientificName);
                              setSpeciesSearchOpen(false);
                            }}
                            data-testid={`species-option-${s.id}`}
                          >
                            {selectedSpeciesId === s.id ? (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <span className="w-4 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="truncate italic">{s.scientificName}</div>
                              {s.japaneseName && (
                                <div className="text-xs text-muted-foreground truncate">{s.japaneseName}</div>
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

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1 sm:flex-none">
                キャンセル
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !credit || !selectedSpeciesId || uploadMutation.isPending}
                className="flex-1 sm:flex-none"
                data-testid="button-submit-photo"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    処理中...
                  </>
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
            <AlertCircle className="w-4 h-4" />
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
        <h2 className="font-semibold text-foreground mb-4">
          公開写真一覧
          {photos && photos.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">（{photos.length}枚）</span>
          )}
        </h2>
        {photosLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <PhotoThumbnail
                key={photo.id}
                photo={photo}
                onClick={() => setViewingPhoto(photo)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Camera className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>公開写真がありません</p>
          </div>
        )}
      </div>

      <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          {viewingPhoto && (
            <>
              <div className="relative bg-black flex items-center justify-center min-h-[50vw] max-h-[80vh]">
                <img
                  src={`/api/files/${viewingPhoto.fileKey}`}
                  alt="Begonia"
                  className="max-w-full max-h-[80vh] object-contain"
                />
                <button
                  className="absolute top-3 right-3 bg-black/60 rounded-full p-1.5 text-white hover:bg-black/80"
                  onClick={() => setViewingPhoto(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 bg-background space-y-1">
                {viewingPhoto.species && (
                  <p className="text-sm font-medium italic">
                    {viewingPhoto.species.scientificName}
                    {viewingPhoto.species.japaneseName && (
                      <span className="text-muted-foreground not-italic ml-2">({viewingPhoto.species.japaneseName})</span>
                    )}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">クレジット: {viewingPhoto.credit}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
