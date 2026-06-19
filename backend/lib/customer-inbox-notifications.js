const mongoose = require("mongoose");
const CustomerNotification = require("../models/CustomerNotification");

const toObjectId = (customerId) => {
  if (!customerId) return null;
  try {
    return new mongoose.Types.ObjectId(String(customerId));
  } catch {
    return null;
  }
};

/**
 * Create a single customer inbox row. Failures are logged and never thrown.
 */
const notifyCustomerInbox = async (
  customerId,
  {
    title,
    description = "",
    notificationType = "order",
    clickAction = "/",
    campaignId,
  }
) => {
  const oid = toObjectId(customerId);
  if (!oid || !title) return { created: 0 };

  try {
    await CustomerNotification.create({
      customerId: oid,
      campaignId: campaignId || undefined,
      title,
      description,
      image: "",
      clickAction,
      notificationType,
      channels: { push: false, sms: false, email: false },
      status: "unread",
    });
    return { created: 1 };
  } catch (err) {
    console.error("[inbox] notifyCustomerInbox failed:", err.message);
    return { created: 0, error: err.message };
  }
};

const INBOX_STATUS_TITLES = {
  "Order Placed": { title: "Order Placed", type: "order_placed" },
  Pending: { title: "Order Placed", type: "order_placed" },
  Processing: { title: "Order Processing", type: "order" },
  Accepted: { title: "Order Accepted", type: "order" },
  Packed: { title: "Order Packed", type: "order" },
  Shipped: { title: "Order Shipped", type: "order_shipped" },
  OutForDelivery: { title: "Out for Delivery", type: "order" },
  Delivered: { title: "Order Delivered", type: "order_delivered" },
  Refunded: { title: "Refund Completed", type: "refunded" },
};

const notifyOrderStatusInbox = async (order, status, message) => {
  if (!order?.user || !status) return;
  const meta = INBOX_STATUS_TITLES[status] || {
    title: `Order Update: ${status}`,
    type: "order",
  };
  const invoice = order.invoice ? `#${order.invoice}` : "";
  await notifyCustomerInbox(order.user, {
    title: meta.title,
    description:
      message ||
      `Your order ${invoice} status is now ${status}.`.trim(),
    notificationType: meta.type,
    clickAction: `/order/${order._id}`,
    campaignId: order._id,
  });
};

module.exports = {
  notifyCustomerInbox,
  notifyOrderStatusInbox,
};
