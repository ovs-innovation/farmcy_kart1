require("dotenv").config();
const { connectDB } = require("../config/db");
const Product = require("../models/Product");
const productData = require("../utils/products");

connectDB();

const appendProductsOnly = async () => {
  try {
    console.log(`Starting processing of ${productData.length} product(s)...`);

    let addedCount = 0;
    let updatedCount = 0;

    for (const prod of productData) {
      const query = prod._id ? { _id: prod._id } : { productId: prod.productId };
      const existing = await Product.findOne(query);

      if (existing) {
        await Product.updateOne(query, { $set: prod });
        updatedCount++;
      } else {
        await Product.create(prod);
        addedCount++;
      }
    }

    console.log(`✅ Success! Added ${addedCount} new product(s) and updated ${updatedCount} existing product(s) in MongoDB.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error appending products:", error.message);
    process.exit(1);
  }
};

appendProductsOnly();
