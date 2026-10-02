const express = require("express");
const router = express.Router();
const { handleShiprocketWebhook, testWebhook } = require("../controller/shiprocketWebhookController");

// Shiprocket Webhook
router.get("/", testWebhook);
router.post("/", handleShiprocketWebhook);
router.get("/shiprocket", testWebhook);
router.post("/shiprocket", handleShiprocketWebhook);
router.get("/tracking", testWebhook);
router.post("/tracking", handleShiprocketWebhook);

module.exports = router;
