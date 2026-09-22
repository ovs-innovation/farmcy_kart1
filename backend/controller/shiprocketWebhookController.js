const Order = require("../models/Order");
const ShiprocketEventLog = require("../models/ShiprocketEventLog");
const { syncShiprocketTracking } = require("../services/shiprocketSyncService");

/**
 * Handles incoming webhooks from Shiprocket.
 * Route: POST /api/webhooks/shiprocket
 */
const handleShiprocketWebhook = async (req, res) => {
  try {
    // Verify x-api-key if token is set in env
    const webhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    const incomingToken = req.headers["x-api-key"];

    if (webhookToken && incomingToken !== webhookToken) {
      console.warn("Shiprocket Webhook: Unauthorized access attempt with invalid token.");
      return res.status(401).send({ message: "Unauthorized: Invalid API Key" });
    }

    const payload = req.body || {};
    console.log("Shiprocket Webhook Received:", JSON.stringify(payload, null, 2));

    const awb = payload.awb || payload.awb_code;
    const shipmentId = payload.shipment_id;
    const externalOrderId = payload.order_id;

    if (!awb && !shipmentId) {
      return res.status(400).send({ message: "Invalid webhook payload: No AWB or Shipment ID" });
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

    // Find the order in our database
    let order = null;
    
    if (externalOrderId) {
      order = await Order.findById(externalOrderId);
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
    // Shiprocket expects 200 even if we fail internally, to prevent retries of bad payloads
    // but here we can return 500 if it's a server error
    res.status(500).send({ message: error.message });
  }
};

const testWebhook = async (req, res) => {
  res.status(200).send({ success: true, message: "Shiprocket webhook endpoint active" });
};

module.exports = {
  handleShiprocketWebhook,
  testWebhook,
};
