import { getSafeString } from "@utils/translate";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FiBell } from "react-icons/fi";

import CustomerNotificationServices from "@services/CustomerNotificationServices";
import useCustomerAuth from "@hooks/useCustomerAuth";

const WebsiteAnnouncements = () => {
  const { isLoggedIn } = useCustomerAuth();

  const { data } = useQuery({
    queryKey: ["publicAnnouncements"],
    queryFn: () => CustomerNotificationServices.getPublicAnnouncements(3),
    staleTime: 2 * 60 * 1000,
  });

  const items = data?.announcements || [];
  if (!items.length) return null;

  return (
    <section className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-4">
      <div className="rounded-xl border border-store-200 bg-store-50/80 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-store-100 bg-white">
          <FiBell className="text-store-600" />
          <h2 className="text-sm font-bold text-gray-800">Offers &amp; Updates</h2>
          {isLoggedIn && (
            <Link
              href="/user/notifications"
              className="ml-auto text-xs font-semibold text-store-600 hover:underline"
            >
              My notifications
            </Link>
          )}
        </div>
        <ul className="divide-y divide-store-100">
          {items.map((item) => (
            <li key={item._id}>
              <Link
                href={
                  item.clickAction && item.clickAction !== "/"
                    ? item.clickAction.startsWith("/")
                      ? item.clickAction
                      : `/${item.clickAction}`
                    : "/user/notifications"
                }
                className="flex gap-3 px-4 py-3 hover:bg-white transition-colors"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-100"
                  />
                ) : (
                  <span className="w-14 h-14 rounded-lg bg-store-100 flex items-center justify-center text-store-600 shrink-0">
                    <FiBell />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="font-semibold text-gray-800 text-sm block">
                    {getSafeString(item?.title, null, "")}
                  </span>
                  {item.description ? (
                    <span className="text-xs text-gray-600 line-clamp-2">
                      {getSafeString(item?.description, null, "")}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default WebsiteAnnouncements;
