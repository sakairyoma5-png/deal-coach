import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Zap, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const legalItems = [
  { label: "販売業者（法人名）", value: "Core practice" },
  { label: "運営責任者", value: "小路 琉生" },
  { label: "所在地", value: "〒150-0021 東京都渋谷区恵比寿西2丁目4番8号 ウィンド恵比寿ビル8F" },
  { label: "電話番号", value: "09053047978" },
  { label: "メールアドレス", value: "corepractice.official@gmail.com" },
  { label: "追加手数料", value: "なし" },
  {
    label: "交換および返品に関するポリシー",
    value:
      "サブスクリプションはいつでも解約可能です。解約後も当該請求期間終了までサービスをご利用いただけます。デジタルサービスの性質上、返金は原則としてお受けしておりません。",
  },
  { label: "サービス提供時期", value: "決済完了後、直ちにご利用いただけます" },
  { label: "利用可能な決済手段", value: "クレジットカード" },
  { label: "決済期間", value: "クレジットカード決済はただちに処理されます" },
  { label: "販売価格", value: "各プランのページに表示された金額（消費税込）" },
];

export default function LegalPage() {
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
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              トップページに戻る
            </Button>
          </Link>

          <h1
            className="text-2xl md:text-3xl font-bold mb-8"
            data-testid="text-legal-title"
          >
            特定商取引法に基づく表記
          </h1>

          <Card className="p-6" data-testid="card-legal-info">
            <div className="divide-y divide-border">
              {legalItems.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col sm:flex-row py-4 first:pt-0 last:pb-0 gap-1 sm:gap-6"
                  data-testid={`row-legal-${item.label}`}
                >
                  <dt className="text-sm font-medium text-muted-foreground sm:w-40 shrink-0">
                    {item.label}
                  </dt>
                  <dd className="text-sm" data-testid={`text-legal-value-${item.label}`}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">DealCoach</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 DealCoach. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
