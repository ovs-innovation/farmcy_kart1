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

const assertEqual = (actual, expected, testName) => {
  if (typeof actual === "number" && typeof expected === "number") {
    if (Math.abs(actual - expected) > 0.01) {
      console.error(`❌ FAILED [${testName}]: Expected ${expected}, got ${actual}`);
      process.exit(1);
    }
  } else if (actual !== expected) {
    console.error(`❌ FAILED [${testName}]: Expected '${expected}', got '${actual}'`);
    process.exit(1);
  }
  console.log(`✅ PASSED [${testName}]`);
};

console.log("=== RUNNING ALL INVOICE TEST CASES ===\n");

// TEST CASE 1: Reference Invoice
const order1 = {
  cart: [
    { title: "Metform 500mg Tablet", mrp: 42.00, price: 32.00, taxRate: 12, quantity: 1, expDate: "2028-08-31" },
    { title: "Amox 500mg Capsule", mrp: 57.00, price: 54.72, taxRate: 12, quantity: 1, expDate: "2028-08-31" },
    { title: "Gluco Strips", mrp: 795.00, price: 610.00, taxRate: 12, quantity: 1, expDate: "228-08-31" }
  ],
  shippingCost: 0,
  total: 696.72
};
const res1 = calculateInvoiceTotals(order1);
assertEqual(res1.mrpTotal, 894.00, "TC1: MRP Total");
assertEqual(res1.totalDiscount, 197.28, "TC1: Total Discount");
assertEqual(res1.totalGst, 83.61, "TC1: Total GST");
assertEqual(res1.shippingCost, 0, "TC1: Shipping Cost");
assertEqual(res1.payableAmount, 696.72, "TC1: Payable Amount");

// TEST CASE 2: Single Product
const order2 = {
  cart: [{ title: "Paracetamol 500mg", mrp: 100.00, price: 80.00, taxRate: 18, quantity: 1 }]
};
const res2 = calculateInvoiceTotals(order2);
assertEqual(res2.mrpTotal, 100.00, "TC2: Single Product MRP");
assertEqual(res2.totalDiscount, 20.00, "TC2: Single Product Discount");
assertEqual(res2.totalGst, 14.40, "TC2: Single Product GST");
assertEqual(res2.payableAmount, 80.00, "TC2: Single Product Payable");

// TEST CASE 3: Multiple Quantities
const order3 = {
  cart: [{ title: "Paracetamol 500mg", mrp: 100.00, price: 80.00, taxRate: 18, quantity: 3 }]
};
const res3 = calculateInvoiceTotals(order3);
assertEqual(res3.mrpTotal, 300.00, "TC3: Multiple Qty MRP");
assertEqual(res3.totalDiscount, 60.00, "TC3: Multiple Qty Discount");
assertEqual(res3.totalGst, 43.20, "TC3: Multiple Qty GST");
assertEqual(res3.payableAmount, 240.00, "TC3: Multiple Qty Payable");

// TEST CASE 4: Multiple Products Accumulation
assertEqual(res1.cart.length, 3, "TC4: Cart Item Count");

// TEST CASE 5: Zero Discount
const order5 = {
  cart: [{ title: "Vitamins", mrp: 50.00, price: 50.00, taxRate: 5, quantity: 2 }]
};
const res5 = calculateInvoiceTotals(order5);
assertEqual(res5.totalDiscount, 0.00, "TC5: Zero Discount");

// TEST CASE 6: Free Shipping
assertEqual(res1.shippingCost, 0, "TC6: Free Shipping");

// TEST CASE 7: Expiry Date Protection
assertEqual(res1.cart[2].formattedExpDate, "2028-08-31", "TC7: 4-digit Year Expiry Formatting");

// TEST CASE 8: Legacy Order without explicit taxSummary or missing mrp
const order8 = {
  cart: [{ title: "Legacy Item", originalPrice: 150.00, price: 120.00, quantity: 1 }]
};
const res8 = calculateInvoiceTotals(order8);
assertEqual(res8.mrpTotal, 150.00, "TC8: Legacy Order MRP Fallback");
assertEqual(res8.totalDiscount, 30.00, "TC8: Legacy Order Discount Fallback");
assertEqual(res8.payableAmount, 120.00, "TC8: Legacy Order Payable Fallback");

console.log("\nALL 8 INVOICE TEST CASES EXECUTED AND PASSED SUCCESSFULLY!");
