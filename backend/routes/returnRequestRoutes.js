const express = require("express");
const router = express.Router();
const { isAuth, isAdmin } = require("../config/auth");
const {
  createReturnRequest,
  getUserReturnRequests,
  getReturnRequestById,
  getReturnEligibility,
  getReturnReasons,
  getAllReturnRequests,
  updateReturnRequestStatus,
} = require("../controller/returnRequestController");

// Customer Routes
router.post("/", isAuth, createReturnRequest);
router.get("/reasons", isAuth, getReturnReasons);
router.get("/eligibility/:orderId", isAuth, getReturnEligibility);
router.get("/", isAuth, getUserReturnRequests);
router.get("/:id", isAuth, getReturnRequestById);

// Admin Routes
router.get("/admin/all", isAuth, isAdmin, getAllReturnRequests);
router.put("/admin/:id/status", isAuth, isAdmin, updateReturnRequestStatus);

module.exports = router;
