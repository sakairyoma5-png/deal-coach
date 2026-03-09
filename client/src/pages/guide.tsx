import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import {
  Zap,
  ArrowLeft,
  UserCircle,
  Building2,
  BookOpen,
  MessageSquare,
  BarChart3,
  Calendar,
  Target,
  Users,
  ClipboardList,
  LineChart,
  ArrowRight,
  CheckCircle2,
  Crown,
} from "lucide-react";

const personalSteps = [
  {
    step: 1,
    icon: UserCircle,
    title: "無料アカウント登録",
    description: "Googleアカウント、GitHub、メールアドレスなどで簡単に登録できます。クレジットカードは不要です。",
    color: "text-blue-500",
    bg: "from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20",
  },
  {
    step: 2,
    icon: BookOpen,
    title: "スキルカードで営業テクニックを学ぶ",
    description: "SPIN営業、ミラーリング、クロージングなど50枚以上のスキルカードを6つのカテゴリから選んで学習。良い例・悪い例、チェックリスト付きで実践的に理解できます。",
    color: "text-emerald-500",
    bg: "from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20",
  },
  {
    step: 3,
    icon: MessageSquare,
    title: "AIロールプレイで実践練習",
    description: "6つの性格タイプ × 3段階の難易度から顧客を選んで、リアルな商談シミュレーション。自由にシナリオを設定するカスタムモードも利用できます。",
    color: "text-violet-500",
    bg: "from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20",
  },
  {
    step: 4,
    icon: Target,
    title: "AIフィードバックで振り返り",
    description: "ロールプレイ終了後、AIコーチが会話内容を分析。強み・改善点を具体的にフィードバック。質問しながら深く理解できます。",
    color: "text-amber-500",
    bg: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
  },
  {
    step: 5,
    icon: BarChart3,
    title: "スキル診断で実力を可視化",
    description: "傾聴力・質問力・共感力・クロージング力の4軸で営業スキルを診断。練習を重ねるごとにスコアが更新され、成長を実感できます。",
    color: "text-rose-500",
    bg: "from-rose-500/10 to-pink-500/10 dark:from-rose-500/20 dark:to-pink-500/20",
  },
  {
    step: 6,
    icon: Calendar,
    title: "学習カレンダーで進捗管理",
    description: "学習した日が自動で記録され、カレンダー上で確認できます。学習予定を登録して、計画的にスキルアップしましょう。",
    color: "text-sky-500",
    bg: "from-sky-500/10 to-indigo-500/10 dark:from-sky-500/20 dark:to-indigo-500/20",
  },
];

const corporateSteps = [
  {
    step: 1,
    icon: Building2,
    title: "組織を作成する",
    description: "アカウント登録後、「組織」タブから組織名を入力して作成。法人プラン（¥10,000/アカウント/月）の決済完了後、管理者として組織が有効化されます。",
    color: "text-violet-500",
    bg: "from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20",
  },
  {
    step: 2,
    icon: Users,
    title: "招待コードでメンバーを招待",
    description: "組織設定から招待コードを取得し、チームメンバーに共有。メンバーが参加すると自動的にアカウント分の課金（¥10,000/月）が追加されます。",
    color: "text-blue-500",
    bg: "from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20",
  },
  {
    step: 3,
    icon: ClipboardList,
    title: "カリキュラムを設定する",
    description: "管理者ダッシュボードから週ごとに学習すべきスキルカードを割り当て。メンバーには通知が届き、計画的な育成が可能です。",
    color: "text-emerald-500",
    bg: "from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20",
  },
  {
    step: 4,
    icon: BarChart3,
    title: "管理者ダッシュボードで進捗を把握",
    description: "メンバー全員のスキルスコア、週間練習回数、カリキュラム達成率をリアルタイムで確認。未参加者も一目で把握できます。",
    color: "text-amber-500",
    bg: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
  },
  {
    step: 5,
    icon: LineChart,
    title: "成長トレンドで効果を測定",
    description: "チーム全体や個人の週次スコア推移をグラフで可視化。4軸レーダーチャートで強み・弱みの変化を追跡し、データに基づいた育成戦略を立てられます。",
    color: "text-rose-500",
    bg: "from-rose-500/10 to-pink-500/10 dark:from-rose-500/20 dark:to-pink-500/20",
  },
];

