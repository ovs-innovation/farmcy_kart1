const crypto = require("crypto");

/**
 * Verify Razorpay payment signature (order_id|payment_id HMAC-SHA256).
 * @see https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/#step-5-verify-payment-signature
 */
const verifyRazorpayPaymentSignature = (
  { razorpay_order_id, razorpay_payment_id, razorpay_signature },
  secret
) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { valid: false, message: "Missing Razorpay payment verification fields." };
  }
  if (!secret) {
    return { valid: false, message: "Razorpay secret is not configured." };
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return { valid: false, message: "Invalid Razorpay payment signature." };
  }

  return { valid: true };
};

module.exports = {
  verifyRazorpayPaymentSignature,
};
