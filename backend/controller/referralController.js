const Referral = require("../models/Referral");
const Customer = require("../models/Customer");

const getReferralDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch the customer to get referralCode and totalReferralEarnings
    const customer = await Customer.findById(userId).select("referralCode totalReferralEarnings");

    if (!customer) {
      return res.status(404).send({ message: "Customer not found" });
    }

    // Fetch all referrals made by this user
    const referrals = await Referral.find({ referrer: userId })
      .populate("referredUser", "name createdAt")
      .populate("rewardCoupon", "couponCode")
      .sort({ createdAt: -1 });

    const totalSuccessful = referrals.filter(r => r.status === "earned").length;
    const totalPending = referrals.filter(r => r.status === "pending").length;

    // Map referrals for frontend
    const history = referrals.map(r => ({
      _id: r._id,
      friendName: r.referredUser ? r.referredUser.name : "Unknown",
      joinedDate: r.referredUser ? r.referredUser.createdAt : r.createdAt,
      status: r.status,
      rewardAmount: r.rewardAmount,
      couponCode: r.rewardCoupon ? r.rewardCoupon.couponCode : null,
    }));

    res.send({
      referralCode: customer.referralCode,
      totalEarnings: customer.totalReferralEarnings || 0,
      totalSuccessful,
      totalPending,
      history,
    });
  } catch (err) {
    console.error("getReferralDashboard error:", err);
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  getReferralDashboard,
};
