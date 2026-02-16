import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  TrendingUp,
  BookOpen,
  MessageSquare,
  BarChart3,
  ArrowRight,
  LogOut,
  Target,
  Calendar as CalendarIcon,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import type { SkillDiagnosis, UserProgress, Subscription, SkillCard } from "@shared/schema";
import { UpgradeOverlay } from "@/components/upgrade-banner";

export default function Dashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: latestDiagnosis, isLoading: diagLoading } = useQuery<SkillDiagnosis | null>({
    queryKey: ["/api/diagnosis/latest"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress/recent"],
  });

  const { data: subscription } = useQuery<Subscription | null>({
    queryKey: ["/api/subscription"],
  });

  const { data: recommendations, isLoading: recsLoading } = useQuery<{ cards: SkillCard[]; reason: string }>({
    queryKey: ["/api/recommendations"],
    enabled: !!latestDiagnosis,
  });

  const skillAxes = [
    { label: "傾聴力", key: "listening" as const, color: "bg-blue-500" },
    { label: "質問力", key: "questioning" as const, color: "bg-violet-500" },
    { label: "共感力", key: "empathy" as const, color: "bg-emerald-500" },
    { label: "クロージング力", key: "closing" as const, color: "bg-amber-500" },
  ];

  const quickActions = [
    { icon: BookOpen, label: "スキルカード", path: "/skills", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: MessageSquare, label: "AIロープレ", path: "/roleplay", color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: BarChart3, label: "スキル診断", path: "/diagnosis", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: CalendarIcon, label: "学習カレンダー", path: "/calendar", color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const userPlan = subscription?.plan || "free";
  const planLabel = userPlan === "pro" ? "Pro" : userPlan === "basic" ? "Basic" : "Free";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">DealCoach</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button size="icon" variant="ghost" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate" data-testid="text-user-greeting">
              {user?.firstName ? `${user.firstName}さん` : "こんにちは"}
            </h1>
            <Link href="/pricing">
              <p className="text-xs text-muted-foreground">
                {planLabel}プラン <ChevronRight className="w-3 h-3 inline" />
              </p>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{latestDiagnosis?.overallScore || 0}</span>
          </div>
        </div>

        <Card className="p-4" data-testid="card-skill-overview">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold text-sm">スキルスコア</h2>
            <Link href="/diagnosis">
              <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="button-view-diagnosis">
                詳細 <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          {diagLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {skillAxes.map((axis) => {
                const value = latestDiagnosis?.[axis.key] || 0;
                return (
                  <div key={axis.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{axis.label}</span>
                      <span className="text-xs font-medium">{value}/100</span>
                    </div>
                    <Progress value={value} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <Link key={action.path} href={action.path}>
              <Card className="p-3 hover-elevate flex flex-col items-center gap-2" data-testid={`card-action-${action.label}`}>
                <div className={`w-9 h-9 rounded-md ${action.bg} flex items-center justify-center`}>
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">{action.label}</span>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="p-4" data-testid="card-recommendations">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            おすすめスキルカード
          </h2>
          {userPlan === "free" ? (
            <UpgradeOverlay feature="AIレコメンド" requiredPlan="Basic">
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-md bg-muted/30">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">あなたにおすすめのスキル</p>
                      <p className="text-[10px] text-muted-foreground">AIが診断結果から提案</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            </UpgradeOverlay>
          ) : recsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recommendations && recommendations.cards.length > 0 ? (
            <div className="space-y-2">
              {recommendations.reason && (
                <p className="text-xs text-muted-foreground mb-2">{recommendations.reason}</p>
              )}
              {recommendations.cards.slice(0, 3).map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-md bg-muted/30 hover-elevate cursor-pointer"
                  onClick={() => navigate("/skills")}
                  data-testid={`rec-card-${card.id}`}
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {card.isAiGenerated ? (
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{card.titleJa}</p>
                    <p className="text-[10px] text-muted-foreground">{card.category}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-md bg-muted/50 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                {latestDiagnosis
                  ? "AIロープレを練習して、あなたに合ったスキルカードを自動生成しましょう。"
                  : "まずはAIロープレを試して、あなたの営業力を可視化しましょう。AIが最適な学習プランを提案します。"}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4" data-testid="card-recent-activity">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            最近のアクティビティ
          </h2>
          {activityLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {activity.activityType === "skill_card" && "スキルカード学習"}
                      {activity.activityType === "roleplay" && "AIロープレ練習"}
                      {activity.activityType === "diagnosis" && "スキル診断"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {activity.practiceDate ? new Date(activity.practiceDate).toLocaleDateString("ja-JP") : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              まだアクティビティがありません
            </p>
          )}
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
