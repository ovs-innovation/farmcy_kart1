const Customer = require("../models/Customer");

const PLACEHOLDER_EMAIL_DOMAIN = "phone.farmacykart.com";

const isPlaceholderEmail = (email) =>
  !!email && String(email).toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

const getRealEmail = (email) => {
  if (!email) return "";
  const normalized = String(email).trim().toLowerCase();
  if (!normalized || isPlaceholderEmail(normalized)) return "";
  return normalized;
};

/**
 * Resolve customer contact from DB — never trust checkout payload alone.
 */
const resolveCustomerContact = async (orderOrUserId, userInfo = {}) => {
  const userId = orderOrUserId?.user || orderOrUserId;
  if (userId) {
    const customer = await Customer.findById(userId)
      .select("name email phone")
      .lean();
    if (customer) {
      return {
        email:
          getRealEmail(customer.email) || getRealEmail(userInfo.email),
        name: customer.name || userInfo.name || "Customer",
        phone: customer.phone || userInfo.contact || "",
        customer,
      };
    }
  }

  return {
    email: getRealEmail(userInfo.email),
    name: userInfo.name || "Customer",
    phone: userInfo.contact || "",
    customer: null,
  };
};

module.exports = {
  PLACEHOLDER_EMAIL_DOMAIN,
  isPlaceholderEmail,
  getRealEmail,
  resolveCustomerContact,
};
