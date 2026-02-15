import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  BookOpen,
  Zap,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Lock,
  Star,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { SkillCard, UserSkillProgress } from "@shared/schema";

function SkillCardDetail({
  card,
  onBack,
  isCompleted,
}: {
  card: SkillCard;
  onBack: () => void;
  isCompleted: boolean;
}) {
  const { toast } = useToast();
  const [completed, setCompleted] = useState(isCompleted);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/skill-cards/${card.id}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      setCompleted(true);
      toast({ title: "履修完了", description: `「${card.titleJa}」を履修済みにしました` });
      queryClient.invalidateQueries({ queryKey: ["/api/skill-progress"] });
    },
    onError: () => {
      toast({ title: "エラー", description: "履修登録に失敗しました", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back-skills">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-semibold text-base truncate">{card.titleJa}</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="secondary">{card.category}</Badge>
            {card.isAiGenerated && <Badge variant="outline" className="text-[10px]">AI生成</Badge>}
            {completed && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                履修済み
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-bold mb-2">{card.titleJa}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{card.descriptionJa}</p>
        </div>

        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">良い例</h3>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{card.goodExampleJa}</p>
        </Card>

        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">悪い例</h3>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{card.badExampleJa}</p>
        </Card>

        {card.tipsJa && card.tipsJa.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm">ポイント</h3>
            </div>
            <ul className="space-y-2">
              {card.tipsJa.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {!completed && (
          <Button
            className="w-full"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            data-testid="button-complete-skill"
          >
            {completeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            履修済みにする
          </Button>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

export default function SkillsPage() {
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<SkillCard | null>(null);

  const { data: skillCards, isLoading } = useQuery<SkillCard[]>({
    queryKey: ["/api/skill-cards"],
  });

  const { data: subscription } = useQuery<{ plan: string } | null>({
    queryKey: ["/api/subscription"],
  });

  const { data: skillProgress } = useQuery<UserSkillProgress[]>({
    queryKey: ["/api/skill-progress"],
  });

  const userPlan = subscription?.plan || "free";
  const completedIds = new Set((skillProgress || []).map((p) => p.skillCardId));

  if (selectedCard) {
    return (
      <SkillCardDetail
        card={selectedCard}
        onBack={() => setSelectedCard(null)}
        isCompleted={completedIds.has(selectedCard.id)}
      />
    );
  }

  const difficultyColors: Record<string, string> = {
    beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  const difficultyLabels: Record<string, string> = {
    beginner: "初級",
    intermediate: "中級",
    advanced: "上級",
  };

  const totalCards = skillCards?.length || 0;
  const completedCount = skillCards?.filter((c) => completedIds.has(c.id)).length || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-base">スキルカード</h1>
          </div>
          <div className="flex items-center gap-2">
            {totalCards > 0 && (
              <span className="text-xs text-muted-foreground" data-testid="text-progress-count">
                {completedCount}/{totalCards} 履修済み
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-md" />
            ))}
          </div>
        ) : skillCards && skillCards.length > 0 ? (
          skillCards.map((card, index) => {
            const isLocked = card.isPremium && userPlan === "free" && index >= 3;
            const isDone = completedIds.has(card.id);
            return (
              <Card
                key={card.id}
                className={`p-4 hover-elevate ${isLocked ? "opacity-60" : "cursor-pointer"}`}
                onClick={() => !isLocked && setSelectedCard(card)}
                data-testid={`card-skill-${card.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                    isDone ? "bg-emerald-500/10" : "bg-primary/10"
                  }`}>
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : card.isAiGenerated ? (
                      <Sparkles className="w-4 h-4 text-primary" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`font-semibold text-sm ${isDone ? "text-muted-foreground" : ""}`}>{card.titleJa}</h3>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColors[card.difficulty] || ""}`}>
                        {difficultyLabels[card.difficulty] || card.difficulty}
                      </Badge>
                      {isDone && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          履修済み
                        </Badge>
                      )}
                      {card.isAiGenerated && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">AI</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{card.descriptionJa}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">スキルカードがまだありません</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
