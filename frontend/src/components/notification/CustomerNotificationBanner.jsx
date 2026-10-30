import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBell, FiX } from "react-icons/fi";
import { useState } from "react";

import useCustomerAuth from "@hooks/useCustomerAuth";
import CustomerNotificationServices from "@services/CustomerNotificationServices";
import { getSafeString } from "@utils/translate";

const CustomerNotificationBanner = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoggedIn, userId } = useCustomerAuth();
  const [dismissedId, setDismissedId] = useState(null);

  const { data } = useQuery({
    queryKey: ["customerNotifications", userId, "banner"],
    queryFn: () =>
      CustomerNotificationServices.getMyNotifications({ limit: 1, page: 1 }),
    enabled: isLoggedIn,
    refetchInterval: isLoggedIn ? 45000 : false,
  });

  if (!isLoggedIn) return null;

  const latest = data?.notifications?.find((n) => n.status === "unread");
  if (!latest || dismissedId === latest._id) return null;

  const handleOpen = async () => {
    try {
      await CustomerNotificationServices.markAsRead(latest._id);
      queryClient.invalidateQueries({ queryKey: ["customerNotifications"] });
    } catch (_) {}
    const href =
      latest.clickAction && latest.clickAction !== "/"
        ? latest.clickAction.startsWith("http")
          ? latest.clickAction
          : latest.clickAction.startsWith("/")
          ? latest.clickAction
          : `/${latest.clickAction}`
        : "/user/notifications";
    if (href.startsWith("http")) window.open(href, "_blank");
    else router.push(href);
  };

  return (
    <div className="bg-store-600 text-white px-4 py-2.5 flex items-center gap-3 text-sm shadow-md">
      <FiBell className="shrink-0 text-lg" />
      <button
        type="button"
        onClick={handleOpen}
        className="flex-1 text-left min-w-0 hover:underline"
      >
        <span className="font-bold block truncate">{getSafeString(latest.title, null, "")}</span>
        {latest.description ? (
          <span className="text-white/90 text-xs line-clamp-1">{getSafeString(latest.description, null, "")}</span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => router.push("/user/notifications")}
        className="shrink-0 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full"
      >
        View all
      </button>
      <button
        type="button"
        onClick={() => setDismissedId(latest._id)}
        className="shrink-0 p-1 hover:bg-white/20 rounded"
        aria-label="Dismiss"
      >
        <FiX />
      </button>
    </div>
  );
};

export default CustomerNotificationBanner;
