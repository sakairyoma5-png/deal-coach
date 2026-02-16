import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plus,
  X,
  Check,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SkillCard, SkillCardStudyLog, ScheduledStudy } from "@shared/schema";

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthLabel = `${year}年${month + 1}月`;

  const { data: studyLogs, isLoading: logsLoading } = useQuery<SkillCardStudyLog[]>({
    queryKey: ["/api/calendar/study-logs", { month: monthStr }],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/study-logs?month=${monthStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: scheduled, isLoading: scheduledLoading } = useQuery<ScheduledStudy[]>({
    queryKey: ["/api/calendar/scheduled", { month: monthStr }],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/scheduled?month=${monthStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: skillCards } = useQuery<SkillCard[]>({
    queryKey: ["/api/skill-cards"],
  });

  const addScheduleMutation = useMutation({
    mutationFn: async ({ skillCardId, scheduledDate }: { skillCardId: number; scheduledDate: string }) => {
      await apiRequest("POST", "/api/calendar/schedule", { skillCardId, scheduledDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/scheduled", { month: monthStr }] });
      setShowAddDialog(false);
      setSearchQuery("");
      toast({ title: "学習予定を追加しました" });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/calendar/schedule/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/scheduled", { month: monthStr }] });
      toast({ title: "学習予定を削除しました" });
    },
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const studyLogsByDate: Record<string, number[]> = {};
  if (studyLogs) {
    for (const log of studyLogs) {
      const d = new Date(log.studiedAt!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!studyLogsByDate[key]) studyLogsByDate[key] = [];
      if (!studyLogsByDate[key].includes(log.skillCardId)) {
        studyLogsByDate[key].push(log.skillCardId);
      }
    }
  }

  const scheduledByDate: Record<string, ScheduledStudy[]> = {};
  if (scheduled) {
    for (const s of scheduled) {
      if (!scheduledByDate[s.scheduledDate]) scheduledByDate[s.scheduledDate] = [];
      scheduledByDate[s.scheduledDate].push(s);
    }
  }

  const getCardTitle = (id: number) => {
    return skillCards?.find(c => c.id === id)?.titleJa || `カード #${id}`;
  };

  const selectedStudied = selectedDate ? (studyLogsByDate[selectedDate] || []) : [];
  const selectedScheduled = selectedDate ? (scheduledByDate[selectedDate] || []) : [];
  const isPast = selectedDate ? selectedDate < todayStr : false;
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate ? selectedDate > todayStr : false;

  const filteredCards = skillCards?.filter(c =>
    c.titleJa.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-base">学習カレンダー</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button size="icon" variant="ghost" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-bold text-lg" data-testid="text-current-month">{monthLabel}</h2>
          <Button size="icon" variant="ghost" onClick={nextMonth} data-testid="button-next-month">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {(logsLoading || scheduledLoading) ? (
          <Skeleton className="h-64 w-full rounded-md" />
        ) : (
          <Card className="p-3">
            <div className="grid grid-cols-7 gap-0">
              {weekDays.map((d, i) => (
                <div key={d} className={`text-center text-xs font-medium py-1.5 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasStudied = (studyLogsByDate[dateStr]?.length || 0) > 0;
                const hasScheduled = (scheduledByDate[dateStr]?.length || 0) > 0;
                const isSelected = selectedDate === dateStr;
                const isCurrentDay = dateStr === todayStr;
                const dayOfWeek = new Date(year, month, day).getDay();

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-md text-sm relative transition-colors
                      ${isSelected ? "bg-primary text-primary-foreground" : ""}
                      ${isCurrentDay && !isSelected ? "ring-1 ring-primary" : ""}
                      ${dayOfWeek === 0 && !isSelected ? "text-red-400" : ""}
                      ${dayOfWeek === 6 && !isSelected ? "text-blue-400" : ""}
                    `}
                    data-testid={`calendar-day-${dateStr}`}
                  >
                    <span className="text-xs leading-none">{day}</span>
                    <div className="flex gap-0.5 mt-0.5">
                      {hasStudied && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-emerald-500"}`} />
                      )}
                      {hasScheduled && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-amber-500"}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                学習済み
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                予定あり
              </div>
            </div>
          </Card>
        )}

        {selectedDate && (
          <Card className="p-4 space-y-3" data-testid="card-day-detail">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-bold text-sm">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
              </h3>
              {(isToday || isFuture) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                  data-testid="button-add-schedule"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  予定追加
                </Button>
              )}
            </div>

            {selectedStudied.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  学習済み ({selectedStudied.length}枚)
                </p>
                {selectedStudied.map(cardId => (
                  <div key={cardId} className="flex items-center gap-2 pl-5">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{getCardTitle(cardId)}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedScheduled.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                  学習予定 ({selectedScheduled.length}枚)
                </p>
                {selectedScheduled.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 pl-5">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{getCardTitle(s.skillCardId)}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={() => deleteScheduleMutation.mutate(s.id)}
                      disabled={deleteScheduleMutation.isPending}
                      data-testid={`button-delete-schedule-${s.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {selectedStudied.length === 0 && selectedScheduled.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                {isPast ? "この日の学習記録はありません" : "予定はありません"}
              </p>
            )}
          </Card>
        )}
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-base">
              学習予定を追加
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="スキルカードを検索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-skill"
              />
            </div>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {filteredCards.slice(0, 20).map(card => {
                const alreadyScheduled = selectedScheduled.some(s => s.skillCardId === card.id);
                return (
                  <button
                    key={card.id}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover-elevate transition-colors ${alreadyScheduled ? "opacity-50" : ""}`}
                    disabled={alreadyScheduled || addScheduleMutation.isPending}
                    onClick={() => {
                      if (selectedDate) {
                        addScheduleMutation.mutate({ skillCardId: card.id, scheduledDate: selectedDate });
                      }
                    }}
                    data-testid={`button-schedule-card-${card.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{card.titleJa}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] flex-shrink-0">
                        {card.category}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              {filteredCards.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  該当するカードが見つかりません
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
