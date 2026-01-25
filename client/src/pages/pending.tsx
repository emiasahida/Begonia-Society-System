import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">承認待ち</CardTitle>
          <CardDescription>
            会員登録の申請を受け付けました
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            管理者による承認をお待ちください。承認されると図鑑をご利用いただけます。
          </p>
          <p className="text-center text-sm text-muted-foreground">
            承認には数日かかる場合があります。ご不明な点がございましたら、協会事務局までお問い合わせください。
          </p>
          <div className="pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
