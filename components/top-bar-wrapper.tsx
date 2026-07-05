import { getNotifications, getUsers, isSupabaseConfigured } from "@/lib/data";
import { getActiveUser } from "@/lib/user-session";
import { TopBar } from "./top-bar";

export async function TopBarWrapper() {
  if (!isSupabaseConfigured()) {
    return (
      <TopBar
        user={null}
        users={[]}
        notifications={[]}
        unreadCount={0}
      />
    );
  }

  try {
    const [users, notifications, activeUser] = await Promise.all([
      getUsers(),
      getNotifications(),
      getActiveUser(),
    ]);
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
      <TopBar
        user={activeUser}
        users={users}
        notifications={notifications}
        unreadCount={unreadCount}
      />
    );
  } catch {
    return (
      <TopBar
        user={null}
        users={[]}
        notifications={[]}
        unreadCount={0}
      />
    );
  }
}
