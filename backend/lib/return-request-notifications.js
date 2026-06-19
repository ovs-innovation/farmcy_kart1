const Order = require("../models/Order");
const Setting = require("../models/Setting");
const { sendEmail } = require("./email-sender/sender");
const {
  returnRequestReceivedEmail,
  formatDate,
} = require("./email-sender/templates/return-request-received");
const { resolveCustomerContact } = require("./customer-contact");
const { notifyCustomerInbox } = require("./customer-inbox-notifications");

const getShopSettings = async () => {
  const globalSetting = await Setting.findOne({ name: "globalSetting" });
  const settings = globalSetting?.setting || {};
  return {
    shopName: settings.shop_name || "Farmacykart",
    contactEmail: settings.email || undefined,
  };
};

/**
 * Sends return-request-received email. Failures are logged and do not throw.
 */
const sendReturnRequestSubmittedEmail = async (returnRequest, order) => {
  try {
    const contact = await resolveCustomerContact(order, order?.user_info || {});
    const email = contact.email;
    if (!email) {
      console.warn(
        `[return] No valid customer email for return ${returnRequest._id}; skipping submitted email`
      );
      return { skipped: true, reason: "no_email" };
    }

    const { shopName, contactEmail } = await getShopSettings();
    const template = returnRequestReceivedEmail({
      name: order.user_info?.name || "Customer",
      returnId: returnRequest.returnId || returnRequest._id,
      invoice: order.invoice,
      submittedDate: formatDate(returnRequest.createdAt || new Date()),
      returnReason: returnRequest.returnReason,
      status: returnRequest.status || "Initiated",
      shop_name: shopName,
    });

    await sendEmail({
      to: email,
      replyTo: contactEmail,
      subject: "Return Request Received",
      html: template.html,
      text: template.text,
      emailType: "return-request-submitted",
    });

    console.log(
      `[return] Submitted email sent to ${email} for return #${returnRequest.returnId}`
    );
    return { sent: true };
  } catch (err) {
    console.error("[return] Submitted email failed (non-blocking):", err.message || err);
    return { sent: false, error: err.message };
  }
};

module.exports = {
  sendReturnRequestSubmittedEmail,
};