const personalPlans = [
  {
    name: "Free",
    price: "¥0",
    features: ["スキルカード学習（1日3枚まで）", "AIロールプレイ", "スキル診断", "組織参加"],
  },
  {
    name: "Basic",
    price: "¥3,000/月",
    features: ["スキルカード無制限", "AIロールプレイ", "スキル診断", "学習カレンダー"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "¥4,500/月",
    features: ["Basicの全機能", "優先AIレスポンス", "詳細分析レポート", "カスタムシナリオ無制限"],
  },
];

type Tab = "personal" | "corporate";

function StepCard({ s }: { s: typeof personalSteps[0] }) {
  return (
    <Card className="overflow-hidden" data-testid={`card-step-${s.step}`}>
      <div className="p-5">
        <div className="flex gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center shrink-0`}>
            <s.icon className={`w-6 h-6 ${s.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-muted-foreground">STEP {s.step}</span>
            </div>
            <h3 className="font-semibold text-base mb-1.5">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg tracking-tight" data-testid="text-logo">
                  DealCoach
                </span>
              </div>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-14">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              トップページに戻る
            </Button>
          </Link>

          <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-guide-title">
            使い方ガイド
          </h1>
          <p className="text-muted-foreground mb-8">
            DealCoachの使い方をステップごとにご紹介します
          </p>

          <div className="flex gap-2 mb-8" data-testid="tabs-guide">
            <Button
              variant={activeTab === "personal" ? "default" : "outline"}
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => setActiveTab("personal")}
              data-testid="tab-personal"
            >
              <UserCircle className="w-4 h-4" />
              個人向け
            </Button>
            <Button
              variant={activeTab === "corporate" ? "default" : "outline"}
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => setActiveTab("corporate")}
              data-testid="tab-corporate"
            >
              <Building2 className="w-4 h-4" />
              法人向け
            </Button>
          </div>

          {activeTab === "personal" && (
            <div data-testid="section-personal">
              <div className="space-y-4 mb-12">
                {personalSteps.map((s) => (
                  <StepCard key={s.step} s={s} />
                ))}
              </div>

              <Card className="p-6 mb-8 text-center" data-testid="card-personal-cta">
                <h3 className="font-bold text-lg mb-2">今すぐ始めましょう</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  無料プランで全ての基本機能を体験できます
                </p>
                <a href="/api/login">
                  <Button size="lg" className="gap-2" data-testid="button-guide-signup">
                    無料で始める
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              </Card>

              <Card className="p-6" data-testid="card-personal-plans">
                <h3 className="font-bold text-lg mb-4 text-center">個人向け料金プラン</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {personalPlans.map((plan) => (
                    <div
                      key={plan.name}
                      className={`rounded-lg border p-4 ${plan.highlight ? "border-primary bg-primary/5" : "border-border"}`}
                      data-testid={`card-plan-${plan.name}`}
                    >
                      <div className="font-bold text-sm mb-1">{plan.name}</div>
                      <div className="text-xl font-bold mb-3">{plan.price}</div>
                      <ul className="space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-4">
                  <Link href="/pricing">
                    <Button variant="link" className="text-sm gap-1" data-testid="link-guide-pricing">
                      料金プランの詳細を見る
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "corporate" && (
            <div data-testid="section-corporate">
              <div className="space-y-4 mb-12">
                {corporateSteps.map((s) => (
                  <Card key={s.step} className="p-5" data-testid={`card-corporate-step-${s.step}`}>
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                        <s.icon className={`w-6 h-6 ${s.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-muted-foreground">STEP {s.step}</span>
                        </div>
                        <h3 className="font-semibold text-base mb-1.5">{s.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-6 mb-8" data-testid="card-corporate-benefits">
                <h3 className="font-bold text-lg mb-3 text-center">法人利用のポイント</h3>
                <ul className="space-y-2.5">
                  {[
                    "メンバーは個人のアカウントでログインして学習",
                    "管理者は複数人設定可能（組織設定から権限変更）",
                    "練習ログは自動で記録され、管理者が確認可能",
                    "カリキュラム割り当て時にメンバーへ通知が届きます",
                    "メンバーの追加・削除に応じて課金が自動調整されます",
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6 mb-8 text-center" data-testid="card-corporate-cta">
                <h3 className="font-bold text-lg mb-2">チームの営業力を強化しましょう</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  組織を作成して、メンバーを招待できます
                </p>
                <a href="/api/login">
                  <Button size="lg" className="gap-2" data-testid="button-guide-corp-signup">
                    <Building2 className="w-4 h-4" />
                    組織を作成する
                  </Button>
                </a>
              </Card>

              <Card className="p-6" data-testid="card-corporate-plan">
                <h3 className="font-bold text-lg mb-4 text-center">法人プラン</h3>
                <div className="max-w-sm mx-auto rounded-lg border border-primary bg-primary/5 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-primary" />
                    <span className="font-bold text-lg">Enterprise</span>
                  </div>
                  <div className="mb-1">
                    <span className="text-3xl font-bold">¥10,000</span>
                    <span className="text-sm text-muted-foreground ml-1">/アカウント/月</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    利用人数に応じた従量課金
                  </p>
                  <ul className="space-y-2">
                    {[
                      "全スキルカード無制限",
                      "AIロールプレイ無制限",
                      "詳細スキル診断",
                      "AIレコメンド",
                      "学習カレンダー",
                      "カスタムシナリオ無制限",
                      "管理者ダッシュボード",
                      "カリキュラム管理",
                      "成長トレンド分析",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  メンバー追加時に自動で課金が追加されます。退会時は日割りで調整されます。
                </p>
              </Card>
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Zap className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">DealCoach</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <a href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                利用規約
              </a>
              <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                プライバシーポリシー
              </a>
              <a href="/legal" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                特定商取引法に基づく表記
              </a>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            &copy; 2026 DealCoach. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
