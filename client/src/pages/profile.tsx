import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentDisplayName = user?.displayName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "";
  const [displayName, setDisplayName] = useState(currentDisplayName);

  useEffect(() => {
    setDisplayName(user?.displayName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "");
  }, [user?.displayName, user?.firstName, user?.lastName]);

  const updateProfile = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", { displayName: name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "プロフィールを更新しました" });
    },
    onError: (error: any) => {
      toast({ title: "エラー", description: error.message || "更新に失敗しました", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!displayName.trim()) return;
    updateProfile.mutate(displayName.trim());
  };

  const hasChanges = displayName.trim() !== currentDisplayName;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <Link href="/" data-testid="link-back-home">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold text-base">プロフィール設定</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Avatar className="w-20 h-20">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
              {(user?.displayName || user?.firstName)?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="displayName">
                表示名
              </label>
              <Input
                id="displayName"
                data-testid="input-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名を入力"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                アプリ内で表示される名前です（50文字以内）
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!hasChanges || updateProfile.isPending}
              data-testid="button-save-profile"
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              保存する
            </Button>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
