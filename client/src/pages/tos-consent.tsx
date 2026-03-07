import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Zap, ExternalLink, Shield, FileText } from "lucide-react";
import { Link } from "wouter";

const tosPoints = [
  "本サービスはAIを活用した営業スキルトレーニングを提供するSaaSサービスです",
  "アカウント登録には正確な情報の提供が必要です",
  "サービス内のコンテンツの著作権はDealCoachに帰属します",
  "不正利用・迷惑行為は禁止されています",
  "サービスの内容は予告なく変更される場合があります",
  "個人情報はプライバシーポリシーに基づき適切に管理されます",
];

export default function TosConsentPage() {
  const [agreed, setAgreed] = useState(false);
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/accept-tos");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">DealCoach</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-tos-title">
            利用規約への同意
          </h1>
          <p className="text-sm text-muted-foreground">
            サービスをご利用いただくには、利用規約への同意が必要です
          </p>
        </div>

        <Card className="p-5 mb-6" data-testid="card-tos-summary">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            利用規約の主なポイント
          </h2>
          <ul className="space-y-2.5">
            {tosPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </span>
                {point}
              </li>
            ))}
          </ul>

          <Link href="/terms">
            <Button variant="link" className="mt-4 gap-1.5 px-0 text-sm" data-testid="link-tos-full">
              利用規約の全文を読む
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </Card>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer" data-testid="label-tos-agree">
            <Checkbox
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
              data-testid="checkbox-tos-agree"
            />
            <span className="text-sm leading-relaxed">
              <Link href="/terms" className="text-primary underline underline-offset-2">利用規約</Link>
              に同意します
            </span>
          </label>

          <Button
            className="w-full"
            size="lg"
            disabled={!agreed || acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
            data-testid="button-tos-accept"
          >
            {acceptMutation.isPending ? "処理中..." : "同意してサービスを利用する"}
          </Button>
        </div>
      </main>
    </div>
  );
}
