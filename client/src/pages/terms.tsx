import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Zap, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg tracking-tight" data-testid="text-logo">DealCoach</span>
              </div>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link href="/">
          <Button variant="ghost" className="gap-1 mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            トップに戻る
          </Button>
        </Link>

        <Card className="p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-8" data-testid="text-terms-title">利用規約</h1>

          <div className="space-y-8 text-sm leading-relaxed text-foreground">
            <p>
              この利用規約（以下「本規約」）は、Core practice（以下「当社」）が提供するSaaS型営業トレーニングサービス「DealCoach」（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただくにあたり、本規約に同意いただく必要があります。
            </p>

            <section>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-section-overview">第1条（サービス概要）</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>本サービスは、AI技術を活用した営業スキルトレーニングプラットフォームです。</li>
                <li>本サービスは、スキルカード学習、AIロールプレイ練習、スキル診断・分析、AIレコメンド、学習カレンダー、カスタムシナリオ作成等の機能を提供します。</li>
                <li>本サービスは、インターネットを通じてWebブラウザ上で利用するSaaS型サービスとして提供されます。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-section-conditions">第2条（利用条件）</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>本サービスの利用を希望する方は、本規約に同意の上、当社が定める方法により利用登録を行うものとします。</li>
                <li>利用者は、登録情報が正確かつ最新であることを保証するものとします。</li>
                <li>未成年者が本サービスを利用する場合は、法定代理人の同意を得るものとします。</li>
                <li>当社は、以下の場合に利用登録を拒否または取り消すことができます。
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>登録情報に虚偽が含まれる場合</li>
                    <li>過去に本規約違反により利用資格を取り消されたことがある場合</li>
                    <li>その他、当社が不適切と判断した場合</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-section-prohibited">第3条（禁止事項）</h2>
              <p className="text-muted-foreground mb-2">利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>本サービスの運営を妨害するおそれのある行為</li>
                <li>他の利用者に関する個人情報等を収集または蓄積する行為</li>
                <li>他の利用者に成りすます行為</li>
                <li>本サービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
                <li>当社、他の利用者またはその他の第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
                <li>本サービスのリバースエンジニアリング、逆コンパイル、逆アセンブル等の行為</li>
                <li>本サービスで提供されるコンテンツの無断転載、複製、配布等の行為</li>
                <li>当社が許諾しない本サービス上での宣伝、広告、勧誘等の営業活動</li>
                <li>その他、当社が不適切と判断する行為</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-section-ip">第4条（知的財産権）</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>本サービスおよび本サービスに関連する一切のコンテンツ（テキスト、画像、動画、音声、プログラム、デザイン等）に関する知的財産権は、当社または当社にライセンスを許諾している者に帰属します。</li>
                <li>利用者は、当社の事前の書面による承諾なく、本サービスのコンテンツを複製、改変、公衆送信、頒布、貸与等してはなりません。</li>
                <li>利用者が本サービス上で入力した情報（ロールプレイの会話内容等）については、当社がサービス改善の目的で匿名化した上で利用する場合があります。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-section-disclaimer">第5条（免責事項）</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>当社は、本サービスが利用者の特定の目的に適合すること、期待する機能・正確性・有用性を有すること、利用者による本サービスの利用が利用者に適用される法令に適合すること、および不具合が生じないことについて、何ら保証するものではありません。</li>
                <li>当社は、AIが生成する診断結果、フィードバック、レコメンド等の正確性、妥当性について保証するものではありません。</li>
                <li>当社は、本サービスに起因して利用者に生じたあらゆる損害について、当社の故意または重大な過失による場合を除き、一切の責任を負いません。</li>
                <li>当社が責任を負う場合であっても、その範囲は利用者が当社に支払った直近1ヶ月分の利用料金を上限とします。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-section-changes">第6条（サービスの変更・終了）</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>当社は、利用者に事前に通知することなく、本サービスの内容を変更し、または本サービスの提供を中止もしくは終了することができるものとします。</li>
                <li>当社は、本サービスの変更、中止または終了により利用者に生じた損害について、一切の責任を負いません。</li>
                <li>当社は、以下のいずれかに該当する場合、利用者に事前に通知することなく、本サービスの全部または一部を一時的に中断することができます。
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>本サービスの保守点検を行う場合</li>
                    <li>天災、停電、通信障害等の不可抗力により本サービスの提供が困難な場合</li>
                    <li>その他、当社がやむを得ないと判断した場合</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-section-privacy">第7条（個人情報の取り扱い）</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>当社は、本サービスの利用によって取得する個人情報を、当社のプライバシーポリシーに従い適切に取り扱います。</li>
                <li>当社は、利用者の個人情報を以下の目的で利用します。
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>本サービスの提供・運営</li>
                    <li>利用者からのお問い合わせへの対応</li>
                    <li>本サービスの改善および新サービスの開発</li>
                    <li>利用規約への違反行為への対応</li>
                    <li>本サービスに関する重要なお知らせの通知</li>
                  </ul>
                </li>
                <li>当社は、法令に基づく場合を除き、利用者の同意なく第三者に個人情報を提供しません。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" data-testid="text-section-law">第8条（準拠法・管轄裁判所）</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
                <li>本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">第9条（規約の変更）</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>当社は、必要と判断した場合には、利用者に通知することなくいつでも本規約を変更することができるものとします。</li>
                <li>変更後の利用規約は、当社ウェブサイトに掲載した時点から効力を生じるものとします。</li>
                <li>本規約の変更後、本サービスの利用を継続した場合には、変更後の規約に同意したものとみなします。</li>
              </ol>
            </section>

            <p className="text-muted-foreground pt-4 border-t border-border">
              制定日：2026年3月7日
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
