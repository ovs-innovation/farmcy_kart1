const Setting = require("../models/Setting");

const getString = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val.en || val.name?.en || val.name || Object.values(val)[0] || "";
  }
  return String(val);
};

const buildCompanyInfo = async (logoUrl) => {
  const globalSetting = await Setting.findOne({ name: "globalSetting" });
  const s = globalSetting?.setting || {};
  const storeUrl = (process.env.STORE_URL || "https://farmacykart.com").replace(/\/$/, "");

  return {
    company: s.company_name || s.shop_name || "Farmacykart",
    address: s.address || "",
    phone: s.contact || "",
    email: s.email || "support@farmacykart.com",
    website: storeUrl,
    vat_number: s.vat_number || "",
    currency: s.default_currency || "₹",
    logo: logoUrl || "",
  };
};

const normalizeInvoiceCart = (cart = []) =>
  cart.map((item) => {
    const unitPrice = Number(item.prices?.price ?? item.price ?? item.sellingPrice ?? 0);
    const unitMrp = Number(item.mrp || item.originalPrice || item.prices?.originalPrice || unitPrice);
    const discount = Number(item.discountAmount ?? (unitMrp > unitPrice ? unitMrp - unitPrice : 0));
    return {
      title: getString(item.title),
      quantity: Number(item.quantity) || 1,
      price: unitPrice,
      sellingPrice: unitPrice,
      mrp: unitMrp,
      originalPrice: unitMrp,
      discountAmount: discount,
      hsn: item.hsn || item.hsnCode || "",
      batchNo: item.batchNo || "",
      expDate: item.expDate || "",
      taxRate: Number(item.taxRate || item.gstRate || item.gstPercentage || 12),
      gstRate: Number(item.gstRate || item.taxRate || item.gstPercentage || 12),
    };
  });

const enrichOrderForInvoice = (order, companyInfo) => {
  const cart = normalizeInvoiceCart(order.cart);
  const subTotal = Number(order.subTotal ?? 0);
  const shippingCost = Number(order.shippingCost ?? 0);
  const discount = Number(order.discount ?? 0);
  const total = Number(order.total ?? 0);
  
  // Calculate embedded inclusive GST
  const inclusiveTax = cart.reduce((sum, item) => {
    const lineTotal = item.price * item.quantity;
    const rate = item.gstRate || item.taxRate || 12;
    const itemGst = (lineTotal * rate) / (100 + rate);
    return sum + itemGst;
  }, 0);

  const orderData = typeof order.toObject === 'function' ? order.toObject() : order;
  return {
    ...orderData,
    cart,
    subTotal,
    shippingCost,
    discount,
    total,
    vat: Number(order.taxSummary?.inclusiveTax || order.vat || inclusiveTax || 0),
    inclusiveGst: Number(order.taxSummary?.inclusiveTax || inclusiveTax || 0),
    company_info: companyInfo,
  };
};

const buildInvoiceEmailOption = (order, companyInfo, shopName, contactEmail, logo) => {
  const cart = normalizeInvoiceCart(order.cart);
  const currency = companyInfo.currency || "₹";
  const isCod =
    order.paymentMethod === "Cash On Delivery" || order.paymentMethod === "Cash";

  return {
    name: order.user_info?.name || "Customer",
    email: order.user_info?.email || "",
    phone: order.user_info?.contact || "",
    address: order.user_info?.address || "",
    invoice: order.invoice,
    cart,
    subTotal: Number(order.subTotal ?? 0),
    shipping: Number(order.shippingCost ?? 0),
    discount: Number(order.discount ?? 0),
    total: Number(order.total ?? 0),
    currency,
    method: order.paymentMethod || "Online",
    date: new Date(order.createdAt || Date.now()).toLocaleDateString(),
    paymentStatus: isCod ? "Pending" : "Confirmed",
    status: order.status || "Order Placed",
    company_name: companyInfo.company,
    company_address: companyInfo.address,
    company_phone: companyInfo.phone,
    company_email: companyInfo.email,
    company_website: companyInfo.website,
    vat_number: companyInfo.vat_number,
    trackingUrl: `${process.env.STORE_URL || "https://farmacykart.com"}/user/dashboard`,
    contact_email: contactEmail,
    shop_name: shopName,
    logo,
  };
};

module.exports = {
  buildCompanyInfo,
  normalizeInvoiceCart,
  enrichOrderForInvoice,
  buildInvoiceEmailOption,
};
