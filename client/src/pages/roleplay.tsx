import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  ShieldQuestion,
  Clock,
  BarChart3,
  Smile,
  Search,
  Zap,
  Pencil,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Swords,
  Trophy,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const personalityTypes = [
  { id: "cautious", label: "慎重型", description: "リスクを重視し、データや実績を求める", icon: ShieldQuestion, color: "text-blue-500 bg-blue-500/10" },
  { id: "decisive", label: "即決型", description: "スピード重視、要点を簡潔に聞きたい", icon: Zap, color: "text-amber-500 bg-amber-500/10" },
  { id: "analytical", label: "分析型", description: "論理的、詳細なデータや比較を求める", icon: BarChart3, color: "text-emerald-500 bg-emerald-500/10" },
  { id: "friendly", label: "友好型", description: "人間関係重視、信頼構築を大切にする", icon: Smile, color: "text-pink-500 bg-pink-500/10" },
  { id: "skeptical", label: "懐疑型", description: "警戒心が強く、矛盾点を突いてくる", icon: Search, color: "text-red-500 bg-red-500/10" },
  { id: "busy", label: "多忙型", description: "時間がない、要点だけを短く聞きたい", icon: Clock, color: "text-violet-500 bg-violet-500/10" },
];

const difficultyLevels = [
  { id: "easy", label: "初級", description: "協力的な顧客。ヒントをくれる", icon: GraduationCap, color: "text-emerald-500 bg-emerald-500/10" },
  { id: "medium", label: "中級", description: "標準的な顧客。適度な質問・反論", icon: Swords, color: "text-amber-500 bg-amber-500/10" },
  { id: "hard", label: "上級", description: "厳しい反論・予想外の質問が来る", icon: Trophy, color: "text-red-500 bg-red-500/10" },
];

function DifficultySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">難易度</label>
      <div className="grid grid-cols-3 gap-2">
        {difficultyLevels.map((level) => {
          const Icon = level.icon;
          const isSelected = value === level.id;
          return (
            <Card
              key={level.id}
              className={`p-2.5 cursor-pointer transition-all text-center ${
                isSelected ? "ring-2 ring-primary" : "hover-elevate"
              }`}
              onClick={() => onChange(level.id)}
              data-testid={`card-difficulty-${level.id}`}
            >
              <div className={`w-8 h-8 rounded-md flex items-center justify-center mx-auto mb-1 ${level.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm block">{level.label}</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{level.description}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const phaseOptions = [
  "初期接触（テレアポ・初回訪問）",
  "ヒアリング（課題把握）",
  "提案（プレゼンテーション）",
  "交渉（条件調整）",
  "クロージング（契約締結）",
  "フォローアップ（契約後フォロー）",
];

function RoleplayChat({
  mode,
  config,
  onBack,
}: {
  mode: string;
  config: any;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/roleplay/start", { mode, config });
      return await res.json();
    },
    onSuccess: (data: { sessionId: number; messages: ChatMessage[] }) => {
      setSessionId(data.sessionId);
      setMessages(data.messages);
    },
    onError: () => {
      toast({ title: "エラー", description: "セッションの開始に失敗しました", variant: "destructive" });
    },
  });

  useEffect(() => {
    startMutation.mutate();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/roleplay/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, message: messageToSend }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantContent += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      toast({ title: "エラー", description: "メッセージの送信に失敗しました", variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/roleplay/end", { sessionId });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "セッション完了", description: "フィードバックが生成されました" });
      queryClient.invalidateQueries({ queryKey: ["/api/diagnosis/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress/recent"] });
      onBack();
    },
    onError: () => {
      toast({ title: "エラー", description: "セッションの終了に失敗しました", variant: "destructive" });
    },
  });

  const difficultyLabel = difficultyLevels.find((d) => d.id === config.difficulty)?.label || "中級";
  const headerTitle = mode === "personality"
    ? `${personalityTypes.find((p) => p.id === config.personalityType)?.label || ""}との商談`
    : "カスタム商談";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back-roleplay">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm truncate">{headerTitle}</h1>
              <p className="text-[10px] text-muted-foreground truncate">{config.product || ""} / {difficultyLabel}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => endSessionMutation.mutate()}
            disabled={endSessionMutation.isPending || messages.filter(m => m.role !== "system").length < 4}
            data-testid="button-end-session"
          >
            {endSessionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "終了"}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        {startMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">商談相手を準備中...</p>
          </div>
        ) : (
          <>
            {messages.filter((m) => m.role !== "system").map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${i}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <UserIcon className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="メッセージを入力..."
              className="resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              data-testid="input-roleplay-message"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              data-testid="button-send-message"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalityModeForm({ onStart, onBack }: { onStart: (config: any) => void; onBack: () => void }) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [product, setProduct] = useState("");
  const [goal, setGoal] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const canStart = selectedType && product.trim();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back-personality">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="font-bold text-base">性格タイプ選択</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <div>
          <label className="text-sm font-medium mb-2 block">顧客の性格タイプ</label>
          <div className="grid grid-cols-2 gap-2">
            {personalityTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <Card
                  key={type.id}
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary" : "hover-elevate"
                  }`}
                  onClick={() => setSelectedType(type.id)}
                  data-testid={`card-personality-${type.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${type.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">{type.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{type.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block" htmlFor="product-input">
            提案する商品/サービス <span className="text-destructive">*</span>
          </label>
          <Input
            id="product-input"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="例: クラウド型業務管理SaaS"
            data-testid="input-product"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block" htmlFor="goal-input">
            商談のゴール
          </label>
          <Input
            id="goal-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="例: 次回デモのアポイント獲得"
            data-testid="input-goal"
          />
        </div>

        <DifficultySelector value={difficulty} onChange={setDifficulty} />

        <Button
          className="w-full"
          disabled={!canStart}
          onClick={() =>
            onStart({
              personalityType: selectedType,
              product: product.trim(),
              goal: goal.trim() || "商談を成功させる",
              difficulty,
            })
          }
          data-testid="button-start-personality"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          商談を開始する
        </Button>
      </main>
      <BottomNav />
    </div>
  );
}

function CustomModeForm({ onStart, onBack }: { onStart: (config: any) => void; onBack: () => void }) {
  const { toast } = useToast();
  const [myCompany, setMyCompany] = useState("");
  const [theirCompany, setTheirCompany] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phase, setPhase] = useState("");
  const [product, setProduct] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);

  const prepareMutation = useMutation({
    mutationFn: async (config: any) => {
      const res = await apiRequest("POST", "/api/roleplay/custom-prepare", { config });
      return await res.json();
    },
    onSuccess: (data: { ready: boolean; questions?: string[] }) => {
      if (data.ready || !data.questions?.length) {
        onStart(buildConfig());
      } else {
        setAiQuestions(data.questions);
        setAiAnswers(new Array(data.questions.length).fill(""));
        setShowQuestions(true);
      }
    },
    onError: () => {
      toast({ title: "エラー", description: "準備に失敗しました", variant: "destructive" });
    },
  });

  const buildConfig = () => ({
    myCompany: myCompany.trim(),
    theirCompany: theirCompany.trim(),
    relationship: relationship.trim(),
    phase,
    product: product.trim(),
    difficulty,
    additionalInfo: additionalInfo.trim() + (aiAnswers.length > 0 ? "\n\n追加情報:\n" + aiQuestions.map((q, i) => `Q: ${q}\nA: ${aiAnswers[i]}`).join("\n") : ""),
  });

  const canPrepare = myCompany.trim() && theirCompany.trim() && product.trim();

  if (showQuestions && aiQuestions.length > 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => setShowQuestions(false)} data-testid="button-back-questions">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="font-bold text-base">AIからの確認</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-md">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              よりリアルなロープレのために、以下の点を教えてください。スキップも可能です。
            </p>
          </div>

          {aiQuestions.map((question, i) => (
            <div key={i}>
              <label className="text-sm font-medium mb-1.5 block">{question}</label>
              <Textarea
                value={aiAnswers[i]}
                onChange={(e) => {
                  const newAnswers = [...aiAnswers];
                  newAnswers[i] = e.target.value;
                  setAiAnswers(newAnswers);
                }}
                placeholder="回答を入力..."
                className="resize-none text-sm"
                rows={2}
                data-testid={`input-ai-answer-${i}`}
              />
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onStart(buildConfig())}
              data-testid="button-skip-questions"
            >
              スキップして開始
            </Button>
            <Button
              className="flex-1"
              onClick={() => onStart(buildConfig())}
              data-testid="button-start-with-answers"
            >
              回答して開始
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back-custom">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="font-bold text-base">自由設定</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            自社の情報 <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={myCompany}
            onChange={(e) => setMyCompany(e.target.value)}
            placeholder="例: ITソリューション企業。従業員50名。クラウドサービスの開発・販売を主力事業としている。"
            className="resize-none text-sm"
            rows={2}
            data-testid="input-my-company"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            相手の会社情報 <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={theirCompany}
            onChange={(e) => setTheirCompany(e.target.value)}
            placeholder="例: 製造業の大手企業。従業員2000名。工場のDX化を推進中。"
            className="resize-none text-sm"
            rows={2}
            data-testid="input-their-company"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">これまでの関係性</label>
          <Textarea
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="例: 展示会で名刺交換済み。1回だけオンラインで30分のヒアリングを実施。"
            className="resize-none text-sm"
            rows={2}
            data-testid="input-relationship"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">商談フェーズ</label>
          <div className="flex flex-wrap gap-1.5">
            {phaseOptions.map((p) => (
              <Badge
                key={p}
                variant={phase === p ? "default" : "outline"}
                className={`cursor-pointer text-xs ${phase === p ? "" : "no-default-active-elevate"}`}
                onClick={() => setPhase(phase === p ? "" : p)}
                data-testid={`badge-phase-${p}`}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            提案する商品/サービス <span className="text-destructive">*</span>
          </label>
          <Input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="例: 工場向けIoTモニタリングシステム"
            data-testid="input-custom-product"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">その他の情報</label>
          <Textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="例: 競合にA社がいる。先方のIT部長は技術に詳しい。予算は年間1000万円程度。"
            className="resize-none text-sm"
            rows={2}
            data-testid="input-additional-info"
          />
        </div>

        <DifficultySelector value={difficulty} onChange={setDifficulty} />

        <Button
          className="w-full"
          disabled={!canPrepare || prepareMutation.isPending}
          onClick={() => prepareMutation.mutate(buildConfig())}
          data-testid="button-prepare-custom"
        >
          {prepareMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AIが確認中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AIに確認して開始
            </>
          )}
        </Button>
      </main>
      <BottomNav />
    </div>
  );
}

type RoleplayView = "select" | "personality" | "custom" | "chat";

export default function RoleplayPage() {
  const [view, setView] = useState<RoleplayView>("select");
  const [chatMode, setChatMode] = useState<string>("");
  const [chatConfig, setChatConfig] = useState<any>(null);

  const handleStartChat = (mode: string, config: any) => {
    setChatMode(mode);
    setChatConfig(config);
    setView("chat");
  };

  if (view === "chat" && chatConfig) {
    return (
      <RoleplayChat
        mode={chatMode}
        config={chatConfig}
        onBack={() => setView("select")}
      />
    );
  }

  if (view === "personality") {
    return (
      <PersonalityModeForm
        onStart={(config) => handleStartChat("personality", config)}
        onBack={() => setView("select")}
      />
    );
  }

  if (view === "custom") {
    return (
      <CustomModeForm
        onStart={(config) => handleStartChat("custom", config)}
        onBack={() => setView("select")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-500" />
            <h1 className="font-bold text-base">AIロープレ</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          練習モードを選んで、AIとの模擬商談を始めましょう
        </p>

        <Card
          className="p-5 hover-elevate cursor-pointer"
          onClick={() => setView("personality")}
          data-testid="card-mode-personality"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <ShieldQuestion className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">性格タイプ選択</h3>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">おすすめ</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                慎重型・即決型・分析型など、よくある顧客の性格タイプを選択。自分の商材とゴールを入力して、すぐに練習を開始できます。
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
          </div>
        </Card>

        <Card
          className="p-5 hover-elevate cursor-pointer"
          onClick={() => setView("custom")}
          data-testid="card-mode-custom"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-md bg-violet-500/10 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="font-semibold text-base">自由設定</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                自社と相手の会社情報、過去の関係性、商談フェーズなどを詳細に設定。AIが情報を分析し、最適な顧客人格を自動生成します。
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
          </div>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
