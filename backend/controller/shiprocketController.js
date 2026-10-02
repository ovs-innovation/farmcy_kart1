const { shiprocketRequest } = require("../services/shiprocketService");
const Order = require("../models/Order");
const { syncShiprocketTracking } = require("../services/shiprocketSyncService");
const { mapShiprocketAddressFields } = require("../utils/shiprocketAddressMapper");
const { enrichOrderItemsForShiprocket } = require("../utils/cartTaxUtils");

// STEP 3 — Create Shiprocket Order (Business Logic + Auto Courier & AWB)
const createShiprocketOrder = async (req, res) => {
  try {
    const { orderId, ...shiprocketBody } = req.body;
    const payload = await buildShiprocketPayload(shiprocketBody, orderId);

    const validationError = validateShiprocketPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const response = await shiprocketRequest(
      "post",
      "v1/external/orders/create/adhoc",
      payload
    );

    // Persist base Shiprocket order info on our Order
    await mergeShiprocketData(orderId, {
      order_id: response?.order_id || payload?.order_id,
      shipment_id: response?.shipment_id,
      status: response?.status || response?.status_code,
      last_synced: new Date(),
    });

    // Auto-select best courier & assign AWB (non-blocking for caller)
    if (response?.shipment_id && payload?.billing_pincode) {
      autoAssignBestCourier({
        orderId,
        shipmentId: response.shipment_id,
        pickupPincode:
          process.env.SHIPROCKET_PICKUP_PINCODE ||
          payload?.pickup_postcode ||
          payload?.pickup_pincode ||
          payload?.billing_pincode,
        deliveryPincode: payload.shipping_pincode || payload.billing_pincode,
        weight: payload.weight || 0.5,
        isCod: payload.payment_method?.toLowerCase() === "cod",
      }).catch((err) => {
        // Don't break API response if auto-assign fails; just log
        console.error("Auto courier assignment failed:", err.message);
      });
    }

    res.json({
      message: "Order created successfully",
      shiprocket: response,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Shiprocket order creation failed",
    });
  }
};

function validateShiprocketPayload(payload = {}) {
  if (!payload.order_id || !payload.billing_customer_name || !payload.order_items) {
    return "Missing required fields: order_id, billing_customer_name, or order_items";
  }
  if (!payload.billing_state) {
    return "Missing required field: billing_state";
  }
  if (!payload.billing_country) {
    return "Missing required field: billing_country";
  }
  const missingHsn = (payload.order_items || []).find(
    (item) => !String(item.hsn || "").trim()
  );
  if (missingHsn) {
    return "Missing HSN on one or more order items";
  }
  return null;
}

async function buildShiprocketPayload(rawPayload = {}, orderId = null) {
  let orderCart = [];
  if (orderId) {
    const order = await Order.findById(orderId).select("cart").lean();
    if (order?.cart?.length) {
      orderCart = order.cart;
    }
  }

  const payload = mapShiprocketAddressFields(
    enrichPayloadWithShipping(rawPayload)
  );

  const defaultPayload = {
    order_id: "",
    order_date: "",
    pickup_location:
      process.env.SHIPROCKET_PICKUP_LOCATION ||
      "work",
    comment: "",
    reseller_name: "",
    company_name: "",
    billing_customer_name: "",
    billing_last_name: "",
    billing_address: "",
    billing_address_2: "",
    billing_isd_code: "",
    billing_city: "",
    billing_pincode: "",
    billing_state: "",
    billing_country: "",
    billing_email: "",
    billing_phone: "",
    billing_alternate_phone: "",
    shipping_is_billing: true,
    shipping_customer_name: "",
    shipping_last_name: "",
    shipping_address: "",
    shipping_address_2: "",
    shipping_city: "",
    shipping_pincode: "",
    shipping_country: "",
    shipping_state: "",
    shipping_email: "",
    shipping_phone: "",
    payment_method: "",
    shipping_charges: "",
    giftwrap_charges: "",
    transaction_charges: "",
    total_discount: "",
    sub_total: "",
    length: "",
    breadth: "",
    height: "",
    weight: "",
    ewaybill_no: "",
    customer_gstin: "",
    invoice_number: "",
    order_type: "",
  };

  const normalizedOrderItems = await enrichOrderItemsForShiprocket(
    payload.order_items || [],
    orderCart
  );

  return {
    ...defaultPayload,
    ...payload,
    order_items: normalizedOrderItems,
  };
}

