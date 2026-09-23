require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const Order = require("../models/Order");

async function run() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("--- Inspecting null checkoutRequestId documents ---");
    const nullCountBefore = await Order.countDocuments({ checkoutRequestId: null });
    console.log(`Found ${nullCountBefore} orders with checkoutRequestId: null`);

    if (nullCountBefore > 0) {
      console.log("Cleaning up null checkoutRequestId using $unset...");
      const result = await Order.updateMany(
        { checkoutRequestId: null },
        { $unset: { checkoutRequestId: "" } }
      );
      console.log(`Updated ${result.modifiedCount || result.nModified || 0} documents.`);
    }

    const nullCountAfter = await Order.countDocuments({ checkoutRequestId: null });
    console.log(`Orders with checkoutRequestId: null after cleanup: ${nullCountAfter}`);

    console.log("\n--- Inspecting Order collection indexes ---");
    const indexes = await Order.collection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));

    const checkoutIndex = indexes.find(
      (idx) => idx.name === "checkoutRequestId_1" || (idx.key && idx.key.checkoutRequestId === 1)
    );

    if (checkoutIndex) {
      console.log("\nFound checkoutRequestId index:", checkoutIndex);
      console.log("Is unique:", !!checkoutIndex.unique);
      console.log("Is sparse:", !!checkoutIndex.sparse);
    } else {
      console.warn("\nWarning: checkoutRequestId_1 index not found in raw collection indexes. Ensuring index via Mongoose...");
      await Order.init();
      const updatedIndexes = await Order.collection.indexes();
      console.log("Updated indexes:", JSON.stringify(updatedIndexes, null, 2));
    }

    console.log("\nCleanup & Index verification finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup script error:", err);
    process.exit(1);
  }
}

run();
