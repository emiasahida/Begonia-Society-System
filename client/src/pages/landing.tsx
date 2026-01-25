import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { BookOpen, Search, Shield, Camera, Users, Leaf, ArrowRight } from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Search,
      title: "包括的な検索",
      description: "約2万件のベゴニア種を学名、著者名、備考で検索できます",
    },
    {
      icon: Camera,
      title: "写真ギャラリー",
      description: "会員撮影の美しいベゴニア写真を種ごとに閲覧できます",
    },
    {
      icon: Shield,
      title: "会員限定アクセス",
      description: "協会会員のみがアクセスできる専用の図鑑システムです",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground hidden sm:block">
              日本ベゴニア協会
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">ログイン</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="container mx-auto px-4 py-24 lg:py-32 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
                <Leaf className="w-4 h-4" />
                <span>会員専用図鑑システム</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
                日本ベゴニア協会
                <br />
                <span className="text-primary">図鑑システム</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                約2万種のベゴニアデータを収録した会員専用の図鑑システムです。
                学名や著者名で検索し、会員撮影の写真とともに種の詳細をご覧いただけます。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="gap-2" data-testid="button-login-hero">
                  <a href="/api/login">
                    ログインして図鑑を見る
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                会員登録は協会窓口にて受付しております
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-4">
                図鑑の特徴
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                ベゴニア愛好家のために作られた専門的な図鑑システムです
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="p-6 hover-elevate bg-card border-card-border"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto">
              <BookOpen className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-4">
                約2万種のベゴニアを収録
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                世界中のベゴニア品種データを網羅した、日本最大級の
                ベゴニア図鑑データベースです。学名、著者名、分類、
                花色、産地などの詳細情報をご覧いただけます。
              </p>
              <div className="flex items-center justify-center gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">20,000+</div>
                  <div className="text-sm text-muted-foreground">収録種数</div>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <div className="text-3xl font-bold text-primary">1883年~</div>
                  <div className="text-sm text-muted-foreground">記録年</div>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <div className="text-3xl font-bold text-primary">世界各地</div>
                  <div className="text-sm text-muted-foreground">産地</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Leaf className="w-4 h-4" />
              <span>Japan Begonia Society</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} 日本ベゴニア協会. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
