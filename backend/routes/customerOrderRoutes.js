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

//get a order by id
router.get("/:id", isAuth, getOrderById);

//get all order by a user (must be before /:id)
router.get("/list", isAuth, getOrderCustomer);
router.get("/my-orders", isAuth, getOrderCustomer);

//get all order by a user
router.get("/", isAuth, getOrderCustomer);

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
