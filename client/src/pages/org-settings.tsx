import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Crown,
  UserMinus,
  Shield,
  Users,
  LinkIcon,
  BarChart3,
} from "lucide-react";
import type { Organization, OrganizationMember } from "@shared/schema";

type OrgWithRole = Organization & { role: string };

export default function OrgSettingsPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const orgId = parseInt(id || "0");

  const { data: org, isLoading: orgLoading } = useQuery<OrgWithRole>({
    queryKey: ["/api/org", orgId],
    enabled: orgId > 0,
  });

  const { data: members, isLoading: membersLoading } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/org", orgId, "members"],
    enabled: orgId > 0,
  });

  const isAdmin = org?.role === "admin";

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/org/${orgId}/invite`);
      return res.json();
    },
    onSuccess: async (data: { inviteCode: string }) => {
      const inviteUrl = `${window.location.origin}/org/join/${data.inviteCode}`;
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "招待リンクをコピーしました" });
      } catch {
        toast({ title: "招待コード", description: data.inviteCode });
      }
    },
    onError: (error: Error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/org/${orgId}/members/${userId}`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org", orgId, "members"] });
      toast({ title: "ロールを変更しました" });
    },
    onError: (error: Error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/org/${orgId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org", orgId, "members"] });
      toast({ title: "メンバーを削除しました" });
    },
    onError: (error: Error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/org/${orgId}/members/${user?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org"] });
      toast({ title: "組織を退出しました" });
      navigate("/org");
    },
    onError: (error: Error) => {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    },
  });

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-40 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">組織が見つかりません</p>
          <Link href="/org">
            <Button variant="outline" data-testid="button-back-to-orgs">組織一覧に戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/org">
              <Button size="icon" variant="ghost" data-testid="button-back-to-orgs">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="font-bold text-base truncate" data-testid="text-org-title">{org.name}</h1>
            {isAdmin && <Badge variant="secondary" className="text-[10px]">管理者</Badge>}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending}
              data-testid="button-copy-invite"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "コピーしました" : "招待リンクをコピー"}
            </Button>
            <Link href={`/org/${orgId}/dashboard`}>
              <Button variant="outline" className="gap-2" data-testid="button-go-dashboard">
                <BarChart3 className="w-4 h-4" />
                ダッシュボード
              </Button>
            </Link>
          </div>
        )}

        <Card className="p-4" data-testid="card-members">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              メンバー ({members?.length || 0})
            </h2>
          </div>

          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30"
                  data-testid={`member-row-${member.userId}`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {member.userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" data-testid={`text-member-id-${member.userId}`}>
                      {member.userId}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("ja-JP") : ""} 参加
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {member.role === "admin" ? (
                      <Badge variant="default" className="text-[10px] gap-1">
                        <Crown className="w-3 h-3" />
                        管理者
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">メンバー</Badge>
                    )}
                    {isAdmin && member.userId !== user?.id && (
                      <div className="flex items-center gap-1">
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            updateRoleMutation.mutate({ userId: member.userId, role: value })
                          }
                        >
                          <SelectTrigger className="w-auto text-[10px]" data-testid={`select-role-${member.userId}`}>
                            <Shield className="w-3 h-3" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">管理者</SelectItem>
                            <SelectItem value="member">メンバー</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-remove-${member.userId}`}>
                              <UserMinus className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>メンバーを削除</AlertDialogTitle>
                              <AlertDialogDescription>
                                このメンバーを組織から削除してもよろしいですか？
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeMemberMutation.mutate(member.userId)}
                                data-testid={`button-confirm-remove-${member.userId}`}
                              >
                                削除する
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              メンバーがいません
            </p>
          )}
        </Card>

        {!isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full text-destructive" data-testid="button-leave-org">
                組織を退出する
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>組織を退出</AlertDialogTitle>
                <AlertDialogDescription>
                  「{org.name}」から退出してもよろしいですか？再参加するには招待コードが必要です。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => leaveMutation.mutate()}
                  data-testid="button-confirm-leave"
                >
                  退出する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
