const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "earned"],
      default: "pending",
    },
    rewardAmount: {
      type: Number,
      default: 100,
    },
    discountAmount: {
      type: Number,
      default: 50,
    },
    rewardCoupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: false,
    },
    discountCoupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Referral = mongoose.model("Referral", referralSchema);
module.exports = Referral;
