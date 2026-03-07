import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BookOpen,
  MessageSquare,
  BarChart3,
  Calendar,
  Sparkles,
  Target,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Building2,
  Users,
  ClipboardList,
  Eye,
  LineChart,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "スキルカード学習",
    description: "SPIN営業やミラーリングなど、実践的な営業テクニックを体系的に学べます。良い例・悪い例で理解が深まります。",
    gradient: "from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: MessageSquare,
    title: "AIロープレ練習",
    description: "AIが顧客役を務める模擬商談で実践力を磨きます。難易度設定やカスタムシナリオにも対応。",
    gradient: "from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20",
    iconColor: "text-violet-500",
  },
  {
    icon: BarChart3,
    title: "スキル診断・分析",
    description: "傾聴力・質問力・共感力・クロージング力の4軸でAIが評価。弱点を可視化して効率的に改善。",
    gradient: "from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: Sparkles,
    title: "AIレコメンド",
    description: "あなたの学習データを分析し、最適な学習プランをAIが提案。効率的にスキルアップできます。",
    gradient: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: Calendar,
    title: "学習カレンダー",
    description: "日々の学習状況をカレンダーで可視化。継続的な学習習慣の形成をサポートします。",
    gradient: "from-rose-500/10 to-pink-500/10 dark:from-rose-500/20 dark:to-pink-500/20",
    iconColor: "text-rose-500",
  },
  {
    icon: Target,
    title: "カスタムシナリオ",
    description: "あなたの商品・顧客情報を登録して、実際の商談に近いシナリオでロープレ練習ができます。",
    gradient: "from-sky-500/10 to-indigo-500/10 dark:from-sky-500/20 dark:to-indigo-500/20",
    iconColor: "text-sky-500",
  },
];


const enterpriseFeatures = [
  {
    icon: BarChart3,
    title: "管理者ダッシュボード",
    description: "メンバー全員のスキルスコア・練習回数・成長推移をリアルタイムで把握。データに基づいたチーム育成が可能です。",
  },
  {
    icon: Users,
    title: "メンバースコア管理",
    description: "傾聴・質問・共感・クロージングの4軸でメンバーごとのスキルを可視化。強み・弱みを一目で把握できます。",
  },
  {
    icon: ClipboardList,
    title: "カリキュラム指定",
    description: "週ごとに学習すべきスキルカードを指定。チーム全体で統一されたトレーニングプランを実行できます。",
  },
  {
    icon: Eye,
    title: "未実施者の即時把握",
    description: "誰がカリキュラムを完了していないか一目でわかる。フォローアップが必要なメンバーを見逃しません。",
  },
  {
    icon: LineChart,
    title: "成長推移チャート",
    description: "週次・月次でチームと個人のスコア変化を折れ線グラフで可視化。トレーニングの効果を定量的に測定。",
  },
  {
    icon: CheckCircle2,
    title: "履修率トラッキング",
    description: "カリキュラムの達成率をプログレスバーで表示。チーム全体の学習進捗を一目で確認できます。",
  },
];

const enterpriseBenefits = [
  "誰がやっていないか一目でわかる",
  "チーム全体のスキル底上げを実現",
  "データに基づいた育成計画が立てられる",
  "新人の早期戦力化をサポート",
  "マネージャーの育成負荷を軽減",
  "営業組織のパフォーマンスを可視化",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight" data-testid="text-logo">DealCoach</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/login">
              <Button variant="outline" data-testid="button-login">
                ログイン
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="pt-14">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 dark:from-primary/10 dark:to-violet-500/10" />
          <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                AI搭載の次世代セールストレーニング
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight" data-testid="text-hero-title">
                営業力を、
                <span className="text-primary">AIで</span>
                <br />
                次のレベルへ
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-description">
                AIが顧客役を務めるリアルなロープレ練習と、
                4軸のスキル診断であなたの営業力を可視化。
                データドリブンで効率的にスキルアップ。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a href="/api/login">
                  <Button size="lg" className="gap-2 text-base px-8" data-testid="button-cta-start">
                    無料で始める
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <a href="#features">
                  <Button size="lg" variant="outline" className="text-base px-8" data-testid="button-cta-features">
                    機能を見る
                  </Button>
                </a>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  無料プランあり
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  クレジットカード不要
                </div>
              </div>
            </div>
          </div>
        </section>


        <section id="features" className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-features-title">
                6つの主要機能
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                DealCoachは営業スキルの習得に必要な全てを提供します
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="p-5 hover-elevate"
                  data-testid={`card-feature-${feature.title}`}
                >
                  <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="enterprise" className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium mb-4">
                <Building2 className="w-3.5 h-3.5" />
                法人・チーム向け
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-enterprise-title">
                チームの営業力を、まとめて底上げ
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                管理者ダッシュボードでメンバーの学習状況を一元管理。
                カリキュラム指定とスコア分析で、組織全体の営業力を効率的に向上させます。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {enterpriseFeatures.map((feature) => (
                <Card
                  key={feature.title}
                  className="p-5 hover-elevate"
                  data-testid={`card-enterprise-${feature.title}`}
                >
                  <div className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-violet-500" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6 md:p-8" data-testid="card-enterprise-benefits">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2" data-testid="text-enterprise-benefits-title">
                    法人導入のメリット
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    営業マネージャーの育成負担を減らしながら、チーム全体のパフォーマンスを向上させます。
                  </p>
                  <ul className="space-y-2.5">
                    {enterpriseBenefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2.5 text-sm" data-testid={`text-benefit-${benefit}`}>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-center gap-3 md:items-end md:justify-center md:min-w-[200px]">
                  <a href="/api/login">
                    <Button size="lg" className="gap-2 text-base" data-testid="button-enterprise-cta">
                      <Building2 className="w-4 h-4" />
                      組織を作成する
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground text-center md:text-right">
                    無料で組織を作成して、<br />チームメンバーを招待できます
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">今すぐ始めよう</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              あなたの営業力を変える第一歩
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              無料プランで今すぐスタート。AIがあなたの営業スキルを分析し、成長をサポートします。
            </p>
            <a href="/api/login">
              <Button size="lg" className="gap-2 text-base px-8" data-testid="button-cta-bottom">
                無料で始める
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </section>

        <footer className="py-8 border-t border-border">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <Zap className="w-3 h-3 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sm">DealCoach</span>
              </div>
              <div className="flex items-center gap-4">
                <a href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-terms">
                  利用規約
                </a>
                <a href="/legal" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-legal">
                  特定商取引法に基づく表記
                </a>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              &copy; 2026 DealCoach. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
