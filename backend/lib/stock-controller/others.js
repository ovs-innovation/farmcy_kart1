require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../../models/Product");

// const base = 'https://api-m.sandbox.paypal.com';

// Create separate MongoDB connection only if MONGO_URI is available
// Note: This connection is not currently used in this file, but kept for potential future use
let mongo_connection = null;
if (process.env.MONGO_URI) {
  try {
    mongo_connection = mongoose.createConnection(process.env.MONGO_URI, {
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      keepAlive: 1,
      poolSize: 100,
      bufferMaxEntries: 0,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    });
  } catch (err) {
    console.warn("Warning: Could not create separate MongoDB connection:", err.message);
  }
} else {
  console.warn("Warning: MONGO_URI not set in environment variables. Separate connection not created.");
}

// decrease product quantity after a order created
const handleProductQuantity = async (cart) => {
  try {
    for (const p of cart) {
      if (p?.isCombination) {
        // Handle variant quantity updates
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: p._id,
            "variants.productId": p?.variant?.productId || "",
            stock: { $gte: p.quantity },
            "variants.quantity": { $gte: p.quantity },
          },
          {
            $inc: {
              stock: -p.quantity,
              "variants.$.quantity": -p.quantity,
              sales: p.quantity,
            },
          },
          {
            new: true,
          }
        );
        if (!updatedProduct) {
          console.error(`Failed to decrease stock for combination product ${p._id}. Insufficient stock.`);
        }
      } else {
        // Handle regular product quantity updates
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: p._id,
            stock: { $gte: p.quantity },
          },
          {
            $inc: {
              stock: -p.quantity,
              sales: p.quantity,
            },
          },
          {
            new: true,
          }
        );
        if (!updatedProduct) {
          console.error(`Failed to decrease stock for product ${p._id}. Insufficient stock.`);
        }
      }
    }
  } catch (err) {
    console.log("err on handleProductQuantity", err.message);
  }
};

const rollbackReservedStock = async (reservedItems) => {
  for (const { item, quantity } of reservedItems) {
    try {
      const itemId = item._id || item.id;
      if (item?.isCombination) {
        const variantId = item?.variant?.productId || item?.variant?._id || item?.variant?.id;
        const filter = { _id: itemId };
        if (variantId) {
          filter["variants.productId"] = variantId;
        }
        await Product.updateOne(filter, {
          $inc: {
            stock: quantity,
            "variants.$.quantity": quantity,
            sales: -quantity,
          },
        });
      } else {
        await Product.updateOne(
          { _id: itemId },
          {
            $inc: {
              stock: quantity,
              sales: -quantity,
            },
          }
        );
      }
    } catch (rbErr) {
      console.error("Rollback failed for item:", item, rbErr.message);
    }
  }
};

const reserveStockAtomically = async (cart, session = null) => {
  const reservedItems = [];
  try {
    for (const p of cart) {
      const quantity = Number(p.quantity) || 1;
      const itemId = p._id || p.id;
      if (p?.isCombination) {
        const variantId = p?.variant?.productId || p?.variant?._id || p?.variant?.id;
        const filter = {
          _id: itemId,
          stock: { $gte: quantity },
          "variants.quantity": { $gte: quantity },
        };
        if (variantId) {
          filter["variants.productId"] = variantId;
        }
        const options = { new: true };
        if (session) options.session = session;

        const updatedProduct = await Product.findOneAndUpdate(
          filter,
          {
            $inc: {
              stock: -quantity,
              "variants.$.quantity": -quantity,
              sales: quantity,
            },
          },
          options
        );

        if (!updatedProduct) {
          throw new Error(`Insufficient stock for item ${p.title || itemId}`);
        }
        reservedItems.push({ item: p, quantity });
      } else {
        const options = { new: true };
        if (session) options.session = session;

        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: itemId,
            stock: { $gte: quantity },
          },
          {
            $inc: {
              stock: -quantity,
              sales: quantity,
            },
          },
          options
        );

        if (!updatedProduct) {
          throw new Error(`Insufficient stock for item ${p.title || itemId}`);
        }
        reservedItems.push({ item: p, quantity });
      }
    }
    return { ok: true, reservedItems };
  } catch (err) {
    if (!session && reservedItems.length > 0) {
      await rollbackReservedStock(reservedItems);
    }
    return { ok: false, error: err.message, reservedItems };
  }
};

