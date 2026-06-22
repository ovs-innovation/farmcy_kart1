const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Setting = require("../models/Setting");
const admin = require("../config/firebase-admin");
const { sendEmail } = require("./email-sender/sender");
const { refundSuccessEmail } = require("./email-sender/templates/refund-success");
const { storeBaseUrl } = require("./email-sender/simple-templates");
const { resolveCustomerContact } = require("./customer-contact");
const { notifyCustomerInbox } = require("./customer-inbox-notifications");

const formatRefundDate = (date = new Date()) =>
  date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatAmount = (total, currency = "₹") =>
  `${currency}${Number(total || 0).toFixed(2)}`;

/**
 * Sends refund-completed email and optional FCM push when admin marks order Refunded.
 * Sets refundEmailSent only after email succeeds to allow retry on failure.
 */
const sendRefundCompletedNotifications = async (order) => {
  if (!order || order.refundEmailSent) {
    return { skipped: true, reason: "already_sent" };
  }

  const contact = await resolveCustomerContact(order, order.user_info || {});
  const email = contact.email;
  if (!email) {
    console.warn(
      `[refund] No customer email for order ${order._id}; skipping refund notification`
    );
    return { skipped: true, reason: "no_email" };
  }

  const globalSetting = await Setting.findOne({ name: "globalSetting" });
  const settings = globalSetting?.setting || {};
  const shopName = settings.shop_name || "Farmacykart";
  const currency =
    order.company_info?.currency || settings.default_currency || "₹";
  const contactEmail = settings.email || undefined;
  const supportPhone = settings.contact || "";

  const refundMethod = order.paymentMethod || "Original payment method";
  const refundDate = formatRefundDate(new Date());

  const template = refundSuccessEmail({
    name: order.user_info?.name || "Customer",
    invoice: order.invoice,
    orderId: order._id.toString(),
    refund_amount: Number(order.total || 0).toFixed(2),
    currency,
    refund_date: refundDate,
    refund_method: refundMethod,
    settlementDays: "3–5 business days",
    shop_name: shopName,
    support_phone: supportPhone,
  });

  const emailBody = {
    to: email,
    replyTo: contactEmail,
    subject: `Farmacykart – Refund processed for order #${order.invoice}`,
    html: template.html,
    text: template.text,
    emailType: "refund-completed",
  };

  await sendEmail(emailBody);
  console.log(
    `[refund] Email sent to ${email} for order #${order.invoice} (${order._id})`
  );

  await Order.updateOne(
    { _id: order._id },
    { $set: { refundEmailSent: true, refundNotifiedAt: new Date() } }
  );

  await sendRefundPushNotification(order, shopName);

  await notifyCustomerInbox(order.user, {
    title: "Refund Completed",
    description: `Your refund of ${formatAmount(order.total, currency)} for order #${order.invoice} has been processed.`,
    notificationType: "refunded",
    clickAction: `/order/${order._id}`,
    campaignId: order._id,
  });

  return { sent: true };
};

const sendRefundPushNotification = async (order, shopName) => {
  try {
    if (!order.user) return;

    const user = await Customer.findById(order.user).select("fcmToken name");
    if (!user?.fcmToken) return;

    const invoice = order.invoice || order._id.toString().slice(-6);
    const currency =
      order.company_info?.currency || "₹";
    const amount = formatAmount(order.total, currency);

    const message = {
      notification: {
        title: `Refund processed – Order #${invoice}`,
        body: `Your refund of ${amount} has been initiated. It will be credited to your original payment method within 3–5 business days.`,
      },
      data: {
        orderId: order._id.toString(),
        click_action: `/order/${order._id}`,
        type: "REFUND_COMPLETED",
      },
      token: user.fcmToken,
    };

    await admin.messaging().send(message);
    console.log(
      `[refund] FCM push sent to ${user.name || "customer"} for order #${invoice}`
    );
  } catch (error) {
    console.warn("[refund] FCM push failed:", error.message);
  }
};

module.exports = {
  sendRefundCompletedNotifications,
  sendRefundPushNotification,
};
