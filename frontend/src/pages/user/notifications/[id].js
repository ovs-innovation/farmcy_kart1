import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  FiArrowLeft,
  FiBell,
  FiExternalLink,
  FiTrash2,
} from "react-icons/fi";

import Layout from "@layout/Layout";
import useCustomerAuth from "@hooks/useCustomerAuth";
import CustomerNotificationServices from "@services/CustomerNotificationServices";
import {
  invalidateCustomerNotifications,
  resolveLink,
  typeBadgeClass,
  typeLabel,
} from "@utils/notificationHelpers";
import { notifyError, notifySuccess } from "@utils/toast";

import LoadingForSession from "@components/preloader/LoadingForSession";

const NotificationDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const { isLoggedIn, isAuthLoading, authStatus } = useCustomerAuth();
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customerNotificationDetail", id],
    queryFn: () => CustomerNotificationServices.getById(id),
    enabled: isLoggedIn && !!id,
  });

  const notification = data?.notification;

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!isLoggedIn) router.replace("/auth/login?redirectUrl=notifications");
  }, [authStatus, isLoggedIn, router]);


  useEffect(() => {
    if (!notification?._id || notification.status !== "unread") return;
    CustomerNotificationServices.markAsRead(notification._id)
      .then(() => invalidateCustomerNotifications(queryClient))
      .catch(() => {});
  }, [notification?._id, notification?.status, queryClient]);

  const handleDelete = async () => {
    if (!notification?._id) return;
    if (!window.confirm("Delete this notification?")) return;
    setDeleting(true);
    try {
      await CustomerNotificationServices.deleteNotification(notification._id);
      invalidateCustomerNotifications(queryClient);
      notifySuccess("Notification deleted");
      router.push("/user/notifications");
    } catch (err) {
      notifyError(err?.message || "Could not delete notification");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenLink = () => {
    const href = resolveLink(notification?.clickAction);
    if (href === "/") return;
    if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
    else router.push(href);
  };

  if (isAuthLoading || authStatus === "loading") {
    return (
      <Layout title="Notification" description="Notification details">
        <LoadingForSession />
      </Layout>
    );
  }

  if (!isLoggedIn) return null;


  return (
    <Layout title="Notification" description="Notification details">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/user/notifications"
          className="inline-flex items-center gap-2 text-sm font-semibold text-store-600 hover:text-store-700 mb-6"
        >
          <FiArrowLeft />
          All notifications
        </Link>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 text-sm">
            Loading...
          </div>
        ) : isError || !notification ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
            <p className="text-red-700 font-medium">Notification not found</p>
            <Link
              href="/user/notifications"
              className="inline-block mt-4 text-sm font-semibold text-store-600 hover:underline"
            >
              Back to notifications
            </Link>
          </div>
        ) : (
          <article className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {notification.image ? (
              <a
                href={notification.image}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-900/5"
                title="Open full image in new tab"
              >
                <img
                  src={notification.image}
                  alt={notification.title}
                  className="w-full max-h-[min(70vh,520px)] object-contain mx-auto"
                />
              </a>
            ) : (
              <div className="h-48 bg-gradient-to-br from-store-100 to-store-200 flex items-center justify-center">
                <FiBell className="text-5xl text-store-500" />
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${typeBadgeClass(
                    notification.notificationType
                  )}`}
                >
                  {typeLabel(notification.notificationType)}
                </span>
                <span className="text-xs text-gray-400">
                  {dayjs(notification.createdAt).format("DD MMM YYYY, h:mm A")}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {notification.title}
              </h1>

              {notification.description ? (
                <p className="mt-4 text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {notification.description}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                {notification.clickAction &&
                  notification.clickAction !== "/" && (
                    <button
                      type="button"
                      onClick={handleOpenLink}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-store-600 text-white text-sm font-semibold hover:bg-store-700 transition-colors"
                    >
                      <FiExternalLink />
                      Open link
                    </button>
                  )}
                {notification.image && (
                  <a
                    href={notification.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-store-300 text-store-700 text-sm font-semibold hover:bg-store-50 transition-colors"
                  >
                    <FiExternalLink />
                    Full image
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <FiTrash2 />
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </article>
        )}
      </div>
    </Layout>
  );
};

export default NotificationDetailPage;
