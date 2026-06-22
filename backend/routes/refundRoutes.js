const router = require("express").Router();
const {
  addRefundReason,
  getRefundData,
  updateRefundReason,
  updateReasonStatus,
  updateRefundMode,
  deleteRefundReason,
} = require("../controller/refundController");
const { isAdmin } = require("../config/auth");

router.post("/add", isAdmin, addRefundReason);
router.get("/all", isAdmin, getRefundData);
router.put("/:id", isAdmin, updateRefundReason);
router.put("/status/:id", isAdmin, updateReasonStatus);
router.put("/mode/update", isAdmin, updateRefundMode);
router.delete("/:id", isAdmin, deleteRefundReason);

module.exports = router;