const checkStock = async (cart) => {
  try {
    if (!cart || !Array.isArray(cart)) {
      console.log("checkStock: cart is not an array", cart);
      return [];
    }

    const objectIds = [];
    const stringIdentifiers = [];
    const titles = [];

    cart.forEach((item) => {
      const candidates = [item._id, item.id, item.productId].filter(Boolean);
      candidates.forEach((cand) => {
        const candStr = String(cand).trim();
        if (mongoose.Types.ObjectId.isValid(candStr)) {
          objectIds.push(candStr);
        } else if (candStr) {
          stringIdentifiers.push(candStr);
        }
      });

      const titleStr = typeof item.title === "string" ? item.title : item.title?.en || "";
      if (titleStr && String(titleStr).trim()) {
        titles.push(String(titleStr).trim());
      }
    });

    const uniqueObjectIds = [...new Set(objectIds)];
    const uniqueStrings = [...new Set(stringIdentifiers)];
    const uniqueTitles = [...new Set(titles)];

    const orConditions = [];
    if (uniqueObjectIds.length > 0) {
      orConditions.push({ _id: { $in: uniqueObjectIds } });
    }
    if (uniqueStrings.length > 0) {
      orConditions.push({ productId: { $in: uniqueStrings } });
      orConditions.push({ sku: { $in: uniqueStrings } });
      orConditions.push({ slug: { $in: uniqueStrings } });
    }
    if (uniqueTitles.length > 0) {
      orConditions.push({ title: { $in: uniqueTitles } });
      orConditions.push({ "title.en": { $in: uniqueTitles } });
    }

    const productMap = new Map();
    if (orConditions.length > 0) {
      const dbProducts = await Product.find({ $or: orConditions });
      dbProducts.forEach((prod) => {
        if (prod._id) productMap.set(prod._id.toString(), prod);
        if (prod.productId) productMap.set(String(prod.productId).trim(), prod);
        if (prod.sku) productMap.set(String(prod.sku).trim(), prod);
        if (prod.slug) productMap.set(String(prod.slug).trim(), prod);
        if (typeof prod.title === "string") productMap.set(prod.title.trim(), prod);
        if (prod.title?.en) productMap.set(String(prod.title.en).trim(), prod);
      });
    }

    const outOfStockItems = [];
    for (const item of cart) {
      const keysToTry = [
        item._id?.toString(),
        item.id?.toString(),
        item.productId?.toString(),
        item.slug,
        typeof item.title === "string" ? item.title.trim() : item.title?.en?.trim(),
      ].filter(Boolean);

      let product = null;
      for (const key of keysToTry) {
        if (productMap.has(key)) {
          product = productMap.get(key);
          break;
        }
      }

      if (!product) {
        console.log("checkStock: product not found for item:", JSON.stringify(item));
        outOfStockItems.push({
          _id: item._id || item.id,
          id: item.id,
          title: typeof item.title === "string" ? item.title : item.title?.en || "Unknown Product",
          reason: "Product not found in database",
        });
        continue;
      }

      if (item.isCombination) {
        const variantId = item.variant?.productId || item.variant?._id || item.variant?.id;
        if (!variantId) {
          console.log("checkStock: variantId missing for combination product", item._id || item.id);
          outOfStockItems.push({
            _id: product._id,
            id: item.id,
            title: item.title,
            reason: "Variant information missing",
          });
          continue;
        }

        const variant = product.variants?.find(
          (v) => (v.productId || v._id || v.id)?.toString() === variantId?.toString()
        );

        if (!variant) {
          console.log("checkStock: variant not found", variantId, "in product", product._id);
          outOfStockItems.push({
            _id: product._id,
            id: item.id,
            title: item.title,
            reason: "Variant not found",
          });
          continue;
        }

        if (variant.quantity < item.quantity) {
          outOfStockItems.push({
            _id: product._id,
            id: item.id,
            title: item.title,
            variantId: variantId,
            available: variant.quantity,
            requested: item.quantity,
          });
        }
      } else {
        if (product.stock < item.quantity) {
          outOfStockItems.push({
            _id: product._id,
            id: item.id,
            title: typeof item.title === "string" ? item.title : item.title?.en || product.title?.en || product.title,
            available: product.stock,
            requested: item.quantity,
          });
        }
      }
    }
    return outOfStockItems;
  } catch (err) {
    console.error("err on checkStock:", err.message);
    return [];
  }
};

const handleProductAttribute = async (key, value, multi) => {
  try {
    // const products = await Product.find({ 'variants.1': { $exists: true } });
    const products = await Product.find({ isCombination: true });

    // console.log('products', products);

    if (multi) {
      for (const p of products) {
        await Product.updateOne(
          { _id: p._id },
          {
            $pull: {
              variants: { [key]: { $in: value } },
            },
          }
        );
      }
    } else {
      for (const p of products) {
        // console.log('p', p._id);
        await Product.updateOne(
          { _id: p._id },
          {
            $pull: {
              variants: { [key]: value },
            },
          }
        );
      }
    }
  } catch (err) {
    console.log("err, when delete product variants", err.message);
  }
};

module.exports = {
  handleProductQuantity,
  handleProductAttribute,
  checkStock,
  reserveStockAtomically,
  rollbackReservedStock,
};