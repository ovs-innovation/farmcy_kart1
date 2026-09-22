const mongoose = require("mongoose");
const Product = require("../models/Product");

const DEFAULT_SHIPROCKET_HSN =
  process.env.SHIPROCKET_DEFAULT_HSN?.trim() || "3305";

async function populateCartTaxFields(cart) {
  if (!cart || cart.length === 0) return cart;

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

  if (orConditions.length === 0) return cart;

  const products = await Product.find({ $or: orConditions }).select(
    "_id productId sku slug title taxRate hsnCode mrp originalPrice batchNo expDate"
  );

  const productMap = new Map();
  products.forEach((product) => {
    const data = {
      taxRate: product.taxRate || 0,
      hsnCode: product.hsnCode || "",
      mrp: product.mrp || product.originalPrice || 0,
      batchNo: product.batchNo || "",
      expDate: product.expDate || "",
    };
    if (product._id) productMap.set(product._id.toString(), data);
    if (product.productId) productMap.set(String(product.productId).trim(), data);
    if (product.sku) productMap.set(String(product.sku).trim(), data);
    if (product.slug) productMap.set(String(product.slug).trim(), data);
    if (typeof product.title === "string") productMap.set(product.title.trim(), data);
    if (product.title?.en) productMap.set(String(product.title.en).trim(), data);
  });

  return cart.map((item) => {
    const keysToTry = [
      item._id?.toString(),
      item.id?.toString(),
      item.productId?.toString(),
      item.slug,
      typeof item.title === "string" ? item.title.trim() : item.title?.en?.trim(),
    ].filter(Boolean);

    let productData = null;
    for (const key of keysToTry) {
      if (productMap.has(key)) {
        productData = productMap.get(key);
        break;
      }
    }

    if (productData) {
      return {
        ...item,
        taxRate: item.taxRate ?? productData.taxRate,
        hsn: item.hsn || item.hsnCode || productData.hsnCode,
        mrp: item.mrp || productData.mrp,
        batchNo: item.batchNo || productData.batchNo,
        expDate: item.expDate || productData.expDate,
      };
    }
    return item;
  });
}

function normalizeToken(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function resolveLineItemHsn(item) {
  const hsn = normalizeToken(item?.hsn || item?.hsnCode);
  return hsn || DEFAULT_SHIPROCKET_HSN;
}

async function enrichOrderItemsForShiprocket(orderItems = [], cart = []) {
  let enrichedCart = cart;
  if (cart?.length) {
    enrichedCart = await populateCartTaxFields(cart);
  }

  const cartByKey = new Map();
  (enrichedCart || []).forEach((item, index) => {
    const keys = [
      item.sku,
      item.productId?.toString?.(),
      item.id?.toString?.(),
      item._id?.toString?.(),
      `index:${index}`,
    ].filter(Boolean);
    keys.forEach((key) => cartByKey.set(String(key), item));
  });

  return (orderItems || []).map((item, index) => {
    const cartMatch =
      cartByKey.get(String(item.sku)) ||
      cartByKey.get(`index:${index}`) ||
      enrichedCart[index];

    const merged = { ...(cartMatch || {}), ...item };
    return {
      name: merged.name || merged.title || `Item-${index + 1}`,
      sku: merged.sku || merged.id || merged._id || `SKU-${index + 1}`,
      units: merged.units ?? merged.quantity ?? 1,
      selling_price: (
        merged.selling_price ??
        merged.price ??
        merged.unit_price ??
        0
      ).toString(),
      discount: merged.discount ?? "",
      tax: merged.tax ?? "",
      hsn: resolveLineItemHsn(merged),
    };
  });
}

module.exports = {
  populateCartTaxFields,
  enrichOrderItemsForShiprocket,
  resolveLineItemHsn,
  DEFAULT_SHIPROCKET_HSN,
};
