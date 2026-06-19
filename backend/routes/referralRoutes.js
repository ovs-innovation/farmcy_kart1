const express = require("express");
const router = express.Router();
const referralController = require("../controller/referralController");
const { isAuth } = require("../config/auth");

router.get("/dashboard", isAuth, referralController.getReferralDashboard);

module.exports = router;
