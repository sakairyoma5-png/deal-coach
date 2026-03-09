import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Zap, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const sections = [
  {
    title: "第1条（個人情報の定義）",
    content: `本プライバシーポリシーにおいて「個人情報」とは、個人情報保護法に規定される個人情報を指し、生存する個人に関する情報であって、氏名、メールアドレス、その他の記述等により特定の個人を識別できるものをいいます。`,
  },
  {
    title: "第2条（収集する情報）",
    content: `当社は、以下の情報を取得する場合があります。
・氏名、メールアドレス等のアカウント情報（認証サービス経由で取得）
・ご利用のサービスに関する情報（学習履歴、ロールプレイ履歴、スキル診断結果等）
・お支払いに関する情報（Stripeを通じて処理され、当社はクレジットカード番号等を直接保持しません）
・アクセスログ情報（IPアドレス、ブラウザ情報、アクセス日時等）
・Cookieおよび類似技術により取得される情報`,
  },
  {
    title: "第3条（利用目的）",
    content: `当社は、取得した個人情報を以下の目的で利用いたします。
・サービスの提供、運営、改善
・ユーザー認証およびアカウント管理
・AIを活用した営業スキルトレーニングの提供および改善
・課金処理およびサブスクリプション管理
・お問い合わせへの対応
・サービスに関するご連絡（重要なお知らせ、機能更新等）
・利用状況の分析およびサービス品質向上
・不正利用の防止`,
  },
  {
    title: "第4条（第三者提供）",
    content: `当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
・ユーザーの同意がある場合
・法令に基づく場合
・人の生命、身体または財産の保護のために必要な場合
・サービスの提供に必要な業務委託先に対して、必要な範囲で提供する場合

【業務委託先】
・Stripe, Inc.：決済処理のために、お支払い情報を共有します
・OpenAI：AI営業トレーニング機能の提供のために、会話データを処理委託します（個人を特定する情報は送信しません）
・Replit, Inc.：サービスのホスティングおよび認証基盤として利用します`,
  },
  {
    title: "第5条（Cookieの利用）",
    content: `当社は、サービスの提供および改善のためにCookieおよび類似の技術を使用します。Cookieは、ユーザーのブラウザに保存される小さなデータファイルで、セッション管理やユーザー設定の保持に利用されます。ユーザーはブラウザの設定によりCookieの受け入れを拒否することができますが、その場合、サービスの一部が正常に機能しない場合があります。`,
  },
  {
    title: "第6条（安全管理措置）",
    content: `当社は、個人情報の漏洩、滅失またはき損の防止その他の個人情報の安全管理のために、必要かつ適切な措置を講じます。
・通信の暗号化（SSL/TLS）
・アクセス制御の実施
・データベースの適切な管理
・定期的なセキュリティ対策の見直し`,
  },
  {
    title: "第7条（個人情報の開示・訂正・削除）",
    content: `ユーザーは、当社が保有する自己の個人情報について、開示、訂正、追加、削除、利用停止または第三者提供の停止を請求することができます。ご請求の際は、下記のお問い合わせ先までご連絡ください。本人確認を行った上で、合理的な期間内に対応いたします。`,
  },
  {
    title: "第8条（プライバシーポリシーの変更）",
    content: `当社は、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更がある場合は、サービス上での通知その他適切な方法でお知らせいたします。変更後のプライバシーポリシーは、本ページに掲載した時点から効力を生じるものとします。`,
  },
  {
    title: "第9条（お問い合わせ）",
    content: `個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。

事業者名: Core practice
メールアドレス: corepractice.official@gmail.com`,
  },
];

export default function PrivacyPage() {
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

          <h1 className="text-2xl md:text-3xl font-bold mb-8" data-testid="text-privacy-title">
            プライバシーポリシー
          </h1>

          <Card className="p-6 md:p-8" data-testid="card-privacy-content">
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Core practice（以下「当社」）は、DealCoach（以下「本サービス」）における個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
              </p>

              {sections.map((section, i) => (
                <section key={i} data-testid={`section-privacy-${i + 1}`}>
                  <h2 className="font-bold text-base mb-3">{section.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </section>
              ))}

              <p className="text-muted-foreground pt-4 border-t border-border text-sm">
                制定日：2026年3月7日
              </p>
            </div>
          </Card>
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
            <div className="flex items-center gap-4">
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
