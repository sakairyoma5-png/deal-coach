import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Users,
  Building2,
  Briefcase,
  ChevronRight,
  Loader2,
  Bot,
  User as UserIcon,
} from "lucide-react";
import type { RoleplayScenario, RoleplaySession } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function RoleplayChat({ scenario, onBack }: { scenario: RoleplayScenario; onBack: () => void }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/roleplay/start", { scenarioId: scenario.id });
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
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/roleplay/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, message: input.trim() }),
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back-roleplay">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm truncate">{scenario.titleJa}</h1>
              <p className="text-[10px] text-muted-foreground truncate">{scenario.customerName} - {scenario.companyName}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => endSessionMutation.mutate()}
            disabled={endSessionMutation.isPending || messages.length < 4}
            data-testid="button-end-session"
          >
            {endSessionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "終了"}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        {startMutation.isPending ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
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

export default function RoleplayPage() {
  const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario | null>(null);

  const { data: scenarios, isLoading } = useQuery<RoleplayScenario[]>({
    queryKey: ["/api/scenarios"],
  });

  const difficultyColors: Record<string, string> = {
    easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hard: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  const difficultyLabels: Record<string, string> = {
    easy: "初級",
    medium: "中級",
    hard: "上級",
  };

  if (selectedScenario) {
    return <RoleplayChat scenario={selectedScenario} onBack={() => setSelectedScenario(null)} />;
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

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        <p className="text-sm text-muted-foreground mb-2">
          シナリオを選んで、AIとの模擬商談を始めましょう
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-md" />
            ))}
          </div>
        ) : scenarios && scenarios.length > 0 ? (
          scenarios.map((scenario) => (
            <Card
              key={scenario.id}
              className="p-4 hover-elevate cursor-pointer"
              onClick={() => setSelectedScenario(scenario)}
              data-testid={`card-scenario-${scenario.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{scenario.titleJa}</h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColors[scenario.difficulty] || ""}`}>
                      {difficultyLabels[scenario.difficulty] || scenario.difficulty}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{scenario.customerName} ({scenario.customerRole})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span>{scenario.companyName} - {scenario.industry}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Briefcase className="w-3 h-3" />
                      <span>{scenario.productService}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">シナリオがまだありません</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
