const ReturnRequest = require("../models/ReturnRequest");
const Setting = require("../models/Setting");

const RETURN_WINDOW_DAYS = 7;

const ACTIVE_RETURN_STATUSES = [
  "Initiated",
  "Under Review",
  "Approved",
  "Pickup Scheduled",
  "Picked Up",
  "QC Verification",
  "Refund Initiated",
  "Approved for Replacement",
  "Replacement Created",
  "Replacement Shipped",
];

const TERMINAL_RETURN_STATUSES = ["Refunded", "Rejected", "Replacement Delivered"];

const REFUND_ONLY_STATUSES = [
  "Approved",
  "Pickup Scheduled",
  "Picked Up",
  "QC Verification",
  "Refund Initiated",
  "Refunded",
];

const REPLACEMENT_ONLY_STATUSES = [
  "Approved for Replacement",
  "Replacement Created",
  "Replacement Shipped",
  "Replacement Delivered",
];

const REFUND_ALLOWED_FROM_STATUSES = [
  "QC Verification",
  "Refund Initiated",
  "Picked Up",
  "Approved",
  "Pickup Scheduled",
];

const getCartProductId = (cartItem) => {
  if (!cartItem) return null;
  if (cartItem.productId) return String(cartItem.productId);
  if (cartItem.product?._id) return String(cartItem.product._id);
  if (cartItem.product && typeof cartItem.product === "string") return cartItem.product;
  if (cartItem._id) return String(cartItem._id);
  if (cartItem.id) return String(cartItem.id);
  return null;
};

const getCartItemPrice = (cartItem) => {
  const price =
    cartItem?.prices?.price ??
    cartItem?.price ??
    cartItem?.prices?.originalPrice ??
    0;
  return Number(price) || 0;
};

/**
 * Latest delivery timestamp from status history, or updatedAt fallback for Delivered orders.
 */
const getOrderDeliveredAt = (order) => {
  if (!order) return null;

  const entries = [];
  for (const h of order.statusHistory || []) {
    if (String(h.status).toLowerCase() === "delivered") {
      entries.push(new Date(h.updatedAt || h.timestamp || 0));
    }
  }
  for (const h of order.trackingHistory || []) {
    if (String(h.status).toLowerCase() === "delivered") {
      entries.push(new Date(h.timestamp || h.updatedAt || 0));
    }
  }

  if (entries.length) {
    return new Date(Math.max(...entries.map((d) => d.getTime())));
  }

  if (String(order.status).toLowerCase() === "delivered") {
    return order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt);
  }

  return null;
};

const isWithinReturnWindow = (order) => {
  const deliveredAt = getOrderDeliveredAt(order);
  if (!deliveredAt) return false;
  const windowEnd = new Date(deliveredAt);
  windowEnd.setDate(windowEnd.getDate() + RETURN_WINDOW_DAYS);
  return new Date() <= windowEnd;
};

const getReturnWindowDaysRemaining = (order) => {
  const deliveredAt = getOrderDeliveredAt(order);
  if (!deliveredAt) return 0;
  const windowEnd = new Date(deliveredAt);
  windowEnd.setDate(windowEnd.getDate() + RETURN_WINDOW_DAYS);
  const ms = windowEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
};

const isRefundModeEnabled = async () => {
  try {
    const setting = await Setting.findOne({ name: "refundSetting" });
    if (!setting?.setting) return true;
    return setting.setting.refundMode !== false;
  } catch {
    return true;
  }
};

const findActiveReturnForOrder = async (orderId, userId) => {
  return ReturnRequest.findOne({
    order: orderId,
    user: userId,
    status: { $in: ACTIVE_RETURN_STATUSES },
  });
};

const findOverlappingActiveReturn = async (orderId, userId, productIds) => {
  const active = await ReturnRequest.find({
    order: orderId,
    user: userId,
    status: { $in: ACTIVE_RETURN_STATUSES },
  });

  if (!active.length) return null;

  const requested = new Set(productIds.map(String));
  for (const req of active) {
    const activeProductIds = (req.items || []).map((i) => String(i.product));
    const overlap = activeProductIds.some((id) => requested.has(id));
    if (overlap || activeProductIds.length > 0) {
      return req;
    }
  }

  return active[0];
};

const validateAndBuildReturnItems = (order, requestedItems) => {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new Error("At least one item is required for a return request.");
  }

  const cart = order.cart || [];
  const validated = [];
  let refundAmount = 0;
  const seenProducts = new Set();

  for (const reqItem of requestedItems) {
    const reqProductId = String(reqItem.product || "");
    if (!reqProductId) {
      throw new Error("Each return item must include a product id.");
    }
    if (seenProducts.has(reqProductId)) {
      throw new Error("Duplicate products in return request.");
    }
    seenProducts.add(reqProductId);

    const cartItem = cart.find((c) => getCartProductId(c) === reqProductId);
    if (!cartItem) {
      throw new Error("One or more selected items are not part of this order.");
    }

    const orderedQty = Number(cartItem.quantity) || 1;
    const reqQty = Number(reqItem.quantity) || 0;
    if (reqQty < 1 || reqQty > orderedQty) {
      throw new Error(
        `Invalid quantity for product ${reqProductId}. Maximum allowed: ${orderedQty}.`
      );
    }

    const price = getCartItemPrice(cartItem);
    validated.push({
      product: reqProductId,
      quantity: reqQty,
      price,
    });
    refundAmount += price * reqQty;
  }

  return { items: validated, refundAmount };
};

const buildEligibilityResult = async (order, userId) => {
  if (!order) {
    return { eligible: false, reason: "Order not found." };
  }

  if (String(order.status).toLowerCase() !== "delivered") {
    return {
      eligible: false,
      reason: "Only delivered orders can be returned.",
      orderStatus: order.status,
    };
  }

  const refundMode = await isRefundModeEnabled();
  if (!refundMode) {
    return { eligible: false, reason: "Return requests are temporarily unavailable." };
  }

  const deliveredAt = getOrderDeliveredAt(order);
  if (!deliveredAt) {
    return { eligible: false, reason: "Delivery date could not be verified for this order." };
  }

  if (!isWithinReturnWindow(order)) {
    return {
      eligible: false,
      reason: `Return window expired. Returns are allowed within ${RETURN_WINDOW_DAYS} days of delivery.`,
      deliveredAt,
      returnWindowDays: RETURN_WINDOW_DAYS,
    };
  }

  const activeReturn = await findActiveReturnForOrder(order._id, userId);
  if (activeReturn) {
    return {
      eligible: false,
      reason: "An active return request already exists for this order.",
      activeReturnId: activeReturn._id,
      activeReturnStatus: activeReturn.status,
      returnId: activeReturn.returnId,
    };
  }

  return {
    eligible: true,
    deliveredAt,
    daysRemaining: getReturnWindowDaysRemaining(order),
    returnWindowDays: RETURN_WINDOW_DAYS,
  };
};

module.exports = {
  RETURN_WINDOW_DAYS,
  ACTIVE_RETURN_STATUSES,
  TERMINAL_RETURN_STATUSES,
  REFUND_ALLOWED_FROM_STATUSES,
  REFUND_ONLY_STATUSES,
  REPLACEMENT_ONLY_STATUSES,
  getCartProductId,
  getOrderDeliveredAt,
  isWithinReturnWindow,
  getReturnWindowDaysRemaining,
  isRefundModeEnabled,
  findActiveReturnForOrder,
  findOverlappingActiveReturn,
  validateAndBuildReturnItems,
  buildEligibilityResult,
};