function enrichPayloadWithShipping(payload = {}) {
  const billing = {
    customer_name: payload.billing_customer_name,
    last_name: payload.billing_last_name || "",
    address: payload.billing_address,
    city: payload.billing_city,
    pincode: payload.billing_pincode ? String(payload.billing_pincode) : "",
    state: payload.billing_state,
    country: payload.billing_country,
    email: payload.billing_email,
    phone: payload.billing_phone,
  };

  const shipping = {
    customer_name:
      payload.shipping_customer_name || payload.billing_customer_name,
    last_name: payload.shipping_last_name || payload.billing_last_name || "",
    address: payload.shipping_address || payload.billing_address,
    city: payload.shipping_city || payload.billing_city,
    pincode: payload.shipping_pincode
      ? String(payload.shipping_pincode)
      : billing.pincode,
    state: payload.shipping_state || payload.billing_state,
    country: payload.shipping_country || payload.billing_country,
    email: payload.shipping_email || payload.billing_email,
    phone: payload.shipping_phone || payload.billing_phone,
  };

  return {
    ...payload,
    billing_customer_name: billing.customer_name,
    billing_last_name: billing.last_name,
    billing_address: billing.address,
    billing_city: billing.city,
    billing_pincode: billing.pincode,
    billing_state: billing.state,
    billing_country: billing.country,
    billing_email: billing.email,
    billing_phone: billing.phone,
    shipping_is_billing:
      payload.shipping_is_billing !== undefined
        ? payload.shipping_is_billing
        : true,
    shipping_customer_name: shipping.customer_name,
    shipping_last_name: shipping.last_name,
    shipping_address: shipping.address,
    shipping_city: shipping.city,
    shipping_pincode: shipping.pincode,
    shipping_state: shipping.state,
    shipping_country: shipping.country,
    shipping_email: shipping.email,
    shipping_phone: shipping.phone,
  };
}

// STEP 4.1 — Check Courier Serviceability
const checkCourierServiceability = async (req, res) => {
  try {
    const { pickup_pincode, delivery_pincode, weight, cod } = req.body;

    if (!pickup_pincode || !delivery_pincode || !weight) {
      return res.status(400).json({
        error: "Missing required fields: pickup_pincode, delivery_pincode, weight",
      });
    }

    const query = new URLSearchParams({
      pickup_postcode: String(pickup_pincode),
      delivery_postcode: String(delivery_pincode),
      weight: String(weight),
      cod: cod ? "1" : "0",
    }).toString();

    const response = await shiprocketRequest(
      "get",
      `v1/external/courier/serviceability/?${query}`
    );

    res.json({
      message: "Courier serviceability checked successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to check courier serviceability",
    });
  }
};

// STEP 4.2 — Assign Courier & Generate AWB
const assignCourierAndGenerateAWB = async (req, res) => {
  try {
    const { shipment_id, courier_id, orderId } = req.body;

    if (!shipment_id || !courier_id) {
      return res.status(400).json({
        error: "Missing required fields: shipment_id, courier_id",
      });
    }

    const response = await shiprocketRequest(
      "post",
      "v1/external/courier/assign/awb",
      {
        shipment_id: Number(shipment_id),
        courier_id: Number(courier_id),
      }
    );

    await syncShiprocketTracking(orderId, {
      shipment_id: Number(shipment_id),
      courier_id: Number(courier_id),
      awb_code: response?.awb_code,
      courier_name: response?.courier_name,
      status: response?.status,
    });

    res.json({
      message: "Courier assigned and AWB generated successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to assign courier and generate AWB",
    });
  }
};

// STEP 5 — Generate Shipping Label (PDF)
const generateShippingLabel = async (req, res) => {
  try {
    const { shipment_id, orderId } = req.query;

    if (!shipment_id) {
      return res.status(400).json({
        error: "Missing required parameter: shipment_id",
      });
    }

    // Shiprocket expects POST for label generation
    // Shiprocket expects shipment_id as an array and supports format / print_type
    const response = await shiprocketRequest(
      "post",
      "v1/external/courier/generate/label",
      {
        shipment_id: [Number(shipment_id)],
        format: "pdf",
        print_type: "invoice_label",
      }
    );

    await mergeShiprocketData(orderId, {
      label_url:
        response?.label_url ||
        response?.label ||
        response?.data?.label_url ||
        response?.pdf_url,
      last_synced: new Date(),
    });

    res.json({
      message: "Shipping label generated successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to generate shipping label",
    });
  }
};

// STEP 6 — Request Pickup
const requestPickup = async (req, res) => {
  try {
    const { shipment_id, orderId } = req.body;

    if (!shipment_id) {
      return res.status(400).json({
        error: "Missing required field: shipment_id",
      });
    }

    const response = await shiprocketRequest(
      "post",
      "v1/external/courier/generate/pickup",
      {
        shipment_id: Number(shipment_id),
      }
    );

    await mergeShiprocketData(orderId, {
      pickup_status: response?.pickup_status || response?.status,
      last_synced: new Date(),
    });

    res.json({
      message: "Pickup requested successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to request pickup",
    });
  }
};

// STEP 7 — Track Shipment
const trackShipment = async (req, res) => {
  try {
    const { awb_code } = req.params;
    const { orderId } = req.query;

    if (!awb_code) {
      return res.status(400).json({
        error: "Missing required parameter: awb_code",
      });
    }

    const response = await shiprocketRequest(
      "get",
      `v1/external/courier/track/awb/${awb_code}`
    );

    await syncShiprocketTracking(orderId, response);

    res.json({
      message: "Shipment tracked successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to track shipment",
    });
  }
};

