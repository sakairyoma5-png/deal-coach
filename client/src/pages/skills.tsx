import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
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
  Brain,
  Cog,
  MapPin,
  AlertTriangle,
  ClipboardCheck,
  Trophy,
  Link2,
  Filter,
  Search,
  ThumbsUp,
  TrendingUp,
  MessageSquareQuote,
} from "lucide-react";
import type { SkillCard, UserSkillProgress } from "@shared/schema";

function SkillCardDetail({
  card,
  onBack,
  isCompleted,
  allCards,
  onSelectCard,
}: {
  card: SkillCard;
  onBack: () => void;
  isCompleted: boolean;
  allCards: SkillCard[];
  onSelectCard: (card: SkillCard) => void;
}) {
  const { toast } = useToast();
  const [completed, setCompleted] = useState(isCompleted);
  const [practiceExercise, setPracticeExercise] = useState<{
    scenario: string;
    question: string;
    hint: string;
    idealPoints: string[];
  } | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<{
    score: number;
    goodPoints: string[];
    improvements: string[];
    overallFeedback: string;
    modelAnswer: string;
  } | null>(null);
  const [showHint, setShowHint] = useState(false);

  const generatePracticeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/skill-cards/${card.id}/practice`);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data && data.scenario) {
        setPracticeExercise(data);
      } else {
        setPracticeExercise({
          scenario: data?.scenario || "シナリオの取得に失敗しました。もう一度お試しください。",
          question: data?.question || "このスキルをどのように活用しますか？",
          hint: data?.hint || "",
          idealPoints: data?.idealPoints || [],
        });
      }
      setUserAnswer("");
      setEvaluation(null);
      setShowHint(false);
    },
    onError: () => {
      toast({ title: "エラー", description: "練習問題の生成に失敗しました", variant: "destructive" });
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/skill-cards/${card.id}/practice/evaluate`, {
        scenario: practiceExercise?.scenario,
        question: practiceExercise?.question,
        userAnswer,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setEvaluation({
        score: typeof data?.score === 'number' ? Math.max(1, Math.min(5, data.score)) : 3,
        goodPoints: Array.isArray(data?.goodPoints) && data.goodPoints.length > 0 ? data.goodPoints : ["回答を提出した積極性が良いです。"],
        improvements: Array.isArray(data?.improvements) && data.improvements.length > 0 ? data.improvements : ["より具体的な発言例を含めるとさらに良くなります。"],
        overallFeedback: data?.overallFeedback || "回答を評価しました。練習を繰り返すことでスキルが向上します。",
        modelAnswer: data?.modelAnswer || card.goodExampleJa || `このスキル「${card.titleJa}」を活用した具体的な営業トークを意識して練習しましょう。`,
      });
    },
    onError: () => {
      toast({ title: "エラー", description: "評価の生成に失敗しました", variant: "destructive" });
    },
  });

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
            <Badge variant="outline" className={`text-[10px] ${
              card.difficulty === "beginner" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
              card.difficulty === "advanced" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
              "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
              {card.difficulty === "beginner" ? "初級" : card.difficulty === "advanced" ? "上級" : "中級"}
            </Badge>
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

        {card.whyEffectiveJa && (
          <Card className="p-4" data-testid="section-why-effective">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-sm">なぜ効果的か</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.whyEffectiveJa}</p>
          </Card>
        )}

        {card.mechanismJa && (
          <Card className="p-4" data-testid="section-mechanism">
            <div className="flex items-center gap-2 mb-3">
              <Cog className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-sm">メカニズム</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.mechanismJa}</p>
          </Card>
        )}

        {card.usageScenarioJa && (
          <Card className="p-4" data-testid="section-usage-scenario">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-teal-500" />
              <h3 className="font-semibold text-sm">活用シーン</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.usageScenarioJa}</p>
          </Card>
        )}

        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5" data-testid="section-good-example">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">良い例</h3>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{card.goodExampleJa}</p>
        </Card>

        <Card className="p-4 border-red-500/30 bg-red-500/5" data-testid="section-bad-example">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">悪い例</h3>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{card.badExampleJa}</p>
        </Card>

        {card.failurePatternsJa && card.failurePatternsJa.length > 0 && (
          <Card className="p-4 border-orange-500/20 bg-orange-500/5" data-testid="section-failure-patterns">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-sm text-orange-700 dark:text-orange-400">よくある失敗パターン</h3>
            </div>
            <ul className="space-y-2">
              {card.failurePatternsJa.map((pattern, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <XCircle className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">{pattern}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {card.tipsJa && card.tipsJa.length > 0 && (
          <Card className="p-4" data-testid="section-tips">
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

        {card.checklistJa && card.checklistJa.length > 0 && (
          <Card className="p-4 border-blue-500/20 bg-blue-500/5" data-testid="section-checklist">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400">商談前チェックリスト</h3>
            </div>
            <ul className="space-y-2">
              {card.checklistJa.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {card.successStoryJa && (
          <Card className="p-4 border-amber-500/20 bg-amber-500/5" data-testid="section-success-story">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-amber-700 dark:text-amber-400">成功事例</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.successStoryJa}</p>
          </Card>
        )}

        {card.relatedCardIds && card.relatedCardIds.length > 0 && (() => {
          const relatedCards = allCards.filter((c) => card.relatedCardIds?.includes(c.id));
          return relatedCards.length > 0 ? (
            <Card className="p-4" data-testid="section-related-cards">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">関連スキル</h3>
              </div>
              <div className="space-y-2">
                {relatedCards.map((rc) => (
                  <button
                    key={rc.id}
                    onClick={() => onSelectCard(rc)}
                    className="w-full text-left flex items-center gap-2 p-2 rounded-md hover-elevate"
                    data-testid={`button-related-card-${rc.id}`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm truncate">{rc.titleJa}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto flex-shrink-0">{rc.category}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          ) : null;
        })()}

        <Card className="p-4" data-testid="section-practice">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">実習</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generatePracticeMutation.mutate()}
              disabled={generatePracticeMutation.isPending}
              data-testid="button-generate-practice"
            >
              {generatePracticeMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 mr-1.5" />
              )}
              {practiceExercise ? "別の問題" : "問題を生成"}
            </Button>
          </div>

          {!practiceExercise && !generatePracticeMutation.isPending && (
            <p className="text-xs text-muted-foreground">
              AIが実際の営業シーンに基づいた練習問題を生成します。回答するとAIからフィードバックが受けられます。
            </p>
          )}

          {practiceExercise && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-sm font-medium mb-2">シナリオ</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{practiceExercise.scenario}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">{practiceExercise.question}</p>
                {practiceExercise.hint && (
                  <div className="mb-2">
                    {showHint ? (
                      <p className="text-xs text-muted-foreground bg-amber-500/10 p-2 rounded-md">
                        <Lightbulb className="w-3 h-3 inline mr-1 text-amber-500" />
                        {practiceExercise.hint}
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowHint(true)}
                        className="text-xs text-primary hover:underline"
                        data-testid="button-show-hint"
                      >
                        ヒントを見る
                      </button>
                    )}
                  </div>
                )}
                <Textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="あなたの回答を入力してください..."
                  className="text-sm min-h-[80px] resize-none"
                  data-testid="textarea-practice-answer"
                />
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => evaluateMutation.mutate()}
                  disabled={evaluateMutation.isPending || !userAnswer.trim()}
                  data-testid="button-submit-practice"
                >
                  {evaluateMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  回答を送信
                </Button>
              </div>

              {evaluation && (
                <div className="space-y-4 border-t pt-4" data-testid="section-evaluation-result">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-5 h-5 ${s <= evaluation.score ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="text-base font-semibold" data-testid="text-evaluation-score">{evaluation.score}/5</span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-overall-feedback">
                    {evaluation.overallFeedback}
                  </p>

                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3" data-testid="section-good-points">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">良かった点</p>
                    </div>
                    <ul className="space-y-1">
                      {evaluation.goodPoints.map((point, i) => (
                        <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3" data-testid="section-improvements">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">改善ポイント</p>
                    </div>
                    <ul className="space-y-1">
                      {evaluation.improvements.map((point, i) => (
                        <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5 shrink-0">-</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {evaluation.modelAnswer && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-3" data-testid="section-model-answer">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MessageSquareQuote className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">模範回答</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed italic">{evaluation.modelAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

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

const CATEGORIES = ["すべて", "ヒアリング", "ラポール構築", "提案", "クロージング", "心理学", "交渉術"];

export default function SkillsPage() {
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<SkillCard | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [searchQuery, setSearchQuery] = useState("");

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
        allCards={skillCards || []}
        onSelectCard={setSelectedCard}
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

  const filteredCards = (skillCards || []).filter((card) => {
    const matchesCategory = selectedCategory === "すべて" || card.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      card.titleJa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.descriptionJa?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="スキルを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            data-testid="input-search-skills"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className="flex-shrink-0 text-xs"
              data-testid={`button-category-${cat}`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-md" />
            ))}
          </div>
        ) : filteredCards.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{filteredCards.length}件のカード</p>
            {filteredCards.map((card, index) => {
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
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || selectedCategory !== "すべて" ? "該当するカードがありません" : "スキルカードがまだありません"}
            </p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
