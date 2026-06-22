const ReturnRequest = require("../models/ReturnRequest");
const Order = require("../models/Order");
const Setting = require("../models/Setting");
const { dispatchCampaign } = require("../lib/notification-dispatch");
const { sendRefundCompletedNotifications } = require("../lib/order-refund-notifications");
const { sendReturnRequestSubmittedEmail } = require("../lib/return-request-notifications");
const { notifyCustomerInbox } = require("../lib/customer-inbox-notifications");
const {
  ACTIVE_RETURN_STATUSES,
  REFUND_ALLOWED_FROM_STATUSES,
  REFUND_ONLY_STATUSES,
  REPLACEMENT_ONLY_STATUSES,
  isRefundModeEnabled,
  findActiveReturnForOrder,
  validateAndBuildReturnItems,
  buildEligibilityResult,
  isWithinReturnWindow,
} = require("../lib/return-request-utils");

const REFUND_ONLY_SET = new Set(REFUND_ONLY_STATUSES);
const REPLACEMENT_ONLY_SET = new Set(REPLACEMENT_ONLY_STATUSES);

const STATUS_TRANSITIONS = {
  Initiated: ["Under Review", "Rejected"],
  "Under Review": ["Approved", "Approved for Replacement", "Rejected"],
  Approved: ["Pickup Scheduled", "Rejected"],
  "Pickup Scheduled": ["Picked Up", "Rejected"],
  "Picked Up": ["QC Verification", "Rejected"],
  "QC Verification": ["Refund Initiated", "Refunded", "Rejected"],
  "Refund Initiated": ["Refunded", "Rejected"],
  "Approved for Replacement": ["Replacement Created", "Rejected"],
  "Replacement Created": ["Replacement Shipped", "Rejected"],
  "Replacement Shipped": ["Replacement Delivered", "Rejected"],
  Refunded: [],
  "Replacement Delivered": [],
  Rejected: [],
};

const ADMIN_UPDATABLE_STATUSES = [
  "Under Review",
  "Approved",
  "Pickup Scheduled",
  "Picked Up",
  "QC Verification",
  "Refund Initiated",
  "Refunded",
  "Rejected",
  "Approved for Replacement",
  "Replacement Created",
  "Replacement Shipped",
  "Replacement Delivered",
];

const validateResolutionPath = (request, nextStatus) => {
  const resolution = request.resolutionType || "pending";

  if (REFUND_ONLY_SET.has(nextStatus) && resolution === "replacement") {
    return "This return is on the replacement path and cannot move to a refund status.";
  }

  if (REPLACEMENT_ONLY_SET.has(nextStatus) && resolution === "refund") {
    return "This return is on the refund path and cannot move to a replacement status.";
  }

  if (nextStatus === "Refunded" && resolution === "replacement") {
    return "Replacement requests cannot be marked as Refunded. Complete the replacement delivery instead.";
  }

  if (
    REPLACEMENT_ONLY_SET.has(nextStatus) &&
    resolution === "pending" &&
    nextStatus !== "Approved for Replacement"
  ) {
    return "Approve the request for replacement before progressing the replacement workflow.";
  }

  if (
    REFUND_ONLY_SET.has(nextStatus) &&
    resolution === "pending" &&
    !["Approved", "Pickup Scheduled", "Picked Up", "QC Verification", "Refund Initiated", "Refunded"].includes(nextStatus)
  ) {
    // allowed — first refund-path status sets resolution
  }

  return null;
};

const applyResolutionType = (request, nextStatus) => {
  if (nextStatus === "Approved for Replacement" || REPLACEMENT_ONLY_SET.has(nextStatus)) {
    request.resolutionType = "replacement";
  } else if (nextStatus === "Approved" || REFUND_ONLY_SET.has(nextStatus)) {
    request.resolutionType = "refund";
  }
};

const getShopName = async () => {
  try {
    const globalSetting = await Setting.findOne({ name: "globalSetting" });
    return globalSetting?.setting?.shop_name || "Farmacykart";
  } catch {
    return "Farmacykart";
  }
};

