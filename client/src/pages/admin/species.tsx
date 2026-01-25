import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Plus, Search, Leaf, Pencil, Trash2, X, FileUp, Loader2 } from "lucide-react";
import type { Species, InsertSpecies } from "@shared/schema";

interface SearchResponse {
  data: Species[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminSpecies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editingSpecies, setEditingSpecies] = useState<Species | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ["/api/species", { q: searchQuery, page, limit: 20 }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      params.set("page", page.toString());
      params.set("limit", "20");
      const res = await fetch(`/api/species?${params}`);
      if (!res.ok) throw new Error("Failed to fetch species");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSpecies) => {
      return apiRequest("POST", "/api/admin/species", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/species"] });
      setIsAddDialogOpen(false);
      toast({ title: "種を追加しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "種の追加に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSpecies> }) => {
      return apiRequest("PATCH", `/api/admin/species/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/species"] });
      setEditingSpecies(null);
      toast({ title: "種を更新しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "種の更新に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/species/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/species"] });
      toast({ title: "種を削除しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "種の削除に失敗しました", variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/species/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    },
    onSuccess: (data: { imported: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/species"] });
      setIsImportDialogOpen(false);
      toast({ title: "インポート完了", description: `${data.imported} 件の種をインポートしました` });
    },
    onError: () => {
      toast({ title: "エラー", description: "CSVインポートに失敗しました", variant: "destructive" });
    },
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            種マスター管理
          </h1>
          <p className="text-muted-foreground">
            ベゴニア種データの登録・編集・削除
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-import">
                <FileUp className="w-4 h-4 mr-2" />
                CSVインポート
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>CSVインポート</DialogTitle>
                <DialogDescription>
                  種マスターデータをCSVファイルからインポートします
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-2" />
                      <span>CSVファイルを選択</span>
                    </div>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-species">
                <Plus className="w-4 h-4 mr-2" />
                新規追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <SpeciesForm
                onSubmit={(data) => createMutation.mutate(data)}
                isPending={createMutation.isPending}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="種を検索..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="pl-10"
          data-testid="input-search-species"
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-2/3" />
            </Card>
          ))
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((species) => (
            <Card key={species.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground italic truncate">
                      {species.scientificName}
                    </span>
                    {species.classification && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        {species.classification}
                      </Badge>
                    )}
                  </div>
                  {species.authorName && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {species.authorName}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingSpecies(species)}
                    data-testid={`button-edit-${species.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("この種を削除しますか？")) {
                        deleteMutation.mutate(species.id);
                      }
                    }}
                    data-testid={`button-delete-${species.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Leaf className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>種が見つかりません</p>
          </div>
        )}
      </div>

      <Dialog open={!!editingSpecies} onOpenChange={(open) => !open && setEditingSpecies(null)}>
        <DialogContent>
          {editingSpecies && (
            <SpeciesForm
              species={editingSpecies}
              onSubmit={(data) => updateMutation.mutate({ id: editingSpecies.id, data })}
              isPending={updateMutation.isPending}
              onCancel={() => setEditingSpecies(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SpeciesFormProps {
  species?: Species;
  onSubmit: (data: InsertSpecies) => void;
  isPending: boolean;
  onCancel: () => void;
}

function SpeciesForm({ species, onSubmit, isPending, onCancel }: SpeciesFormProps) {
  const [formData, setFormData] = useState<InsertSpecies>({
    scientificName: species?.scientificName || "",
    authorName: species?.authorName || "",
    classification: species?.classification || "",
    flowerColor: species?.flowerColor || "",
    origin: species?.origin || "",
    japaneseName: species?.japaneseName || "",
    notes: species?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{species ? "種の編集" : "新規種の追加"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="scientificName">学名 *</Label>
          <Input
            id="scientificName"
            value={formData.scientificName}
            onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
            required
            data-testid="input-scientific-name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="authorName">著者名</Label>
          <Input
            id="authorName"
            value={formData.authorName || ""}
            onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
            data-testid="input-author-name"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="classification">分類</Label>
            <Input
              id="classification"
              value={formData.classification || ""}
              onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
              data-testid="input-classification"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flowerColor">花色</Label>
            <Input
              id="flowerColor"
              value={formData.flowerColor || ""}
              onChange={(e) => setFormData({ ...formData, flowerColor: e.target.value })}
              data-testid="input-flower-color"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="origin">産地・出典</Label>
          <Input
            id="origin"
            value={formData.origin || ""}
            onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
            data-testid="input-origin"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="japaneseName">和名・読み</Label>
          <Input
            id="japaneseName"
            value={formData.japaneseName || ""}
            onChange={(e) => setFormData({ ...formData, japaneseName: e.target.value })}
            data-testid="input-japanese-name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">備考</Label>
          <Textarea
            id="notes"
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            data-testid="input-notes"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-submit-species">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : species ? "更新" : "追加"}
        </Button>
      </DialogFooter>
    </form>
  );
}
