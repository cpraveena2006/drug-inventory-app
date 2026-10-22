import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Bell } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useNotifications, useMarkAllNotificationsRead } from "../hooks/useInventoryQueries";
import { notificationService } from "../services/notifications";

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (error) => toast.error(error.response?.data?.message || "Could not mark notification read"),
  });
  const items = data?.items || [];
  return <section className="page inventory-page">
    <div className="page-intro"><div><span className="page-eyebrow">ACTIVITY CENTER</span><h2>Notifications</h2><p>Supplier alerts and system updates for your account.</p></div>
      <Button variant="secondary" disabled={!data?.unreadCount || markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck size={15} /> Mark all read</Button>
    </div>
    {isLoading ? <Skeleton rows={5} /> : isError ? <EmptyState title="Could not load notifications" description="Check the connection and try again." /> : items.length === 0 ? <EmptyState title="You're all caught up" description="New activity notifications will appear here." /> :
      <div className="request-list">{items.map((item) => <article className={`request-card notification-card${item.readAt ? "" : " unread"}`} key={item._id}>
        <div className="request-heading"><div className="notification-title"><Bell size={16} /><div><h3>{item.title}</h3><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>
          {!item.readAt && <Button size="sm" variant="secondary" disabled={markOne.isPending} onClick={() => markOne.mutate(item._id)}>Mark read</Button>}
        </div>
      </article>)}</div>}
  </section>;
}