// Create a new return request
exports.createReturnRequest = async (req, res) => {
  try {
    const { orderId, items, returnReason, customerNotes, images, refundMethod } = req.body;
    const userId = req.user._id;

    if (!orderId) {
      return res.status(400).json({ message: "Order id is required." });
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (String(order.status).toLowerCase() !== "delivered") {
      return res.status(400).json({ message: "Can only return delivered orders." });
    }

    if (!(await isRefundModeEnabled())) {
      return res.status(403).json({ message: "Return requests are temporarily unavailable." });
    }

    if (!isWithinReturnWindow(order)) {
      return res.status(400).json({
        message:
          "Return window expired. Returns are allowed within 7 days of delivery.",
        code: "RETURN_WINDOW_EXPIRED",
      });
    }

    const activeReturn = await findActiveReturnForOrder(orderId, userId);
    if (activeReturn) {
      return res.status(409).json({
        message: "An active return request already exists for this order.",
        code: "DUPLICATE_RETURN_REQUEST",
        returnId: activeReturn.returnId,
        activeReturnId: activeReturn._id,
        status: activeReturn.status,
      });
    }

    let validatedItems;
    let refundAmount;
    try {
      const built = validateAndBuildReturnItems(order, items);
      validatedItems = built.items;
      refundAmount = built.refundAmount;
    } catch (validationErr) {
      return res.status(400).json({ message: validationErr.message });
    }

    const newRequest = new ReturnRequest({
      user: userId,
      order: orderId,
      items: validatedItems,
      returnReason,
      customerNotes: customerNotes || "",
      images: Array.isArray(images) ? images.slice(0, 3) : [],
      refundMethod: refundMethod || "Original Payment Method",
      refundAmount,
      resolutionType: "pending",
      status: "Initiated",
      timeline: [
        {
          status: "Initiated",
          message: "Return request submitted successfully.",
          timestamp: new Date(),
        },
      ],
    });

    const savedRequest = await newRequest.save();

    order.status = "Refund Requested";
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: "Refund Requested",
      note: `Return request #${savedRequest.returnId || savedRequest._id} submitted`,
      updatedAt: new Date(),
    });
    await order.save();

    sendReturnRequestSubmittedEmail(savedRequest, order).catch((err) => {
      console.error("[return] Submitted email error:", err.message || err);
    });

    notifyCustomerInbox(userId, {
      title: "Return Submitted",
      description: `Your return request for order #${order.invoice} has been submitted.`,
      notificationType: "return_submitted",
      clickAction: `/returns/${savedRequest._id}`,
      campaignId: savedRequest._id,
    }).catch((err) => {
      console.error("[return] Inbox notification error:", err.message || err);
    });

    res.status(201).json({
      message: "Return request created successfully",
      returnRequest: savedRequest,
    });
  } catch (error) {
    console.error("Create return request error:", error);
    res.status(500).json({ message: "Failed to create return request", error: error.message });
  }
};

exports.getReturnEligibility = async (req, res) => {
  try {
    const userId = req.user._id;
    const order = await Order.findOne({ _id: req.params.orderId, user: userId });
    if (!order) {
      return res.status(404).json({ eligible: false, reason: "Order not found." });
    }

    const result = await buildEligibilityResult(order, userId);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ eligible: false, reason: "Failed to check return eligibility." });
  }
};

// Get all return requests for a customer
exports.getUserReturnRequests = async (req, res) => {
  try {
    const requests = await ReturnRequest.find({ user: req.user._id })
      .populate("order", "invoice")
      .populate("items.product", "title image")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return requests" });
  }
};

