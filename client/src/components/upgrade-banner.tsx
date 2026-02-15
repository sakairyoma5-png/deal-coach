import { Button } from "@/components/ui/button";
import { Crown, Lock, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export function UpgradeBanner({
  feature,
  requiredPlan = "Basic",
  className = "",
}: {
  feature: string;
  requiredPlan?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-primary/20 bg-primary/5 p-4 ${className}`} data-testid="upgrade-banner">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Crown className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5">{feature}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {requiredPlan}プラン以上でご利用いただけます
          </p>
        </div>
      </div>
      <Link href="/pricing">
        <Button size="sm" className="w-full mt-3" data-testid="button-upgrade">
          <Crown className="w-3.5 h-3.5 mr-1.5" />
          プランをアップグレード
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </Link>
    </div>
  );
}

export function UpgradeOverlay({
  feature,
  requiredPlan = "Basic",
  children,
}: {
  feature: string;
  requiredPlan?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" data-testid="upgrade-overlay">
      <div className="blur-[3px] pointer-events-none select-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background/90 backdrop-blur-sm rounded-md border p-4 max-w-[280px] w-full shadow-sm">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-semibold">{feature}</p>
            <p className="text-xs text-muted-foreground">
              {requiredPlan}プラン以上で利用可能
            </p>
            <Link href="/pricing">
              <Button size="sm" data-testid="button-upgrade-overlay">
                <Crown className="w-3.5 h-3.5 mr-1.5" />
                アップグレード
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureLockedInline({
  feature,
  requiredPlan = "Basic",
}: {
  feature: string;
  requiredPlan?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3" data-testid="feature-locked-inline">
      <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <p className="text-xs text-muted-foreground flex-1">
        {feature}は<span className="font-medium text-foreground">{requiredPlan}プラン</span>以上で利用できます
      </p>
      <Link href="/pricing">
        <Button size="sm" variant="outline" data-testid="button-upgrade-inline">
          詳細
        </Button>
      </Link>
    </div>
  );
}
