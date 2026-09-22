const mongoose = require("mongoose");

const shiprocketEventLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    awb: {
      type: String,
      default: "",
    },
    shipmentId: {
      type: String,
      default: "",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    eventType: {
      type: String,
      default: "",
    },
    payload: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const ShiprocketEventLog = mongoose.model("ShiprocketEventLog", shiprocketEventLogSchema);
module.exports = ShiprocketEventLog;
