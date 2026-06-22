const Customer = require("../models/Customer");

const PLACEHOLDER_EMAIL_DOMAIN = "phone.farmacykart.com";

const PROFILE_INCOMPLETE_MESSAGE =
  "Please complete your profile before placing an order.";

const ORDER_PHONE_REQUIRED_MESSAGE =
  "A valid phone number is required to place an order.";

const ORDER_ADDRESS_REQUIRED_MESSAGE =
  "Please provide a complete delivery address.";

const isPlaceholderEmail = (email) =>
  !!email && String(email).toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

const isFakeName = (name) => {
  if (!name || !String(name).trim()) return false;
  const trimmed = String(name).trim();
  return trimmed.startsWith("User ") && /^User\s\d+$/i.test(trimmed);
};

const getRealEmail = (email) => {
  if (!email) return "";
  const normalized = String(email).trim().toLowerCase();
  if (!normalized || isPlaceholderEmail(normalized)) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return "";
  return normalized;
};

const normalizePhone = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const hasRealFullName = (customer) => {
  if (!customer?.name) return false;
  const name = String(customer.name).trim();
  return name.length > 0 && !isFakeName(name);
};

const hasRealEmail = (customer) => getRealEmail(customer?.email).length > 0;

const isProfileCompleteForOrder = (customer) =>
  hasRealFullName(customer) && hasRealEmail(customer);

const hasCompleteDeliveryAddress = (userInfo = {}) => {
  const houseNo = String(userInfo.houseNo || "").trim();
  const area = String(userInfo.area || "").trim();
  const city = String(userInfo.city || "").trim();
  const zipCode = String(userInfo.zipCode || "").trim();
  const landmark = String(userInfo.landmark || "").trim();
  const addressLine = String(userInfo.address || "").trim();

  if (!city || !zipCode) return false;

  const street = area || landmark || houseNo || addressLine;
  return !!street;
};

/**
 * Validates authenticated customer profile for order placement.
 * Fetches latest profile from database.
 */

const assertCustomerReadyForOrder = async (userId, userInfo = {}) => {
  if (!userId) {
    return { ok: false, message: "Authentication required to place an order." };
  }

  const customer = await Customer.findById(userId)
    .select("name email phone phoneVerified age gender")
    .lean();

  if (!customer) {
    return { ok: false, message: "Customer not found." };
  }

  const phone = normalizePhone(userInfo.contact || customer.phone);
  if (!phone || phone.length < 10) {
    return { ok: false, message: ORDER_PHONE_REQUIRED_MESSAGE };
  }

  if (!hasCompleteDeliveryAddress(userInfo)) {
    return { ok: false, message: ORDER_ADDRESS_REQUIRED_MESSAGE };
  }

  return { ok: true, customer };
};


const assertCustomerProfileForOrder = async (userId) => {
  if (!userId) {
    return { ok: false, message: PROFILE_INCOMPLETE_MESSAGE };
  }

  const customer = await Customer.findById(userId)
    .select("name email phone")
    .lean();

  if (!customer || !isProfileCompleteForOrder(customer)) {
    return { ok: false, message: PROFILE_INCOMPLETE_MESSAGE };
  }

  return { ok: true, customer };
};

/** Overlay DB profile name/email onto order user_info (never use checkout email). */

/** Merge checkout user_info with optional DB profile fields. */
const applyCustomerProfileToUserInfo = (userInfo = {}, customer) => {
  const info = { ...userInfo };

  const checkoutName = String(userInfo.name || "").trim();
  const checkoutEmail = getRealEmail(userInfo.email);
  const dbName =
    customer?.name && !isFakeName(customer.name)
      ? String(customer.name).trim()
      : "";
  const dbEmail = getRealEmail(customer?.email);

  info.name = checkoutName || dbName || "Customer";
  info.email = checkoutEmail || dbEmail || "";
  info.contact = normalizePhone(userInfo.contact || customer?.phone) || "";

  return info;
};

module.exports = {
  PROFILE_INCOMPLETE_MESSAGE,
  isPlaceholderEmail,
  isFakeName,
  getRealEmail,
  hasRealFullName,
  hasRealEmail,
  isProfileCompleteForOrder,
  assertCustomerProfileForOrder,
  applyCustomerProfileToUserInfo,
  ORDER_PHONE_REQUIRED_MESSAGE,
  ORDER_ADDRESS_REQUIRED_MESSAGE,
  normalizePhone,
  hasCompleteDeliveryAddress,
  assertCustomerReadyForOrder,
};
