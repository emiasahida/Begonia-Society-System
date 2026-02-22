import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Leaf,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
} from "lucide-react";
import type { Species } from "@shared/schema";

interface SpeciesWithThumbnail extends Species {
  thumbnailKey?: string;
}

interface SearchResponse {
  data: SpeciesWithThumbnail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Encyclopedia() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: classifications } = useQuery<string[]>({
    queryKey: ["/api/species/classifications"],
  });

  const { data, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: [
      "/api/species",
      { q: debouncedQuery, classification: classificationFilter, page, limit },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (classificationFilter)
        params.set("classification", classificationFilter);
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      const res = await fetch(`/api/species?${params}`);
      if (!res.ok) throw new Error("Failed to fetch species");
      return res.json();
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-serif font-bold text-foreground">
          図鑑検索
        </h1>
        <p className="text-muted-foreground">
          学名、作出者名、備考で部分一致検索ができます
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="検索キーワードを入力..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            data-testid="input-search"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
              data-testid="button-clear-search"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Select
          value={classificationFilter || "all"}
          onValueChange={(val) => {
            setClassificationFilter(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="w-full sm:w-48"
            data-testid="select-classification-filter"
          >
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="分類で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての分類</SelectItem>
            {classifications?.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {debouncedQuery && data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            「{debouncedQuery}」の検索結果: {data.total.toLocaleString()} 件
          </span>
          {isFetching && <span className="text-primary">更新中...</span>}
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </Card>
          ))
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((species) => (
            <Card key={species.id} className="p-4 hover-elevate">
              <Link
                href={`/species/${species.id}`}
                className="flex items-start gap-4"
                data-testid={`link-species-${species.id}`}
              >
                {species.thumbnailKey ? (
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={`/api/files/${species.thumbnailKey}`}
                      alt={species.scientificName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground italic truncate">
                        {species.scientificName}
                      </h3>
                      {species.authorName && (
                        <p className="text-sm text-muted-foreground truncate">
                          {species.authorName}
                        </p>
                      )}
                    </div>
                    {species.classification && (
                      <Badge
                        variant="secondary"
                        className="flex-shrink-0 text-xs"
                      >
                        {species.classification}
                      </Badge>
                    )}
                  </div>
                  {species.japaneseName && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {species.japaneseName}
                    </p>
                  )}
                  {species.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {species.notes}
                    </p>
                  )}
                </div>
              </Link>
            </Card>
          ))
        ) : (
          <div className="text-center py-16">
            <Leaf className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {debouncedQuery
                ? "検索結果がありません"
                : "種が登録されていません"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {debouncedQuery
                ? "別のキーワードで検索してみてください"
                : "管理者が種データをインポートするまでお待ちください"}
            </p>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4" />
            前へ
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            data-testid="button-next-page"
          >
            次へ
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
