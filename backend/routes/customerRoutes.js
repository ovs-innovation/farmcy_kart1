const express = require("express");
const router = express.Router();
const {
  loginCustomer,
  loginWithPhone,
  registerCustomer,
  registerCustomerDirect,
  verifyPhoneNumber,
  signUpWithProvider,
  signUpWithOauthProvider,
  verifyEmailAddress,
  forgetPassword,
  changePassword,
  resetPassword,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  addAllCustomers,
  addShippingAddress,
  getShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  getCustomerStatistics,
  createWholesaler,
  deleteCloudinaryAsset,
  cloudinarySign,
  getAllWholesalers,
  // Cart management
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkCustomerExistance,
  updateFcmToken,
  verifyEmailOTP,
  resendVerificationEmail,
  sendPhoneEmailOTP,
  verifyPhoneEmailOTP,
  signupPhone,
  completeProfile,
  sendProfileEmailOtp,
  verifyProfileEmailOtp,
} = require("../controller/customerController");
const {
  passwordVerificationLimit,
  emailVerificationLimit,
} = require("../lib/email-sender/sender");
const { getOrderCustomer } = require("../controller/customerOrderController");
const { isAuth, isAdmin } = require("../config/auth");

//login with phone
router.post("/login-phone", loginWithPhone);
router.post("/send-phone-otp", sendPhoneEmailOTP);
router.post("/verify-phone-otp", verifyPhoneEmailOTP);

// shipping address send to array
router.post("/shipping/address/:id", isAuth, addShippingAddress);

// get all shipping address
router.get("/shipping/address/:id", isAuth, getShippingAddress);

// shipping address update
router.put("/shipping/address/:userId/:shippingId", isAuth, updateShippingAddress);

// shipping address delete
router.delete("/shipping/address/:userId/:shippingId", isAuth, deleteShippingAddress);

//register a user
router.post("/register/:token", registerCustomer);

//register a user directly
router.post("/signup", registerCustomerDirect);

// Wholesaler accounts: admin panel only (not public storefront)
router.post("/wholesaler", isAuth, isAdmin, createWholesaler);

// Delete uploaded Cloudinary asset
router.post("/cloudinary-delete", deleteCloudinaryAsset);

// Server-side cloudinary upload endpoint (accepts data URL)
router.post("/cloudinary-upload", async (req, res) => {
  // delegate to controller
  try {
    const controller = require('../controller/customerController');
    return controller.cloudinaryUpload(req, res);
  } catch (err) {
    console.error('cloudinary-upload route error:', err);
    res.status(500).send({ message: err.message });
  }
});

// Provide a signature for signed client uploads (allows return_delete_token)
router.post("/cloudinary-sign", cloudinarySign);

// Cloudinary status
router.get("/cloudinary-status", (req, res) => {
  try {
    const controller = require('../controller/customerController');
    return controller.cloudinaryStatus(req, res);
  } catch (err) {
    console.error('cloudinary-status route error:', err);
    res.status(500).send({ message: err.message });
  }
});

// Send credentials to wholesaler
router.post('/send-credentials/:id', async (req, res) => {
  try {
    const controller = require('../controller/customerController');
    return controller.sendCredentials(req, res);
  } catch (err) {
    console.error('send-credentials route error:', err);
    res.status(500).send({ message: err.message });
  }
});

// Admin: get wholesalers
router.get("/wholesalers", isAuth, isAdmin, getAllWholesalers);

//login a user
router.post("/login", loginCustomer);
router.post("/signup-phone", signupPhone);
router.post("/complete-profile", isAuth, completeProfile);
router.post(
  "/profile/send-email-otp",
  isAuth,
  emailVerificationLimit,
  sendProfileEmailOtp
);
router.post("/profile/verify-email-otp", isAuth, verifyProfileEmailOtp);

//register or login with google and fb
router.post("/signup/oauth", signUpWithOauthProvider);

//register or login with google and fb
router.post("/signup/:token", signUpWithProvider);

//forget-password
router.put("/forget-password", passwordVerificationLimit, forgetPassword);

//reset-password
router.put("/reset-password", resetPassword);

//change password
router.post("/change-password", isAuth, changePassword);

//add all users
router.post("/add/all", isAuth, isAdmin, addAllCustomers);

//get all user
router.get("/", isAuth, isAdmin, getAllCustomers);

//get customer statistics
router.get("/statistics", isAuth, isAdmin, getCustomerStatistics);

//check customer existence
router.post("/check-user", checkCustomerExistance);


// ─── CART ROUTES ──────────────────────────────────────────────────────────────

// Get customer cart (populated) — must be BEFORE /:id wildcard
router.get("/cart/:customerId", isAuth, getCart);

// Add item to cart
router.post("/cart/:customerId/add", isAuth, addToCart);

// Update item quantity in cart
router.put("/cart/:customerId/update", isAuth, updateCartItem);

// Remove a specific item from cart
router.delete("/cart/:customerId/remove/:productId", isAuth, removeFromCart);

// Clear entire cart
router.delete("/cart/:customerId/clear", isAuth, clearCart);

// Customer order history (must be before /:id wildcard)
router.get("/me/orders", isAuth, getOrderCustomer);
router.get("/orders", isAuth, getOrderCustomer);

// ─────────────────────────────────────────────────────────────────────────────

//get a user
router.get("/:id", isAuth, getCustomerById);

//update a user
router.put("/:id", isAuth, updateCustomer);

//delete a user
router.delete("/:id", isAuth, isAdmin, deleteCustomer);

// update fcm token
router.put("/update-fcm-token/:id", isAuth, updateFcmToken);

module.exports = router;
