import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";
import type { OrgNotification } from "@shared/schema";

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery<OrgNotification[]>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              data-testid="badge-notification-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm" data-testid="text-notifications-title">
            通知
          </h3>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications && notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 border-b border-border last:border-b-0 cursor-pointer ${
                  notif.isRead ? "opacity-60" : ""
                }`}
                onClick={() => {
                  if (!notif.isRead) {
                    markReadMutation.mutate(notif.id);
                  }
                }}
                data-testid={`notification-item-${notif.id}`}
              >
                <p className="text-xs leading-relaxed">{notif.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {notif.createdAt
                    ? new Date(notif.createdAt).toLocaleString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">通知はありません</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
