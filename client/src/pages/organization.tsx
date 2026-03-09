import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import {
  Building2,
  Plus,
  UserPlus,
  Users,
  ChevronRight,
  ArrowLeft,
  Crown,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import type { Organization } from "@shared/schema";

const createOrgSchema = z.object({
  name: z.string().min(1, "組織名を入力してください").max(50, "50文字以内で入力してください"),
});

const joinOrgSchema = z.object({
  code: z.string().min(1, "招待コードを入力してください"),
});

type OrgWithCheckout = Organization & { checkoutUrl?: string };

export default function OrganizationPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const search = useSearch();
  const redirectedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("canceled") === "true") {
      toast({ title: "決済がキャンセルされました", description: "組織は作成されましたが、法人プランは未契約です", variant: "destructive" });
    }
  }, [search]);

  const { data: orgs, isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/org"],
  });

  const createForm = useForm<z.infer<typeof createOrgSchema>>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "" },
  });

  const joinForm = useForm<z.infer<typeof joinOrgSchema>>({
    resolver: zodResolver(joinOrgSchema),
    defaultValues: { code: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createOrgSchema>) => {
      const res = await apiRequest("POST", "/api/org", data);
      return res.json();
    },
    onSuccess: (org: OrgWithCheckout) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org"] });
      createForm.reset();

      if (org.checkoutUrl && !redirectedRef.current) {
        redirectedRef.current = true;
        toast({ title: "組織を作成しました", description: "法人プランの決済画面に移動します" });
        window.location.href = org.checkoutUrl;
      } else {
        toast({ title: "組織を作成しました", description: org.name });
        navigate(`/org/${org.id}/settings`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (data: z.infer<typeof joinOrgSchema>) => {
      const res = await apiRequest("POST", `/api/org/join/${data.code}`);
      return res.json();
    },
    onSuccess: (org: Organization) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org"] });
      joinForm.reset();
      toast({ title: "組織に参加しました", description: org.name });
    },
    onError: (error: Error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button size="icon" variant="ghost" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="font-bold text-base">組織管理</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <Card className="p-4 bg-primary/5 border-primary/20" data-testid="card-enterprise-info">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">法人プラン</p>
              <p className="text-xs text-muted-foreground">
                ¥10,000/アカウント/月の従量課金。組織作成時にStripe決済が必要です。メンバー追加・削除時に自動で課金が調整されます。
              </p>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-2 flex-wrap">
          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="button-create-org" className="gap-2">
                <Plus className="w-4 h-4" />
                組織を作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しい組織を作成</DialogTitle>
              </DialogHeader>
              <div className="mb-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    組織作成後、法人プラン（¥10,000/アカウント/月）のStripe決済画面に移動します。管理者自身も1アカウントとしてカウントされます。
                  </p>
                </div>
              </div>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>組織名</FormLabel>
                        <FormControl>
                          <Input placeholder="例: 営業チームA" {...field} data-testid="input-org-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending} data-testid="button-submit-create-org">
                    <CreditCard className="w-4 h-4" />
                    {createMutation.isPending ? "作成中..." : "作成して決済に進む"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-join-org" className="gap-2">
                <UserPlus className="w-4 h-4" />
                招待コードで参加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>組織に参加</DialogTitle>
              </DialogHeader>
              <Form {...joinForm}>
                <form onSubmit={joinForm.handleSubmit((data) => joinMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={joinForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>招待コード</FormLabel>
                        <FormControl>
                          <Input placeholder="招待コードを入力" {...field} data-testid="input-invite-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={joinMutation.isPending} data-testid="button-submit-join-org">
                    {joinMutation.isPending ? "参加中..." : "参加する"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">所属組織</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-md" />
              ))}
            </div>
          ) : orgs && orgs.length > 0 ? (
            orgs.map((org) => (
              <Card
                key={org.id}
                className="p-4 hover-elevate cursor-pointer"
                onClick={() => navigate(`/org/${org.id}/settings`)}
                data-testid={`card-org-${org.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" data-testid={`text-org-name-${org.id}`}>{org.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {org.createdBy === user?.id && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Crown className="w-3 h-3" /> 管理者
                        </span>
                      )}
                      {org.subscriptionStatus === "active" ? (
                        <Badge variant="default" className="text-[10px] h-4 bg-emerald-500">契約中</Badge>
                      ) : org.subscriptionStatus === "canceled" ? (
                        <Badge variant="secondary" className="text-[10px] h-4">解約済み</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4">未契約</Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6">
              <div className="text-center space-y-2">
                <Users className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  まだ組織に参加していません
                </p>
                <p className="text-xs text-muted-foreground">
                  組織を作成するか、招待コードで参加しましょう
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
