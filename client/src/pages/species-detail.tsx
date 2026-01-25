import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Leaf, Camera, User, Calendar, MapPin, Palette, BookOpen } from "lucide-react";
import type { Species, Photo } from "@shared/schema";

interface SpeciesWithPhotos extends Species {
  photos: (Photo & { memberName?: string })[];
}

export default function SpeciesDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: species, isLoading } = useQuery<SpeciesWithPhotos>({
    queryKey: ["/api/species", id],
    queryFn: async () => {
      const res = await fetch(`/api/species/${id}`);
      if (!res.ok) throw new Error("Failed to fetch species");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </Card>
      </div>
    );
  }

  if (!species) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <Leaf className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            種が見つかりません
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            指定された種は存在しないか、削除された可能性があります
          </p>
          <Button asChild variant="outline">
            <Link href="/encyclopedia">
              <ArrowLeft className="w-4 h-4 mr-2" />
              図鑑に戻る
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/encyclopedia">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-serif font-bold text-foreground italic truncate">
            {species.scientificName}
          </h1>
          {species.japaneseName && (
            <p className="text-muted-foreground">{species.japaneseName}</p>
          )}
        </div>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          基本情報
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Leaf className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">学名</p>
                <p className="text-sm font-medium text-foreground italic">
                  {species.scientificName}
                </p>
              </div>
            </div>
            {species.authorName && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">著者名</p>
                  <p className="text-sm font-medium text-foreground">
                    {species.authorName}
                  </p>
                </div>
              </div>
            )}
            {species.classification && (
              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">分類</p>
                  <Badge variant="secondary">{species.classification}</Badge>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {species.flowerColor && (
              <div className="flex items-start gap-3">
                <Palette className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">花色</p>
                  <p className="text-sm font-medium text-foreground">
                    {species.flowerColor}
                  </p>
                </div>
              </div>
            )}
            {species.origin && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">産地・出典</p>
                  <p className="text-sm font-medium text-foreground">
                    {species.origin}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        {species.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">備考</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {species.notes}
            </p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          写真ギャラリー
          {species.photos && species.photos.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {species.photos.length} 枚
            </Badge>
          )}
        </h2>
        {species.photos && species.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {species.photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-lg overflow-hidden bg-muted relative group"
              >
                <img
                  src={`/api/files/${photo.fileKey}`}
                  alt={species.scientificName}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white/90 truncate">
                    {photo.credit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Camera className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">この種の写真はまだ登録されていません</p>
          </div>
        )}
      </Card>
    </div>
  );
}
