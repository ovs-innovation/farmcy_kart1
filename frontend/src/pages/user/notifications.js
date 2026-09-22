import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBell } from "react-icons/fi";

import Layout from "@layout/Layout";
import useCustomerAuth from "@hooks/useCustomerAuth";
import CustomerNotificationServices from "@services/CustomerNotificationServices";
import NotificationListItem from "@components/notification/NotificationListItem";
import {
  invalidateCustomerNotifications,
  resolveLink,
} from "@utils/notificationHelpers";
import { notifyError, notifySuccess } from "@utils/toast";

import LoadingForSession from "@components/preloader/LoadingForSession";

const NotificationsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoggedIn, isAuthLoading, authStatus, userId } = useCustomerAuth();
  const [deletingId, setDeletingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customerNotificationsAll", userId],
    queryFn: () =>
      CustomerNotificationServices.getMyNotifications({ limit: 50, page: 1 }),
    enabled: isLoggedIn && !!userId,
  });

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!isLoggedIn) router.replace("/auth/login?redirectUrl=notifications");
  }, [authStatus, isLoggedIn, router]);

  if (isAuthLoading || authStatus === "loading") {
    return (
      <Layout title="Notifications" description="Your notifications">
        <LoadingForSession />
      </Layout>
    );
  }

  if (!isLoggedIn) return null;


  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleClick = async (item) => {
    if (item.status === "unread") {
      await CustomerNotificationServices.markAsRead(item._id);
      invalidateCustomerNotifications(queryClient);
    }
    const href = resolveLink(item.clickAction);
    if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
    else router.push(href);
  };

  const handleImageClick = (item) => {
    router.push(`/user/notifications/${item._id}`);
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this notification?")) return;
    setDeletingId(item._id);
    try {
      await CustomerNotificationServices.deleteNotification(item._id);
      invalidateCustomerNotifications(queryClient);
      notifySuccess("Notification deleted");
    } catch (err) {
      notifyError(err?.message || "Could not delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAll = async () => {
    await CustomerNotificationServices.markAllAsRead();
    invalidateCustomerNotifications(queryClient);
    notifySuccess("All marked as read");
  };

  return (
    <Layout title="Notifications" description="Your notifications">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Notifications
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tap an image to view it full size. Offers and updates from
              Farmacykart.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="shrink-0 text-sm font-semibold text-store-600 hover:text-store-700 px-3 py-1.5 rounded-lg hover:bg-store-50"
            >
              Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 text-sm">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 text-center py-20 px-6">
            <span className="inline-flex w-16 h-16 rounded-2xl bg-store-100 text-store-500 items-center justify-center mb-4">
              <FiBell className="text-3xl" />
            </span>
            <p className="font-semibold text-gray-700">No notifications yet</p>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              When admin sends offers or updates, they will show up here and in
              the bell icon.
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
            {notifications.map((item) => (
              <li key={item._id}>
                <NotificationListItem
                  item={item}
                  showRelativeTime={false}
                  onBodyClick={handleClick}
                  onImageClick={handleImageClick}
                  onDelete={handleDelete}
                  deleting={deletingId === item._id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage;
