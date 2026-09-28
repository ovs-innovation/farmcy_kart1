const { calculateInvoiceTotals, formatExpiryDate } = require("./verify_invoice_calc");

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

console.log("===============================================================");
console.log("🧪 EXECUTING COMPREHENSIVE INVOICE VERIFICATION SUITE (11 CASES)");
console.log("===============================================================\n");

// -----------------------------------------------------------------------------
// TEST CASE 1: Primary Business Rule Example (Dolo 500 mg)
// Product: MRP ₹40.00, 12% Discount (₹4.80), Selling Price ₹35.20, GST 12% included.
// Must NOT calculate ₹35.20 + GST = ₹39.42! Final Payable must be ₹35.20.
// -----------------------------------------------------------------------------
const order1 = {
  cart: [
    {
      title: "Dolo 500 mg",
      mrp: 40.00,
      price: 35.20,
      taxRate: 12,
      quantity: 1,
      hsn: "30049099",
      batchNo: "DL5001",
      expDate: "2027-12-31",
    },
  ],
  shippingCost: 0,
  total: 35.20,
};
const res1 = calculateInvoiceTotals(order1);
assertEqual(res1.mrpTotal, 40.00, "TC1: MRP Total ₹40.00");
assertEqual(res1.totalDiscount, 4.80, "TC1: Total Discount ₹4.80");
assertEqual(res1.sellingTotal, 35.20, "TC1: Subtotal / Selling Price ₹35.20");
assertEqual(res1.cart[0].lineGst, 3.77, "TC1: Embedded Inclusive GST ₹3.77 (35.20 - 35.20/1.12)");
assertEqual(res1.grandTotal, 35.20, "TC1: Grand Total must remain ₹35.20 (NOT ₹39.42)");
assertEqual(res1.isGstIncluded, true, "TC1: GST is marked included");

// -----------------------------------------------------------------------------
// TEST CASE 2: Multiple Quantities of GST-Inclusive Item
// 3 units of Dolo 500 mg
// -----------------------------------------------------------------------------
const order2 = {
  cart: [
    {
      title: "Dolo 500 mg",
      mrp: 40.00,
      price: 35.20,
      taxRate: 12,
      quantity: 3,
    },
  ],
  shippingCost: 0,
  total: 105.60,
};
const res2 = calculateInvoiceTotals(order2);
assertEqual(res2.mrpTotal, 120.00, "TC2: Multiple Qty MRP Total ₹120.00");
assertEqual(res2.totalDiscount, 14.40, "TC2: Multiple Qty Discount ₹14.40");
assertEqual(res2.sellingTotal, 105.60, "TC2: Subtotal / Selling Price ₹105.60");
assertEqual(res2.cart[0].lineGst, 11.31, "TC2: Embedded GST for 3 units ₹11.31");
assertEqual(res2.grandTotal, 105.60, "TC2: Grand Total ₹105.60");

// -----------------------------------------------------------------------------
// TEST CASE 3: Multi-item Reference Cart (Metform + Amox + Gluco Strips)
// -----------------------------------------------------------------------------
const order3 = {
  cart: [
    { title: "Metform 500mg Tablet", mrp: 42.00, price: 32.00, taxRate: 12, quantity: 1, expDate: "2028-08-31" },
    { title: "Amox 500mg Capsule", mrp: 57.00, price: 54.72, taxRate: 12, quantity: 1, expDate: "2028-08-31" },
    { title: "Dr Morepen Gluco One Strips", mrp: 795.00, price: 610.00, taxRate: 12, quantity: 1, expDate: "228-08-31" }
  ],
  shippingCost: 0,
  total: 696.72
};
const res3 = calculateInvoiceTotals(order3);
assertEqual(res3.mrpTotal, 894.00, "TC3: Multi-item MRP Total ₹894.00");
assertEqual(res3.totalDiscount, 197.28, "TC3: Multi-item Total Discount ₹197.28");
assertEqual(res3.sellingTotal, 696.72, "TC3: Multi-item Subtotal / Selling Price ₹696.72");
assertEqual(res3.grandTotal, 696.72, "TC3: Multi-item Grand Total ₹696.72");

// -----------------------------------------------------------------------------
// TEST CASE 4: Coupon Discount Application
// Order with Coupon code applied (-₹50.00)
// -----------------------------------------------------------------------------
const order4 = {
  cart: [
    { title: "Metform 500mg Tablet", mrp: 42.00, price: 32.00, taxRate: 12, quantity: 1 },
    { title: "Dr Morepen Gluco One Strips", mrp: 795.00, price: 610.00, taxRate: 12, quantity: 1 }
  ],
  shippingCost: 0,
  coupon: { couponCode: "WELCOME50", discountAmount: 50.00 },
  discount: 50.00,
  total: 592.00
};
const res4 = calculateInvoiceTotals(order4);
assertEqual(res4.sellingTotal, 642.00, "TC4: Subtotal before coupon ₹642.00");
assertEqual(res4.couponDiscount, 50.00, "TC4: Coupon Discount ₹50.00");
assertEqual(res4.grandTotal, 592.00, "TC4: Grand Total after coupon ₹592.00");

