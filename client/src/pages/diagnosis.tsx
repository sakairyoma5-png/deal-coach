import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Ear,
  HelpCircle,
  Heart,
  HandshakeIcon,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { SkillDiagnosis } from "@shared/schema";

export default function DiagnosisPage() {
  const { data: latestDiagnosis, isLoading } = useQuery<SkillDiagnosis | null>({
    queryKey: ["/api/diagnosis/latest"],
  });

  const { data: history, isLoading: historyLoading } = useQuery<SkillDiagnosis[]>({
    queryKey: ["/api/diagnosis/history"],
  });

  const skillAxes = [
    { label: "傾聴力", key: "listening" as const, icon: Ear, color: "text-blue-500", bg: "bg-blue-500/10", barColor: "bg-blue-500" },
    { label: "質問力", key: "questioning" as const, icon: HelpCircle, color: "text-violet-500", bg: "bg-violet-500/10", barColor: "bg-violet-500" },
    { label: "共感力", key: "empathy" as const, icon: Heart, color: "text-emerald-500", bg: "bg-emerald-500/10", barColor: "bg-emerald-500" },
    { label: "クロージング力", key: "closing" as const, icon: HandshakeIcon, color: "text-amber-500", bg: "bg-amber-500/10", barColor: "bg-amber-500" },
  ];

  const getScoreLevel = (score: number) => {
    if (score >= 80) return { label: "優秀", color: "text-emerald-500" };
    if (score >= 60) return { label: "良好", color: "text-blue-500" };
    if (score >= 40) return { label: "普通", color: "text-amber-500" };
    return { label: "要改善", color: "text-red-500" };
  };

  const getTrend = (key: string) => {
    if (!history || history.length < 2) return null;
    const current = latestDiagnosis?.[key as keyof SkillDiagnosis] as number;
    const prev = history[1]?.[key as keyof SkillDiagnosis] as number;
    if (current === undefined || prev === undefined) return null;
    if (current > prev) return "up";
    if (current < prev) return "down";
    return "same";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            <h1 className="font-bold text-base">スキル診断</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : latestDiagnosis ? (
          <>
            <Card className="p-5 text-center" data-testid="card-overall-score">
              <p className="text-xs text-muted-foreground mb-1">総合スコア</p>
              <div className="text-5xl font-bold text-primary mb-1" data-testid="text-overall-score">
                {latestDiagnosis.overallScore}
              </div>
              <p className={`text-sm font-medium ${getScoreLevel(latestDiagnosis.overallScore).color}`}>
                {getScoreLevel(latestDiagnosis.overallScore).label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2">
                最終診断: {latestDiagnosis.createdAt ? new Date(latestDiagnosis.createdAt).toLocaleDateString("ja-JP") : ""}
              </p>
            </Card>

            <Card className="p-4" data-testid="card-skill-axes">
              <h2 className="font-semibold text-sm mb-4">4軸スキル評価</h2>
              <div className="space-y-4">
                {skillAxes.map((axis) => {
                  const value = latestDiagnosis[axis.key] || 0;
                  const level = getScoreLevel(value);
                  const trend = getTrend(axis.key);
                  return (
                    <div key={axis.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-md ${axis.bg} flex items-center justify-center`}>
                            <axis.icon className={`w-3.5 h-3.5 ${axis.color}`} />
                          </div>
                          <span className="text-sm font-medium">{axis.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {trend && (
                            <span className="flex items-center">
                              {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                              {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                              {trend === "same" && <Minus className="w-3 h-3 text-muted-foreground" />}
                            </span>
                          )}
                          <span className={`text-sm font-semibold ${level.color}`}>{value}</span>
                        </div>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </Card>

            {latestDiagnosis.feedbackJa && (
              <Card className="p-4" data-testid="card-feedback">
                <h2 className="font-semibold text-sm mb-3">AIフィードバック</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{latestDiagnosis.feedbackJa}</p>
              </Card>
            )}

            {latestDiagnosis.strengths && latestDiagnosis.strengths.length > 0 && (
              <Card className="p-4" data-testid="card-strengths">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  強み
                </h2>
                <ul className="space-y-1.5">
                  {latestDiagnosis.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {latestDiagnosis.weaknesses && latestDiagnosis.weaknesses.length > 0 && (
              <Card className="p-4" data-testid="card-weaknesses">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                  改善ポイント
                </h2>
                <ul className="space-y-1.5">
                  {latestDiagnosis.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">-</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-semibold text-base mb-2">まだ診断結果がありません</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              AIロープレを完了すると、自動的にスキル診断が行われます
            </p>
            <a href="/roleplay">
              <Button data-testid="button-start-roleplay">
                ロープレを始める
              </Button>
            </a>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
