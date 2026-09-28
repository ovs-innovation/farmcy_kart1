const dayjs = require("dayjs");

/**
 * Format expiry date to YYYY-MM-DD with 4-digit year protection
 */
const formatExpiryDate = (dateVal) => {
  if (!dateVal) return "-";
  let str = String(dateVal).trim();
  if (str.includes("T")) {
    str = str.split("T")[0];
  }
  // If year is 3 digits like 228-08-31, expand to 2028-08-31
  if (/^\d{3}-\d{2}-\d{2}$/.test(str)) {
    str = "2" + str;
  } else if (/^\d{1,3}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split("-");
    if (parts[0].length < 4) {
      parts[0] = parts[0].padStart(4, "20");
    }
    str = parts.join("-");
  }

  const parsed = dayjs(str);
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD");
  }
  return str || "-";
};

/**
 * Centralized Calculation Engine for Invoices
 * Enforces GST-inclusive pricing where GST is already included in MRP and Selling Price.
 * Finalized Order is the source of truth for totals.
 */
const calculateInvoiceTotals = (order = {}, isWholesaler = false) => {
  const cart = order?.cart || [];

  let mrpTotal = 0;
  let totalDiscount = 0;
  let inclusiveGstTotal = 0;
  let linePayableTotal = 0;

  const processedCart = cart.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);

    // Resolve Unit Selling Price (inclusive of GST)
    let unitSellingPrice = Number(item.price ?? item.prices?.price ?? 0);

    // Resolve Unit MRP (handling 0 properly by falling back to originalPrice/price)
    let unitMrp = 0;
    if (isWholesaler) {
      unitMrp = Number(item.wholePrice) || Number(item.price) || 0;
    } else {
      const rawMrp =
        item.mrp !== undefined && item.mrp !== null && Number(item.mrp) > 0
          ? Number(item.mrp)
          : Number(item.originalPrice || item.prices?.originalPrice || unitSellingPrice || 0);
      unitMrp = Math.abs(rawMrp);
    }

    if (unitSellingPrice <= 0 && unitMrp > 0 && typeof item.discount === "number" && item.discount > 0) {
      unitSellingPrice = unitMrp - (unitMrp * item.discount) / 100;
    }
    unitSellingPrice = Math.abs(unitSellingPrice);

    // If unitMrp was missing or lower than selling price, floor it to selling price
    if (unitMrp < unitSellingPrice) {
      unitMrp = unitSellingPrice;
    }

    // Calculate Unit Discount & Line Discount
    let unitDiscount = 0;
    if (!isWholesaler) {
      if (unitMrp > unitSellingPrice) {
        unitDiscount = unitMrp - unitSellingPrice;
      } else if (typeof item.discount === "number" && item.discount > 0) {
        unitDiscount = (unitMrp * item.discount) / 100;
      }
    }
    unitDiscount = Math.max(0, unitDiscount);

    const lineMrp = Number((unitMrp * quantity).toFixed(2));
    const lineDiscount = Number((unitDiscount * quantity).toFixed(2));
    const linePayable = Number((unitSellingPrice * quantity).toFixed(2));

    // GST is INCLUDED in the Selling Price:
    // Embedded GST component = Selling Price - (Selling Price / (1 + rate / 100))
    const gstRate = Number(item.taxRate ?? item.gstRate ?? item.gstPercentage ?? 12) || 0;
    const lineGst =
      linePayable > 0 && gstRate > 0
        ? Number((linePayable - linePayable / (1 + gstRate / 100)).toFixed(2))
        : 0;

    mrpTotal += lineMrp;
    totalDiscount += lineDiscount;
    inclusiveGstTotal += lineGst;
    linePayableTotal += linePayable;

    return {
      ...item,
      quantity,
      unitMrp,
      unitSellingPrice,
      unitDiscount,
      lineMrp,
      lineDiscount,
      linePayable,
      gstRate,
      lineGst,
      hsn: item.hsn || item.hsnCode || "-",
      batchNo: item.batchNo || "-",
      formattedExpDate: formatExpiryDate(item.expDate),
    };
  });

  const shippingCost = Math.max(0, Number(order?.shippingCost || 0));

  // Determine coupon discount if present
  let couponDiscount = 0;
  if (order?.coupon?.discountAmount !== undefined && Number(order.coupon.discountAmount) > 0) {
    couponDiscount = Number(order.coupon.discountAmount);
  } else if (order?.coupon?.couponCode && order?.discount > 0) {
    couponDiscount = Number(order.discount);
  }

  // Grand Total: Authoritative from finalized order, with deterministic fallback
  let grandTotal = 0;
  if (order?.total !== undefined && order?.total !== null && Number(order.total) >= 0) {
    grandTotal = Number(order.total);
  } else {
    grandTotal = Math.max(0, linePayableTotal + shippingCost - couponDiscount);
  }

  return {
    cart: processedCart,
    mrpTotal: Number(mrpTotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    subTotal: Number(linePayableTotal.toFixed(2)),
    sellingTotal: Number(linePayableTotal.toFixed(2)),
    inclusiveGstTotal: Number(inclusiveGstTotal.toFixed(2)),
    totalGst: Number(inclusiveGstTotal.toFixed(2)),
    shippingCost,
    couponDiscount: Number(couponDiscount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    payableAmount: Number(grandTotal.toFixed(2)),
    linePayableTotal: Number(linePayableTotal.toFixed(2)),
    isGstIncluded: true,
  };
};

module.exports = {
  formatExpiryDate,
  calculateInvoiceTotals,
};