// Get single return request by ID (for customer or admin)
exports.getReturnRequestById = async (req, res) => {
  try {
    const request = await ReturnRequest.findById(req.params.id)
      .populate("user", "name email")
      .populate("order", "invoice status")
      .populate("items.product", "title image");

    if (!request) {
      return res.status(404).json({ message: "Return request not found" });
    }

    const requestUserId =
      request.user?._id?.toString?.() || String(request.user);

    if (req.user.role === "customer" && requestUserId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return request details" });
  }
};

// --- ADMIN ROUTES ---

exports.getAllReturnRequests = async (req, res) => {
  try {
    const requests = await ReturnRequest.find()
      .populate("user", "name email")
      .populate("order", "invoice")
      .sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return requests" });
  }
};

exports.updateReturnRequestStatus = async (req, res) => {
  try {
    const {
      status,
      adminNotes,
      message,
      pickupDate,
      replacementOrderId,
      replacementTrackingNumber,
      replacementTrackingUrl,
    } = req.body;

    if (!ADMIN_UPDATABLE_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await ReturnRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Return request not found" });
    }

    if (request.status === status) {
      return res.status(400).json({ message: `Return request is already ${status}.` });
    }

    const allowedNext = STATUS_TRANSITIONS[request.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from "${request.status}" to "${status}".`,
      });
    }

    const pathError = validateResolutionPath(request, status);
    if (pathError) {
      return res.status(400).json({ message: pathError });
    }

    if (status === "Refunded") {
      if (!REFUND_ALLOWED_FROM_STATUSES.includes(request.status)) {
        return res.status(400).json({
          message: "Return must be approved and verified before marking as Refunded.",
        });
      }

      const order = await Order.findById(request.order);
      if (!order) {
        return res.status(404).json({ message: "Linked order not found." });
      }
      if (order.status === "Refunded") {
        return res.status(400).json({ message: "Order has already been refunded." });
      }
    }

    if (status === "Replacement Delivered") {
      const order = await Order.findById(request.order);
      if (!order) {
        return res.status(404).json({ message: "Linked order not found." });
      }
      if (request.resolutionType !== "replacement") {
        return res.status(400).json({
          message: "Only replacement-path requests can be marked as Replacement Delivered.",
        });
      }
    }

    const previousStatus = request.status;
    applyResolutionType(request, status);
    request.status = status;
    if (adminNotes) {
      request.adminNotes = adminNotes;
    }
    if (pickupDate) {
      request.pickupDate = new Date(pickupDate);
    }
    if (replacementOrderId) {
      request.replacementOrderId = replacementOrderId;
    }
    if (replacementTrackingNumber) {
      request.replacementTrackingNumber = replacementTrackingNumber;
    }
    if (replacementTrackingUrl) {
      request.replacementTrackingUrl = replacementTrackingUrl;
    }

    request.timeline.push({
      status,
      message: message || `Status updated to ${status}`,
      timestamp: new Date(),
    });

    await request.save();

    if (status === "Refunded") {
      const updatedOrder = await Order.findByIdAndUpdate(
        request.order,
        {
          $set: { status: "Refunded" },
          $push: {
            statusHistory: {
              status: "Refunded",
              note: message || `Return request #${request.returnId || request._id} refunded`,
              updatedAt: new Date(),
            },
          },
        },
        { new: true }
      );

      sendRefundCompletedNotifications(updatedOrder).catch((err) => {
        console.error(
          `[return] Refund completed notification failed for order ${request.order}:`,
          err.message || err
        );
      });
    } else if (status === "Replacement Delivered") {
      await Order.findByIdAndUpdate(request.order, {
        $set: { status: "Delivered" },
        $push: {
          statusHistory: {
            status: "Delivered",
            note:
              message ||
              `Replacement delivered for return request #${request.returnId || request._id}`,
            updatedAt: new Date(),
          },
        },
      });
    } else if (status === "Rejected") {
      await Order.findByIdAndUpdate(request.order, {
        $set: { status: "Delivered" },
        $push: {
          statusHistory: {
            status: "Delivered",
            note: message || `Return request #${request.returnId || request._id} rejected`,
            updatedAt: new Date(),
          },
        },
      });
    } else if (status === "Approved for Replacement") {
      await Order.findByIdAndUpdate(request.order, {
        $push: {
          statusHistory: {
            status: "Refund Requested",
            note: `Return #${request.returnId || request._id} approved for replacement`,
            updatedAt: new Date(),
          },
        },
      });
    }

    if (status !== "Refunded") {
      try {
        const shopName = await getShopName();
        const order = await Order.findById(request.order).select("invoice");
        const invoiceLabel = order?.invoice ? `#${order.invoice}` : "";
        const isReplacementUpdate = REPLACEMENT_ONLY_SET.has(status);
        const isRefundInitiated = status === "Refund Initiated";

        let notificationType = "return";
        if (isRefundInitiated) notificationType = "refund_initiated";
        else if (status === "Replacement Shipped") notificationType = "replacement_shipped";
        else if (status === "Replacement Delivered") notificationType = "replacement_delivered";
        else if (isReplacementUpdate) notificationType = "replacement";

        await dispatchCampaign({
          title: isReplacementUpdate
            ? `Replacement Update: ${status}`
            : isRefundInitiated
              ? "Refund Initiated"
              : `Return Request ${status}`,
          description:
            message ||
            (isReplacementUpdate
              ? `Your replacement request ${invoiceLabel} has been updated to ${status}.`
              : isRefundInitiated
                ? `Refund has been initiated for your return ${invoiceLabel}.`
                : `Your return request ${invoiceLabel} has been updated to ${status}.`),
          image: "",
          clickAction: "/returns",
          target: "Single",
          customerId: request.user,
          channels: { push: true, sms: false, email: true },
          shopName,
          notificationType,
          campaignId: request._id,
        });
      } catch (notifyErr) {
        console.error("Failed to send return notification:", notifyErr);
      }
    }

    res.status(200).json({
      message: `Return request marked as ${status}`,
      returnRequest: request,
      previousStatus,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};

exports.getReturnReasons = async (req, res) => {
  try {
    const reasons = [
      "Wrong Item Delivered",
      "Damaged Product",
      "Expired Medicine",
      "Missing Item",
      "Not Required",
      "Other",
    ];
    res.status(200).json(reasons);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return reasons", error: error.message });
  }
};

module.exports = exports;
