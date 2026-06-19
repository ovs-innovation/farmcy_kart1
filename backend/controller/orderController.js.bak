const mongoose = require("mongoose");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Admin = require("../models/Admin");
const Brand = require("../models/Brand");
const { populateCartTaxFields } = require("../utils/cartTaxUtils");

const getAllOrders = async (req, res) => {
  const {
    day,
    status,
    page,
    limit,
    method,
    endDate,
    // download,
    // sellFrom,
    startDate,
    customerName,
    userRole,
  } = req.query;

  //  day count
  let date = new Date();
  const today = date.toString();
  date.setDate(date.getDate() - Number(day));
  const dateTime = date.toString();

  const beforeToday = new Date();
  beforeToday.setDate(beforeToday.getDate() - 1);
  // const before_today = beforeToday.toString();

  const startDateData = new Date(startDate);
  startDateData.setDate(startDateData.getDate());
  const start_date = startDateData.toString();

  // console.log(" start_date", start_date, endDate);

  const queryObject = {};

  if (!status) {
    queryObject.$or = [
      { status: { $regex: `Order Placed`, $options: "i" } },
      { status: { $regex: `Pending`, $options: "i" } },
      { status: { $regex: `Processing`, $options: "i" } },
      { status: { $regex: `Delivered`, $options: "i" } },
      { status: { $regex: `Cancelled`, $options: "i" } },
      { status: { $regex: `Cancel`, $options: "i" } },
    ];
  }

  if (customerName) {
    queryObject.$or = [
      { "user_info.name": { $regex: `${customerName}`, $options: "i" } },
      { invoice: { $regex: `${customerName}`, $options: "i" } },
    ];
  }

  if (day) {
    queryObject.createdAt = { $gte: dateTime, $lte: today };
  }

  if (status) {
    queryObject.status = { $regex: `${status}`, $options: "i" };
  }

  if (startDate && endDate) {
    queryObject.updatedAt = {
      $gt: start_date,
      $lt: endDate,
    };
  }
  if (method) {
    queryObject.paymentMethod = { $regex: `${method}`, $options: "i" };
  }

  const pages = Number(page) || 1;
  const limits = Number(limit);
  const skip = (pages - 1) * limits;

  try {
    // If userRole is specified, get customer IDs with that role
    let customerIds = [];
    if (userRole && (userRole === "customer" || userRole === "wholesaler")) {
      const customers = await Customer.find({ role: userRole }).select("_id");
      customerIds = customers.map((c) => c._id.toString());
      // Add user filter to query - match orders where user is in the customerIds list
      if (customerIds.length > 0) {
        queryObject.user = { $in: customerIds };
      } else {
        // If no customers found with this role, return empty result
        return res.send({
          orders: [],
          limits,
          pages,
          totalDoc: 0,
          methodTotals: [],
        });
      }
    }

    // total orders count
    const totalDoc = await Order.countDocuments(queryObject);
    const orders = await Order.find(queryObject)
      .select(
        "_id invoice paymentMethod subTotal total user_info user cart discount shippingCost status createdAt updatedAt shiprocket"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    // Populate brand names in all orders
    const ordersWithBrandNames = [];
    for (const order of orders) {
      const orderObj = order.toObject();
      if (orderObj.cart && orderObj.cart.length > 0) {
        // Get all unique brand IDs from cart items
        const brandIds = [...new Set(
          orderObj.cart
            .filter(item => item.brand && mongoose.Types.ObjectId.isValid(item.brand))
            .map(item => item.brand)
        )];
        
        // Fetch brand names if there are brand IDs
        if (brandIds.length > 0) {
          const brands = await Brand.find({ _id: { $in: brandIds } }).select('_id name');
          const brandMap = {};
          brands.forEach(brand => {
            const nameObj = brand.name || {};
            brandMap[brand._id.toString()] = nameObj.en || nameObj[Object.keys(nameObj)[0]] || '-';
          });
          
          // Replace brand IDs with brand names in cart items
          orderObj.cart = orderObj.cart.map(item => {
            if (item.brand && brandMap[item.brand]) {
              return { ...item, brand: brandMap[item.brand] };
            }
            return item;
          });
        }
      }
      ordersWithBrandNames.push(orderObj);
    }

    let methodTotals = [];
    if (startDate && endDate) {
      // console.log("filter method total");
      const filteredOrders = await Order.find(queryObject, {
        _id: 1,
        // subTotal: 1,
        total: 1,

        paymentMethod: 1,
        // createdAt: 1,
        updatedAt: 1,
      }).sort({ createdAt: -1 });
      for (const order of filteredOrders) {
        const { paymentMethod, total } = order;
        const existPayment = methodTotals.find(
          (item) => item.method === paymentMethod
        );

        if (existPayment) {
          existPayment.total += total;
        } else {
          methodTotals.push({
            method: paymentMethod,
            total: total,
          });
        }
      }
    }

    res.send({
      orders: ordersWithBrandNames,
      limits,
      pages,
      totalDoc,
      methodTotals,
      // orderOverview,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getOrderCustomer = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
    
    // Populate brand names in all orders
    const ordersWithBrandNames = [];
    for (const order of orders) {
      const orderObj = order.toObject();
      if (orderObj.cart && orderObj.cart.length > 0) {
        // Get all unique brand IDs from cart items
        const brandIds = [...new Set(
          orderObj.cart
            .filter(item => item.brand && mongoose.Types.ObjectId.isValid(item.brand))
            .map(item => item.brand)
        )];
        
        // Fetch brand names if there are brand IDs
        if (brandIds.length > 0) {
          const brands = await Brand.find({ _id: { $in: brandIds } }).select('_id name');
          const brandMap = {};
          brands.forEach(brand => {
            const nameObj = brand.name || {};
            brandMap[brand._id.toString()] = nameObj.en || nameObj[Object.keys(nameObj)[0]] || '-';
          });
          
          // Replace brand IDs with brand names in cart items
          orderObj.cart = orderObj.cart.map(item => {
            if (item.brand && brandMap[item.brand]) {
              return { ...item, brand: brandMap[item.brand] };
            }
            return item;
          });
        }
      }
      ordersWithBrandNames.push(orderObj);
    }
    
    res.send(ordersWithBrandNames);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    // console.log("getOrderById");

    const order = await Order.findById(req.params.id);
    
    // Populate brand names in cart items
    if (order && order.cart && order.cart.length > 0) {
      // Get all unique brand IDs from cart items
      const brandIds = [...new Set(
        order.cart
          .filter(item => item.brand && mongoose.Types.ObjectId.isValid(item.brand))
          .map(item => item.brand)
      )];
      
      // Fetch brand names if there are brand IDs
      if (brandIds.length > 0) {
        const brands = await Brand.find({ _id: { $in: brandIds } }).select('_id name');
        const brandMap = {};
        brands.forEach(brand => {
          // Handle multilingual name object - get English name or first available
          const nameObj = brand.name || {};
          brandMap[brand._id.toString()] = nameObj.en || nameObj[Object.keys(nameObj)[0]] || '-';
        });
        
        // Replace brand IDs with brand names in cart items
        order.cart = order.cart.map(item => {
          if (item.brand && brandMap[item.brand]) {
            return { ...item, brand: brandMap[item.brand] };
          }
          return item;
        });
      }
    }
    
    // Populate taxRate and HSN from Product collection
    order.cart = await populateCartTaxFields(order.cart);
    
    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const { ORDER_STATUS, VALID_TRANSITIONS } = require("../utils/orderStatus");
const {
  sendRefundCompletedNotifications,
} = require("../lib/order-refund-notifications");
const Setting = require("../models/Setting");
const { sendEmail } = require("../lib/email-sender/sender");
const { sendSMS } = require("../lib/sms-sender/sender");
const { orderStatusUpdateBody } = require("../lib/email-sender/templates/order-to-customer/status-update");

const PLACEHOLDER_EMAIL_DOMAIN = "phone.farmacykart.com";
const isPlaceholderEmail = (email) =>
  !!email && String(email).toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
const getRealEmail = (email) => {
  if (!email) return "";
  const normalized = String(email).trim().toLowerCase();
  if (!normalized || isPlaceholderEmail(normalized)) return "";
  return normalized;
};
const getEmailLogoUrl = async () => {
  try {
    const storeCustomizationSetting = await Setting.findOne(
      { name: "storeCustomizationSetting" },
      { "setting.navbar.logo": 1, "setting.seo.favicon": 1, _id: 0 }
    );
    const adminLogo =
      storeCustomizationSetting?.setting?.navbar?.logo ||
      storeCustomizationSetting?.setting?.seo?.favicon ||
      "";
    if (adminLogo && String(adminLogo).trim()) return String(adminLogo).trim();
  } catch (_) {}

  if (process.env.STORE_LOGO_URL) return process.env.STORE_LOGO_URL;
  const base = (process.env.STORE_URL || "https://farmacykart.com").replace(/\/$/, "");
  return `${base}/favicon.png`;
};

const updateOrder = async (req, res) => {
  try {
    const { status, message, courierName, trackingNumber, trackingUrl, estimatedDeliveryDate } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    const previousStatus = order.status;

    // Validate status transition
    if (status && order.status !== status) {
      const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
      // During migration, if current status is not in our new flow, we might need to allow it
      // or if it's an admin update, we can be a bit more flexible but still warn
      if (allowedTransitions.length > 0 && !allowedTransitions.includes(status)) {
        // Just a warning for now to not break admin flow if they need to force something
        console.warn(`Potentially invalid status transition: ${order.status} -> ${status}`);
      }
    }

    const updateData = { status };
    if (courierName) updateData.courierName = courierName;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (trackingUrl) updateData.trackingUrl = trackingUrl;
    if (estimatedDeliveryDate) updateData.estimatedDeliveryDate = estimatedDeliveryDate;

    // Build update object
    const updateQuery = {
      $set: updateData,
      $push: {
        statusHistory: {
          status: status,
          note: message || `Order status updated to ${status}`,
          updatedAt: new Date(),
        },
        // Also keep legacy trackingHistory for now
        trackingHistory: {
          status,
          message: message || `Order status updated to ${status}`,
          timestamp: new Date(),
        },
      },
    };

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true }
    );

    // Customer notification on status change (email if real email else SMS)
    if (status && previousStatus !== status) {
      (async () => {
        try {
          const globalSetting = await Setting.findOne({ name: "globalSetting" });
          const shopName = globalSetting?.setting?.shop_name || "Farmacykart";
          const contactEmail = globalSetting?.setting?.email || "support@farmacykart.com";
          const logo = await getEmailLogoUrl();

          const customerEmail = getRealEmail(updatedOrder.user_info?.email);
          const phone = updatedOrder.user_info?.contact;
          const dashUrl = `${process.env.STORE_URL}/user/dashboard`;

          // avoid repeat sends for same status
          if (updatedOrder.lastStatusNotified === status) return;

          if (customerEmail) {
            await sendEmail({
              to: customerEmail,
              replyTo: contactEmail,
              subject: `Farmacykart – Order #${updatedOrder.invoice} ${status}`,
              html: orderStatusUpdateBody({
                shop_name: shopName,
                logo,
                name: updatedOrder.user_info?.name,
                invoice: updatedOrder.invoice,
                status,
                message: message || `Your order status is now ${status}.`,
                trackingUrl: dashUrl,
                contact_email: contactEmail,
              }),
              emailType: "order-status-update",
            });
          } else if (phone) {
            const smsMessage = `Hi ${updatedOrder.user_info?.name || ""}, order #${updatedOrder.invoice} update: ${status}. Track: ${dashUrl}`;
            await sendSMS(phone, smsMessage, {
              name: updatedOrder.user_info?.name,
              orderid: updatedOrder.invoice,
              status,
            });
          }

          await Order.updateOne(
            { _id: updatedOrder._id },
            { $set: { lastStatusNotified: status } }
          );
        } catch (err) {
          console.error("[order] status notification failed:", err.message || err);
        }
      })();
    }

    if (
      status === "Refunded" &&
      previousStatus !== "Refunded" &&
      !order.refundEmailSent
    ) {
      sendRefundCompletedNotifications(updatedOrder).catch((err) => {
        console.error(
          `[refund] Notification failed for order ${updatedOrder._id}:`,
          err.message || err
        );
      });
    }

    res.status(200).send({
      message: "Order Updated Successfully!",
      order: updatedOrder,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteOrder = (req, res) => {
  Order.deleteOne({ _id: req.params.id }, (err) => {
    if (err) {
      res.status(500).send({
        message: err.message,
      });
    } else {
      res.status(200).send({
        message: "Order Deleted Successfully!",
      });
    }
  });
};

// get dashboard recent order
const getDashboardRecentOrder = async (req, res) => {
  try {
    // console.log("getDashboardRecentOrder");

    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const queryObject = {};

    queryObject.$or = [
      { status: { $regex: `Pending`, $options: "i" } },
      { status: { $regex: `Processing`, $options: "i" } },
      { status: { $regex: `Delivered`, $options: "i" } },
      { status: { $regex: `Cancel`, $options: "i" } },
    ];

    const totalDoc = await Order.countDocuments(queryObject);

    // query for orders
    const orders = await Order.find(queryObject)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    // console.log('order------------<', orders);

    res.send({
      orders: orders,
      page: page,
      limit: limit,
      totalOrder: totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get dashboard count
const getDashboardCount = async (req, res) => {
  try {
    // console.log("getDashboardCount");

    const totalDoc = await Order.countDocuments();

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total processing order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total delivered order count
    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total cancel order count
    const totalCancelOrder = await Order.aggregate([
      {
        $match: {
          status: "Cancel",
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalCustomer = await Customer.countDocuments();
    const totalProduct = await Product.countDocuments();
    const totalDeliveryBoy = await Admin.countDocuments({ role: "Driver" });

    const totalAcceptedOrder = await Order.countDocuments({ status: "Accepted" });
    const totalOutForDeliveryOrder = await Order.countDocuments({ status: "OutForDelivery" });
    const totalRefundedOrder = await Order.countDocuments({ status: "Refunded" });
    const totalFailedOrder = await Order.countDocuments({ status: "Failed" });

    res.send({
      totalOrder: totalDoc,
      totalPendingOrder: totalPendingOrder[0] || 0,
      totalProcessingOrder: totalProcessingOrder[0]?.count || 0,
      totalDeliveredOrder: totalDeliveredOrder[0]?.count || 0,
      totalCancelOrder: totalCancelOrder[0]?.count || 0,
      totalAcceptedOrder,
      totalOutForDeliveryOrder,
      totalRefundedOrder,
      totalFailedOrder,
      totalCustomer,
      totalProduct,
      totalDeliveryBoy,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDashboardAmount = async (req, res) => {
  // console.log('total')
  let week = new Date();
  week.setDate(week.getDate() - 10);

  // console.log('getDashboardAmount');

  const currentDate = new Date();
  currentDate.setDate(1); // Set the date to the first day of the current month
  currentDate.setHours(0, 0, 0, 0); // Set the time to midnight

  const lastMonthStartDate = new Date(currentDate); // Copy the current date
  lastMonthStartDate.setMonth(currentDate.getMonth() - 1); // Subtract one month

  let lastMonthEndDate = new Date(currentDate); // Copy the current date
  lastMonthEndDate.setDate(0); // Set the date to the last day of the previous month
  lastMonthEndDate.setHours(23, 59, 59, 999); // Set the time to the end of the day

  try {
    // total order amount
    const totalAmount = await Order.aggregate([
      {
        $group: {
          _id: null,
          tAmount: {
            $sum: "$total",
          },
        },
      },
    ]);
    // console.log('totalAmount',totalAmount)
    const thisMonthOrderAmount = await Order.aggregate([
      {
        $project: {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          total: 1,
          subTotal: 1,
          discount: 1,
          updatedAt: 1,
          createdAt: 1,
          status: 1,
        },
      },
      {
        $match: {
          $or: [{ status: { $regex: "Delivered", $options: "i" } }],
          year: { $eq: new Date().getFullYear() },
          month: { $eq: new Date().getMonth() + 1 },
          // $expr: {
          //   $eq: [{ $month: "$updatedAt" }, { $month: new Date() }],
          // },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $month: "$updatedAt",
            },
          },
          total: {
            $sum: "$total",
          },
          subTotal: {
            $sum: "$subTotal",
          },

          discount: {
            $sum: "$discount",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    const lastMonthOrderAmount = await Order.aggregate([
      {
        $project: {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          total: 1,
          subTotal: 1,
          discount: 1,
          updatedAt: 1,
          createdAt: 1,
          status: 1,
        },
      },
      {
        $match: {
          $or: [{ status: { $regex: "Delivered", $options: "i" } }],

          updatedAt: { $gt: lastMonthStartDate, $lt: lastMonthEndDate },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $month: "$updatedAt",
            },
          },
          total: {
            $sum: "$total",
          },
          subTotal: {
            $sum: "$subTotal",
          },

          discount: {
            $sum: "$discount",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    // console.log("thisMonthlyOrderAmount ===>", thisMonthlyOrderAmount);

    // order list last 10 days
    const orderFilteringData = await Order.find(
      {
        $or: [{ status: { $regex: `Delivered`, $options: "i" } }],
        updatedAt: {
          $gte: week,
        },
      },

      {
        paymentMethod: 1,
        paymentDetails: 1,
        total: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    );

    res.send({
      totalAmount:
        totalAmount.length === 0
          ? 0
          : parseFloat(totalAmount[0].tAmount).toFixed(2),
      thisMonthlyOrderAmount: thisMonthOrderAmount[0]?.total,
      lastMonthOrderAmount: lastMonthOrderAmount[0]?.total,
      ordersData: orderFilteringData,
    });
  } catch (err) {
    // console.log('err',err)
    res.status(500).send({
      message: err.message,
    });
  }
};

const getBestSellerProductChart = async (req, res) => {
  try {
    // console.log("getBestSellerProductChart");

    const totalDoc = await Order.countDocuments({});
    const bestSellingProduct = await Order.aggregate([
      {
        $unwind: "$cart",
      },
      {
        $group: {
          _id: "$cart.title",

          count: {
            $sum: "$cart.quantity",
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: 4,
      },
    ]);

    res.send({
      totalDoc,
      bestSellingProduct,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDashboardOrders = async (req, res) => {
  const { page, limit } = req.query;

  const pages = Number(page) || 1;
  const limits = Number(limit) || 8;
  const skip = (pages - 1) * limits;

  let week = new Date();
  week.setDate(week.getDate() - 10);

  const start = new Date().toDateString();

  // (startDate = '12:00'),
  //   (endDate = '23:59'),
  // console.log("page, limit", page, limit);

  try {
    const totalDoc = await Order.countDocuments({});

    // query for orders
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    const totalAmount = await Order.aggregate([
      {
        $group: {
          _id: null,
          tAmount: {
            $sum: "$total",
          },
        },
      },
    ]);

    // total order amount
    const todayOrder = await Order.find({ createdAt: { $gte: start } });

    // this month order amount
    const totalAmountOfThisMonth = await Order.aggregate([
      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },
            month: {
              $month: "$createdAt",
            },
          },
          total: {
            $sum: "$total",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total delivered order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total delivered order count
    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    //weekly sale report
    // filter order data
    const weeklySaleReport = await Order.find({
      $or: [{ status: { $regex: `Delivered`, $options: "i" } }],
      createdAt: {
        $gte: week,
      },
    });

    res.send({
      totalOrder: totalDoc,
      totalAmount:
        totalAmount.length === 0
          ? 0
          : parseFloat(totalAmount[0].tAmount).toFixed(2),
      todayOrder: todayOrder,
      totalAmountOfThisMonth:
        totalAmountOfThisMonth.length === 0
          ? 0
          : parseFloat(totalAmountOfThisMonth[0].total).toFixed(2),
      totalPendingOrder:
        totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0],
      totalProcessingOrder:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      totalDeliveredOrder:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,
      orders,
      weeklySaleReport,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrderCustomer,
  updateOrder,
  deleteOrder,
  getBestSellerProductChart,
  getDashboardOrders,
  getDashboardRecentOrder,
  getDashboardCount,
  getDashboardAmount,
};
