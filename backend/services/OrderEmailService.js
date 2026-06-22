const { sendEmail } = require("../lib/email-sender/sender");
const Setting = require("../models/Setting");
const { orderConfirmationBody } = require("../lib/email-sender/templates/order-to-customer");
const { resolveCustomerContact } = require("../lib/customer-contact");

const getEmailLogoUrl = async () => {
  try {
    const storeCustomizationSetting = await Setting.findOne(
      { name: "storeCustomizationSetting" },
      { "setting.navbar.logo": 1, "setting.seo.favicon": 1, _id: 0 }
    );
    const adminLogo =
      storeCustomizationSetting?.setting?.navbar?.logo ||
      storeCustomizationSetting?.setting?.seo?.favicon ||
      "";
    if (adminLogo && String(adminLogo).trim()) return String(adminLogo).trim();
  } catch (_) {}

  if (process.env.STORE_LOGO_URL) return process.env.STORE_LOGO_URL;
  const base = (process.env.STORE_URL || "https://farmacykart.com").replace(/\/$/, "");
  return `${base}/favicon.png`;
};

const PLACEHOLDER_EMAIL_DOMAIN = "phone.farmacykart.com";
const isPlaceholderEmail = (email) =>
  !!email && String(email).toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
const getRealEmail = (email) => {
  if (!email) return "";
  const normalized = String(email).trim().toLowerCase();
  if (!normalized || isPlaceholderEmail(normalized)) return "";
  return normalized;
};

class OrderEmailService {
  static async getBaseOptions(order) {
    const globalSetting = await Setting.findOne({ name: "globalSetting" });
    const shopName = globalSetting?.setting?.shop_name || "Farmacykart";
    const contactEmail = globalSetting?.setting?.email || "support@farmacykart.com";
    const currency = order.company_info?.currency || "₹";
    const logo = await getEmailLogoUrl();

    return {
      name: order.user_info?.name || "Customer",
      invoice: order.invoice,
      total: order.total,
      currency,
      date: new Date(order.createdAt).toLocaleDateString(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentMethod === "Cash On Delivery" ? "Pending" : "Confirmed",
      status: order.status || "Pending",
      deliveryAddress: order.user_info?.address,
      cart: order.cart || [],
      trackingUrl: `${process.env.STORE_URL}/user/dashboard`,
      contact_email: contactEmail,
      shop_name: shopName,
      logo,
    };
  }

  static async sendOrderConfirmation(order) {
    const contact = await resolveCustomerContact(order, order.user_info || {});
   const customerEmail =
  contact.email && String(contact.email).trim()
    ? String(contact.email).trim()
    : "";
    if (!customerEmail) return false;

    try {
      const options = await this.getBaseOptions(order);
      options.name = contact.name || options.name;
      const emailBody = {
        to: customerEmail,
        replyTo: options.contact_email,
        subject: `Your FarmacyKart Order Has Been Confirmed`,
        html: orderConfirmationBody(options),
        emailType: "order-confirmation",
      };

      await sendEmail(emailBody);
      return true;
    } catch (error) {
      console.error("Order confirmation email failed:", error.message);
      return false;
    }
  }

  static async sendOrderPacked(order) {
    // For future implementation
    console.log("OrderEmailService.sendOrderPacked called");
  }

  static async sendOrderShipped(order) {
    // For future implementation
    console.log("OrderEmailService.sendOrderShipped called");
  }

  static async sendOutForDelivery(order) {
    // For future implementation
    console.log("OrderEmailService.sendOutForDelivery called");
  }

  static async sendOrderDelivered(order) {
    // For future implementation
    console.log("OrderEmailService.sendOrderDelivered called");
  }
}

module.exports = OrderEmailService;
