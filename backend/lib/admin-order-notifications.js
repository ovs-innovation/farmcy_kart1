const Notification = require("../models/Notification");

/**
 * Create admin bell notification for a new order. Idempotent per orderId.
 */
const createAdminOrderNotification = async (order) => {
  if (!order?._id) {
    return { created: false, reason: "missing_order" };
  }

  try {
    const existing = await Notification.findOne({
      orderId: order._id,
      notificationType: "new_order",
    }).lean();

    if (existing) {
      console.log("[AUDIT] ADMIN_NOTIFICATION_CREATED:skipped-duplicate", {
        orderId: String(order._id),
        notificationId: String(existing._id),
      });
      return { created: false, duplicate: true, notification: existing };
    }

    const customerName = order.user_info?.name || "Customer";
    const orderAmount = Number(order.total) || 0;
    const invoice = order.invoice ?? "";

    const notification = await Notification.create({
      orderId: order._id,
      message: `New order #${invoice} from ${customerName} — ₹${orderAmount}`,
      notificationType: "new_order",
      customerName,
      orderAmount,
      status: "unread",
    });

    console.log("[AUDIT] ADMIN_NOTIFICATION_CREATED", {
      orderId: String(order._id),
      notificationId: String(notification._id),
      invoice,
      customerName,
      orderAmount,
    });

    return { created: true, notification };
  } catch (err) {
    console.error("[AUDIT] ADMIN_NOTIFICATION_CREATED:failed", err.message);
    return { created: false, error: err.message };
  }
};

module.exports = { createAdminOrderNotification };
