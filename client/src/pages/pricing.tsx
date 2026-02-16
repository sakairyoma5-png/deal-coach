import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  X,
  Zap,
  Crown,
  Star,
  ArrowLeft,
  Loader2,
  Settings,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Subscription } from "@shared/schema";

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const { data: subscription, refetch: refetchSub } = useQuery<Subscription | null>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/sync-subscription");
      return res.json();
    },
    onSuccess: () => {
      refetchSub();
    },
  });

  useEffect(() => {
    if (search.includes("success=true")) {
      syncMutation.mutate();
      toast({ title: "サブスクリプション登録完了", description: "プランがアップグレードされました。" });
      navigate("/pricing", { replace: true });
    }
    if (search.includes("canceled=true")) {
      toast({ title: "キャンセルされました", description: "プラン変更はキャンセルされました。", variant: "destructive" });
      navigate("/pricing", { replace: true });
    }
  }, []);

  const currentPlan = subscription?.plan || "free";
  const hasStripeSubscription = !!subscription?.stripeSubscriptionId;

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, plan, billingCycle }: { priceId: string; plan: string; billingCycle: string }) => {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId, plan, billingCycle });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({ title: "エラー", description: "チェックアウトの作成に失敗しました。", variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal");
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({ title: "エラー", description: "ポータルの作成に失敗しました。", variant: "destructive" });
    },
  });

  const plans = [
    {
      id: "free",
      name: "Free",
      icon: Zap,
      monthlyPrice: 0,
      annualPrice: 0,
      monthlyPriceId: null,
      annualPriceId: null,
      features: [
        { text: "スキルカード 1日3枚まで", included: true },
        { text: "AIロープレ 月3回", included: true },
        { text: "基本スキル診断", included: true },
        { text: "AIレコメンド", included: false },
        { text: "学習カレンダー", included: false },
        { text: "カスタムシナリオ", included: false },
      ],
      cta: "現在のプラン",
      highlight: false,
    },
    {
      id: "basic",
      name: "Basic",
      icon: Star,
      monthlyPrice: 3000,
      annualPrice: 30000,
      monthlyPriceId: "price_1T1GVn95hoZRgn2nL4r2BJbI",
      annualPriceId: "price_1T1GVo95hoZRgn2nfRMvoTEy",
      features: [
        { text: "全スキルカード", included: true },
        { text: "AIロープレ 月10回", included: true },
        { text: "詳細スキル診断", included: true },
        { text: "AIレコメンド", included: false },
        { text: "学習カレンダー", included: true },
        { text: "カスタムシナリオ 3つまで", included: true },
      ],
      cta: "Basicにアップグレード",
      highlight: true,
    },
    {
      id: "pro",
      name: "Pro",
      icon: Crown,
      monthlyPrice: 4500,
      annualPrice: 45000,
      monthlyPriceId: "price_1T1GVo95hoZRgn2nyDf6ksP3",
      annualPriceId: "price_1T1GVo95hoZRgn2nEzvqlFBx",
      features: [
        { text: "全スキルカード", included: true },
        { text: "AIロープレ 無制限", included: true },
        { text: "詳細スキル診断", included: true },
        { text: "AIレコメンド", included: true },
        { text: "学習カレンダー", included: true },
        { text: "カスタムシナリオ 無制限", included: true },
      ],
      cta: "Proにアップグレード",
      highlight: false,
    },
  ];

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    if (plan.id === "free") return;

    const priceId = isAnnual ? plan.annualPriceId : plan.monthlyPriceId;
    if (!priceId) return;

    checkoutMutation.mutate({
      priceId,
      plan: plan.id,
      billingCycle: isAnnual ? "annual" : "monthly",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <Link href="/">
                <Button size="icon" variant="ghost" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <CreditCard className="w-5 h-5 text-amber-500" />
            <h1 className="font-bold text-base">料金プラン</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {hasStripeSubscription && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">現在のプラン</p>
                <p className="font-bold text-lg capitalize">{currentPlan}</p>
                {subscription?.billingCycle && (
                  <p className="text-xs text-muted-foreground">
                    {subscription.billingCycle === "annual" ? "年額プラン" : "月額プラン"}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-subscription"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
                <span className="ml-1.5">プラン管理・解約</span>
              </Button>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-center">
          <div className="flex items-center gap-0 bg-muted rounded-md p-0.5">
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !isAnnual ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setIsAnnual(false)}
              data-testid="button-monthly"
            >
              月額
            </button>
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isAnnual ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setIsAnnual(true)}
              data-testid="button-annual"
            >
              年額
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                2ヶ月分お得
              </Badge>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {plans.map((plan) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const isCurrent = currentPlan === plan.id;
            const isUpgrade = plan.id !== "free" && !isCurrent;
            const isDowngrade = plan.id === "free" && currentPlan !== "free";

            return (
              <Card
                key={plan.id}
                className={`p-5 ${plan.highlight ? "ring-2 ring-primary" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.highlight && (
                  <Badge className="mb-3 text-[10px]">人気</Badge>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                    plan.id === "free" ? "bg-muted" : plan.id === "basic" ? "bg-primary/10" : "bg-amber-500/10"
                  }`}>
                    <plan.icon className={`w-4 h-4 ${
                      plan.id === "free" ? "text-muted-foreground" : plan.id === "basic" ? "text-primary" : "text-amber-500"
                    }`} />
                  </div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    {price === 0 ? "¥0" : `¥${price.toLocaleString()}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground ml-1">
                      /{isAnnual ? "年" : "月"}
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      )}
                      <span className={feature.included ? "" : "text-muted-foreground/50"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled data-testid={`button-select-${plan.id}`}>
                    現在のプラン
                  </Button>
                ) : isDowngrade && hasStripeSubscription ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {portalMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    プラン管理で変更
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={checkoutMutation.isPending}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {checkoutMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    {plan.cta}
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled data-testid={`button-select-${plan.id}`}>
                    {plan.cta}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1 pt-2">
          <p>月額プラン: 支払日から次回請求日まで利用可能</p>
          <p>年額プラン: 支払日から1年間利用可能</p>
          <p>解約後も現在の請求期間終了まで利用できます</p>
        </div>
      </main>
      {isAuthenticated && <BottomNav />}
    </div>
  );
}
