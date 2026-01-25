import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, Camera, ArrowRight, Leaf, TrendingUp } from "lucide-react";
import type { Species } from "@shared/schema";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalSpecies: number;
    totalPhotos: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: recentSpecies, isLoading: recentLoading } = useQuery<Species[]>({
    queryKey: ["/api/species/recent"],
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-serif font-bold text-foreground">
          図鑑ホーム
        </h1>
        <p className="text-muted-foreground">
          ベゴニア図鑑システムへようこそ
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">収録種数</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold text-primary">
                  {stats?.totalSpecies?.toLocaleString() || "0"}
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-accent/20 to-transparent border-accent/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">公開写真数</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  {stats?.totalPhotos?.toLocaleString() || "0"}
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Camera className="w-5 h-5 text-accent-foreground" />
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm text-muted-foreground mb-1">クイック検索</p>
              <p className="text-sm text-foreground">
                学名・著者名で検索
              </p>
            </div>
            <Button asChild size="icon" data-testid="button-quick-search">
              <Link href="/encyclopedia">
                <Search className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              最近追加された種
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/encyclopedia" className="gap-1">
                すべて見る
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : recentSpecies && recentSpecies.length > 0 ? (
              recentSpecies.slice(0, 5).map((species) => (
                <Link
                  key={species.id}
                  href={`/species/${species.id}`}
                  className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                  data-testid={`link-species-${species.id}`}
                >
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate italic">
                      {species.scientificName}
                    </p>
                    {species.authorName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {species.authorName}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Leaf className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">まだ種が登録されていません</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            図鑑の使い方
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">種を検索</p>
                <p className="text-xs text-muted-foreground">
                  学名、著者名、備考で部分一致検索ができます
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">詳細を閲覧</p>
                <p className="text-xs text-muted-foreground">
                  種の詳細情報と会員撮影の写真を確認できます
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">写真を楽しむ</p>
                <p className="text-xs text-muted-foreground">
                  美しいベゴニアの写真ギャラリーをお楽しみください
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button asChild className="w-full" data-testid="button-start-search">
              <Link href="/encyclopedia" className="gap-2">
                <Search className="w-4 h-4" />
                図鑑を検索する
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
