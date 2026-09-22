const Order = require("../models/Order");
const Customer = require("../models/Customer");
const admin = require("../config/firebase-admin");
const { MAP_SHIPROCKET_STATUS } = require("../utils/orderStatus");
const { notifyOrderStatusInbox } = require("../lib/customer-inbox-notifications");

/**
 * Syncs Shiprocket tracking data to the local Order model.
 */
async function syncShiprocketTracking(orderId, trackingData) {
  try {
    if (!orderId || !trackingData) return;

    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`Order sync failed: Order ${orderId} not found.`);
      return;
    }

    const previousStatus = order.shipmentStatus || order.shiprocket?.status;

    const shipment = trackingData.tracking_data || trackingData;
    const awb = shipment.awb_code || shipment.awb;
    const currentStatus = shipment.shipment_status || shipment.status;
    const courierName = shipment.courier_name || shipment.courier;
    const etd = shipment.edd || shipment.estimated_delivery_date;
    const history = shipment.shipment_track_activities || shipment.activities || [];
    const lastActivity = history[0] || {};

    const setUpdates = {
      "shiprocket.status": currentStatus,
      "shiprocket.awb_code": awb,
      "shiprocket.courier_name": courierName,
      "shiprocket.tracking_data": shipment,
      "shiprocket.last_synced": new Date(),
      trackingNumber: awb,
      courierName: courierName,
      shipmentStatus: currentStatus,
      estimatedDeliveryDate: etd ? new Date(etd) : order.estimatedDeliveryDate,
      currentLocation: lastActivity.location || order.currentLocation,
      lastTrackingUpdate: new Date(),
    };

    const isCodPaymentConfirmed =
      trackingData.cod_collected === true ||
      trackingData.cod_status?.toLowerCase() === "collected" ||
      trackingData.payment_status?.toLowerCase() === "paid" ||
      trackingData.is_cod_collected === true ||
      String(trackingData.custom_status || "").toLowerCase().includes("cod collected");

    if (isCodPaymentConfirmed && (order.paymentMethod === "COD" || order.paymentMethod === "Cash") && order.paymentStatus !== "Paid") {
      setUpdates.paymentStatus = "Paid";
      setUpdates.paymentCollectedAt = new Date();
      setUpdates.paidAt = new Date();
    }

    const mappedStatus = MAP_SHIPROCKET_STATUS(currentStatus);
    if (mappedStatus) {
      setUpdates.status = mappedStatus;
    }

    if (history.length > 0) {
      setUpdates.trackingHistory = history
        .map((h) => ({
          status: h.status || h.activity,
          message: h.activity || h.sr_status_label || "",
          timestamp: h.date || h.timestamp || new Date(),
          location: h.location || "",
        }))
        .reverse();
    }

    const updateQuery = { $set: setUpdates };

    if (mappedStatus && mappedStatus !== order.status) {
      updateQuery.$push = {
        statusHistory: {
          status: mappedStatus,
          note:
            lastActivity.activity ||
            lastActivity.sr_status_label ||
            `Order status updated to ${mappedStatus}`,
          updatedAt: new Date(),
        },
      };
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateQuery, {
      new: true,
    });

    if (previousStatus !== currentStatus) {
      await sendStatusNotification(updatedOrder, currentStatus);
      if (mappedStatus && mappedStatus !== order.status) {
        await notifyOrderStatusInbox(
          updatedOrder,
          mappedStatus,
          `Your shipment status is now: ${currentStatus}.`
        );
      }
    }

    return updatedOrder;
  } catch (error) {
    console.error("syncShiprocketTracking error:", error);
    throw error;
  }
}

async function sendStatusNotification(order, newStatus) {
  try {
    if (!order.user) return;

    const user = await Customer.findById(order.user);
    if (!user || !user.fcmToken) return;

    const title = `Order Update: #${order.invoice || order._id.toString().slice(-6)}`;
    const body = `Your shipment status is now: ${newStatus}. ${
      order.currentLocation ? `Current location: ${order.currentLocation}` : ""
    }`;

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        orderId: order._id.toString(),
        click_action: `/user/track-order?id=${order._id}`,
        type: "ORDER_UPDATE",
      },
      token: user.fcmToken,
    };

    await admin.messaging().send(message);
    console.log(
      `Shipment status notification sent to user ${user.name} for order ${order._id}`
    );
  } catch (error) {
    console.warn("Error sending shipment notification:", error.message);
  }
}

module.exports = {
  syncShiprocketTracking,
};
