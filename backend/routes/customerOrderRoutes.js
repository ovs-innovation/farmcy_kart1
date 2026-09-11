const express = require("express");
const router = express.Router();
const {
  addOrder,
  getOrderById,
  getOrderCustomer,
  createPaymentIntent,
  addRazorpayOrder,
  createOrderByRazorPay,
  sendEmailInvoiceToCustomer,
  requestRefund,
} = require("../controller/customerOrderController");

const { emailVerificationLimit } = require("../lib/email-sender/sender");
const { isAuth, isAuthOptional } = require("../config/auth");

//add a order
router.post("/add", isAuthOptional, addOrder);

// create stripe payment intent
router.post("/create-payment-intent", isAuthOptional, createPaymentIntent);

//add razorpay order
router.post("/add/razorpay", isAuth, addRazorpayOrder);

//add a order by razorpay
router.post("/create/razorpay", isAuthOptional, createOrderByRazorPay);

//get all order by a user (must be before /:id)
router.get("/list", isAuth, getOrderCustomer);
router.get("/my-orders", isAuth, getOrderCustomer);

//get all order by a user (handles both customer list and admin fallback)
router.get("/", isAuth, (req, res, next) => {
  const adminRoles = ["Admin", "Super Admin", "Cashier", "Manager", "CEO", "Driver", "Security Guard", "Accountant"];
  if (req.user && req.user.role && adminRoles.includes(req.user.role)) {
    const { getAllOrders } = require("../controller/orderController");
    return getAllOrders(req, res, next);
  }
  return getOrderCustomer(req, res, next);
});

//get a order by id (constrained to 24-character hex MongoDB ObjectId to let admin routes fall through)
router.get("/:id([0-9a-fA-F]{24})", isAuth, (req, res, next) => {
  const adminRoles = ["Admin", "Super Admin", "Cashier", "Manager", "CEO", "Driver", "Security Guard", "Accountant"];
  if (req.user && req.user.role && adminRoles.includes(req.user.role)) {
    const { getOrderById: getAdminOrderById } = require("../controller/orderController");
    return getAdminOrderById(req, res, next);
  }
  return getOrderById(req, res, next);
});

//request refund for an order
router.put("/refund/:id", isAuth, requestRefund);

//#send email invoice to customer
router.post(
  "/customer/invoice",
  isAuth,
  emailVerificationLimit,
  sendEmailInvoiceToCustomer
);

module.exports = router;
