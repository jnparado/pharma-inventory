import { getNotifications, isSupabaseConfigured } from "@/lib/data";
import { getActiveUser } from "@/lib/user-session";
import { TopBar } from "./top-bar";

export async function TopBarWrapper() {
  if (!isSupabaseConfigured()) {
    return (
      <TopBar user={null} notifications={[]} unreadCount={0} />
    );
  }

  try {
    const [notifications, activeUser] = await Promise.all([
      getNotifications(),
      getActiveUser(),
    ]);
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
      <TopBar
        user={activeUser}
        notifications={notifications}
        unreadCount={unreadCount}
      />
    );
  } catch {
    return (
      <TopBar user={null} notifications={[]} unreadCount={0} />
    );
  }
}
