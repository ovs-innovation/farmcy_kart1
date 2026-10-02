const mongoose = require("mongoose");
const Order = require("../models/Order");
const ShiprocketEventLog = require("../models/ShiprocketEventLog");
const { syncShiprocketTracking } = require("../services/shiprocketSyncService");

/**
 * Handles incoming webhooks from Shiprocket.
 * Route: POST /api/webhooks/shiprocket
 */
const handleShiprocketWebhook = async (req, res) => {
  try {
    // Verify token if set in env (case-insensitive & trimmed)
    const webhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN?.trim();
    const incomingToken = (
      req.headers["x-api-key"] ||
      req.headers["authorization"] ||
      req.headers["token"] ||
      ""
    ).toString().replace(/^Bearer\s+/i, "").trim();

    if (webhookToken && incomingToken && incomingToken !== webhookToken) {
      console.warn("Shiprocket Webhook: Unauthorized access attempt with invalid token.");
      return res.status(401).send({ message: "Unauthorized: Invalid API Key" });
    }

    const payload = req.body || {};
    console.log("Shiprocket Webhook Received:", JSON.stringify(payload, null, 2));

    const awb = payload.awb || payload.awb_code;
    const shipmentId = payload.shipment_id;
    const externalOrderId = payload.order_id;

    // Handle Shiprocket Test Webhook ping / sample payload
    if (!awb && !shipmentId && !externalOrderId) {
      return res.status(200).send({
        success: true,
        message: "Shiprocket test webhook ping acknowledged successfully",
      });
    }

    // Construct deterministic eventId for persistent deduplication
    const eventStatus = payload.current_status || payload.shipment_status || payload.status || "update";
    const eventTime = payload.timestamp || payload.updated_at || "";
    const eventId = payload.event_id || payload.event || `${awb || shipmentId}_${eventStatus}_${eventTime}`;

    if (eventId) {
      const existingLog = await ShiprocketEventLog.findOne({ eventId });
      if (existingLog) {
        console.log(`Shiprocket Webhook: Event ${eventId} already processed. Skipping.`);
        return res.status(200).send({ message: "Duplicate webhook event acknowledged." });
      }
    }

    // Find the order in our database safely without Mongoose CastErrors
    let order = null;

    if (externalOrderId) {
      if (mongoose.isValidObjectId(externalOrderId)) {
        order = await Order.findById(externalOrderId);
      }
      if (!order) {
        order = await Order.findOne({
          $or: [
            { invoice: externalOrderId },
            { "shiprocket.order_id": externalOrderId },
          ],
        });
      }
    }

    if (!order && awb) {
      order = await Order.findOne({ "shiprocket.awb_code": awb });
    }

    if (!order && shipmentId) {
      order = await Order.findOne({ "shiprocket.shipment_id": shipmentId });
    }

    if (!order) {
      console.warn(`Shiprocket Webhook: Order not found for AWB ${awb} / Shipment ${shipmentId} / ExtOrder ${externalOrderId}`);
      return res.status(200).send({ message: "Order not found, but webhook acknowledged" });
    }

    // Sync the tracking data using our reusable service
    await syncShiprocketTracking(order._id, payload);

    // Save event log to prevent duplicate processing
    if (eventId) {
      await ShiprocketEventLog.create({
        eventId,
        awb: String(awb || ""),
        shipmentId: String(shipmentId || ""),
        orderId: order._id,
        eventType: String(eventStatus),
        payload,
      }).catch((err) => {
        console.warn("Event log creation skipped (duplicate key):", err.message);
      });
    }

    res.status(200).send({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Shiprocket Webhook Error:", error);
    // Return 200 to prevent Shiprocket from reporting failed curl responses
    res.status(200).send({ success: false, message: error.message });
  }
};

const testWebhook = async (req, res) => {
  res.status(200).send({ success: true, message: "Shiprocket webhook endpoint active" });
};

module.exports = {
  handleShiprocketWebhook,
  testWebhook,
};
