/**
 * Centralized Phone Normalization and Query Utilities
 * 
 * Standardizes phone number parsing, canonical formatting, and query variant generation
 * across signup, login, Firebase authentication, and database lookups.
 */

/**
 * Normalizes any phone string to a canonical 10-digit numeric string.
 * @param {string|number} phone - Raw input phone number
 * @returns {string} - Clean 10-digit phone string, or raw digits if < 10 digits
 */
const normalizePhone = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  // For Indian numbers or numbers prefixed with country code (91), extract last 10 digits
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

/**
 * Converts a phone number to standard E.164 format (+91XXXXXXXXXX for India).
 * @param {string|number} phone - Raw input phone number
 * @param {string} countryCode - Country dial code without plus (default: "91")
 * @returns {string} - E.164 formatted phone number (e.g. "+919876543210")
 */
const toE164 = (phone, countryCode = "91") => {
  const norm10 = normalizePhone(phone);
  if (!norm10 || norm10.length < 10) return "";
  return `+${countryCode}${norm10}`;
};

/**
 * Builds an array of phone string variants matching all legacy and modern database formats.
 * @param {string|number} phone - Raw phone number
 * @returns {string[]} - Array of possible database representations: ["9876543210", "+919876543210", "919876543210", "09876543210"]
 */
const buildPhoneQueryVariants = (phone) => {
  const norm10 = normalizePhone(phone);
  if (!norm10 || norm10.length < 10) {
    const raw = String(phone || "").trim();
    return raw ? [raw] : [];
  }

  const variants = [
    norm10,                  // 10 digits: "9876543210"
    `+91${norm10}`,          // E.164: "+919876543210"
    `91${norm10}`,           // 12 digits: "919876543210"
    `0${norm10}`,            // Leading zero: "09876543210"
  ];

  return [...new Set(variants)];
};

/**
 * Checks if two phone numbers represent the same phone entity.
 * @param {string|number} phoneA 
 * @param {string|number} phoneB 
 * @returns {boolean}
 */
const isSamePhone = (phoneA, phoneB) => {
  const a = normalizePhone(phoneA);
  const b = normalizePhone(phoneB);
  if (!a || !b) return false;
  return a === b;
};

const PLACEHOLDER_EMAIL_DOMAIN = "phone.farmacykart.com";

/**
 * Builds a deterministic placeholder email for phone-only customer accounts.
 * @param {string|number} phone 
 * @returns {string}
 */
const buildPlaceholderEmail = (phone) => {
  const norm10 = normalizePhone(phone);
  return `${norm10 || Date.now()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
};

/**
 * Checks if an email is a system-generated placeholder email.
 * @param {string} email 
 * @returns {boolean}
 */
const isPlaceholderEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const lower = email.toLowerCase().trim();
  return (
    lower.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`) ||
    lower.includes("phone.farmacykart.com") ||
    lower.includes("placeholder")
  );
};

module.exports = {
  normalizePhone,
  toE164,
  buildPhoneQueryVariants,
  isSamePhone,
  buildPlaceholderEmail,
  isPlaceholderEmail,
  PLACEHOLDER_EMAIL_DOMAIN,
};
