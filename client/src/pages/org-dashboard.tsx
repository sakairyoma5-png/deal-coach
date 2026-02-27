import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Activity,
  ClipboardList,
  Plus,
  Trash2,
  UserX,
  CheckCircle2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { SkillCard, CurriculumAssignment } from "@shared/schema";

interface TrendData {
  week: string;
  avgScore: number;
  avgListening: number;
  avgQuestioning: number;
  avgEmpathy: number;
  avgClosing: number;
  practiceCount: number;
}

interface MemberDashboard {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  weeklyPracticeCount: number;
  avgScore: number;
  latestScore: number | null;
  latestListening: number | null;
  latestQuestioning: number | null;
  latestEmpathy: number | null;
  latestClosing: number | null;
  completionRate: number;
  curriculumTotal: number;
  curriculumCompleted: number;
}

interface DashboardData {
  members: MemberDashboard[];
  nonParticipants: MemberDashboard[];
  weekStart: string;
  totalMembers: number;
  totalCards: number;
  curriculum: Array<{ id: number; skillCardId: number }>;
}

interface EnrichedPracticeLog {
  id: number;
  orgId: number | null;
  userId: string;
  skillCardId: number | null;
  sessionId: number | null;
  score: number | null;
  listening: number | null;
  questioning: number | null;
  empathy: number | null;
  closing: number | null;
  practiceType: string;
  practicedAt: string | null;
  displayName: string;
  skillCardTitle: string;
}

function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  return {
    weekStart: weekStartDate.toISOString().split("T")[0],
    weekEnd: weekEndDate.toISOString().split("T")[0],
  };
}

