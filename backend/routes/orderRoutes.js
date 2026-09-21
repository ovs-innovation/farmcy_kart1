const express = require("express");
const router = express.Router();
const { isAuth, isAdmin } = require("../config/auth");
const {
  getAllOrders,
  getOrderById,
  getOrderCustomer,
  updateOrder,
  deleteOrder,
  getDashboardOrders,
  getDashboardRecentOrder,
  getBestSellerProductChart,
  getDashboardCount,
  getDashboardAmount,
} = require("../controller/orderController");

//get all orders
router.get("/", isAuth, isAdmin, getAllOrders);

// get dashboard orders data
router.get("/dashboard", isAuth, isAdmin, getDashboardOrders);

// dashboard recent-order
router.get("/dashboard-recent-order", isAuth, isAdmin, getDashboardRecentOrder);

// dashboard order count
router.get("/dashboard-count", isAuth, isAdmin, getDashboardCount);

// dashboard order amount
router.get("/dashboard-amount", isAuth, isAdmin, getDashboardAmount);

// chart data for product
router.get("/best-seller/chart", isAuth, isAdmin, getBestSellerProductChart);

//get all order by a user
router.get("/customer/:id", isAuth, getOrderCustomer);

//get a order by id
router.get("/:id", isAuth, isAdmin, getOrderById);

//update a order
router.put("/:id", isAuth, isAdmin, updateOrder);

//delete a order
router.delete("/:id", isAuth, isAdmin, deleteOrder);

module.exports = router;
