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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Zap,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
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
} from "lucide-react";
import type { SkillCard, UserSkillProgress, SkillCardStudyLog } from "@shared/schema";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { Crown } from "lucide-react";
import { Link } from "wouter";

function SkillCardDetail({
  card,
  onBack,
  isCompleted,
  allCards,
  onSelectCard,
  userPlan,
}: {
  card: SkillCard;
  onBack: () => void;
  isCompleted: boolean;
  allCards: SkillCard[];
  onSelectCard: (card: SkillCard) => void;
  userPlan: string;
}) {
  const { toast } = useToast();
  const [completed, setCompleted] = useState(isCompleted);

  type QuizChoice = { text: string; isCorrect: boolean; explanation: string };
  type QuizQuestion = { situation: string; customerStatement: string; choices: QuizChoice[]; questionNumber: number };
  type QuizAnswer = { questionNumber: number; situation: string; customerStatement: string; selectedIndex: number; correctIndex: number; isCorrect: boolean; choices: QuizChoice[] };
  const [practiceState, setPracticeState] = useState<'idle' | 'loading' | 'questioning' | 'answered' | 'done'>('idle');
  const [practiceScenario, setPracticeScenario] = useState("");
  const [salesRole, setSalesRole] = useState("");
  const [meetingGoal, setMeetingGoal] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerRole, setCustomerRole] = useState("");
  const [customerPersonality, setCustomerPersonality] = useState("");
  const [hiddenConcerns, setHiddenConcerns] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [quizScore, setQuizScore] = useState<{ correctCount: number; totalQuestions: number } | null>(null);

  const startPracticeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/skill-cards/${card.id}/practice/start`);
      return await res.json();
    },
    onSuccess: (data) => {
      setPracticeScenario(data.scenario || "");
      setSalesRole(data.salesRole || "");
      setMeetingGoal(data.meetingGoal || "");
      setCustomerName(data.customerName || "田中部長");
      setCustomerRole(data.customerRole || "");
      setCustomerPersonality(data.customerPersonality || "");
      setHiddenConcerns(data.hiddenConcerns || "");
      setQuizAnswers([]);
      setQuizScore(null);
      setSelectedAnswer(null);
      setCurrentQuestion(null);
      setPracticeState('loading');
      fetchQuizQuestion(1, data, []);
    },
    onError: () => {
      toast({ title: "エラー", description: "練習の開始に失敗しました", variant: "destructive" });
    },
  });

  const fetchQuizQuestion = async (qNum: number, scenarioData?: any, prevSits?: string[]) => {
    try {
      const sc = scenarioData || { scenario: practiceScenario, customerName, customerRole, customerPersonality, hiddenConcerns };
      const res = await apiRequest("POST", `/api/skill-cards/${card.id}/practice/quiz`, {
        scenario: sc.scenario || practiceScenario,
        customerName: sc.customerName || customerName,
        customerRole: sc.customerRole || customerRole,
        customerPersonality: sc.customerPersonality || customerPersonality,
        hiddenConcerns: sc.hiddenConcerns || hiddenConcerns,
        questionNumber: qNum,
        previousSituations: prevSits || quizAnswers.map(a => a.situation),
      });
      const question = await res.json();
      setCurrentQuestion(question);
      setSelectedAnswer(null);
      setPracticeState('questioning');
    } catch {
      toast({ title: "エラー", description: "問題の生成に失敗しました", variant: "destructive" });
      setPracticeState('idle');
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (selectedAnswer !== null || !currentQuestion) return;
    setSelectedAnswer(index);
    const correctIdx = currentQuestion.choices.findIndex(c => c.isCorrect);
    const answer: QuizAnswer = {
      questionNumber: currentQuestion.questionNumber,
      situation: currentQuestion.situation,
      customerStatement: currentQuestion.customerStatement,
      selectedIndex: index,
      correctIndex: correctIdx >= 0 ? correctIdx : 0,
      isCorrect: currentQuestion.choices[index]?.isCorrect === true,
      choices: currentQuestion.choices,
    };
    setQuizAnswers(prev => [...prev, answer]);
    setPracticeState('answered');
  };

  const handleNextQuestion = async () => {
    const nextNum = (currentQuestion?.questionNumber || 0) + 1;
    if (nextNum > 5) {
      setPracticeState('loading');
      try {
        const allAnswers = quizAnswers;
        const res = await apiRequest("POST", `/api/skill-cards/${card.id}/practice/evaluate`, {
          answers: allAnswers.map(a => ({ selectedIndex: a.selectedIndex, correctIndex: a.correctIndex })),
          scenario: practiceScenario,
        });
        const data = await res.json();
        setQuizScore({ correctCount: data.correctCount || 0, totalQuestions: data.totalQuestions || 5 });
      } catch {
        const correctCount = quizAnswers.filter(a => a.isCorrect).length;
        setQuizScore({ correctCount, totalQuestions: quizAnswers.length });
      }
      setPracticeState('done');
    } else {
      setPracticeState('loading');
      await fetchQuizQuestion(nextNum);
    }
  };

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
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">実習クイズ</h3>
            </div>
            {(practiceState === 'idle' || practiceState === 'done') && userPlan !== 'free' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => startPracticeMutation.mutate()}
                disabled={startPracticeMutation.isPending}
                data-testid="button-start-practice"
              >
                {startPracticeMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                )}
                {practiceState === 'done' ? "もう一度練習" : "練習を開始"}
              </Button>
            )}
          </div>

          {practiceState === 'idle' && !startPracticeMutation.isPending && userPlan === 'free' && (
            <UpgradeBanner feature="AI実習クイズ" requiredPlan="Basic" />
          )}

          {practiceState === 'idle' && !startPracticeMutation.isPending && userPlan !== 'free' && (
            <p className="text-xs text-muted-foreground">
              AIが商談シナリオを生成し、顧客の発言に対する最適な応答を4択から選ぶクイズ形式で練習します。全5問出題されます。
            </p>
          )}

          {practiceState !== 'idle' && (
            <div className="space-y-3 mt-1">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-0.5">商談背景</p>
                  <p className="text-xs text-foreground leading-relaxed">{practiceScenario}</p>
                </div>
                <div className="border-t pt-2">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">顧客企業・担当者</p>
                  <p className="text-xs text-foreground font-medium">{customerName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{customerRole}</p>
                  {customerPersonality && (
                    <p className="text-[11px] text-foreground/80 mt-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">タイプ: </span>
                      {customerPersonality}
                    </p>
                  )}
                </div>
                <div className="border-t pt-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground">あなたの役割</p>
                    <p className="text-xs text-foreground">{salesRole || "法人営業担当"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground">商談の目的</p>
                    <p className="text-xs text-foreground">{meetingGoal || "顧客課題のヒアリング"}</p>
                  </div>
                </div>
                <div className="border-t pt-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground">練習スキル</p>
                  <p className="text-xs text-primary font-medium">{card.titleJa}</p>
                </div>
              </div>

              {(practiceState === 'questioning' || practiceState === 'answered' || practiceState === 'loading') && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((currentQuestion?.questionNumber || 1) / 5) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    問題 {currentQuestion?.questionNumber || 1}/5
                  </span>
                </div>
              )}

              {practiceState === 'loading' && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  問題を生成中...
                </div>
              )}

              {(practiceState === 'questioning' || practiceState === 'answered') && currentQuestion && (
                <div className="space-y-3" data-testid="section-quiz-question">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">場面</p>
                    <p className="text-xs text-foreground leading-relaxed mb-2">{currentQuestion.situation}</p>
                    <div className="bg-background rounded-md p-2.5 border">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{customerName}の発言</p>
                      <p className="text-sm text-foreground leading-relaxed">「{currentQuestion.customerStatement}」</p>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-foreground">営業としてどう応答しますか？</p>

                  <div className="space-y-2" data-testid="section-quiz-choices">
                    {currentQuestion.choices.map((choice, i) => {
                      const label = String.fromCharCode(65 + i);
                      const isSelected = selectedAnswer === i;
                      const isAnswered = practiceState === 'answered';
                      const isCorrect = choice.isCorrect;

                      let borderClass = "border-border hover:border-primary/50 cursor-pointer";
                      let bgClass = "bg-background";
                      if (isAnswered) {
                        if (isCorrect) {
                          borderClass = "border-emerald-500";
                          bgClass = "bg-emerald-500/5";
                        } else if (isSelected && !isCorrect) {
                          borderClass = "border-red-500";
                          bgClass = "bg-red-500/5";
                        } else {
                          borderClass = "border-border opacity-60";
                        }
                      } else if (isSelected) {
                        borderClass = "border-primary ring-1 ring-primary/30";
                        bgClass = "bg-primary/5";
                      }

                      return (
                        <button
                          key={i}
                          className={`w-full text-left rounded-lg border p-3 transition-all ${borderClass} ${bgClass} ${!isAnswered ? '' : 'cursor-default'}`}
                          onClick={() => handleSelectAnswer(i)}
                          disabled={isAnswered}
                          data-testid={`quiz-choice-${i}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isAnswered && isCorrect ? 'bg-emerald-500 text-white' :
                              isAnswered && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                              isSelected ? 'bg-primary text-primary-foreground' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {isAnswered && isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                               isAnswered && isSelected && !isCorrect ? <XCircle className="w-3.5 h-3.5" /> :
                               label}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground leading-relaxed">{choice.text}</p>
                              {isAnswered && (isCorrect || isSelected) && choice.explanation && (
                                <p className={`text-xs mt-1.5 leading-relaxed ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {choice.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {practiceState === 'answered' && (
                    <Button
                      className="w-full"
                      onClick={handleNextQuestion}
                      data-testid="button-next-question"
                    >
                      {(currentQuestion.questionNumber || 0) >= 5 ? "結果を見る" : "次の問題へ"}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              )}

              {practiceState === 'done' && quizScore && (
                <div className="space-y-4 border-t pt-4" data-testid="section-evaluation-result">
                  <div className="text-center py-2">
                    <div className="flex items-center justify-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-6 h-6 ${s <= quizScore.correctCount ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-evaluation-score">
                      {quizScore.correctCount}/{quizScore.totalQuestions}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {quizScore.correctCount === 5 ? "パーフェクト！素晴らしい営業センスです。" :
                       quizScore.correctCount >= 4 ? "よくできました！あと少しで完璧です。" :
                       quizScore.correctCount >= 3 ? "合格ラインです。さらなるスキルアップを目指しましょう。" :
                       quizScore.correctCount >= 2 ? "もう少し練習が必要です。解説を確認しましょう。" :
                       "基本からしっかり復習しましょう。スキルカードの内容を再確認してください。"}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">問題ごとの結果</p>
                    {quizAnswers.map((answer, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 ${answer.isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}
                        data-testid={`quiz-result-${i}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {answer.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <span className="text-xs font-semibold">問題 {answer.questionNumber}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1.5">{answer.situation}</p>
                        <p className="text-xs text-foreground mb-2">「{answer.customerStatement}」</p>
                        {!answer.isCorrect && (
                          <div className="space-y-1.5">
                            <div className="bg-red-500/5 border-l-2 border-red-400 pl-2 py-1 rounded-r">
                              <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-0.5">あなたの回答</p>
                              <p className="text-xs text-muted-foreground">{answer.choices[answer.selectedIndex]?.text}</p>
                            </div>
                            <div className="bg-emerald-500/5 border-l-2 border-emerald-500 pl-2 py-1 rounded-r">
                              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">正解</p>
                              <p className="text-xs text-foreground">{answer.choices[answer.correctIndex]?.text}</p>
                              {answer.choices[answer.correctIndex]?.explanation && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{answer.choices[answer.correctIndex].explanation}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {answer.isCorrect && answer.choices[answer.correctIndex]?.explanation && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            {answer.choices[answer.correctIndex].explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
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

const FREE_DAILY_LIMIT = 3;

export default function SkillsPage() {
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<SkillCard | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmCard, setConfirmCard] = useState<SkillCard | null>(null);

  const { data: skillCards, isLoading } = useQuery<SkillCard[]>({
    queryKey: ["/api/skill-cards"],
  });

  const { data: subscription } = useQuery<{ plan: string } | null>({
    queryKey: ["/api/subscription"],
  });

  const { data: skillProgress } = useQuery<UserSkillProgress[]>({
    queryKey: ["/api/skill-progress"],
  });

  const { data: todayLogs } = useQuery<SkillCardStudyLog[]>({
    queryKey: ["/api/study-logs/today"],
  });

  const userPlan = subscription?.plan || "free";
  const completedIds = new Set((skillProgress || []).map((p) => p.skillCardId));
  const todayStudiedIds = new Set((todayLogs || []).map((l) => l.skillCardId));
  const todayCount = todayStudiedIds.size;
  const isFree = userPlan === "free";
  const isLimitReached = isFree && todayCount >= FREE_DAILY_LIMIT;

  const studyLogMutation = useMutation({
    mutationFn: async (skillCardId: number) => {
      const res = await apiRequest("POST", "/api/study-logs", { skillCardId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-logs/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress/recent"] });
    },
  });

  const handleCardClick = (card: SkillCard) => {
    const alreadyStudiedToday = todayStudiedIds.has(card.id);

    if (alreadyStudiedToday) {
      setSelectedCard(card);
      return;
    }

    if (!isFree) {
      studyLogMutation.mutate(card.id);
      setSelectedCard(card);
      return;
    }

    if (isLimitReached) {
      setConfirmCard(card);
      return;
    }

    setConfirmCard(card);
  };

  const handleConfirmStudy = () => {
    if (!confirmCard) return;
    studyLogMutation.mutate(confirmCard.id);
    setSelectedCard(confirmCard);
    setConfirmCard(null);
  };

  if (selectedCard) {
    return (
      <SkillCardDetail
        card={selectedCard}
        onBack={() => setSelectedCard(null)}
        isCompleted={completedIds.has(selectedCard.id)}
        allCards={skillCards || []}
        onSelectCard={(card) => {
          const alreadyStudied = todayStudiedIds.has(card.id);
          if (alreadyStudied || !isFree) {
            if (!alreadyStudied) studyLogMutation.mutate(card.id);
            setSelectedCard(card);
          } else if (!isLimitReached) {
            setSelectedCard(null);
            setConfirmCard(card);
          }
        }}
        userPlan={userPlan}
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
          <div className="flex items-center gap-2 flex-wrap">
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
        {isFree && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs ${
            isLimitReached
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400"
              : "bg-primary/5 border border-primary/10 text-muted-foreground"
          }`} data-testid="text-daily-study-count">
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              本日の学習: <span className="font-semibold">{todayCount}/{FREE_DAILY_LIMIT}枚</span>
              {isLimitReached && " （本日の上限に達しました）"}
            </span>
            {isLimitReached && (
              <Link href="/pricing">
                <Button size="sm" variant="outline" className="ml-auto text-[10px] h-6 px-2" data-testid="button-upgrade-daily-limit">
                  <Crown className="w-3 h-3 mr-1" />
                  無制限にする
                </Button>
              </Link>
            )}
          </div>
        )}

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
            {filteredCards.map((card) => {
              const isDone = completedIds.has(card.id);
              const studiedToday = todayStudiedIds.has(card.id);
              return (
                <Card
                  key={card.id}
                  className={`p-4 hover-elevate cursor-pointer ${
                    isFree && isLimitReached && !studiedToday ? "opacity-60" : ""
                  }`}
                  onClick={() => handleCardClick(card)}
                  data-testid={`card-skill-${card.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isDone ? "bg-emerald-500/10" : "bg-primary/10"
                    }`}>
                      {isDone ? (
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
                        {studiedToday && !isDone && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                            本日学習済み
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

      <AlertDialog open={!!confirmCard} onOpenChange={(open) => { if (!open) setConfirmCard(null); }}>
        <AlertDialogContent data-testid="dialog-study-confirm">
          {confirmCard && (
            isLimitReached ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>本日の学習上限に達しました</AlertDialogTitle>
                  <AlertDialogDescription>
                    無料プランでは1日{FREE_DAILY_LIMIT}枚まで学習できます。本日学習したカードは引き続き閲覧可能です。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-dialog-cancel">閉じる</AlertDialogCancel>
                  <Link href="/pricing">
                    <AlertDialogAction data-testid="button-dialog-upgrade">
                      <Crown className="w-3.5 h-3.5 mr-1.5" />
                      プランをアップグレード
                    </AlertDialogAction>
                  </Link>
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>「{confirmCard.titleJa}」を学習しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    本日{todayCount + 1}枚目の学習です（無料プランは1日{FREE_DAILY_LIMIT}枚まで）
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-dialog-cancel">いいえ</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmStudy} data-testid="button-dialog-confirm">
                    はい、学習する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
