const dayjs = require("dayjs");

const formatExpiryDate = (dateVal) => {
  if (!dateVal) return "-";
  let str = String(dateVal).trim();
  if (str.includes("T")) {
    str = str.split("T")[0];
  }
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

const calculateInvoiceTotals = (order = {}, isWholesaler = false) => {
  const cart = order?.cart || [];

  let mrpTotal = 0;
  let totalDiscount = 0;
  let calculatedGstTotal = 0;
  let linePayableTotal = 0;

  const processedCart = cart.map((item) => {
    const quantity = Number(item.quantity) || 1;

    let unitMrp = 0;
    if (isWholesaler) {
      unitMrp = Number(item.wholePrice) || Number(item.price) || 0;
    } else {
      const rawMrp = item.mrp !== undefined && item.mrp !== null && Number(item.mrp) > 0
        ? Number(item.mrp)
        : Number(item.originalPrice || item.price || 0);
      unitMrp = Math.abs(rawMrp);
    }

    let unitSellingPrice = Number(item.price ?? 0);
    if (unitSellingPrice <= 0 && unitMrp > 0 && typeof item.discount === "number" && item.discount > 0) {
      unitSellingPrice = unitMrp - (unitMrp * item.discount) / 100;
    }
    unitSellingPrice = Math.abs(unitSellingPrice);

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

  let totalGst = calculatedGstTotal;
  if (order?.taxSummary?.exclusiveTax !== undefined && order?.taxSummary?.exclusiveTax > 0) {
    totalGst = Number(order.taxSummary.exclusiveTax);
  }

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

const sampleOrder = {
  cart: [
    {
      title: "Metform 500mg Tablet",
      mrp: 42.00,
      price: 32.00,
      taxRate: 12,
      quantity: 1,
      expDate: "2028-08-31"
    },
    {
      title: "Amox 500mg Capsule",
      mrp: 57.00,
      price: 54.72,
      taxRate: 12,
      quantity: 1,
      expDate: "2028-08-31"
    },
    {
      title: "Dr Morepen Gluco One BG 03 Blood Glucose Test Strips",
      mrp: 795.00,
      price: 610.00,
      taxRate: 12,
      quantity: 1,
      expDate: "228-08-31" // malformed year example
    }
  ],
  shippingCost: 0,
  total: 696.72
};

const result = calculateInvoiceTotals(sampleOrder);

console.log("=== INVOICE CALCULATION VERIFICATION ===");
console.log("MRP Total:", result.mrpTotal.toFixed(2), "(Expected: 894.00)");
console.log("Total Discount:", result.totalDiscount.toFixed(2), "(Expected: 197.28)");
console.log("Total GST:", result.totalGst.toFixed(2), "(Expected: 83.61)");
console.log("Shipping Cost:", result.shippingCost === 0 ? "FREE" : result.shippingCost.toFixed(2));
console.log("Estimated Payable:", result.payableAmount.toFixed(2), "(Expected: 696.72)");
console.log("\n--- Line Items ---");
result.cart.forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.title}`);
  console.log(`   MRP: ₹${item.unitMrp.toFixed(2)}, Discount: ₹${item.unitDiscount.toFixed(2)}, Payable: ₹${item.unitSellingPrice.toFixed(2)}, GST (${item.gstRate}%): ₹${item.lineGst.toFixed(2)}, Exp: ${item.formattedExpDate}`);
});

const assertEqual = (actual, expected, name) => {
  if (Math.abs(actual - expected) > 0.01) {
    console.error(`FAILED: ${name}. Actual=${actual}, Expected=${expected}`);
    process.exit(1);
  } else {
    console.log(`PASSED: ${name}`);
  }
};

assertEqual(result.mrpTotal, 894.00, "MRP Total");
assertEqual(result.totalDiscount, 197.28, "Total Discount");
assertEqual(result.totalGst, 83.61, "Total GST");
assertEqual(result.payableAmount, 696.72, "Estimated Payable");
assertEqual(result.cart[2].formattedExpDate, "2028-08-31", "Expiry Date 4-digit year fix");
