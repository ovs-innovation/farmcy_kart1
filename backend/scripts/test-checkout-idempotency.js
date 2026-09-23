require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { addOrder } = require("../controller/customerOrderController");

// Helper to mock express req and res
function createMockReqRes({ user, body = {}, headers = {}, getFn } = {}) {
  const req = {
    user: user || { _id: new mongoose.Types.ObjectId() },
    body,
    headers,
    get: getFn || ((header) => headers[header.toLowerCase()] || headers[header]),
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    send(data) {
      responseData = data;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    _getResult() {
      return { statusCode, data: responseData };
    },
  };

  return { req, res };
}

async function runTests() {
  console.log("=== Starting Checkout Idempotency & Null Handling Tests ===\n");

  try {
    await connectDB();

    // 1. Cleanup any null checkoutRequestId if existing
    const nullsBefore = await Order.countDocuments({ checkoutRequestId: null });
    console.log(`Initial orders with checkoutRequestId: null = ${nullsBefore}`);
    if (nullsBefore > 0) {
      await Order.updateMany({ checkoutRequestId: null }, { $unset: { checkoutRequestId: "" } });
      console.log("Cleaned up initial null checkoutRequestId fields.");
    }

    // 2. Setup mock customer & product for testing order placement
    let testCustomer = await Customer.findOne({ email: "idempotency_test@farmacykart.com" });
    if (!testCustomer) {
      testCustomer = new Customer({
        name: "Idempotency Test User",
        email: "idempotency_test@farmacykart.com",
        phone: "9999999999",
        address: "123 Test Street",
        city: "Mumbai",
        country: "India",
        zipCode: "400001",
      });
      await testCustomer.save();
    }

    let testProduct = await Product.findOne({ "title.en": "Test Product Idempotency" });
    if (!testProduct) {
      testProduct = new Product({
        title: { en: "Test Product Idempotency" },
        slug: "test-product-idempotency",
        sku: "TEST-SKU-IDEMPOTENCY",
        prices: { price: 100 },
        stock: 500,
        status: "show",
      });
      await testProduct.save();
    } else {
      testProduct.stock = 500;
      await testProduct.save();
    }

    const baseCart = [
      {
        _id: testProduct._id.toString(),
        id: testProduct._id.toString(),
        title: "Test Product Idempotency",
        price: 100,
        quantity: 1,
        itemTotal: 100,
      },
    ];

    const baseUserInfo = {
      name: "Idempotency Test User",
      email: "idempotency_test@farmacykart.com",
      contact: "9999999999",
      address: "123 Test Street",
      city: "Mumbai",
      country: "India",
      zipCode: "400001",
    };

    let passedTests = 0;
    let totalTests = 6;

    // --- TEST A: Web Order with valid checkoutRequestId ---
    console.log("\n--- TEST A: Web Order (Valid checkoutRequestId) ---");
    const testAKey = `test_a_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { req: reqA, res: resA } = createMockReqRes({
      user: { _id: testCustomer._id },
      body: {
        cart: baseCart,
        user_info: baseUserInfo,
        paymentMethod: "COD",
        checkoutRequestId: testAKey,
      },
    });

    await addOrder(reqA, resA);
    const resultA = resA._getResult();
    if (resultA.statusCode === 201 && resultA.data?.checkoutRequestId === testAKey) {
      console.log("✅ TEST A PASSED: Order created successfully with checkoutRequestId.");
      passedTests++;
    } else {
      console.error("❌ TEST A FAILED:", resultA);
    }

    // --- TEST B: Web Duplicate Request (Same checkoutRequestId) ---
    console.log("\n--- TEST B: Duplicate Order Request (Same ID) ---");
    const { req: reqB, res: resB } = createMockReqRes({
      user: { _id: testCustomer._id },
      body: {
        cart: baseCart,
        user_info: baseUserInfo,
        paymentMethod: "COD",
        checkoutRequestId: testAKey,
      },
    });

    await addOrder(reqB, resB);
    const resultB = resB._getResult();
    const countA = await Order.countDocuments({ checkoutRequestId: testAKey });

    if (resultB.statusCode === 200 && resultB.data?._id?.toString() === resultA.data?._id?.toString() && countA === 1) {
      console.log("✅ TEST B PASSED: Idempotent return of existing order. Exactly 1 order in DB.");
      passedTests++;
    } else {
      console.error("❌ TEST B FAILED:", { statusCode: resultB.statusCode, countInDB: countA });
    }

    // --- TEST C: React Native-Compatible Request (Header + Body) ---
    console.log("\n--- TEST C: React Native Request (Header Idempotency-Key + Body checkoutRequestId) ---");
    const testCKey = `rn_key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { req: reqC, res: resC } = createMockReqRes({
      user: { _id: testCustomer._id },
      headers: { "idempotency-key": testCKey },
      body: {
        cart: baseCart,
        user_info: baseUserInfo,
        paymentMethod: "COD",
        checkoutRequestId: testCKey,
      },
    });

    await addOrder(reqC, resC);
    const resultC = resC._getResult();
    if (resultC.statusCode === 201 && resultC.data?.checkoutRequestId === testCKey) {
      console.log("✅ TEST C PASSED: React Native header & body format accepted and order created.");
      passedTests++;
    } else {
      console.error("❌ TEST C FAILED:", resultC);
    }

    // --- TEST D: Missing ID (Verify document omits field & multiple missing IDs don't collide) ---
    console.log("\n--- TEST D: Missing ID (No checkoutRequestId) ---");
    const { req: reqD1, res: resD1 } = createMockReqRes({
      user: { _id: testCustomer._id },
      body: {
        cart: baseCart,
        user_info: baseUserInfo,
        paymentMethod: "COD",
      },
    });

    await addOrder(reqD1, resD1);
    const resultD1 = resD1._getResult();

    const { req: reqD2, res: resD2 } = createMockReqRes({
      user: { _id: testCustomer._id },
      body: {
        cart: baseCart,
        user_info: baseUserInfo,
        paymentMethod: "COD",
        checkoutRequestId: null, // explicit null in payload
      },
    });

    await addOrder(reqD2, resD2);
    const resultD2 = resD2._getResult();

    const nullCountInDB = await Order.countDocuments({ checkoutRequestId: null });
    const rawDocD1 = await Order.findById(resultD1.data?._id).lean();
    const rawDocD2 = await Order.findById(resultD2.data?._id).lean();

    const d1Omitted = rawDocD1 && !("checkoutRequestId" in rawDocD1);
    const d2Omitted = rawDocD2 && !("checkoutRequestId" in rawDocD2);

    if (
      resultD1.statusCode === 201 &&
      resultD2.statusCode === 201 &&
      nullCountInDB === 0 &&
      d1Omitted &&
      d2Omitted
    ) {
      console.log("✅ TEST D PASSED: Missing and null IDs omitted from DB; multiple orders succeeded without null collision.");
      passedTests++;
    } else {
      console.error("❌ TEST D FAILED:", {
        d1Status: resultD1.statusCode,
        d2Status: resultD2.statusCode,
        nullCountInDB,
        d1HasField: "checkoutRequestId" in (rawDocD1 || {}),
        d2HasField: "checkoutRequestId" in (rawDocD2 || {}),
      });
    }

    // --- TEST E: Conflicting IDs ---
    console.log("\n--- TEST E: Conflicting Header vs Body IDs ---");
    const { req: reqE, res: resE } = createMockReqRes({
      user: { _id: testCustomer._id },
      headers: { "idempotency-key": "KEY_AAA" },
      body: {
        cart: baseCart,
        user_info: baseUserInfo,
        paymentMethod: "COD",
        checkoutRequestId: "KEY_BBB",
      },
    });

    await addOrder(reqE, resE);
    const resultE = resE._getResult();
    if (resultE.statusCode === 400 && resultE.data?.message?.includes("not match")) {
      console.log("✅ TEST E PASSED: 400 Bad Request returned on conflicting keys.");
      passedTests++;
    } else {
      console.error("❌ TEST E FAILED:", resultE);
    }

    // --- TEST F: Concurrent Duplicate Requests (Race condition) ---
    console.log("\n--- TEST F: Concurrent Duplicate Requests (Race Condition Simulation) ---");
    const testFKey = `concurrent_key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const { req: reqF1, res: resF1 } = createMockReqRes({
      user: { _id: testCustomer._id },
      body: {
        cart: baseCart,
        user_info: baseUserInfo,
        paymentMethod: "COD",
        checkoutRequestId: testFKey,
      },
    });

    const { req: reqF2, res: resF2 } = createMockReqRes({
      user: { _id: testCustomer._id },
      body: {
        cart: baseCart,
        user_info: baseUserInfo,
        paymentMethod: "COD",
        checkoutRequestId: testFKey,
      },
    });

    // Execute concurrently
    await Promise.all([addOrder(reqF1, resF1), addOrder(reqF2, resF2)]);

    const resultF1 = resF1._getResult();
    const resultF2 = resF2._getResult();
    const countF = await Order.countDocuments({ checkoutRequestId: testFKey });

    const f1Valid = resultF1.statusCode === 201 || resultF1.statusCode === 200;
    const f2Valid = resultF2.statusCode === 201 || resultF2.statusCode === 200;
    const orderF1Id = resultF1.data?._id?.toString();
    const orderF2Id = resultF2.data?._id?.toString();

    if (f1Valid && f2Valid && countF === 1 && orderF1Id === orderF2Id) {
      console.log("✅ TEST F PASSED: Concurrent requests produced exactly 1 order in DB and both returned the order successfully.");
      passedTests++;
    } else {
      console.error("❌ TEST F FAILED:", {
        f1: resultF1,
        f2: resultF2,
        countInDB: countF,
      });
    }

    console.log(`\n=============================================`);
    console.log(`Test Results: ${passedTests}/${totalTests} Passed`);
    console.log(`=============================================\n`);

    // Clean up test records
    await Order.deleteMany({ "user_info.email": "idempotency_test@farmacykart.com" });
    await Customer.deleteMany({ email: "idempotency_test@farmacykart.com" });
    await Product.deleteMany({ sku: "TEST-SKU-IDEMPOTENCY" });

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  }
}

runTests();
