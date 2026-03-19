import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Leaf,
  Camera,
  User,
  MapPin,
  Palette,
  BookOpen,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import type { Species, Photo, Member } from "@shared/schema";

interface SpeciesWithPhotos extends Species {
  photos: (Photo & { memberName?: string })[];
}

function PhotoGridItem({
  photo,
  alt,
  onClick,
}: {
  photo: Photo & { memberName?: string };
  alt: string;
  onClick: () => void;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = photo.thumbKey ? `/api/files/${photo.thumbKey}` : `/api/files/${photo.fileKey}`;

  return (
    <div
      className="aspect-square rounded-lg overflow-hidden bg-muted relative group cursor-pointer"
      onClick={onClick}
      data-testid={`photo-${photo.id}`}
    >
      {error ? (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <ImageIcon className="w-6 h-6 opacity-40" />
        </div>
      ) : (
        <>
          {!loaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        <p className="text-xs text-white/90 truncate">{photo.credit}</p>
      </div>
    </div>
  );
}

function PhotoLightbox({
  photos,
  initialIndex,
  speciesName,
  onClose,
}: {
  photos: (Photo & { memberName?: string })[];
  initialIndex: number;
  speciesName: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [imgLoaded, setImgLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) { setIndex(i => i - 1); setImgLoaded(false); }
  }, [hasPrev]);

  const goNext = useCallback(() => {
    if (hasNext) { setIndex(i => i + 1); setImgLoaded(false); }
  }, [hasNext]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <p className="text-white/80 text-sm truncate max-w-[70%] italic">{speciesName}</p>
        <div className="flex items-center gap-3">
          {photos.length > 1 && (
            <span className="text-white/60 text-xs">{index + 1} / {photos.length}</span>
          )}
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1"
            data-testid="button-close-modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          key={photo.id}
          src={`/api/files/${photo.fileKey}`}
          alt={speciesName}
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgLoaded(true)}
          data-testid="lightbox-image"
        />

        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            data-testid="button-prev-photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            data-testid="button-next-photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="px-4 py-3 shrink-0 bg-black/60">
        <p className="text-sm text-white/70 text-center">
          クレジット: {photo.credit}
        </p>
        {photos.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); setImgLoaded(false); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpeciesDetail() {
  const { id } = useParams<{ id: string }>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: member } = useQuery<Member>({
    queryKey: ["/api/me"],
  });

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
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
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
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <Leaf className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground mb-2">種が見つかりません</h3>
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/encyclopedia">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground italic truncate">
            {species.scientificName}
          </h1>
          {species.japaneseName && (
            <p className="text-muted-foreground text-sm">{species.japaneseName}</p>
          )}
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          基本情報
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Leaf className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">学名</p>
                <p className="text-sm font-medium text-foreground italic break-words">{species.scientificName}</p>
              </div>
            </div>
            {species.authorName && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">作出者名</p>
                  <p className="text-sm font-medium text-foreground break-words">{species.authorName}</p>
                </div>
              </div>
            )}
            {species.classification && (
              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">分類</p>
                  <Badge variant="secondary" className="mt-0.5">{species.classification}</Badge>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {species.flowerColor && (
              <div className="flex items-start gap-3">
                <Palette className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">花色</p>
                  <p className="text-sm font-medium text-foreground break-words">{species.flowerColor}</p>
                </div>
              </div>
            )}
            {species.origin && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">産地・出典</p>
                  <p className="text-sm font-medium text-foreground break-words">{species.origin}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        {species.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">備考</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{species.notes}</p>
          </div>
        )}
      </Card>

      {member?.role === "admin" && species.adminComment && (
        <Card className="p-4 sm:p-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            管理者コメント
          </h2>
          <p className="text-sm text-foreground whitespace-pre-wrap" data-testid="text-admin-comment">
            {species.adminComment}
          </p>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          写真ギャラリー
          {species.photos && species.photos.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {species.photos.length}枚
            </Badge>
          )}
        </h2>
        {species.photos && species.photos.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {species.photos.map((photo, i) => (
                <PhotoGridItem
                  key={photo.id}
                  photo={photo}
                  alt={species.scientificName}
                  onClick={() => setLightboxIndex(i)}
                />
              ))}
            </div>
            {species.photos.length > 1 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                写真をタップして拡大 / スワイプで切り替え
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Camera className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">この種の写真はまだ登録されていません</p>
          </div>
        )}
      </Card>

      {lightboxIndex !== null && species.photos && (
        <PhotoLightbox
          photos={species.photos}
          initialIndex={lightboxIndex}
          speciesName={species.scientificName}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