export default function OrgDashboard() {
  const { id } = useParams<{ id: string }>();
  const orgId = parseInt(id || "0");
  const { toast } = useToast();
  const [selectedCardId, setSelectedCardId] = useState<string>("");

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ["/api/org", orgId, "dashboard"],
    enabled: orgId > 0,
  });

  const { data: practiceLogs, isLoading: logsLoading } = useQuery<EnrichedPracticeLog[]>({
    queryKey: ["/api/org", orgId, "practice-logs"],
    enabled: orgId > 0,
  });

  const { data: skillCards } = useQuery<SkillCard[]>({
    queryKey: ["/api/skill-cards"],
    enabled: orgId > 0,
  });

  const { data: curriculum } = useQuery<CurriculumAssignment[]>({
    queryKey: ["/api/org", orgId, "curriculum"],
    enabled: orgId > 0,
  });

  const { data: trends } = useQuery<TrendData[]>({
    queryKey: ["/api/org", orgId, "trends"],
    enabled: orgId > 0,
  });

  const assignMutation = useMutation({
    mutationFn: async (skillCardId: number) => {
      const { weekStart, weekEnd } = getWeekDates();
      await apiRequest("POST", `/api/org/${orgId}/curriculum`, {
        skillCardId,
        weekStart,
        weekEnd,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org", orgId, "curriculum"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org", orgId, "dashboard"] });
      setSelectedCardId("");
      toast({ title: "カリキュラムを追加しました" });
    },
    onError: () => {
      toast({ title: "カリキュラムの追加に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      await apiRequest("DELETE", `/api/org/${orgId}/curriculum/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org", orgId, "curriculum"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org", orgId, "dashboard"] });
      toast({ title: "カリキュラムを削除しました" });
    },
    onError: () => {
      toast({ title: "カリキュラムの削除に失敗しました", variant: "destructive" });
    },
  });

  const activeMembers = dashboard?.members.filter(m => m.weeklyPracticeCount > 0).length || 0;
  const totalMembers = dashboard?.totalMembers || 0;
  const participationRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

  const { weekStart } = getWeekDates();
  const currentWeekCurriculum = curriculum?.filter(c => c.weekStart === weekStart) || [];
  const assignedCardIds = new Set(currentWeekCurriculum.map(c => c.skillCardId));
  const availableCards = skillCards?.filter(c => !assignedCardIds.has(c.id)) || [];

  const curriculumNonCompleters = dashboard?.members.filter(m =>
    m.curriculumTotal > 0 && m.curriculumCompleted < m.curriculumTotal
  ) || [];

  if (dashLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button size="icon" variant="ghost" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="font-bold text-base" data-testid="text-dashboard-title">管理者ダッシュボード</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4" data-testid="card-stat-members">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">メンバー数</p>
                <p className="text-lg font-bold" data-testid="text-total-members">{totalMembers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4" data-testid="card-stat-participation">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">今週の参加率</p>
                <p className="text-lg font-bold" data-testid="text-participation-rate">{participationRate}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4" data-testid="card-stat-non-participants">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">未実施者</p>
                <p className="text-lg font-bold text-red-500" data-testid="text-non-participants-count">
                  {dashboard?.nonParticipants.length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1" data-testid="tab-overview">概要</TabsTrigger>
            <TabsTrigger value="curriculum" className="flex-1" data-testid="tab-curriculum">カリキュラム</TabsTrigger>
            <TabsTrigger value="logs" className="flex-1" data-testid="tab-logs">練習ログ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5 mt-4">
            {dashboard?.nonParticipants && dashboard.nonParticipants.length > 0 && (
              <Card className="p-4" data-testid="card-non-participants">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                  今週未実施のメンバー
                </h2>
                <div className="flex flex-wrap gap-2">
                  {dashboard.nonParticipants.map((member) => (
                    <Badge
                      key={member.userId}
                      variant="destructive"
                      data-testid={`badge-non-participant-${member.userId}`}
                    >
                      {member.displayName || member.email || member.userId}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-4" data-testid="card-member-scores">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                メンバー別スコア一覧
              </h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">メンバー</TableHead>
                      <TableHead className="text-center">今週の練習</TableHead>
                      <TableHead className="text-center">総合</TableHead>
                      <TableHead className="text-center">傾聴</TableHead>
                      <TableHead className="text-center">質問</TableHead>
                      <TableHead className="text-center">共感</TableHead>
                      <TableHead className="text-center">CL</TableHead>
                      <TableHead className="min-w-[120px]">履修率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard?.members.map((member) => {
                      const isNonParticipant = member.weeklyPracticeCount === 0;
                      return (
                        <TableRow
                          key={member.userId}
                          className={isNonParticipant ? "bg-red-500/5" : ""}
                          data-testid={`row-member-${member.userId}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate max-w-[100px]">
                                {member.displayName || member.email || member.userId}
                              </span>
                              {member.role === "admin" && (
                                <Badge variant="secondary" className="text-[10px]">管理者</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-medium ${isNonParticipant ? "text-red-500" : ""}`}>
                              {member.weeklyPracticeCount}回
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-bold">
                              {member.latestScore ?? "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm">{member.latestListening ?? "-"}</TableCell>
                          <TableCell className="text-center text-sm">{member.latestQuestioning ?? "-"}</TableCell>
                          <TableCell className="text-center text-sm">{member.latestEmpathy ?? "-"}</TableCell>
                          <TableCell className="text-center text-sm">{member.latestClosing ?? "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={member.completionRate} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground w-8 text-right">{member.completionRate}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {trends && trends.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-4" data-testid="card-growth-trends">
                  <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    成長推移（週次）
                  </h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="avgScore" name="総合" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="avgListening" name="傾聴" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="avgQuestioning" name="質問" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="avgEmpathy" name="共感" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="avgClosing" name="CL" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-4" data-testid="card-score-breakdown">
                  <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    スコア分解（最新週）
                  </h2>
                  {(() => {
                    const latest = trends[trends.length - 1];
                    const radarData = [
                      { axis: "傾聴", value: latest.avgListening },
                      { axis: "質問", value: latest.avgQuestioning },
                      { axis: "共感", value: latest.avgEmpathy },
                      { axis: "CL", value: latest.avgClosing },
                    ];
                    return (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                            <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                          </RadarChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {[
                            { label: "傾聴", value: latest.avgListening, color: "text-blue-500" },
                            { label: "質問", value: latest.avgQuestioning, color: "text-emerald-500" },
                            { label: "共感", value: latest.avgEmpathy, color: "text-amber-500" },
                            { label: "CL", value: latest.avgClosing, color: "text-red-500" },
                          ].map(item => (
                            <div key={item.label} className="text-center p-1.5 rounded-md bg-muted/30">
                              <p className="text-[10px] text-muted-foreground">{item.label}</p>
                              <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-5 mt-4">
            <Card className="p-4" data-testid="card-curriculum-assign">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                今週のカリキュラム指定
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                週: {weekStart}〜
              </p>

              <div className="flex items-center gap-2 mb-4">
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger className="flex-1" data-testid="select-skill-card">
                    <SelectValue placeholder="スキルカードを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCards.map((card) => (
                      <SelectItem key={card.id} value={String(card.id)} data-testid={`option-card-${card.id}`}>
                        {card.titleJa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (selectedCardId) {
                      assignMutation.mutate(parseInt(selectedCardId));
                    }
                  }}
                  disabled={!selectedCardId || assignMutation.isPending}
                  data-testid="button-assign-curriculum"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  追加
                </Button>
              </div>

              {currentWeekCurriculum.length > 0 ? (
                <div className="space-y-2">
                  {currentWeekCurriculum.map((assignment) => {
                    const card = skillCards?.find(c => c.id === assignment.skillCardId);
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-muted/30"
                        data-testid={`curriculum-item-${assignment.id}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{card?.titleJa || `カード #${assignment.skillCardId}`}</p>
                            <p className="text-[10px] text-muted-foreground">{card?.category || ""}</p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(assignment.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-curriculum-${assignment.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  今週のカリキュラムはまだ指定されていません
                </p>
              )}
            </Card>

            {curriculumNonCompleters.length > 0 && currentWeekCurriculum.length > 0 && (
              <Card className="p-4" data-testid="card-curriculum-non-completers">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-500">
                  <UserX className="w-4 h-4" />
                  カリキュラム未達者
                </h2>
                <div className="space-y-2">
                  {curriculumNonCompleters.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-red-500/5"
                      data-testid={`curriculum-incomplete-${member.userId}`}
                    >
                      <span className="text-xs font-medium truncate">
                        {member.displayName || member.email || member.userId}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Progress
                          value={member.curriculumTotal > 0 ? (member.curriculumCompleted / member.curriculumTotal) * 100 : 0}
                          className="h-2 w-16"
                        />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {member.curriculumCompleted}/{member.curriculumTotal}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {currentWeekCurriculum.length > 0 && curriculumNonCompleters.length === 0 && dashboard && dashboard.members.length > 0 && (
              <Card className="p-4" data-testid="card-curriculum-all-complete">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm font-medium">全メンバーがカリキュラムを完了しています</p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-5 mt-4">
            <Card className="p-4" data-testid="card-practice-logs">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                練習ログ
              </h2>
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : practiceLogs && practiceLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>メンバー</TableHead>
                        <TableHead>スキル</TableHead>
                        <TableHead className="text-center">スコア</TableHead>
                        <TableHead>日時</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {practiceLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                          <TableCell className="text-sm">{log.displayName}</TableCell>
                          <TableCell className="text-sm">{log.skillCardTitle}</TableCell>
                          <TableCell className="text-center">
                            {log.score != null ? (
                              <span className="text-sm font-medium">{log.score}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.practicedAt
                              ? new Date(log.practicedAt).toLocaleString("ja-JP", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  練習ログがありません
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
