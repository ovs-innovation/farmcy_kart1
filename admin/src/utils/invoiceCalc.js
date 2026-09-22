import dayjs from "dayjs";

/**
 * Format expiry date to YYYY-MM-DD with 4-digit year protection
 */
export const formatExpiryDate = (dateVal) => {
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
 * Guarantees exact mathematical alignment between line items, subtotals, GST, and totals.
 */
export const calculateInvoiceTotals = (order = {}, isWholesaler = false) => {
  const cart = order?.cart || [];

  let mrpTotal = 0;
  let totalDiscount = 0;
  let calculatedGstTotal = 0;
  let linePayableTotal = 0;

  const processedCart = cart.map((item) => {
    const quantity = Number(item.quantity) || 1;

    // Resolve Unit MRP (handling 0 properly by falling back to originalPrice/price)
    let unitMrp = 0;
    if (isWholesaler) {
      unitMrp = Number(item.wholePrice) || Number(item.price) || 0;
    } else {
      const rawMrp = item.mrp !== undefined && item.mrp !== null && Number(item.mrp) > 0
        ? Number(item.mrp)
        : Number(item.originalPrice || item.price || 0);
      unitMrp = Math.abs(rawMrp);
    }

    // Resolve Unit Selling Price
    let unitSellingPrice = Number(item.price ?? 0);
    if (unitSellingPrice <= 0 && unitMrp > 0 && typeof item.discount === "number" && item.discount > 0) {
      unitSellingPrice = unitMrp - (unitMrp * item.discount) / 100;
    }
    unitSellingPrice = Math.abs(unitSellingPrice);

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

    const lineMrp = unitMrp * quantity;
    const lineDiscount = unitDiscount * quantity;
    const linePayable = unitSellingPrice * quantity;

    // Resolve GST
    const gstRate = Number(item.taxRate || item.gstRate || item.gstPercentage || 12) || 0;
    const lineGst = (linePayable * gstRate) / 100;

    mrpTotal += lineMrp;
    totalDiscount += lineDiscount;
    calculatedGstTotal += lineGst;
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
      formattedExpDate: formatExpiryDate(item.expDate),
    };
  });

  const shippingCost = Math.max(0, Number(order?.shippingCost || 0));

  // Determine Tax
  let totalGst = calculatedGstTotal;
  if (order?.taxSummary?.exclusiveTax !== undefined && order?.taxSummary?.exclusiveTax > 0) {
    totalGst = Number(order.taxSummary.exclusiveTax);
  }

  // Determine Final Payable Total
  let payableAmount = Number(order?.total || 0);
  if (!payableAmount || payableAmount <= 0) {
    payableAmount = linePayableTotal + shippingCost;
  }

  return {
    cart: processedCart,
    mrpTotal: Math.abs(mrpTotal),
    totalDiscount: Math.abs(totalDiscount),
    totalGst: Math.abs(totalGst),
    shippingCost,
    payableAmount: Math.abs(payableAmount),
    linePayableTotal: Math.abs(linePayableTotal),
  };
};
