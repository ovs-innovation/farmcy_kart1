import { getSafeString } from "@utils/translate";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { FiBell, FiTrash2 } from "react-icons/fi";

dayjs.extend(relativeTime);

import {
  typeLabel,
  typeBadgeClass,
} from "@utils/notificationHelpers";

const NotificationListItem = ({
  item,
  compact = false,
  showRelativeTime = true,
  onBodyClick,
  onImageClick,
  onDelete,
  deleting = false,
}) => {
  const imageSize = compact ? "w-14 h-14" : "w-20 h-20";
  const padding = compact ? "px-4 py-3" : "p-4";

  const handleImageClick = (e) => {
    e.stopPropagation();
    if (item.image && onImageClick) onImageClick(item);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(item);
  };

  return (
    <div
      className={`group relative flex gap-3 ${padding} border-b border-gray-100 last:border-b-0 transition-colors ${
        item.status === "unread"
          ? "bg-gradient-to-r from-store-50/80 to-white"
          : "bg-white hover:bg-gray-50/80"
      }`}
    >
      {item.image ? (
        <button
          type="button"
          onClick={handleImageClick}
          className={`${imageSize} rounded-xl overflow-hidden shrink-0 border-2 border-store-200 shadow-sm hover:border-store-500 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-store-400`}
          title="View image"
        >
          <img
            src={item.image}
            alt={getSafeString(item?.title, null, "")}
            className="w-full h-full object-cover"
          />
        </button>
      ) : (
        <span
          className={`${imageSize} rounded-xl bg-gradient-to-br from-store-100 to-store-200 text-store-600 flex items-center justify-center shrink-0 shadow-sm`}
        >
          <FiBell className={compact ? "text-lg" : "text-2xl"} />
        </span>
      )}

      <button
        type="button"
        onClick={() => onBodyClick?.(item)}
        className="min-w-0 flex-1 text-left focus:outline-none"
      >
        <span className="flex items-start gap-2">
          <span
            className={`font-semibold text-gray-900 leading-snug ${
              compact ? "text-sm truncate" : "text-base"
            }`}
          >
            {getSafeString(item?.title, null, "")}
          </span>
          {item.status === "unread" && (
            <span className="mt-1.5 w-2 h-2 rounded-full bg-store-500 shrink-0" />
          )}
        </span>
        {item.description ? (
          <span
            className={`text-gray-600 block mt-1 ${
              compact ? "text-xs line-clamp-2" : "text-sm line-clamp-3"
            }`}
          >
            {getSafeString(item?.description, null, "")}
          </span>
        ) : null}
        <span className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${typeBadgeClass(
              item.notificationType
            )}`}
          >
            {typeLabel(item.notificationType)}
          </span>
          <span className="text-[11px] text-gray-400">
            {showRelativeTime
              ? dayjs(item.createdAt).fromNow()
              : dayjs(item.createdAt).format("DD MMM YYYY, h:mm A")}
          </span>
        </span>
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 self-start p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-70 group-hover:opacity-100 transition-all disabled:opacity-40"
          aria-label="Delete notification"
          title="Delete"
        >
          <FiTrash2 className="text-base" />
        </button>
      )}
    </div>
  );
};

export default NotificationListItem;
