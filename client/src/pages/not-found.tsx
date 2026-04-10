import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Leaf className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">404</h1>
        <p className="text-muted-foreground">お探しのページが見つかりませんでした</p>
        <Button asChild variant="outline">
          <Link href="/">ホームに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