const cancelShipment = async (req, res) => {
  try {
    const { shipment_id, orderId } = req.body;

    if (!shipment_id) {
      return res.status(400).json({
        error: "Missing required field: shipment_id",
      });
    }

    const response = await shiprocketRequest(
      "post",
      "/v1/external/orders/cancel",
      {
        shipment_id: [Number(shipment_id)],
        cancel_reason: req.body?.cancel_reason || "Cancelled via admin panel",
      }
    );

    await mergeShiprocketData(orderId, {
      status: "CANCELLED",
      pickup_status: "CANCELLED",
      last_synced: new Date(),
    });

    res.json({
      message: "Shipment cancelled successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to cancel shipment",
    });
  }
};

const linkShipmentToOrder = async (req, res) => {
  try {
    const { orderId, shipment_id } = req.body;

    if (!orderId || !shipment_id) {
      return res
        .status(400)
        .json({ error: "orderId and shipment_id are required" });
    }

    await mergeShiprocketData(orderId, {
      shipment_id: Number(shipment_id),
      last_synced: new Date(),
    });

    res.json({ message: "Shipment linked successfully" });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to link shipment",
    });
  }
};

// Generate Shiprocket Invoice PDF (order-level)
const generateInvoice = async (req, res) => {
  try {
    const { order_id, orderId } = req.query;

    if (!order_id) {
      return res.status(400).json({
        error: "Missing required parameter: order_id",
      });
    }

    const response = await shiprocketRequest(
      "post",
      "v1/external/orders/print/invoice",
      {
        ids: [String(order_id)],
      }
    );

    await mergeShiprocketData(orderId, {
      invoice_url:
        response?.invoice_url ||
        response?.data?.invoice_url ||
        response?.data?.url ||
        null,
      last_synced: new Date(),
    });

    res.json({
      message: "Invoice generated successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to generate invoice",
    });
  }
};

async function mergeShiprocketData(orderId, shiprocketFields = {}) {
  if (!orderId || !shiprocketFields) return;
  const updates = {};
  Object.entries(shiprocketFields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      updates[`shiprocket.${key}`] = value;
    }
  });

  if (Object.keys(updates).length === 0) return;

  await Order.findByIdAndUpdate(orderId, { $set: updates }).exec();
}

// Internal helper: auto-select fastest & cheapest courier and assign AWB
async function autoAssignBestCourier({
  orderId,
  shipmentId,
  pickupPincode,
  deliveryPincode,
  weight,
  isCod,
}) {
  if (!orderId || !shipmentId || !deliveryPincode) return;

  const query = new URLSearchParams({
    pickup_postcode: String(
      pickupPincode || process.env.SHIPROCKET_PICKUP_PINCODE || ""
    ),
    delivery_postcode: String(deliveryPincode),
    weight: String(weight || 0.5),
    cod: isCod ? "1" : "0",
  }).toString();

  const serviceability = await shiprocketRequest(
    "get",
    `v1/external/courier/serviceability/?${query}`
  );

  const list =
    serviceability?.data?.data ||
    serviceability?.data?.available_courier_companies ||
    serviceability?.available_courier_companies ||
    serviceability?.data ||
    [];

  if (!Array.isArray(list) || list.length === 0) return;

  // Auto-selection algorithm: pick fastest; if tie, pick cheapest
  const best = list.reduce((best, cur) => {
    const curEta = Number(cur.estimated_delivery_days || cur.eta || 9999);
    const bestEta = Number(
      best.estimated_delivery_days || best.eta || 9999
    );
    const curRate = Number(cur.rate || cur.freight_charge || 0);
    const bestRate = Number(best.rate || best.freight_charge || 0);

    if (curEta < bestEta) return cur;
    if (curEta > bestEta) return best;
    return curRate < bestRate ? cur : best;
  }, list[0]);

  const courierId =
    best.courier_company_id || best.courier_id || best.id || null;

  if (!courierId) return;

  const assignRes = await shiprocketRequest(
    "post",
    "v1/external/courier/assign/awb",
    {
      shipment_id: Number(shipmentId),
      courier_id: Number(courierId),
    }
  );

  await syncShiprocketTracking(orderId, {
    shipment_id: Number(shipmentId),
    courier_id: Number(courierId),
    awb_code: assignRes?.awb_code,
    courier_name: assignRes?.courier_name || best.courier_name,
    status: assignRes?.status || "AWB_ASSIGNED",
  });
}

module.exports = {
  createShiprocketOrder,
  checkCourierServiceability,
  assignCourierAndGenerateAWB,
  generateShippingLabel,
  requestPickup,
  trackShipment,
  cancelShipment,
  linkShipmentToOrder,
  generateInvoice,
};