// -----------------------------------------------------------------------------
// TEST CASE 5: Shipping Fee Added
// Standard order with shipping cost ₹40.00
// -----------------------------------------------------------------------------
const order5 = {
  cart: [
    { title: "Pain Relief Balm", mrp: 120.00, price: 100.00, taxRate: 18, quantity: 1 }
  ],
  shippingCost: 40.00,
  total: 140.00
};
const res5 = calculateInvoiceTotals(order5);
assertEqual(res5.mrpTotal, 120.00, "TC5: MRP ₹120.00");
assertEqual(res5.totalDiscount, 20.00, "TC5: Discount ₹20.00");
assertEqual(res5.sellingTotal, 100.00, "TC5: Subtotal / Selling Price ₹100.00");
assertEqual(res5.shippingCost, 40.00, "TC5: Shipping ₹40.00");
assertEqual(res5.grandTotal, 140.00, "TC5: Grand Total ₹140.00 (100 + 40)");

// -----------------------------------------------------------------------------
// TEST CASE 6: Zero Discount (MRP == Selling Price)
// -----------------------------------------------------------------------------
const order6 = {
  cart: [
    { title: "Ayurvedic Tonic", mrp: 150.00, price: 150.00, taxRate: 5, quantity: 2 }
  ],
  shippingCost: 0,
  total: 300.00
};
const res6 = calculateInvoiceTotals(order6);
assertEqual(res6.mrpTotal, 300.00, "TC6: MRP Total ₹300.00");
assertEqual(res6.totalDiscount, 0.00, "TC6: Total Discount ₹0.00");
assertEqual(res6.sellingTotal, 300.00, "TC6: Selling Total ₹300.00");
assertEqual(res6.grandTotal, 300.00, "TC6: Grand Total ₹300.00");

// -----------------------------------------------------------------------------
// TEST CASE 7: Wholesaler Order
// Wholesaler items use wholesale unit price without consumer discount
// -----------------------------------------------------------------------------
const order7 = {
  user_info: { role: "wholesaler" },
  cart: [
    { title: "Paracetamol Bulk", wholePrice: 25.00, mrp: 40.00, price: 35.00, quantity: 10 }
  ],
  shippingCost: 0,
  total: 250.00
};
const res7 = calculateInvoiceTotals(order7, true);
assertEqual(res7.cart[0].unitMrp, 25.00, "TC7: Wholesaler Unit Price ₹25.00");
assertEqual(res7.totalDiscount, 0.00, "TC7: Wholesaler Discount ₹0.00");
assertEqual(res7.sellingTotal, 250.00, "TC7: Wholesaler Selling Total ₹250.00");
assertEqual(res7.grandTotal, 250.00, "TC7: Wholesaler Grand Total ₹250.00");

// -----------------------------------------------------------------------------
// TEST CASE 8: Historical Order Snapshot Immutability
// Finalized order total is preserved even if dynamic calculations differ
// -----------------------------------------------------------------------------
const order8 = {
  cart: [
    { title: "Legacy Medicine", mrp: 200.00, price: 180.00, quantity: 1 }
  ],
  shippingCost: 0,
  total: 180.00
};
const res8 = calculateInvoiceTotals(order8);
assertEqual(res8.grandTotal, 180.00, "TC8: Historical order snapshot total preserved");

// -----------------------------------------------------------------------------
// TEST CASE 9: Missing HSN, Batch, Expiry fallbacks
// Missing regulatory metadata must fallback safely to "-" without errors
// -----------------------------------------------------------------------------
const order9 = {
  cart: [
    { title: "Unregistered Generic", price: 50.00, quantity: 1 }
  ]
};
const res9 = calculateInvoiceTotals(order9);
assertEqual(res9.cart[0].hsn, "-", "TC9: HSN fallback to '-'");
assertEqual(res9.cart[0].batchNo, "-", "TC9: Batch fallback to '-'");
assertEqual(res9.cart[0].formattedExpDate, "-", "TC9: Expiry fallback to '-'");

// -----------------------------------------------------------------------------
// TEST CASE 10: 3-Digit Year Expiry Date Sanitization (e.g. '228-08-31')
// -----------------------------------------------------------------------------
const formatted1 = formatExpiryDate("228-08-31");
const formatted2 = formatExpiryDate("2028-08-31T00:00:00.000Z");
const formatted3 = formatExpiryDate(null);
assertEqual(formatted1, "2028-08-31", "TC10: '228-08-31' converted to '2028-08-31'");
assertEqual(formatted2, "2028-08-31", "TC10: ISO timestamp parsed to '2028-08-31'");
assertEqual(formatted3, "-", "TC10: null date returns '-'");

// -----------------------------------------------------------------------------
// TEST CASE 11: Summary Label and Financial Fields Verification
// Ensures sellingTotal is populated and isGstIncluded is active
// -----------------------------------------------------------------------------
assertEqual(res1.sellingTotal !== undefined, true, "TC11: sellingTotal field exists");
assertEqual(res1.isGstIncluded, true, "TC11: isGstIncluded flag is true");
assertEqual(res1.payableAmount, res1.grandTotal, "TC11: payableAmount matches grandTotal");

console.log("\n===============================================================");
console.log("🎉 ALL 11 INVOICE TEST CASES PASSED WITH 100% ACCURACY!");
console.log("===============================================================\n");
