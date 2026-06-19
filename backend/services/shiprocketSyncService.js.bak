const Order = require("../models/Order");
const Customer = require("../models/Customer");
const admin = require("../config/firebase-admin");

/**
 * Syncs Shiprocket tracking data to the local Order model.
 * Maps sub-fields to top-level fields for frontend compatibility.
 * Sends push notifications on status changes.
 * 
 * @param {string} orderId - Local MongoDB Order ID
 * @param {Object} trackingData - Shiprocket tracking response data
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
    
    // Extract data from Shiprocket tracking response
    // Shiprocket structure varies slightly between Webhook and API
    const shipment = trackingData.tracking_data || trackingData;
    const awb = shipment.awb_code || shipment.awb;
    const currentStatus = shipment.shipment_status || shipment.status;
    const courierName = shipment.courier_name || shipment.courier;
    const etd = shipment.edd || shipment.estimated_delivery_date;
    const history = shipment.shipment_track_activities || shipment.activities || [];
    const lastActivity = history[0] || {};
    
    const updates = {
      "shiprocket.status": currentStatus,
      "shiprocket.awb_code": awb,
      "shiprocket.courier_name": courierName,
      "shiprocket.tracking_data": shipment,
      "shiprocket.last_synced": new Date(),
      
      // Top-level field sync (as requested)
      trackingNumber: awb,
      courierName: courierName,
      shipmentStatus: currentStatus,
      estimatedDeliveryDate: etd ? new Date(etd) : order.estimatedDeliveryDate,
      currentLocation: lastActivity.location || order.currentLocation,
      lastTrackingUpdate: new Date(),
    };

    // Map Shiprocket Status to Main Order Status
    const { MAP_SHIPROCKET_STATUS } = require("../utils/orderStatus");
    const mappedStatus = MAP_SHIPROCKET_STATUS(currentStatus);
    
    if (mappedStatus) {
      updates.status = mappedStatus;
    }

    // Update tracking history array
    if (history.length > 0) {
      // Legacy trackingHistory
      updates.trackingHistory = history.map(h => ({
        status: h.status || h.activity,
        message: h.activity || h.sr_status_label || "",
        timestamp: h.date || h.timestamp || new Date(),
        location: h.location || ""
      })).reverse(); // Oldest to newest
      
      // New statusHistory
      // We only add the latest activity to statusHistory if it's a significant status change
      if (mappedStatus && mappedStatus !== order.status) {
        updates.$push = {
          statusHistory: {
            status: mappedStatus,
            note: lastActivity.activity || lastActivity.sr_status_label || `Order status updated to ${mappedStatus}`,
            updatedAt: new Date(),
          }
        };
      }
    }

    // Apply updates
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId, 
      updates.hasOwnProperty('$push') ? { $set: updates, ...updates.$push } : { $set: updates }, 
      { new: true }
    );

    // Send Notification if status changed
    if (previousStatus !== currentStatus) {
      await sendStatusNotification(updatedOrder, currentStatus);
    }

    return updatedOrder;
  } catch (error) {
    console.error("syncShiprocketTracking error:", error);
    throw error;
  }
}

/**
 * Sends FCM push notification to the customer about status change.
 */
async function sendStatusNotification(order, newStatus) {
  try {
    if (!order.user) return;

    const user = await Customer.findById(order.user);
    if (!user || !user.fcmToken) return;

    const title = `Order Update: #${order.invoice || order._id.toString().slice(-6)}`;
    const body = `Your shipment status is now: ${newStatus}. ${order.currentLocation ? `Current location: ${order.currentLocation}` : ''}`;

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
    console.log(`Shipment status notification sent to user ${user.name} for order ${order._id}`);
  } catch (error) {
    console.warn("Error sending shipment notification:", error.message);
  }
}

module.exports = {
  syncShiprocketTracking,
};
