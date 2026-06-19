const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const returnRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    returnId: {
      type: Number,
      required: false, // Handled by AutoIncrement
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    returnReason: {
      type: String,
      required: true,
      enum: [
        "Wrong Item Delivered",
        "Damaged Product",
        "Expired Medicine",
        "Missing Item",
        "Not Required",
        "Other",
      ],
    },
    customerNotes: {
      type: String,
      default: "",
    },
    images: [
      {
        type: String, // URLs of uploaded proof images
      },
    ],
    refundMethod: {
      type: String,
      required: true,
      enum: ["Original Payment Method"],
      default: "Original Payment Method",
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    resolutionType: {
      type: String,
      enum: ["pending", "refund", "replacement"],
      default: "pending",
    },
    replacementOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    replacementTrackingNumber: {
      type: String,
      default: "",
    },
    replacementTrackingUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true,
      enum: [
        "Initiated",
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
      ],
      default: "Initiated",
    },
    timeline: [
      {
        status: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    adminNotes: {
      type: String,
      default: "",
    },
    pickupDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-increment for readable return request IDs (e.g., Return #10001)
const ReturnRequest = mongoose.model(
  "ReturnRequest",
  returnRequestSchema.plugin(AutoIncrement, {
    inc_field: "returnId",
    start_seq: 10000,
  })
);

module.exports = ReturnRequest;
