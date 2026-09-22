const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    invoice: {
      type: Number,
      required: false,
    },
    cart: [{}],
    user_info: {
      name: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      contact: {
        type: String,
        required: false,
      },
      address: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      country: {
        type: String,
        required: false,
      },
      zipCode: {
        type: String,
        required: false,
      },
    },
    subTotal: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      required: true,
    },
    taxSummary: {
      inclusiveTax: { type: Number, default: 0 },
      exclusiveTax: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 },
    },
    discount: {
      type: Number,
      required: true,
      default: 0,
    },
    coupon: {
      couponCode: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
    },

    total: {
      type: Number,
      required: true,
    },
    shippingOption: {
      type: String,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    paidAt: {
      type: Date,
    },
    paymentCollectedAt: {
      type: Date,
    },
    checkoutRequestId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    shiprocketSyncStatus: {
      type: String,
      enum: ["Pending", "Created", "Failed", "Retrying"],
      default: "Pending",
    },
    shiprocketLastError: {
      type: String,
      default: "",
    },
    shiprocketRetryCount: {
      type: Number,
      default: 0,
    },
    cardInfo: {
      type: Object,
      required: false,
    },
    shiprocket: {
      order_id: { type: String },
      shipment_id: { type: Number },
      status: { type: String },
      awb_code: { type: String },
      courier_name: { type: String },
      courier_id: { type: Number },
      label_url: { type: String },
      invoice_url: { type: String },
      pickup_status: { type: String },
      last_synced: { type: Date },
      tracking_data: { type: Object },
    },
    status: {
      type: String,
      enum: [
        "Order Placed",
        "Pending",
        "Scheduled",
        "Accepted",
        "Processing",
        "Order On The Way",
        "Delivered",
        "Cancelled",
        "Refund Requested",
        "Refunded",
        "Payment Failed",
        // Legacy statuses for safety during migration
        "Cancel",
        "OutForDelivery",
        "Failed"
      ],
      default: "Order Placed",
    },
    statusHistory: [
      {
        status: { type: String },
        note: { type: String },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    // Keep trackingHistory for compatibility with existing data
    trackingHistory: [
      {
        status: { type: String },
        message: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    courierName: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    estimatedDeliveryDate: { type: Date },
    currentLocation: { type: String },
    lastTrackingUpdate: { type: Date },
    shipmentStatus: { type: String },
    confirmationEmailSent: { type: Boolean, default: false },
    confirmationSmsSent: { type: Boolean, default: false },
    invoiceEmailSent: { type: Boolean, default: false },
    adminNewOrderEmailSent: { type: Boolean, default: false },
    lastStatusNotified: { type: String, default: "" },
    refundEmailSent: { type: Boolean, default: false },
    refundNotifiedAt: { type: Date },
    refund: {
      reason: { type: String, default: "" },
      note: { type: String, default: "" },
      requestedAt: { type: Date }
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model(
  "Order",
  orderSchema.plugin(AutoIncrement, {
    inc_field: "invoice",
    start_seq: 10000,
  })
);
module.exports = Order;
